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

    // Filter categories and articles by search term
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
        <div className="min-h-screen bg-[#0B0F1A] text-[#E5E7EB] font-sans selection:bg-[#06B6D4]/30 selection:text-cyan-200">
            <SEOHead 
                title="Help Center & Documentation" 
                description="Find help articles, pairing guides, network firewall troubleshooting, and performance setup instructions for Chameleon Remote Desktop."
                canonical="https://chameleon-jet.vercel.app/help"
            />
            <Navbar />

            <div className="relative z-10 pb-20">
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
                                        className={`p-5 rounded-2xl border transition-all text-left flex flex-col justify-between h-32 ${
                                            isSelected 
                                                ? 'bg-[#111827] border-[#06B6D4] text-[#E5E7EB] shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                                                : 'bg-[#111827] border-[#1F2937] text-[#9CA3AF] hover:border-[#06B6D4]/40 hover:text-[#E5E7EB]'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-gradient-to-tr from-[#22C55E] to-[#06B6D4] text-white' : 'bg-[#0B0F1A] border border-[#1F2937] text-[#06B6D4]'}`}>
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
                                        <div className="flex items-center gap-3 border-b border-[#1F2937] pb-3">
                                            <div className="w-8 h-8 rounded-xl bg-[#111827] border border-[#1F2937] text-[#06B6D4] flex items-center justify-center">
                                                <HeaderIcon size={18} />
                                            </div>
                                            <h2 className="text-2xl font-bold text-[#E5E7EB] tracking-tight">
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
