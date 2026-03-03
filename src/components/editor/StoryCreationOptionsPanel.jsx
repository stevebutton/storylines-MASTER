import React, { useState } from 'react';
import { X, FileEdit, Images, Map, MessageSquare, Smartphone, ChevronRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import InterviewModePanel from './InterviewModePanel';
import MapDataImportPanel from './MapDataImportPanel';

export default function StoryCreationOptionsPanel({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [isInterviewModeOpen, setIsInterviewModeOpen] = useState(false);
    const [isMapDataImportOpen, setIsMapDataImportOpen] = useState(false);
    const [storyboarderExpanded, setStoryboarderExpanded] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');
    const [emailSent, setEmailSent] = useState(false);

    const handleStartFromScratch = () => {
        navigate(createPageUrl('StoryEditor'));
        onClose();
    };

    const handleSendEmail = () => {
        if (!emailAddress.trim()) return;
        const url = `${window.location.origin}${createPageUrl('Storyboarder')}`;
        const subject = encodeURIComponent('Your Storyboarder link');
        const body = encodeURIComponent(
            `Open this link on your mobile device to start capturing your story:\n\n${url}\n\nStoryboarder lets you capture chapters, photos, voice descriptions, and GPS locations in the field — ready to finish in the Storylines Story Editor.`
        );
        window.location.href = `mailto:${emailAddress.trim()}?subject=${subject}&body=${body}`;
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
    };

    const options = [
        {
            id: 'scratch',
            title: 'Start from Scratch',
            description: 'Build your story from the ground up with complete creative control',
            icon: FileEdit,
            isActive: true,
            onClick: handleStartFromScratch
        },
        {
            id: 'map',
            title: 'Build a Story from Your Photographs',
            description: 'Import a folder of photos and let Storylines build a location-based narrative from your geotagged images',
            icon: Images,
            isActive: true,
            onClick: () => setIsMapDataImportOpen(true)
        },
        {
            id: 'interview',
            title: 'Interview Mode',
            description: 'Use AI-guided prompts to structure your story systematically',
            icon: MessageSquare,
            isActive: true,
            onClick: () => setIsInterviewModeOpen(true)
        },
        {
            id: 'storyboarder',
            title: 'Storyboarder',
            description: 'Capture in the field, finish in the Story Editor — a mobile-first tool for collaborative field storytelling',
            icon: Smartphone,
            isActive: true,
            onClick: () => setStoryboarderExpanded(v => !v)
        }
    ];

    const colors = {
        scratch:      { bg: 'bg-blue-50',   hover: 'hover:bg-blue-100',   icon: 'text-blue-600',   text: 'text-blue-700'   },
        map:          { bg: 'bg-amber-50',   hover: 'hover:bg-amber-100',  icon: 'text-amber-600',  text: 'text-amber-700'  },
        interview:    { bg: 'bg-indigo-50',  hover: 'hover:bg-indigo-100', icon: 'text-indigo-600', text: 'text-indigo-700' },
        storyboarder: { bg: 'bg-orange-50',  hover: 'hover:bg-orange-100', icon: 'text-orange-600', text: 'text-orange-700' }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 z-[60]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-[60vw] bg-white shadow-2xl z-[70] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-4xl font-bold text-slate-800">Create a New Story</h2>
                            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-slate-100">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <p className="text-sm text-slate-600 mb-6">
                                Choose how you want to start. Each method is designed for a different workflow — from building in the editor to capturing on location.
                            </p>

                            <div className="space-y-4">
                                {options.map((option) => {
                                    const Icon = option.icon;
                                    const colorSet = colors[option.id];
                                    return (
                                        <div key={option.id}
                                            className={`w-full rounded-lg text-left overflow-hidden ${colorSet.bg}`}
                                        >
                                            <button
                                                onClick={option.onClick}
                                                className={`w-full text-left ${colorSet.hover} transition-colors`}
                                            >
                                                <div className="flex items-center gap-4 p-4">
                                                    <div className="p-3">
                                                        <Icon className={`w-8 h-8 ${colorSet.icon}`} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className={`text-lg font-semibold mb-1 ${colorSet.text}`}>
                                                            {option.title}
                                                        </h3>
                                                        <p className="text-sm text-slate-600">
                                                            {option.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* ── Storyboarder expanded detail ── */}
                                            {option.id === 'storyboarder' && storyboarderExpanded && (
                                                <div className="px-5 pb-6 border-t border-orange-200">

                                                    {/* Concept */}
                                                    <p className="mt-4 text-sm text-slate-700 leading-relaxed">
                                                        Storyboarder is a mobile capture tool for teams working in the field. One person captures — voice notes, photos, GPS — while another finishes the story in the desktop Story Editor. Everything syncs in real time, so the editor can be working while the field team is still shooting.
                                                    </p>

                                                    {/* Steps */}
                                                    <ol className="mt-4 space-y-2.5 text-sm text-slate-700">
                                                        <li className="flex gap-3">
                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-semibold">1</span>
                                                            <span><strong>Name your story</strong> — say the title into the mic when prompted.</span>
                                                        </li>
                                                        <li className="flex gap-3">
                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-semibold">2</span>
                                                            <span><strong>Name your first chapter</strong> — speak the chapter name to begin.</span>
                                                        </li>
                                                        <li className="flex gap-3">
                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-semibold">3</span>
                                                            <span><strong>Take photos</strong> — each photo saves instantly with your GPS location.</span>
                                                        </li>
                                                        <li className="flex gap-3">
                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-semibold">4</span>
                                                            <span><strong>Record descriptions</strong> — voice note after each shot to brief the editor (optional).</span>
                                                        </li>
                                                        <li className="flex gap-3">
                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-semibold">5</span>
                                                            <span><strong>Finish in Story Editor</strong> — content appears in the desktop editor as it's captured, ready to edit, sequence, and publish.</span>
                                                        </li>
                                                    </ol>

                                                    {/* Actions row */}
                                                    <div className="mt-5 flex flex-col gap-3">

                                                        {/* Open on this device */}
                                                        <button
                                                            onClick={() => { navigate(createPageUrl('Storyboarder')); onClose(); }}
                                                            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition-colors w-fit"
                                                        >
                                                            Open Storyboarder <ChevronRight className="w-4 h-4" />
                                                        </button>

                                                        {/* Send to mobile */}
                                                        <div>
                                                            <p className="text-xs text-slate-500 mb-2">Or send the link to your phone:</p>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="email"
                                                                    value={emailAddress}
                                                                    onChange={(e) => setEmailAddress(e.target.value)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
                                                                    placeholder="your@email.com"
                                                                    className="flex-1 px-4 py-2.5 rounded-xl border border-orange-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 transition-colors"
                                                                />
                                                                <button
                                                                    onClick={handleSendEmail}
                                                                    disabled={!emailAddress.trim()}
                                                                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-100 hover:bg-orange-200 disabled:opacity-40 text-orange-700 text-sm font-semibold rounded-xl transition-colors border border-orange-200 flex-shrink-0"
                                                                >
                                                                    <Mail className="w-4 h-4" />
                                                                    {emailSent ? 'Sent!' : 'Send'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}

            {/* Interview Mode Panel */}
            <InterviewModePanel
                isOpen={isInterviewModeOpen}
                onClose={() => setIsInterviewModeOpen(false)}
            />

            {/* Map / Photo Import Panel */}
            <MapDataImportPanel
                isOpen={isMapDataImportOpen}
                onClose={() => setIsMapDataImportOpen(false)}
            />
        </AnimatePresence>
    );
}
