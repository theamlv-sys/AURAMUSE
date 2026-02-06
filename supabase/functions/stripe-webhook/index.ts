import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2022-11-15',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
    const signature = req.headers.get('stripe-signature')

    try {
        const body = await req.text()
        const event = stripe.webhooks.constructEvent(
            body,
            signature ?? '',
            Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
        )

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object
            const userId = session.client_reference_id
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
            const priceId = lineItems.data[0]?.price?.id

            // 1. Map Price ID back to Tier
            // USER: Replace these with your actual Stripe Price IDs
            const tierMap: Record<string, string> = {
                'price_1SxisvJTWKOeQHiCMFPeRWD4': 'SCRIBE',
                'price_1Sxiw1JTWKOeQHiCr8JNnA8j': 'AUTEUR',
                'price_1SxixMJTWKOeQHiC4UrYOO9c': 'SHOWRUNNER',
            }

            const newTier = tierMap[priceId]

            if (userId && newTier) {
                // 2. Update user_usage table in Supabase
                const { error } = await supabase
                    .from('user_usage')
                    .upsert({
                        user_id: userId,
                        user_tier: newTier,
                        updated_at: new Date().toISOString()
                    })

                if (error) throw error
                console.log(`Updated user ${userId} to tier ${newTier}`)
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 })
    } catch (err) {
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }
})
