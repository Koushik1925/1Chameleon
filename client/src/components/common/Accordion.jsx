import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Accordion({ items = [] }) {
    const [openIndex, setOpenIndex] = useState(null);

    const toggle = (idx) => {
        setOpenIndex(openIndex === idx ? null : idx);
    };

    return (
        <div className="space-y-4 max-w-3xl mx-auto">
            {items.map((item, idx) => {
                const isOpen = openIndex === idx;
                return (
                    <div 
                        key={idx}
                        className={`bg-[#111827] border rounded-2xl overflow-hidden backdrop-blur-xl transition-all duration-200 ${isOpen ? 'border-[#06B6D4]/60 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'border-[#1F2937] hover:border-[#06B6D4]/40'}`}
                    >
                        <button
                            onClick={() => toggle(idx)}
                            className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                        >
                            <span className="font-bold text-[#E5E7EB] text-base md:text-lg pr-4">
                                {item.question || item.title}
                            </span>
                            <ChevronDown 
                                size={20} 
                                className={`text-[#06B6D4] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#22C55E]' : ''}`}
                            />
                        </button>

                        {isOpen && (
                            <div className="px-6 pb-6 text-[#9CA3AF] text-sm md:text-base leading-relaxed border-t border-[#1F2937] pt-4 animate-in fade-in duration-200">
                                {item.answer || item.content}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
