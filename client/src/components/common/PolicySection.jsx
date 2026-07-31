import React from 'react';

export default function PolicySection({ title, children }) {
    return (
        <section className="mb-10 space-y-4">
            <h3 className="text-2xl font-bold text-white tracking-tight border-b border-slate-800 pb-3">
                {title}
            </h3>
            <div className="text-slate-300 text-sm md:text-base leading-relaxed space-y-4">
                {children}
            </div>
        </section>
    );
}
