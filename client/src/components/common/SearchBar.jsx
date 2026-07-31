import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search articles, FAQs, setup guides...' }) {
    return (
        <div className="relative max-w-2xl mx-auto mb-10">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9CA3AF]">
                <Search size={20} />
            </div>
            <input 
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-11 pr-10 py-4 bg-[#111827] border border-[#1F2937] focus:border-[#06B6D4] focus:ring-2 focus:ring-[#06B6D4]/30 rounded-2xl text-[#E5E7EB] placeholder-[#9CA3AF] text-sm md:text-base outline-none shadow-xl transition-all"
            />
            {value && (
                <button 
                    onClick={() => onChange('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#9CA3AF] hover:text-[#E5E7EB]"
                >
                    <X size={18} />
                </button>
            )}
        </div>
    );
}
