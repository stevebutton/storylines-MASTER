import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function StoryFooter({ onRestart, onViewOtherStories, storyId }) {
    return (
        <div className="min-h-screen flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent z-10" />
            
            {/* Footer Navigation Buttons */}
            <div className="fixed bottom-8 left-8 z-30 flex items-center gap-12">
                <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/55fddbe88_Menubutton.png"
                    alt="Menu"
                    width="50"
                    height="100"
                    className="opacity-0 pointer-events-none"
                />
                
                {onViewOtherStories && (
                    <button
                        onClick={onViewOtherStories}
                        className="opacity-30 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                    >
                        <img 
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/250f728a2_MoreStories.png"
                            alt="More Stories"
                            width="50"
                            height="100"
                        />
                    </button>
                )}

                {storyId && (
                    <Link
                        to={`${createPageUrl('StoryEditor')}?id=${storyId}`}
                        className="opacity-30 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                    >
                        <img 
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/44e8e4095_EditStory.png"
                            alt="Edit Story"
                            width="50"
                            height="100"
                        />
                    </Link>
                )}
            </div>
            
            <motion.div 
                className="relative z-20 text-center px-6 max-w-2xl pointer-events-auto"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1 }}
                viewport={{ once: false }}
            >
                {/* Decorative */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="w-16 h-px bg-white/30" />
                    <div className="w-3 h-3 rounded-full border-2 border-amber-500" />
                    <div className="w-16 h-px bg-white/30" />
                </div>
                
                <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
                    The End
                </h2>
                
                <p className="text-white/70 mb-8">
                    Thank you for exploring this story with us.
                </p>
                
                <Button
                    onClick={onRestart}
                    variant="outline"
                    className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:border-white/50 gap-2"
                >
                    <ArrowUp className="w-4 h-4" />
                    Back to Beginning
                </Button>
            </motion.div>
        </div>
    );
}