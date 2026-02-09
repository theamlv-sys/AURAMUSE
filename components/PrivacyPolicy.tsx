import React from 'react';

interface PrivacyPolicyProps {
    onBack: () => void;
    theme: 'dark' | 'light';
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack, theme }) => {
    const isDark = theme === 'dark';
    // Colors
    const bg = isDark ? 'bg-gray-950 text-gray-300' : 'bg-white text-gray-800';
    const heading = isDark ? 'text-white' : 'text-gray-900';
    const border = isDark ? 'border-gray-800' : 'border-gray-200';
    const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200';

    return (
        <div className={`min-h-screen ${bg} flex flex-col items-center py-12 px-6 fade-in overflow-y-auto`}>
            <div className="w-full max-w-3xl">
                <button
                    onClick={onBack}
                    className="mb-8 text-sm font-bold text-muse-500 hover:text-muse-400 flex items-center gap-2 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Back to App
                </button>

                <div className="text-center mb-12">
                    <h1 className={`text-4xl md:text-5xl font-serif font-bold ${heading} mb-4`}>Privacy Policy</h1>
                    <p className="text-gray-500 text-sm font-mono">Effective Date: February 9, 2026</p>
                </div>

                <div className="space-y-12 text-sm leading-relaxed">

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>1. Introduction</h2>
                        <p className="mb-4">
                            Welcome to <strong>AuraDomoMuse</strong> ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data.
                            This Privacy Policy explains how we look after your personal data when you visit our application and tells you about your privacy rights and how the law protects you.
                        </p>
                        <p>
                            By using AuraDomoMuse, you agree to the collection and use of information in accordance with this policy.
                        </p>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>2. Information We Collect</h2>
                        <ul className="list-disc pl-5 space-y-3 marker:text-muse-500">
                            <li><strong>Identity Data:</strong> Includes first name, last name, username, or similar identifier provided via Google Login.</li>
                            <li><strong>Contact Data:</strong> Includes email address.</li>
                            <li><strong>Content Data:</strong> Includes the scripts, project files, assets (images, audio), and text you generate or upload to the platform.</li>
                            <li><strong>Usage Data:</strong> Includes information about how you use our website, products, and services (e.g., API credit consumption).</li>
                        </ul>
                    </section>

                    <section className={`p-8 rounded-2xl border ${cardBg}`}>
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                                    <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className={`text-xl font-bold ${heading} mb-2`}>3. Google User Data Policy</h2>
                                <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-4">Strict Adherence to Google API Services User Data Policy</p>
                            </div>
                        </div>

                        <p className="mb-6">
                            Our application requests restricted access to your Gmail account (scope: <code>https://www.googleapis.com/auth/gmail.modify</code>) strictly to provide the "Executive Comms" features.
                        </p>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className={`font-bold ${heading} mb-2`}>How We Access Data</h3>
                                <p className="text-gray-500 text-xs mb-2">We fetch your recent emails solely to display them within the AuraDomoMuse interface and to allow you to draft replies using our AI.</p>
                            </div>
                            <div>
                                <h3 className={`font-bold ${heading} mb-2`}>No Third-Party Sharing</h3>
                                <p className="text-gray-500 text-xs mb-2">We do NOT expose your emails to any third parties except for the AI models (Gemini/OpenAI) you explicitly trigger for drafting purposes.</p>
                            </div>
                            <div>
                                <h3 className={`font-bold ${heading} mb-2`}>No Humans Read Emails</h3>
                                <p className="text-gray-500 text-xs mb-2">No human at AuraDomoMuse ever sees your email content. All processing is automated.</p>
                            </div>
                            <div>
                                <h3 className={`font-bold ${heading} mb-2`}>Not For Advertising</h3>
                                <p className="text-gray-500 text-xs mb-2">We never use your Google Workspace data for advertising purposes.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>4. AI Sub-Processors</h2>
                        <p className="mb-4">
                            We use third-party AI models to provide generative features (Text, Image, Audio, Video).
                        </p>
                        <ul className="list-disc pl-5 space-y-2 marker:text-muse-500">
                            <li><strong>Google Gemini (Google LLC):</strong> Used for text generation and reasoning.</li>
                            <li><strong>Stripe:</strong> Used for secure payment processing.</li>
                        </ul>
                        <p className="mt-4 text-xs italic text-gray-500">
                            Note: We configure our API calls to opt-out of training where possible. However, you should avoid inputting highly sensitive personal health or financial information into the AI prompts.
                        </p>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>5. Data Security & Storage</h2>
                        <p>
                            All data is encrypted in transit using SSL/TLS. Your project data is stored in a secure Supabase database with Row Level Security (RLS) enabled, meaning only your authenticated account can access your records.
                        </p>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>6. Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us at: <br />
                            <a href="mailto:auraassistantai@auradomo.com" className="text-muse-500 hover:underline">auraassistantai@auradomo.com</a>
                        </p>
                    </section>
                </div>

                <div className="mt-16 pt-8 border-t border-gray-800 text-center">
                    <p className="text-gray-600 text-xs">© 2026 AuraDomoMuse. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
