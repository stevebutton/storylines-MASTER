import React, { useState } from 'react';
import { X, FileEdit, Upload, FileText, Map, MessageSquare } from 'lucide-react';
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

    const handleStartFromScratch = () => {
        navigate(createPageUrl('StoryEditor'));
        onClose();
    };

    const options = [
        {
            id: 'scratch',
            title: 'Start from Scratch',
            description: 'Create a new story with a blank canvas',
            icon: FileEdit,
            isActive: true,
            onClick: handleStartFromScratch
        },
        {
            id: 'upload',
            title: 'Upload an Outline Document',
            description: 'Import your existing outline from a document',
            icon: Upload,
            isActive: false,
            onClick: null
        },
        {
            id: 'template',
            title: 'Start from a Template',
            description: 'Choose from pre-built story templates',
            icon: FileText,
            isActive: false,
            onClick: null
        },
        {
            id: 'map',
            title: 'Import from Map Data',
            description: 'Build a story from geotagged photos or locations',
            icon: Map,
            isActive: true,
            onClick: () => setIsMapDataImportOpen(true)
        },
        {
            id: 'interview',
            title: 'Interview Mode',
            description: 'Let AI guide you through building your story',
            icon: MessageSquare,
            isActive: true,
            onClick: () => setIsInterviewModeOpen(true)
        }
    ];

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
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <p className="text-sm text-slate-600 mb-6">
                                Choose how you'd like to start creating your story. Each option offers a different path to bring your narrative to life—whether you're starting fresh, importing existing content, or letting AI guide your creative process.
                            </p>

                            <div className="space-y-4">
                                {options.map((option) => {
                                    const Icon = option.icon;
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={option.isActive ? option.onClick : undefined}
                                            disabled={!option.isActive}
                                            className={`
                                                w-full p-6 rounded-lg border-2 text-left transition-all
                                                ${option.isActive 
                                                    ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 cursor-pointer' 
                                                    : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                                                }
                                            `}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`
                                                    p-3 rounded-lg 
                                                    ${option.isActive ? 'bg-amber-100' : 'bg-slate-200'}
                                                `}>
                                                    <Icon className={`
                                                        w-6 h-6 
                                                        ${option.isActive ? 'text-amber-600' : 'text-slate-400'}
                                                    `} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className={`
                                                            font-semibold 
                                                            ${option.isActive ? 'text-slate-900' : 'text-slate-500'}
                                                        `}>
                                                            {option.title}
                                                        </h3>
                                                        {!option.isActive && (
                                                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                                                Coming Soon
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`
                                                        text-sm 
                                                        ${option.isActive ? 'text-slate-600' : 'text-slate-400'}
                                                    `}>
                                                        {option.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
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
                onClose={() => {
                    setIsInterviewModeOpen(false);
                    onClose();
                }}
            />

            {/* Map Data Import Panel */}
            <MapDataImportPanel
                isOpen={isMapDataImportOpen}
                onClose={() => {
                    setIsMapDataImportOpen(false);
                    onClose();
                }}
            />
        </AnimatePresence>
    );
}