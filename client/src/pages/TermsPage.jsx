import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import PolicySection from '../components/common/PolicySection';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#0B0F1A] text-[#E5E7EB] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead 
                title="Terms of Service" 
                description="Review the legal Terms of Service for Chameleon Remote Desktop software, user licenses, acceptable use, and liability limits."
                canonical="https://chameleon-jet.vercel.app/terms"
            />
            <Navbar />

            <div className="relative z-10 pb-20">
                <PageHero 
                    badge="Legal Agreement"
                    title="Terms of"
                    titleGradient="Service"
                    subtitle="Last Updated: July 31, 2026. Please read these terms carefully before downloading or using Chameleon."
                />

                <div className="px-6 max-w-4xl mx-auto bg-[#111827] border border-[#1F2937] rounded-2xl p-8 md:p-12 backdrop-blur-xl shadow-2xl">
                    
                    <PolicySection title="1. Acceptance of Terms">
                        <p>By creating an account, downloading the Chameleon Desktop Agent, or accessing our web client, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the software.</p>
                    </PolicySection>

                    <PolicySection title="2. Software License Grant">
                        <p>Chameleon grants you a revocable, non-exclusive, non-transferable license to download, install, and run the Desktop Agent for personal or authorized business remote access purposes.</p>
                    </PolicySection>

                    <PolicySection title="3. User Accounts & Security">
                        <p>You are responsible for maintaining the confidentiality of your account login credentials and Google OAuth authorization tokens. You must immediately notify Chameleon of any unauthorized access to your account or host devices.</p>
                    </PolicySection>

                    <PolicySection title="4. Acceptable Use Policy">
                        <p>You agree not to use Chameleon to:</p>
                        <ul className="list-disc pl-6 space-y-2 text-slate-300">
                            <li>Gain unauthorized access to computers or networks without explicit owner permission.</li>
                            <li>Distribute malware, spyware, ransomware, or unauthorized remote access trojans (RATs).</li>
                            <li>Interfere with signaling infrastructure or perform denial-of-service (DoS) attacks.</li>
                            <li>Bypass software licensing or security access controls.</li>
                        </ul>
                    </PolicySection>

                    <PolicySection title="5. Use Restrictions">
                        <p>You shall not reverse engineer, decompile, disassemble, or attempt to derive the source code of proprietary native binaries beyond what is explicitly published under open source licenses.</p>
                    </PolicySection>

                    <PolicySection title="6. Service Termination">
                        <p>Chameleon reserves the right to suspend or terminate account access immediately for violations of the Acceptable Use Policy or suspected security exploitation.</p>
                    </PolicySection>

                    <PolicySection title="7. Disclaimer of Warranties">
                        <p>CHAMELEON IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>
                    </PolicySection>

                    <PolicySection title="8. Limitation of Liability">
                        <p>IN NO EVENT SHALL CHAMELEON OR ITS DEVELOPERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES ARISING FROM THE USE OR INABILITY TO USE THE REMOTE DESKTOP SOFTWARE.</p>
                    </PolicySection>

                    <PolicySection title="9. Intellectual Property">
                        <p>All trademarks, brand logos, UI designs, and software documentation are the exclusive property of Chameleon and its licensors.</p>
                    </PolicySection>

                    <PolicySection title="10. Changes to Terms">
                        <p>We may revise these Terms of Service at any time. Continued use of the service following posted changes constitutes acceptance of the updated terms.</p>
                    </PolicySection>

                    <PolicySection title="11. Legal Contact">
                        <p>Questions concerning these terms should be addressed to <a href="mailto:chameleonagent.contact@gmail.com" className="text-cyan-400 underline font-semibold">chameleonagent.contact@gmail.com</a>.</p>
                    </PolicySection>

                </div>
            </div>

            <Footer />
        </div>
    );
}
