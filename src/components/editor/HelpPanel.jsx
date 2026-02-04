import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const helpTopics = [
    {
        id: 'overview',
        title: 'Overview',
        content: (
            <>
                <p className="text-slate-600 mb-4">
                    Welcome to your Story Editor. This guide will help you create and manage your interactive stories.
                </p>
                <ul className="text-sm text-slate-600 space-y-2 ml-4">
                    <li>On the left, you'll see your <strong>Story Settings</strong>, followed by a list of your <strong>Chapters</strong> and their <strong>Slides</strong>.</li>
                    <li>The main area on the right is where you'll edit the details of your selected Story, Chapter, or Slide.</li>
                    <li>Above the main area, you'll find the story title, chapter/slide counts, and save/preview buttons.</li>
                </ul>
            </>
        )
    },
    {
        id: 'story-settings',
        title: 'Story Settings',
        content: (
            <>
                <p className="text-slate-600 mb-4">
                    Configure your story's basic information and hero media.
                </p>
                <ul className="text-sm text-slate-600 space-y-2 ml-4">
                    <li>Click on <strong>"Story Settings"</strong> in the left sidebar.</li>
                    <li>In the main editor, you can:
                        <ul className="ml-4 mt-2 space-y-1">
                            <li>Add a <strong>Title</strong>, <strong>Subtitle</strong>, and <strong>Author</strong>.</li>
                            <li>Choose a <strong>Category</strong>.</li>
                            <li>Upload a <strong>Hero Image</strong> or <strong>Hero Video</strong> for your story's introduction.</li>
                            <li>Mark your story as <strong>Published</strong> or allow <strong>Social Media Sharing</strong>.</li>
                        </ul>
                    </li>
                </ul>
            </>
        )
    },
    {
        id: 'chapters',
        title: 'Chapters',
        content: (
            <>
                <p className="text-slate-600 mb-4">
                    Chapters organize your story into major sections with map locations.
                </p>
                <ul className="text-sm text-slate-600 space-y-2 ml-4">
                    <li>To <strong>add a new Chapter</strong>, click the "Add Chapter" button under your Story Settings.</li>
                    <li>To <strong>view or edit a Chapter</strong>, click its name in the left sidebar. Use the small arrow next to a chapter to expand/collapse its slides.</li>
                    <li>Each chapter can have its own map location, style, and animation settings.</li>
                </ul>
            </>
        )
    },
    {
        id: 'slides',
        title: 'Slides',
        content: (
            <>
                <p className="text-slate-600 mb-4">
                    Slides are the individual content pieces within each chapter.
                </p>
                <ul className="text-sm text-slate-600 space-y-2 ml-4">
                    <li>To <strong>add a new Slide</strong> to a Chapter, first click on that Chapter in the sidebar, then click "Add Slide to Chapter" in the main editor.</li>
                    <li>To <strong>view or edit a Slide</strong>, click its name in the left sidebar.</li>
                    <li>Slides can include text, images, videos, and PDFs.</li>
                </ul>
            </>
        )
    },
    {
        id: 'content',
        title: 'Content',
        content: (
            <>
                <p className="text-slate-600 mb-4">
                    Edit the text and narrative content for your chapters and slides.
                </p>
                <ul className="text-sm text-slate-600 space-y-2 ml-4">
                    <li>Use the <strong>Content</strong> tab to edit titles and descriptions.</li>
                    <li>Add location names to provide context for your readers.</li>
                    <li>Keep your content concise and engaging for the best storytelling experience.</li>
                </ul>
            </>
        )
    },
    {
        id: 'location',
        title: 'Location',
        content: (
            <>
                <p className="text-slate-600 mb-4">
                    Set precise map views for your chapters and slides.
                </p>
                <ul className="text-sm text-slate-600 space-y-2 ml-4">
                    <li>Use the <strong>Location</strong> tab to access the interactive map.</li>
                    <li>Navigate to your desired map view (pan, zoom, rotate, tilt).</li>
                    <li>Click <strong>"Capture Current View"</strong> to save the map's current position, zoom, pitch, and bearing.</li>
                    <li>This map view will be shown when readers reach this part of your story.</li>
                </ul>
            </>
        )
    },
    {
        id: 'media',
        title: 'Media',
        content: (
            <>
                <p className="text-slate-600 mb-4">
                    Upload and manage images, videos, and documents for your slides.
                </p>
                <ul className="text-sm text-slate-600 space-y-2 ml-4">
                    <li>Use the <strong>Media</strong> tab (available for Slides) to upload content.</li>
                    <li>Upload <strong>Images</strong> to show alongside your slide text.</li>
                    <li>Add <strong>Videos</strong> (with optional thumbnail) for richer storytelling.</li>
                    <li>Attach <strong>PDF documents</strong> for additional resources.</li>
                </ul>
            </>
        )
    },
    {
        id: 'settings',
        title: 'Settings',
        content: (
            <>
                <p className="text-slate-600 mb-4">
                    Customize the visual appearance and behavior of your chapters.
                </p>
                <ul className="text-sm text-slate-600 space-y-2 ml-4">
                    <li>Use the <strong>Settings</strong> tab (available for Chapters) to adjust:
                        <ul className="ml-4 mt-2 space-y-1">
                            <li><strong>Map Style</strong>: Choose from light, dark, satellite, watercolor, or terrain.</li>
                            <li><strong>Card Alignment</strong>: Position your content card left, right, or center.</li>
                            <li><strong>Animation Duration</strong>: Control how long the map takes to fly to the next location.</li>
                        </ul>
                    </li>
                </ul>
            </>
        )
    },
    {
        id: 'save-preview',
        title: 'Save & Preview',
        content: (
            <>
                <p className="text-slate-600 mb-4">
                    Save your work and preview your story as readers will see it.
                </p>
                <ul className="text-sm text-slate-600 space-y-2 ml-4">
                    <li>Always click the <strong>"Save"</strong> button in the top right to save your changes.</li>
                    <li>Click the <strong>"Preview"</strong> button (next to Save) to see how your story looks to readers.</li>
                    <li>Preview opens in a new tab so you can keep editing while you review.</li>
                </ul>
            </>
        )
    }
];

export default function HelpPanel({ isOpen, onClose }) {
    const [activeTopic, setActiveTopic] = useState('overview');

    const activeContent = helpTopics.find(topic => topic.id === activeTopic);

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
                        className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-2xl z-[70] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold text-slate-900">How to Use the Story Editor</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Horizontal Menu */}
                        <div className="border-b bg-slate-50 px-6 py-3 overflow-x-auto">
                            <div className="flex gap-2">
                                {helpTopics.map(topic => (
                                    <Button
                                        key={topic.id}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setActiveTopic(topic.id)}
                                        className={cn(
                                            "whitespace-nowrap",
                                            activeTopic === topic.id
                                                ? "bg-white text-amber-600 hover:bg-white hover:text-amber-700 shadow-sm"
                                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                        )}
                                    >
                                        {topic.title}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="prose prose-slate max-w-none">
                                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                    {activeContent?.title}
                                </h3>
                                {activeContent?.content}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}