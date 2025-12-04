import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StoryFooter({ onRestart }) {
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