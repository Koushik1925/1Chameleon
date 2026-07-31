import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import PolicySection from '../components/common/PolicySection';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#0b0f14] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            <SEOHead 
                title="Privacy Policy" 
                description="Read Chameleon's SaaS Privacy Policy detailing account data collection, WebRTC stream isolation, cookie usage, and data retention standards."
                canonical="https://chameleon-jet.vercel.app/privacy"
            />
            <Navbar />

            <div className="relative z-10 pb-20">
                <PageHero 
                    badge="Legal & Privacy"
                    title="Privacy"
                    titleGradient="Policy"
                    subtitle="Last Updated: July 31, 2026. Learn how Chameleon protects your personal data, device identifiers, and WebRTC streaming security."
                />

                <div className="px-6 max-w-4xl mx-auto bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-12 backdrop-blur-xl shadow-2xl">
                    
                    <PolicySection title="1. Information We Collect">
                        <p>Chameleon collects minimal telemetry necessary to authenticate users, pair desktop agents, and establish encrypted WebRTC peer connections. We collect:</p>
                        <ul className="list-disc pl-6 space-y-2 text-slate-300">
                            <li><strong className="text-white">Account Information:</strong> Name, email address, and profile picture provided during Google OAuth authentication or direct account signup.</li>
                            <li><strong className="text-white">Device Information:</strong> Host hardware identifiers (hostname, OS platform, system architecture) used to populate claimed devices in your dashboard.</li>
                            <li><strong className="text-white">Usage Analytics:</strong> Session connection timestamps and signaling ping statistics. <em className="text-cyan-400 font-semibold">We never capture, log, or record screen audio or video.</em></li>
                            <li><strong className="text-white">Cookies:</strong> Session identification cookies required to persist login tokens across visits.</li>
                        </ul>
                    </PolicySection>

                    <PolicySection title="2. How We Use Your Data">
                        <p>We process collected information to:</p>
                        <ul className="list-disc pl-6 space-y-2 text-slate-300">
                            <li>Authenticate your account and maintain active host device claims.</li>
                            <li>Facilitate WebRTC signaling handshake negotiation (ICE candidates, SDP offers/answers).</li>
                            <li>Prevent unauthorized device access or malicious pairing attempts.</li>
                            <li>Deliver technical support responses and platform status notifications.</li>
                        </ul>
                    </PolicySection>

                    <PolicySection title="3. Legal Basis for Processing">
                        <p>We process personal data under GDPR Article 6(1)(b) (performance of a contract) to provide remote desktop access services, and Article 6(1)(f) (legitimate interests) to secure our infrastructure against unauthorized intrusion.</p>
                    </PolicySection>

                    <PolicySection title="4. Data Retention Policy">
                        <p>Account credentials and device claim records are retained for as long as your account remains active. If you delete your account, all associated hardware IDs, tokens, and profile data are purged from MongoDB within 30 days.</p>
                    </PolicySection>

                    <PolicySection title="5. Third-Party Services">
                        <p>Chameleon utilizes trusted infrastructure partners:</p>
                        <ul className="list-disc pl-6 space-y-2 text-slate-300">
                            <li><strong className="text-white">Google OAuth 2.0:</strong> Single sign-on authentication service.</li>
                            <li><strong className="text-white">Render & Vercel:</strong> Encrypted cloud hosting and WebRTC signaling relay infrastructure.</li>
                            <li><strong className="text-white">MongoDB Atlas:</strong> Encrypted document database storage.</li>
                        </ul>
                    </PolicySection>

                    <PolicySection title="6. WebRTC Stream Security">
                        <p>All remote desktop media streams pass directly between peers encrypted with DTLS 1.2 and SRTP AES-GCM 256-bit ciphers. The signaling server facilitates initial connection setup but never inspects or stores media stream contents.</p>
                    </PolicySection>

                    <PolicySection title="7. International Transfers">
                        <p>Your data may be processed on servers located in the United States and European Union, complying with standard contractual clauses (SCCs) for cross-border data protection.</p>
                    </PolicySection>

                    <PolicySection title="8. Your Privacy Rights">
                        <p>Under GDPR and CCPA, you have the right to access, rectify, export, or request immediate erasure of your personal data. You can delete your account at any time on our Delete Account page.</p>
                    </PolicySection>

                    <PolicySection title="9. Children's Privacy">
                        <p>Chameleon is not directed to children under 13 years of age. We do not knowingly collect personal data from minors.</p>
                    </PolicySection>

                    <PolicySection title="10. Policy Updates">
                        <p>We may update this Privacy Policy periodically. Significant updates will be highlighted on our Changelog page and communicated via email.</p>
                    </PolicySection>

                    <PolicySection title="11. Contact Privacy Officer">
                        <p>If you have questions regarding this Privacy Policy, please email <a href="mailto:privacy@chameleon.dev" className="text-cyan-400 underline font-semibold">privacy@chameleon.dev</a>.</p>
                    </PolicySection>

                </div>
            </div>

            <Footer />
        </div>
    );
}
