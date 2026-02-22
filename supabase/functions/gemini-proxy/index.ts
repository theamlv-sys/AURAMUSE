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

        const { model, contents, config } = await req.json()

        // 2. Call Gemini API via REST
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`

        // Construct the payload for the Google API correctly
        const googlePayload: any = {
            contents: Array.isArray(contents)
                ? contents
                : (typeof contents === 'string' ? [{ parts: [{ text: contents }] }] : [contents]),
            generationConfig: config || {},
        }

        // Move specific fields from config to the top level of the payload if they exist
        // Google REST API expects systemInstruction and tools at the top level
        if (config?.systemInstruction) {
            googlePayload.systemInstruction = config.systemInstruction
            delete googlePayload.generationConfig.systemInstruction
        }
        if (config?.tools) {
            googlePayload.tools = config.tools
            delete googlePayload.generationConfig.tools
        }

        // Handle specific image/audio configs that should stay in generationConfig
        // But ensure they aren't duplicate or misplaced
        if (config?.responseModalities) {
            googlePayload.generationConfig.responseModalities = config.responseModalities
        }
        if (config?.imageConfig) {
            googlePayload.generationConfig.imageConfig = config.imageConfig
        }
        if (config?.speechConfig) {
            googlePayload.generationConfig.speechConfig = config.speechConfig
        }

        console.log(`Calling Gemini Model: ${model}`);

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
