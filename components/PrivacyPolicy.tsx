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
                    <p className="text-gray-500 text-sm font-mono">Effective Date: March 9, 2026</p>
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
                            <div>
                                <h3 className={`font-bold ${heading} mb-2`}>Data Caching</h3>
                                <p className="text-gray-500 text-xs mb-2">We do not permanently store the content of your emails. Email data is fetched in real time during your active session and is not cached or persisted on our servers after your session ends.</p>
                            </div>
                            <div>
                                <h3 className={`font-bold ${heading} mb-2`}>Session-Only Access</h3>
                                <p className="text-gray-500 text-xs mb-2">Your Google user data (emails, profile information) is accessed only during your authenticated session. Once you log out or your session expires, all fetched Google data is discarded from memory.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>4. Google User Data Retention</h2>
                        <p className="mb-4">
                            We retain Google user data only as long as necessary to provide the services you have requested:
                        </p>
                        <ul className="list-disc pl-5 space-y-3 marker:text-muse-500">
                            <li><strong>Authentication Data (name, email, profile picture):</strong> Retained for the duration of your active account. This data is stored in our secure Supabase database and is used solely to identify you within the application.</li>
                            <li><strong>Gmail Data (email content):</strong> Accessed in real time during your session only. <strong>We do not store, cache, or persist any email content on our servers.</strong> Email data exists only in your browser's memory during your active session and is discarded when you navigate away or log out.</li>
                            <li><strong>Google Drive Data:</strong> Accessed in real time for project file management. File metadata may be cached temporarily during your session but is not stored permanently on our servers.</li>
                            <li><strong>OAuth Tokens:</strong> Your Google OAuth refresh token is stored securely and encrypted in our database to maintain your authenticated session. Tokens are deleted immediately when you revoke access or delete your account.</li>
                        </ul>
                    </section>

                    <section className={`p-8 rounded-2xl border ${cardBg}`}>
                        <h2 className={`text-xl font-bold ${heading} mb-4`}>5. Google User Data Deletion</h2>
                        <p className="mb-4">
                            You have the right to request deletion of all Google user data associated with your account at any time. Here is how:
                        </p>
                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <h3 className={`font-bold ${heading} mb-2`}>Request Deletion via Email</h3>
                                <p className="text-gray-500 text-xs mb-2">Send an email to <a href="mailto:auraassistantai@auradomo.com" className="text-muse-500 hover:underline">auraassistantai@auradomo.com</a> with the subject line "Data Deletion Request." We will process your request and delete all associated Google user data within <strong>30 days</strong>.</p>
                            </div>
                            <div>
                                <h3 className={`font-bold ${heading} mb-2`}>Revoke Google Access</h3>
                                <p className="text-gray-500 text-xs mb-2">You can revoke AuraDomoMuse's access to your Google account at any time by visiting your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-muse-500 hover:underline">Google Account Permissions</a> page. Upon revocation, we will no longer be able to access any of your Google data, and any stored OAuth tokens will become invalid.</p>
                            </div>
                            <div>
                                <h3 className={`font-bold ${heading} mb-2`}>Account Deletion</h3>
                                <p className="text-gray-500 text-xs mb-2">If you delete your AuraDomoMuse account, all associated data — including your Google authentication tokens, profile information, project files, and any cached metadata — will be <strong>permanently deleted within 30 days</strong>.</p>
                            </div>
                            <div>
                                <h3 className={`font-bold ${heading} mb-2`}>What Gets Deleted</h3>
                                <p className="text-gray-500 text-xs mb-2">Upon deletion request: your user profile, OAuth tokens, project data, story bibles, generated content, subscription records, and all Google-sourced metadata are permanently removed from our systems.</p>
                            </div>
                        </div>
                        <p className="text-xs italic text-gray-500">
                            Note: Deletion of data processed by third-party AI sub-processors (e.g., prompts sent to Google Gemini) is governed by those providers' own data retention policies. We configure our API usage to opt out of training where possible.
                        </p>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>6. AI Sub-Processors</h2>
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
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>7. Data Security & Storage</h2>
                        <p>
                            All data is encrypted in transit using SSL/TLS. Your project data is stored in a secure Supabase database with Row Level Security (RLS) enabled, meaning only your authenticated account can access your records.
                        </p>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>8. Your Rights</h2>
                        <p className="mb-4">
                            Under applicable data protection laws, you have the following rights:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 marker:text-muse-500">
                            <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you.</li>
                            <li><strong>Right to Rectification:</strong> Request correction of inaccurate personal data.</li>
                            <li><strong>Right to Erasure:</strong> Request deletion of your personal data and all associated Google user data.</li>
                            <li><strong>Right to Restrict Processing:</strong> Request limitation of how we process your data.</li>
                            <li><strong>Right to Data Portability:</strong> Request your data in a machine-readable format.</li>
                            <li><strong>Right to Revoke Consent:</strong> Withdraw consent for data processing at any time via your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-muse-500 hover:underline">Google Account Permissions</a> or by contacting us.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>9. Contact Us</h2>
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
