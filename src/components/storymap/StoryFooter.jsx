import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

const stripHtml = (str) => str ? str.replace(/<[^>]*>/g, '') : str;

export default function StoryFooter({ onRestart, relatedStories = [], currentCategory }) {
    return (
        <div className="min-h-screen flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent z-10" />

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

                <Button
                    onClick={onRestart}
                    variant="outline"
                    className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:border-white/50 gap-2 mb-8"
                >
                    <ArrowUp className="w-4 h-4" />
                    Back to Beginning
                </Button>

                <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
                    End
                </h2>

                <p className="text-white/70 mb-8">
                    Thank you for exploring this story
                </p>

                {/* Related Stories */}
                {relatedStories.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        viewport={{ once: false }}
                        className="mt-12"
                    >
                        <h3 className="text-xl font-light text-white/80 mb-6">
                            More {currentCategory} Stories
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {relatedStories.map((relatedStory) => (
                                <div
                                    key={relatedStory.id}
                                    onClick={() => window.location.href = `${createPageUrl('StoryMapView')}?id=${relatedStory.id}`}
                                    className="group cursor-pointer"
                                >
                                    <motion.div
                                        whileHover={{ y: -4 }}
                                        className="relative h-60 rounded-lg overflow-hidden shadow-lg"
                                    >
                                        <img
                                            src={relatedStory.hero_image}
                                            alt={stripHtml(relatedStory.title)}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <h4 className="text-white font-medium text-lg mb-1">
                                                {stripHtml(relatedStory.title)}
                                            </h4>
                                            {relatedStory.subtitle && (
                                                <p className="text-white/70 text-sm">
                                                    {stripHtml(relatedStory.subtitle)}
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
