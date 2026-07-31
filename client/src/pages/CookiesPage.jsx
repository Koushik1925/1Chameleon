import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import PolicySection from '../components/common/PolicySection';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

export default function CookiesPage() {
    return (
        <div className="min-h-screen bg-[#0b0f14] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            <SEOHead 
                title="Cookie Policy" 
                description="Understand how Chameleon uses essential cookies, authentication session tokens, and local browser storage to provide secure remote access."
                canonical="https://chameleon-jet.vercel.app/cookies"
            />
            <Navbar />

            <div className="relative z-10 pb-20">
                <PageHero 
                    badge="Browser Storage"
                    title="Cookie"
                    titleGradient="Policy"
                    subtitle="Last Updated: July 31, 2026. Explanation of essential cookies, session storage, and how to manage your privacy settings."
                />

                <div className="px-6 max-w-4xl mx-auto bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-12 backdrop-blur-xl shadow-2xl">
                    
                    <PolicySection title="1. What Are Cookies?">
                        <p>Cookies and local storage objects (localStorage) are small data files saved on your browser or device when you visit websites. They enable the application to remember your login session, last connected device ID, and user interface preferences.</p>
                    </PolicySection>

                    <PolicySection title="2. Essential Cookies">
                        <p>Essential cookies are strictly required for the website to function. They enable secure navigation, WebSockets signaling connection authentication, and session continuity.</p>
                        <table className="w-full text-left text-xs md:text-sm text-slate-300 mt-3 border border-slate-800 rounded-xl overflow-hidden">
                            <thead className="bg-slate-950 text-white font-mono uppercase">
                                <tr>
                                    <th className="p-3">Key / Cookie</th>
                                    <th className="p-3">Purpose</th>
                                    <th className="p-3">Expiry</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                <tr>
                                    <td className="p-3 font-mono text-cyan-400">chameleon_token</td>
                                    <td className="p-3">Stores encrypted JWT access token for account authentication.</td>
                                    <td className="p-3">7 Days</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-mono text-cyan-400">chameleon_last_session</td>
                                    <td className="p-3">Remembers last connected remote session key for quick reconnect.</td>
                                    <td className="p-3">2 Hours</td>
                                </tr>
                            </tbody>
                        </table>
                    </PolicySection>

                    <PolicySection title="3. Authentication Cookies">
                        <p>Authentication cookies keep you securely logged into your account across page transitions and prevent you from having to re-authenticate every time you open a new tab.</p>
                    </PolicySection>

                    <PolicySection title="4. Analytics & Performance Storage">
                        <p>We use lightweight, privacy-focused internal metrics to monitor WebRTC connection drop rates and signaling latency. We do not use third-party tracking cookies or advertising pixels.</p>
                    </PolicySection>

                    <PolicySection title="5. Preference Storage">
                        <p>Local storage is used to save your desktop viewing options, such as touch controls toggles, audio playback preferences, and dark mode display configurations.</p>
                    </PolicySection>

                    <PolicySection title="6. Third-Party Cookies">
                        <p>If you choose to log in using Google OAuth 2.0, Google may set cookies on its authentication domain (<code className="text-cyan-400">accounts.google.com</code>) to verify your account identity.</p>
                    </PolicySection>

                    <PolicySection title="7. How to Disable Cookies">
                        <p>You can block or delete cookies through your web browser settings (Chrome, Safari, Firefox, Edge). Note that disabling essential authentication cookies will prevent you from signing in to your account or connecting to remote hosts.</p>
                    </PolicySection>

                    <PolicySection title="8. Updates to Cookie Policy">
                        <p>We may update this policy to reflect technological changes or regulatory updates. Any changes will be posted on this page with an updated revision date.</p>
                    </PolicySection>

                </div>
            </div>

            <Footer />
        </div>
    );
}
