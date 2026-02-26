import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function VideoPlayerModal({ isOpen, onClose, videoUrl, title }) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[85vh] z-[9999] backdrop-blur-2xl bg-black/95 border-white/20">
                <DialogHeader>
                    <DialogTitle className="text-white">{title}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 h-full flex items-center justify-center">
                    <video 
                        src={videoUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain rounded-lg"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}