import React from 'react';

interface TermsOfServiceProps {
    onBack: () => void;
    theme: 'dark' | 'light';
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack, theme }) => {
    const isDark = theme === 'dark';
    const bg = isDark ? 'bg-gray-950 text-gray-300' : 'bg-white text-gray-800';
    const heading = isDark ? 'text-white' : 'text-gray-900';
    const border = isDark ? 'border-gray-800' : 'border-gray-200';

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
                    <h1 className={`text-4xl md:text-5xl font-serif font-bold ${heading} mb-4`}>Terms of Service</h1>
                    <p className="text-gray-500 text-sm font-mono">Effective Date: February 9, 2026</p>
                </div>

                <div className="space-y-12 text-sm leading-relaxed">

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>1. Acceptance of Terms</h2>
                        <p className="mb-4">
                            By accessing or using <strong>AuraDomoMuse</strong> ("The Executive OS"), you agree to be bound by these Terms. If you do not agree to these Terms, you may not use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>2. Use of Service</h2>
                        <ul className="list-disc pl-5 space-y-3 marker:text-muse-500">
                            <li><strong>Eligibility:</strong> You must be at least 18 years old to use the Service.</li>
                            <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials.</li>
                            <li><strong>Prohibited Conduct:</strong> You agree not to use the Service for any illegal purpose, or to upload content that is hateful, violent, or infringes on the rights of others.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>3. User Content & Intellectual Property</h2>
                        <p className="mb-4">
                            You retain full ownership of all content (scripts, projects, assets) you create using AuraDomoMuse.
                        </p>
                        <p>
                            By uploading content, you grant us a limited, worldwide, non-exclusive license to access and process your content solely for the purpose of providing the Service (e.g., generating AI summaries or visuals as requested by you). We do not claim ownership of your creations.
                        </p>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>4. Subscriptions & Payments</h2>
                        <p className="mb-4">
                            Paid features are billed in advance on a recurring basis (subscription). You may cancel your subscription at any time via the Stripe billing portal, but no refunds will be provided for the remaining period of the current billing cycle.
                        </p>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>5. Disclaimer of Warranties</h2>
                        <p className="mb-4">
                            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
                            WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.
                        </p>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>6. Limitation of Liability</h2>
                        <p>
                            IN NO EVENT SHALL AURADOMOMUSE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
                        </p>
                    </section>

                    <section>
                        <h2 className={`text-xl font-bold ${heading} mb-4 pb-2 border-b ${border}`}>7. Governing Law</h2>
                        <p>
                            These Terms shall be governed by the laws of the State of California, without regard to its conflict of law provisions.
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

export default TermsOfService;
