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

        const data = await response.json()

        if (!response.ok) {
            console.error('Gemini API Error:', data)
            return new Response(JSON.stringify({ error: data.error || data }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: response.status,
            })
        }

        return new Response(JSON.stringify(data), {
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
