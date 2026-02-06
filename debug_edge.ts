import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@11.1.0'

// MOCK SECRETS for local testing
const STRIPE_SECRET_KEY = 'sk_test_mocked_for_debug';

console.log("Starting Debug Script...");

try {
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2022-11-15',
    });
    console.log("Stripe Client Initialized.");

    // Simulate the payload sent from frontend
    const payload = { tier: 'SCRIBE', userId: 'test-user-id' };

    const priceMap: Record<string, string> = {
        'SCRIBE': 'price_1SxisvJTWKOeQHiCMFPeRWD4',
        'AUTEUR': 'price_1Sxiw1JTWKOeQHiCr8JNnA8j',
        'SHOWRUNNER': 'price_1SxixMJTWKOeQHiC4UrYOO9c',
    };

    const priceId = priceMap[payload.tier];
    console.log(`Mapped Price ID: ${priceId}`);

    if (!priceId) throw new Error('Invalid tier');

    console.log("Attempting to create session...");
    // We expect this to fail because key is mocked, but we want to see IF it reaches this point
    // or if the IMPORT itself is crashing it.

    // Note: We can't fully simulate the session create without a real key, 
    // but if we get here, the imports work.

    console.log("SUCCESS: Environment and Imports valid.");
} catch (error) {
    console.error("CRITICAL ERROR:", error);
}
