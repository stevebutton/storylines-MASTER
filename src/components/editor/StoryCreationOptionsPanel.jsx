import React, { useState } from 'react';
import { X, FileEdit, Upload, FileText, Map, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import InterviewModePanel from './InterviewModePanel';
import MapDataImportPanel from './MapDataImportPanel';
import DocumentUploadPanel from './DocumentUploadPanel';

export default function StoryCreationOptionsPanel({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [isInterviewModeOpen, setIsInterviewModeOpen] = useState(false);
    const [isMapDataImportOpen, setIsMapDataImportOpen] = useState(false);
    const [isDocumentUploadOpen, setIsDocumentUploadOpen] = useState(false);

    const handleStartFromScratch = () => {
        navigate(createPageUrl('StoryEditor'));
        onClose();
    };

    const options = [
        {
            id: 'scratch',
            title: 'Start from Scratch',
            description: 'Build your project narrative from the ground up with complete creative control',
            icon: FileEdit,
            isActive: true,
            onClick: handleStartFromScratch
        },
        {
            id: 'upload',
            title: 'Upload an Outline Document',
            description: 'Transform existing project documentation or reports into an interactive narrative',
            icon: Upload,
            isActive: true,
            onClick: () => setIsDocumentUploadOpen(true)
        },
        {
            id: 'template',
            title: 'Start from a Template',
            description: 'Leverage pre-structured frameworks designed for impact reporting and case studies',
            icon: FileText,
            isActive: false,
            onClick: null
        },
        {
            id: 'map',
            title: 'Import from Map Data',
            description: 'Generate location-based narratives from field documentation and geotagged media',
            icon: Map,
            isActive: true,
            onClick: () => setIsMapDataImportOpen(true)
        },
        {
            id: 'interview',
            title: 'Interview Mode',
            description: 'Use AI-guided prompts to structure your project story systematically',
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
                                Select your preferred approach to creating an interactive project narrative. Each method is designed to accommodate different workflows—from developing new content to leveraging existing documentation and field data.
                            </p>

                            <div className="space-y-4">
                                {options.map((option) => {
                                    const Icon = option.icon;
                                    const colors = {
                                        scratch: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', icon: 'text-blue-600', text: 'text-blue-700' },
                                        upload: { bg: 'bg-green-50', hover: 'hover:bg-green-100', icon: 'text-green-600', text: 'text-green-700' },
                                        template: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', icon: 'text-purple-600', text: 'text-purple-700' },
                                        map: { bg: 'bg-amber-50', hover: 'hover:bg-amber-100', icon: 'text-amber-600', text: 'text-amber-700' },
                                        interview: { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', icon: 'text-indigo-600', text: 'text-indigo-700' }
                                    };
                                    const colorSet = colors[option.id];
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={option.isActive ? option.onClick : undefined}
                                            disabled={!option.isActive}
                                            className={`
                                                w-full rounded-lg text-left transition-all
                                                ${option.isActive 
                                                    ? `${colorSet.bg} ${colorSet.hover} cursor-pointer` 
                                                    : 'bg-slate-100 opacity-50 cursor-not-allowed'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-4 p-4">
                                                <div className="flex flex-col items-center justify-center p-3">
                                                    <Icon className={`
                                                        w-8 h-8 
                                                        ${option.isActive ? colorSet.icon : 'text-slate-400'}
                                                    `} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className={`
                                                            text-lg font-semibold 
                                                            ${option.isActive ? colorSet.text : 'text-slate-500'}
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
                onClose={() => setIsInterviewModeOpen(false)}
            />

            {/* Map Data Import Panel */}
            <MapDataImportPanel
                isOpen={isMapDataImportOpen}
                onClose={() => setIsMapDataImportOpen(false)}
            />

            {/* Document Upload Panel */}
            <DocumentUploadPanel
                isOpen={isDocumentUploadOpen}
                onClose={() => setIsDocumentUploadOpen(false)}
            />
        </AnimatePresence>
    );
}