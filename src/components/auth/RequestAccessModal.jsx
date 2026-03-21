import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle } from 'lucide-react';

const HOW_HEARD_OPTIONS = [
  'Colleague or partner',
  'Social media',
  'Web search',
  'Conference or event',
  'NGO / sector network',
  'Other',
];

const inputClass = [
  'w-full px-3 py-2.5',
  'border border-white/20 rounded-lg',
  'text-white placeholder-white/30',
  'focus:outline-none focus:border-white/50',
  'transition-colors text-sm',
  'bg-white/10',
].join(' ');

const labelClass = 'block text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wider';

export default function RequestAccessModal({ isOpen, onClose, ctaText = 'Request Access' }) {
  const [form, setForm] = useState({
    name: '', email: '', organisation: '', role: '', how_heard: '', message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [error, setError]               = useState('');

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/request-access', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Submission failed');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset after exit animation
    setTimeout(() => { setSubmitted(false); setError(''); setForm({ name: '', email: '', organisation: '', role: '', how_heard: '', message: '' }); }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[300000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ fontFamily: 'Raleway, sans-serif' }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            className="relative z-10 w-full max-w-md bg-black/75 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={   { opacity: 0, y: 12,  scale: 0.97 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <div className="flex flex-col items-center text-center py-6 gap-4">
                <CheckCircle className="w-12 h-12 text-amber-400" />
                <h2 className="text-white text-xl font-light">Request received</h2>
                <p className="text-white/60 text-sm leading-relaxed">
                  Thank you. We'll review your request and be in touch shortly.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-4 px-6 py-2.5 bg-amber-600/80 hover:bg-amber-600 text-white text-sm uppercase tracking-widest rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-0 mb-1">
                  <img
                    src="https://uevxdwzgkodbkzludrni.supabase.co/storage/v1/object/public/media/755f1936001f45de86c469cc-LogoCenteredWhite.png"
                    alt="Storylines"
                    width={200}
                    height={80}
                    className="object-contain opacity-90 flex-shrink-0"
                  />
                  <h2 className="text-white text-xl font-light">{ctaText}</h2>
                </div>
                <p className="text-white/50 text-sm mb-6">
                  Tell us about yourself and we'll be in touch.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Name *</label>
                      <input required value={form.name} onChange={set('name')} placeholder="Your name" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Email *</label>
                      <input required type="email" value={form.email} onChange={set('email')} placeholder="you@org.com" className={inputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Organisation</label>
                      <input value={form.organisation} onChange={set('organisation')} placeholder="Your organisation" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Role / Title</label>
                      <input value={form.role} onChange={set('role')} placeholder="Your role" className={inputClass} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>How did you hear about us?</label>
                    <select
                      value={form.how_heard}
                      onChange={set('how_heard')}
                      className={`${inputClass} appearance-none`}
                      style={{ WebkitAppearance: 'none' }}
                    >
                      <option value="" className="bg-slate-900">Select…</option>
                      {HOW_HEARD_OPTIONS.map(opt => (
                        <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Message</label>
                    <textarea
                      value={form.message}
                      onChange={set('message')}
                      placeholder="Tell us about your use case…"
                      rows={3}
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 px-4 py-2.5 rounded-lg">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-amber-600/80 hover:bg-amber-600 disabled:bg-amber-600/40 text-white font-medium transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-widest rounded-xl mt-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSubmitting ? 'Sending…' : 'Send Request'}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
