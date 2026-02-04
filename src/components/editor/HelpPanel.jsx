import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function HelpPanel({ isOpen, onClose }) {
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
                        className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-[70] flex flex-col"
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

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="prose prose-slate max-w-none">
                                <p className="text-slate-600 mb-6">
                                    Welcome to your Story Editor. This guide will help you create and manage your interactive stories.
                                </p>

                                <div className="space-y-6">
                                    <section>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">1. Story Content</h3>
                                        <ul className="text-sm text-slate-600 space-y-1 ml-4">
                                            <li>On the left, you'll see your <strong>Story Settings</strong>, followed by a list of your <strong>Chapters</strong> and their <strong>Slides</strong>.</li>
                                            <li>The main area on the right is where you'll edit the details of your selected Story, Chapter, or Slide.</li>
                                            <li>Above the main area, you'll find the story title, chapter/slide counts, and save/preview buttons.</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">2. Edit Story Settings</h3>
                                        <ul className="text-sm text-slate-600 space-y-1 ml-4">
                                            <li>Click on <strong>"Story Settings"</strong> in the left sidebar.</li>
                                            <li>In the main editor, you can:
                                                <ul className="ml-4 mt-1 space-y-1">
                                                    <li>Add a <strong>Title</strong>, <strong>Subtitle</strong>, and <strong>Author</strong>.</li>
                                                    <li>Choose a <strong>Category</strong>.</li>
                                                    <li>Upload a <strong>Hero Image</strong> or <strong>Hero Video</strong> for your story's introduction.</li>
                                                    <li>Mark your story as <strong>Published</strong> or allow <strong>Social Media Sharing</strong>.</li>
                                                </ul>
                                            </li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">3. Manage Chapters</h3>
                                        <ul className="text-sm text-slate-600 space-y-1 ml-4">
                                            <li>To <strong>add a new Chapter</strong>, click the "Add Chapter" button under your Story Settings.</li>
                                            <li>To <strong>view or edit a Chapter</strong>, click its name in the left sidebar. Use the small arrow next to a chapter to expand/collapse its slides.</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">4. Manage Slides</h3>
                                        <ul className="text-sm text-slate-600 space-y-1 ml-4">
                                            <li>To <strong>add a new Slide</strong> to a Chapter, first click on that Chapter in the sidebar, then click "Add Slide to Chapter" in the main editor.</li>
                                            <li>To <strong>view or edit a Slide</strong>, click its name in the left sidebar.</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">5. Edit Content (Chapters & Slides)</h3>
                                        <p className="text-sm text-slate-600 mb-2">
                                            Once you've selected a Chapter or Slide, the main editor will show different tabs:
                                        </p>
                                        <ul className="text-sm text-slate-600 space-y-1 ml-4">
                                            <li><strong>Content</strong>: Edit text, titles, and descriptions.</li>
                                            <li><strong>Location</strong>: Use the interactive map to set the exact map view (latitude, longitude, zoom, pitch, bearing) for this part of your story. Click "Capture Current View" to save the map's current settings.</li>
                                            <li><strong>Media</strong> (for Slides): Upload images, videos, or PDF documents.</li>
                                            <li><strong>Settings</strong> (for Chapters): Adjust map style, card alignment, and animation duration.</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">6. Save & Preview</h3>
                                        <ul className="text-sm text-slate-600 space-y-1 ml-4">
                                            <li>Always click the <strong>"Save"</strong> button in the top right to save your changes.</li>
                                            <li>Click the <strong>"Preview"</strong> button (next to Save) to see how your story looks to readers.</li>
                                        </ul>
                                    </section>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}