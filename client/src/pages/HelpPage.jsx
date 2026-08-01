import { useState } from 'react';
import SEOHead from '../components/common/SEOHead';
import PageHero from '../components/common/PageHero';
import SearchBar from '../components/common/SearchBar';
import Accordion from '../components/common/Accordion';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { HELP_CATEGORIES } from '../constants/data';
import * as Icons from 'lucide-react';

export default function HelpPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);

    const filteredCategories = HELP_CATEGORIES.map(cat => {
        const matchingArticles = cat.articles.filter(art =>
            art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            art.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return { ...cat, matchingArticles };
    }).filter(cat =>
        searchTerm ? cat.matchingArticles.length > 0 : true
    );

    return (
        <div className="min-h-screen bg-[#090D17] text-[#9CA3AF] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead
                title="Help Center & Documentation"
                description="Find help articles, pairing guides, network firewall troubleshooting, and performance setup instructions for Chameleon Remote Desktop."
                canonical="https://www.chameleon-agent.online/help"
            />
            <Navbar />

            <div className="relative z-10 pb-24">
                <PageHero
                    badge="Support Center"
                    title="How can we"
                    titleGradient="help you?"
                    subtitle="Search documentation, configuration guides, and troubleshooting steps for Chameleon Remote Desktop."
                />

                <div className="px-6 max-w-5xl mx-auto">
                    {/* Top Search Bar */}
                    <SearchBar
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search pairing codes, NAT firewalls, 60 FPS setup, device claiming..."
                    />

                    {/* Category Selection Cards Grid */}
                    {!searchTerm && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
                            {HELP_CATEGORIES.map(cat => {
                                const IconComp = Icons[cat.icon] || Icons.HelpCircle;
                                const isSelected = activeCategory === cat.id;

                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(isSelected ? null : cat.id)}
                                        className={`p-5 rounded-[18px] border transition-all duration-150 ease-out text-left flex flex-col justify-between h-32 ${
                                            isSelected
                                                ? 'bg-[#111827]/72 backdrop-blur-[12px] border-[#06B6D4]/35 text-[#F3F4F6] shadow-[0_15px_40px_rgba(0,0,0,0.45)]'
                                                : 'bg-[#111827]/72 backdrop-blur-[12px] border-white/6 text-[#9CA3AF] hover:border-[#06B6D4]/35 hover:-translate-y-1 hover:text-[#F3F4F6]'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-gradient-to-tr from-[#22C55E] to-[#06B6D4] text-white' : 'bg-[#090D17] border border-white/5 text-[#06B6D4]'}`}>
                                            <IconComp size={20} />
                                        </div>
                                        <span className="font-bold text-sm leading-snug">
                                            {cat.title}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Accordion Categories List */}
                    <div className="space-y-12">
                        {filteredCategories
                            .filter(cat => !activeCategory || cat.id === activeCategory || searchTerm)
                            .map(cat => {
                                const HeaderIcon = Icons[cat.icon] || Icons.HelpCircle;
                                return (
                                    <div key={cat.id} className="space-y-4">
                                        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                                            <div className="w-8 h-8 rounded-xl bg-[#111827]/72 border border-white/6 text-[#06B6D4] flex items-center justify-center">
                                                <HeaderIcon size={18} />
                                            </div>
                                            <h2 className="text-2xl font-bold text-[#F3F4F6] tracking-tight">
                                                {cat.title}
                                            </h2>
                                        </div>

                                        <Accordion
                                            items={(searchTerm ? cat.matchingArticles : cat.articles).map(art => ({
                                                question: art.title,
                                                answer: art.content
                                            }))}
                                        />
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
