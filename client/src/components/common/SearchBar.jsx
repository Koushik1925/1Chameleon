import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search articles, FAQs, setup guides...' }) {
    return (
        <div className="relative max-w-2xl mx-auto mb-10">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search size={20} />
            </div>
            <input 
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-11 pr-10 py-4 bg-slate-900/80 border border-slate-800 focus:border-cyan-500 rounded-2xl text-white placeholder-slate-500 text-sm md:text-base outline-none shadow-xl transition-all"
            />
            {value && (
                <button 
                    onClick={() => onChange('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white"
                >
                    <X size={18} />
                </button>
            )}
        </div>
    );
}
