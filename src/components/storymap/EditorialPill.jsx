import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Library, Pencil } from 'lucide-react';
import { pillShell, pillBtn, pillDivider } from './StoryViewPill';

/**
 * EditorialPill — fixed bottom-right, constant across all story views.
 *
 * Contains story-level editorial actions that don't change by view context:
 *   More stories / Library / Edit story
 *
 * Appears when the story has loaded (controlled by isVisible).
 */
export default function EditorialPill({
    isVisible = false,
    onViewOtherStories,
    onOpenLibrary,
    onEditStory,
}) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="fixed bottom-6 right-6 z-[100020] pointer-events-auto"
                >
                    <div className={pillShell}>
                        <button onClick={onViewOtherStories} className={pillBtn} title="More stories">
                            <BookOpen className="w-4 h-4" />
                        </button>
                        {pillDivider}
                        <button onClick={onOpenLibrary} className={pillBtn} title="Library">
                            <Library className="w-4 h-4" />
                        </button>
                        <button onClick={onEditStory} className={pillBtn} title="Edit story">
                            <Pencil className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
