import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Mail } from 'lucide-react';

export default function AboutPanel({ isOpen, onClose, story }) {
    if (!story) return null;

    const {
        about_org_name,
        about_logo_url,
        about_who_we_are,
        about_what_we_do,
        about_website,
        about_email,
    } = story;

    const hasContent = about_org_name || about_who_we_are || about_what_we_do;
    if (!hasContent) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Blur backdrop */}
                    <motion.div
                        className="fixed inset-x-0 bottom-0 z-[200009]"
                        style={{ top: 100 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                        onClick={onClose}
                    >
                        <div className="w-full h-full backdrop-blur-xl" style={{ background: 'rgba(0,0,0,0.45)' }} />
                    </motion.div>

                    {/* Panel */}
                    <motion.div
                        className="fixed inset-x-0 bottom-0 z-[200010] flex items-center justify-center pointer-events-none"
                        style={{ top: 100 }}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
                    >
                        <div
                            className="relative rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
                            style={{
                                width: 'calc(100% - 100px)',
                                maxWidth: 900,
                                maxHeight: 'calc(100vh - 160px)',
                                background: 'rgba(0,0,0,0.30)',
                                border: '1px solid rgba(255,255,255,1)',
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                <span className="text-lg font-semibold text-white tracking-wide">About</span>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body — two columns */}
                            <div className="flex overflow-hidden" style={{ maxHeight: 'calc(100vh - 240px)' }}>

                                {/* Left column — identity + links */}
                                <div
                                    className="flex-shrink-0 flex flex-col gap-6 px-8 py-7"
                                    style={{ width: 240, borderRight: '1px solid rgba(255,255,255,0.2)' }}
                                >
                                    {about_logo_url && (
                                        <img
                                            src={about_logo_url}
                                            alt={about_org_name || 'Organisation'}
                                            className="w-full object-contain"
                                            style={{ maxHeight: 80 }}
                                        />
                                    )}

                                    {about_org_name && (
                                        <p className="text-base font-semibold text-white leading-snug">
                                            {about_org_name}
                                        </p>
                                    )}

                                    {(about_website || about_email) && (
                                        <div className="flex flex-col gap-3 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                                            {about_website && (
                                                <a
                                                    href={about_website.startsWith('http') ? about_website : `https://${about_website}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
                                                >
                                                    <Globe className="w-4 h-4 flex-shrink-0" />
                                                    <span className="truncate">{about_website.replace(/^https?:\/\//, '')}</span>
                                                </a>
                                            )}
                                            {about_email && (
                                                <a
                                                    href={`mailto:${about_email}`}
                                                    className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
                                                >
                                                    <Mail className="w-4 h-4 flex-shrink-0" />
                                                    <span className="truncate">{about_email}</span>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right column — content */}
                                <div className="flex-1 overflow-y-auto px-8 py-7 space-y-8">
                                    {about_who_we_are && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-3">
                                                Who We Are
                                            </h3>
                                            <div
                                                className="prose prose-invert prose-sm max-w-none [&_*]:!text-white [&_a]:!text-white/80 leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: about_who_we_are }}
                                            />
                                        </div>
                                    )}
                                    {about_what_we_do && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-3">
                                                What We Do
                                            </h3>
                                            <div
                                                className="prose prose-invert prose-sm max-w-none [&_*]:!text-white [&_a]:!text-white/80 leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: about_what_we_do }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
