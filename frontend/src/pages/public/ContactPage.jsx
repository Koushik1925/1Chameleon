import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, Shield, HelpCircle } from 'lucide-react';
import SEOManager from '../../seo/SEOManager';
import Breadcrumbs from '../../components/public/Breadcrumbs';
import { getContactPageSchema } from '../../seo/schemaGenerators';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Technical Support',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const contactSchema = getContactPageSchema();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <SEOManager
        title="Contact Us — Technical Support & Sales Inquiry"
        description="Get in touch with the Chameleon team for remote desktop support, enterprise deployment inquiries, or security vulnerability disclosures."
        keywords={['contact remote desktop support', 'chameleon support email', 'remote access sales']}
        canonicalPath="/contact"
        schemas={[contactSchema]}
      />

      <Breadcrumbs items={[{ name: 'Contact', item: '/contact' }]} />

      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight">Contact Chameleon</h1>
        <p className="text-sm text-slate-400">
          Have a technical question or enterprise licensing inquiry? Fill out the form or email us directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Contact Info Side Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <h2 className="text-xl font-bold text-slate-100 border-b border-slate-900 pb-3">Get in Touch</h2>
          
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 font-semibold block uppercase text-[10px]">Technical Support</span>
              <a href="mailto:support@chameleon.app" className="text-cyan-400 font-mono hover:underline text-sm block">
                support@chameleon.app
              </a>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-semibold block uppercase text-[10px]">Security Vulnerability Disclosure</span>
              <a href="mailto:security@chameleon.app" className="text-cyan-400 font-mono hover:underline text-sm block">
                security@chameleon.app
              </a>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-semibold block uppercase text-[10px]">GitHub Repository</span>
              <a href="https://github.com/Rithvik-krishna/Chameleon" target="_blank" rel="noopener noreferrer" className="text-cyan-400 font-mono hover:underline text-sm block">
                github.com/Rithvik-krishna/Chameleon
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-900 text-xs text-slate-500 space-y-2">
            <p><strong>Response Time:</strong> Technical support inquiries are answered within 24 hours.</p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8">
          {submitted ? (
            <div className="p-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h2 className="text-2xl font-bold text-slate-100">Message Received!</h2>
              <p className="text-xs text-slate-400">Thank you for reaching out. A technical engineer will get back to you shortly.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Technical Support">Technical Support</option>
                  <option value="Enterprise Licensing">Enterprise Licensing</option>
                  <option value="Security Inquiry">Security Inquiry</option>
                  <option value="Feature Request">Feature Request</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Message</label>
                <textarea
                  required
                  rows="5"
                  placeholder="Describe your question or issue in detail..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
