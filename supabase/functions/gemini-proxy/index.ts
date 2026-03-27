import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const geminiApiKey = Deno.env.get('GOOGLE_GENAI_API_KEY')
        if (!geminiApiKey) {
            throw new Error('GOOGLE_GENAI_API_KEY is not set')
        }

        // 1. Verify Authentication
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('No authorization header')
        }

        const body = await req.json()

        const downloadUrl = body.downloadUrl || body.config?.downloadUrl;
        if (downloadUrl) {
            const url = downloadUrl.includes('?') ? `${downloadUrl}&key=${geminiApiKey}` : `${downloadUrl}?key=${geminiApiKey}`;
            const response = await fetch(url, { method: 'GET' });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Proxy Download Failed: ${response.status} - ${errText}`);
            }
            // Stream the response body directly instead of loading into memory (fixes WORKER_LIMIT)
            return new Response(response.body, {
                headers: { ...corsHeaders, 'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream' },
                status: 200
            })
        }

        // 2a. Handle Operation Polling
        const operationId = body.operation || body.config?.operation;
        if (operationId) {
            const opUrl = `https://generativelanguage.googleapis.com/v1beta/${operationId}?key=${geminiApiKey}`
            const response = await fetch(opUrl, { method: 'GET' })
            const data = await response.json()
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: response.ok ? 200 : response.status,
            })
        }

        const { model, contents, config } = body
        if (!model) throw new Error("No model specified and no operation provided.");

        // 2b. Call Gemini API via REST
        let url = '';
        let googlePayload: any = {};

        if (model.startsWith('veo')) {
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${geminiApiKey}`;
            
            let prompt = "";
            let imageObj = null;
            
            const parts = Array.isArray(contents) ? contents[0]?.parts || contents : contents?.parts || [];
            const safeParts = Array.isArray(parts) ? parts : [parts];
            
            for (const p of safeParts) {
                if (p.text) prompt += p.text + " ";
                if (p.inlineData) {
                    imageObj = {
                        bytesBase64Encoded: p.inlineData.data,
                        mimeType: p.inlineData.mimeType
                    };
                }
            }

            googlePayload = {
                instances: [
                    {
                        prompt: prompt.trim(),
                    }
                ],
                parameters: {
                    aspectRatio: "16:9",
                    personGeneration: "allow_adult"
                }
            };
            if (imageObj) googlePayload.instances[0].image = imageObj;

        } else {
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
            
            googlePayload = {
                contents: Array.isArray(contents)
                    ? contents
                    : (typeof contents === 'string' ? [{ parts: [{ text: contents }] }] : [contents]),
                generationConfig: config || {},
            }

            if (config?.systemInstruction) {
                googlePayload.systemInstruction = config.systemInstruction
                delete googlePayload.generationConfig.systemInstruction
            }
            if (config?.tools) {
                googlePayload.tools = config.tools
                delete googlePayload.generationConfig.tools
            }
            if (config?.responseModalities) googlePayload.generationConfig.responseModalities = config.responseModalities;
            if (config?.imageConfig) googlePayload.generationConfig.imageConfig = config.imageConfig;
            if (config?.speechConfig) googlePayload.generationConfig.speechConfig = config.speechConfig;
        }

        console.log(`Calling Gemini Proxy: ${model || body.operation}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(googlePayload),
        })

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API Error:', errText)
            let errObj;
            try { errObj = JSON.parse(errText); } catch(e) { errObj = errText; }
            return new Response(JSON.stringify({ error: errObj.error || errObj }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: response.status,
            })
        }

        // Stream the JSON response directly from Google to avoid parsing massive base64 payloads locally,
        // which eats up CPU time and causes WORKER_LIMIT crashes on Edge Functions.
        return new Response(response.body, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Proxy Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
