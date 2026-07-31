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
                        className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl transition-colors duration-200"
                    >
                        <button
                            onClick={() => toggle(idx)}
                            className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                        >
                            <span className="font-semibold text-white text-base md:text-lg pr-4">
                                {item.question || item.title}
                            </span>
                            <ChevronDown 
                                size={20} 
                                className={`text-cyan-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {isOpen && (
                            <div className="px-6 pb-6 text-slate-400 text-sm md:text-base leading-relaxed border-t border-slate-800/60 pt-4 animate-in fade-in duration-200">
                                {item.answer || item.content}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
