import { SubscriptionTier } from '../types';
import { supabase } from './supabaseClient';

export const stripeService = {
    /**
     * Creates a Stripe Checkout Session by invoking a Supabase Edge Function.
     */
    async createCheckoutSession(tier: SubscriptionTier, userId: string): Promise<string | null> {
        console.log(`Redirecting to payment link for ${tier} (User: ${userId})`);

        const paymentLinks: Record<string, string> = {
            'SCRIBE': 'https://buy.stripe.com/28EfZi7Km8O3bmo0ombAs02',
            'AUTEUR': 'https://buy.stripe.com/aFacN65Ce1lBcqsfjgbAs01',
            'SHOWRUNNER': 'https://buy.stripe.com/3cIfZi5Ce9S79eg5IGbAs00',
        };

        const url = paymentLinks[tier];

        if (url) {
            // We append the client_reference_id to the URL so the webhook knows WHO paid
            // Format: ?client_reference_id=USER_ID
            const finalUrl = `${url}?client_reference_id=${userId}`;
            window.location.href = finalUrl;
            return finalUrl;
        }

        alert('Invalid tier selected.');
        return null;
    },

    async createCustomerPortalSession(): Promise<void> {
        // TODO: Replace with your actual Stripe Customer Portal link
        // You can find this in Stripe Dashboard -> Settings -> Customer Portal
        const portalUrl = "https://billing.stripe.com/p/login/test_...";
        alert("Redirecting to Subscription Management...");
        window.open(portalUrl, '_blank');
    }
};
