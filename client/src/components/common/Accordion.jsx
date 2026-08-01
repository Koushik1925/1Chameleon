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
                        className={`bg-[#111827]/72 border rounded-[18px] overflow-hidden backdrop-blur-[12px] transition-all duration-150 ease-out ${isOpen ? 'border-[#06B6D4]/35 shadow-[0_8px_30px_rgba(0,0,0,0.35)]' : 'border-white/6 hover:border-[#06B6D4]/35'}`}
                    >
                        <button
                            onClick={() => toggle(idx)}
                            className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                        >
                            <span className="font-bold text-[#F3F4F6] text-base md:text-lg pr-4">
                                {item.question || item.title}
                            </span>
                            <ChevronDown 
                                size={20} 
                                className={`text-[#06B6D4] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#22C55E]' : ''}`}
                            />
                        </button>

                        {isOpen && (
                            <div className="px-6 pb-6 text-[#9CA3AF] text-sm md:text-base leading-relaxed border-t border-white/5 pt-4 animate-in fade-in duration-150">
                                {item.answer || item.content}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
