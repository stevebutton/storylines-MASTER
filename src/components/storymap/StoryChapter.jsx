import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ChapterCarousel from './ChapterCarousel';
import { FileText, Play, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PdfViewer from '@/components/pdf/PdfViewer';
import VideoPlayerModal from './VideoPlayerModal';

export default function StoryChapter({ 
    chapter, 
    isActive, 
    alignment = 'left',
    index,
    onSlideChange,
    delay = 0
}) {
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const currentSlide = chapter.slides?.[activeSlideIndex] || chapter.slides?.[0];
    
    console.log("Current Slide for debugging:", currentSlide);

    const handleSlideChange = (slideIndex) => {
        setActiveSlideIndex(slideIndex);
        const slide = chapter.slides?.[slideIndex];
        if (slide && onSlideChange) {
            onSlideChange(slide);
        }
    };

    const cardStyle = currentSlide?.card_style || 'default';

    // Full Background Style
    if (cardStyle === 'full_background') {
        return (
            <div 
                className="flex items-center py-24 px-4 md:px-8 pr-24 justify-end pointer-events-none"
                style={{ minHeight: '75vh', paddingTop: '140px' }}
            >
                <motion.div
                    initial={index === 0 ? { opacity: 0, x: 100 } : { opacity: 0, y: 40 }}
                    whileInView={index === 0 ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }}
                    transition={index === 0 ? { duration: 4, ease: "easeOut", delay: delay / 1000 } : { duration: 0.8, ease: "easeOut" }}
                    viewport={{ once: false, amount: 0.5 }}
                    className="relative w-1/2 min-w-[300px]"
                >
                    {/* Full Background Card */}
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl pointer-events-auto" style={{ minHeight: '500px' }}>
                        {/* Background Image */}
                        {currentSlide?.background_image && (
                            <div 
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${currentSlide.background_image})` }}
                            />
                        )}
                        
                        {/* 50% Overlay */}
                        <div className="absolute inset-0 bg-black/50" />
                        
                        {/* Content */}
                        <div className="relative z-10 p-6 md:p-8 flex flex-col h-full justify-center">
                            {/* Chapter number */}
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-xs font-medium tracking-[0.2em] uppercase text-amber-400">
                                    Chapter {String(index + 1).padStart(2, '0')}
                                </span>
                                <div className="flex-1 h-px bg-gradient-to-r from-amber-400/50 to-transparent" />
                            </div>
                            
                            {/* Video or Image Carousel */}
                            {currentSlide?.video_url ? (
                                <div className="mb-6 relative">
                                    {!isVideoPlaying && currentSlide.video_thumbnail_url ? (
                                        <div 
                                            className="relative cursor-pointer group"
                                            onClick={() => setIsVideoPlaying(true)}
                                        >
                                            <img 
                                                src={currentSlide.video_thumbnail_url}
                                                alt="Video thumbnail"
                                                className="w-full h-64 object-cover rounded-lg"
                                            />
                                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors rounded-lg flex items-center justify-center">
                                                <Play className="w-16 h-16 text-white" fill="white" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <video 
                                                src={currentSlide.video_url}
                                                controls
                                                autoPlay={isVideoPlaying}
                                                className="w-full h-64 object-cover rounded-lg"
                                            />
                                            <button
                                                onClick={() => setShowVideoModal(true)}
                                                className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
                                            >
                                                <Maximize2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : chapter.slides && chapter.slides.length > 0 && (
                                <div className="mb-6">
                                    <ChapterCarousel 
                                        slides={chapter.slides} 
                                        onSlideChange={handleSlideChange}
                                    />
                                </div>
                            )}
                            
                            {/* Title - animated */}
                            <AnimatePresence mode="wait">
                                <motion.h2 
                                    key={currentSlide?.title}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-2xl md:text-3xl font-light text-white mb-4 leading-tight"
                                >
                                    {currentSlide?.title}
                                </motion.h2>
                            </AnimatePresence>
                            
                            {/* Description - animated */}
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={currentSlide?.description}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                    className="text-white/90 leading-relaxed text-sm md:text-base prose prose-sm max-w-none prose-invert"
                                    dangerouslySetInnerHTML={{ __html: currentSlide?.description || '' }}
                                />
                            </AnimatePresence>
                            
                            {/* Location & PDF */}
                            {(currentSlide?.location || currentSlide?.pdf_url) && (
                                <div className="mt-6 pt-4 border-t border-white/20 flex flex-col items-start gap-3 w-full">
                                    {currentSlide?.location && (
                                        <div className="flex items-center gap-2 text-xs text-white/80">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="font-medium">{currentSlide.location}</span>
                                        </div>
                                    )}

                                    {currentSlide?.pdf_url && (
                                        <div className="w-full">
                                            <h4 className="text-xs font-medium text-white/70 mb-2 uppercase tracking-wider">Related Documents</h4>
                                            <button
                                                onClick={() => setShowPdfModal(true)}
                                                className="flex items-center gap-2 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                                            >
                                                <FileText className="w-4 h-4" />
                                                <span>{decodeURIComponent(currentSlide.pdf_url.split('/').pop().split('?')[0]).replace(/^[^_]+_/, '').replace(/\.pdf$/i, '')}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* PDF Modal */}
                <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
                    <DialogContent className="max-w-4xl h-[90vh] z-[9999] backdrop-blur-2xl bg-white/80 border-white/30">
                        <DialogHeader>
                            <DialogTitle>{currentSlide?.title} - Document</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 h-full overflow-hidden">
                            <PdfViewer url={currentSlide?.pdf_url} />
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Video Modal */}
                <VideoPlayerModal
                    isOpen={showVideoModal}
                    onClose={() => setShowVideoModal(false)}
                    videoUrl={currentSlide?.video_url}
                    title={currentSlide?.title}
                />
            </div>
        );
    }

    // Default Style
    return (
        <div 
            className="flex items-center py-24 px-4 md:px-8 pr-24 justify-end pointer-events-none"
            style={{ minHeight: '75vh', paddingTop: '140px' }}
        >
            <motion.div
                initial={index === 0 ? { opacity: 0, x: 100 } : { opacity: 0, y: 40 }}
                whileInView={index === 0 ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }}
                transition={index === 0 ? { duration: 4, ease: "easeOut", delay: delay / 1000 } : { duration: 0.8, ease: "easeOut" }}
                viewport={{ once: false, amount: 0.5 }}
                className="relative w-1/2 min-w-[300px]"
            >
                {/* Card */}
                <div className={cn(
                    "backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl pointer-events-auto",
                    "bg-white/90 dark:bg-slate-900/90",
                    "border border-white/20"
                )}>
                    {/* Video or Image Carousel */}
                    {currentSlide?.video_url ? (
                        <div className="relative">
                            {!isVideoPlaying && currentSlide.video_thumbnail_url ? (
                                <div 
                                    className="relative cursor-pointer group h-64"
                                    onClick={() => setIsVideoPlaying(true)}
                                >
                                    <img 
                                        src={currentSlide.video_thumbnail_url}
                                        alt="Video thumbnail"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                        <Play className="w-16 h-16 text-white" fill="white" />
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <video 
                                        src={currentSlide.video_url}
                                        controls
                                        autoPlay={isVideoPlaying}
                                        className="w-full h-64 object-cover"
                                    />
                                    <button
                                        onClick={() => setShowVideoModal(true)}
                                        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : chapter.slides && chapter.slides.length > 0 && (
                        <ChapterCarousel 
                            slides={chapter.slides} 
                            onSlideChange={handleSlideChange}
                        />
                    )}
                    
                    {/* Content */}
                    <div className="p-6 md:p-8">
                        {/* Chapter number */}
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xs font-medium tracking-[0.2em] uppercase text-amber-600">
                                Chapter {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-amber-600/50 to-transparent" />
                        </div>
                        
                        {/* Title - animated */}
                        <AnimatePresence mode="wait">
                            <motion.h2 
                                key={currentSlide?.title}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="text-2xl md:text-3xl font-light text-slate-800 mb-4 leading-tight"
                            >
                                {currentSlide?.title}
                            </motion.h2>
                        </AnimatePresence>
                        
                        {/* Description - animated */}
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={currentSlide?.description}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                                className="text-slate-600 leading-relaxed text-sm md:text-base prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: currentSlide?.description || '' }}
                            />
                        </AnimatePresence>
                        
                        {/* Location & PDF */}
                        {(currentSlide?.location || currentSlide?.pdf_url) && (
                            <div className="mt-6 pt-4 border-t border-slate-200/50 flex flex-col items-start gap-3 w-full">
                                {currentSlide?.location && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="font-medium">{currentSlide.location}</span>
                                    </div>
                                )}

                                {currentSlide?.pdf_url && (
                                    <div className="w-full">
                                        <h4 className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Related Documents</h4>
                                        <button
                                            onClick={() => setShowPdfModal(true)}
                                            className="flex items-center gap-2 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
                                        >
                                            <FileText className="w-4 h-4" />
                                            <span>{decodeURIComponent(currentSlide.pdf_url.split('/').pop().split('?')[0]).replace(/^[^_]+_/, '').replace(/\.pdf$/i, '')}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* PDF Modal */}
            <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
                <DialogContent className="max-w-4xl h-[90vh] z-[9999] backdrop-blur-2xl bg-white/80 border-white/30">
                    <DialogHeader>
                        <DialogTitle>{currentSlide?.title} - Document</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 h-full overflow-hidden">
                        <PdfViewer url={currentSlide?.pdf_url} />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Video Modal */}
            <VideoPlayerModal
                isOpen={showVideoModal}
                onClose={() => setShowVideoModal(false)}
                videoUrl={currentSlide?.video_url}
                title={currentSlide?.title}
            />
        </div>
    );
}