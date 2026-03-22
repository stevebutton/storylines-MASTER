import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const VideoEmbed = ({ url }) => {
    if (!url) return null;

    let embedUrl = '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&showinfo=0` : '';
    } else if (url.includes('vimeo.com')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
        embedUrl = videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&controls=0&background=1` : '';
    } else {
        return (
            <video
                src={url}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
            />
        );
    }

    if (!embedUrl) return null;

    return (
        <>
            <iframe
                src={embedUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full object-cover"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            ></iframe>
            <div className="absolute inset-0 z-10" style={{ pointerEvents: 'auto' }} />
        </>
    );
};

// Maximize2 icon as a white SVG data URI — used as the custom fullscreen cursor
const FULLSCREEN_CURSOR = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='15 3 21 3 21 9'/%3E%3Cpolyline points='9 21 3 21 3 15'/%3E%3Cline x1='21' y1='3' x2='14' y2='10'/%3E%3Cline x1='3' y1='21' x2='10' y2='14'/%3E%3C/svg%3E\") 9 9, pointer";

// Tab shown at the right edge of the carousel when the last slide is reached.
// Pixel offsets only — avoids conflict with Framer Motion's transform system.
function NextChapterTab({ onNextChapter, nextChapterName, nextChapterColor }) {
    return (
        <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            whileHover={{ scale: 1.06, boxShadow: '0 8px 32px rgba(0,0,0,0.55)', background: 'rgba(30, 41, 59, 0.96)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            onClick={onNextChapter}
            className="absolute z-20 flex flex-col items-start pointer-events-auto cursor-pointer"
            style={{
                right: -40,
                bottom: -30,
                background: 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(12px)',
                padding: '14px 20px',
                borderRadius: '14px',
                minWidth: 150,
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
        >
            <span style={{
                fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)', fontFamily: 'Raleway, sans-serif',
                marginBottom: 5, display: 'flex', alignItems: 'center', gap: 10,
            }}>
                {nextChapterColor && (
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: nextChapterColor, border: '1px solid white', flexShrink: 0, display: 'inline-block' }} />
                )}
                Next Chapter
            </span>
            {nextChapterName && (
                <span style={{
                    fontSize: 13, fontFamily: 'Raleway, sans-serif', fontWeight: 300,
                    lineHeight: 1.35, color: 'white', maxWidth: 130, display: 'block',
                }}>
                    {nextChapterName}
                </span>
            )}
        </motion.button>
    );
}

export default function ChapterCarousel({ slides, onSlideChange, onImageClick, scrollToRef, onNextChapter = null, nextChapterName = null, nextChapterColor = null }) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    // Expose scrollTo for external navigation
    React.useEffect(() => {
        if (scrollToRef && emblaApi) {
            scrollToRef.current = (idx) => emblaApi.scrollTo(idx);
        }
    }, [emblaApi, scrollToRef]);

    React.useEffect(() => {
        if (!emblaApi) return;

        const onSelect = () => {
            const index = emblaApi.selectedScrollSnap();
            setSelectedIndex(index);
            onSlideChange?.(index);
        };

        emblaApi.on('select', onSelect);
        return () => emblaApi.off('select', onSelect);
    }, [emblaApi, onSlideChange]);

    const scrollPrev = () => emblaApi?.scrollPrev();
    const scrollNext = () => emblaApi?.scrollNext();

    if (!slides || slides.length === 0) return null;

    const atEnd = selectedIndex === slides.length - 1;
    const showTab = atEnd && !!onNextChapter;

    // Single slide — no nav controls, but still show the tab if a next chapter exists
    if (slides.length === 1) {
        return (
            <div className="relative h-[350px]">
                <div
                    className="absolute inset-0 overflow-hidden rounded-t-2xl"
                    style={{ cursor: FULLSCREEN_CURSOR }}
                    onClick={() => onImageClick?.(0)}
                >
                    {slides[0].video_url ? (
                        <VideoEmbed url={slides[0].video_url} />
                    ) : (
                        <img
                            src={slides[0].image}
                            alt={slides[0].title}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            style={{ objectPosition: slides[0].image_position || '50% 50%' }}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </div>
                <AnimatePresence>
                    {onNextChapter && (
                        <NextChapterTab key="tab" onNextChapter={onNextChapter} nextChapterName={nextChapterName} nextChapterColor={nextChapterColor} />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="relative h-[350px]">
            {/* Embla viewport — clips slides to rounded-t-2xl, arrows overflow outside */}
            <div ref={emblaRef} className="absolute inset-0 overflow-hidden rounded-t-2xl">
                <div className="flex h-full">
                    {slides.map((slide, index) => (
                        <div
                            key={index}
                            className="flex-[0_0_100%] min-w-0 h-full relative"
                            style={{ cursor: FULLSCREEN_CURSOR }}
                            onClick={() => onImageClick?.(index)}
                        >
                            {slide.video_url ? (
                                <VideoEmbed url={slide.video_url} />
                            ) : (
                                <img
                                    src={slide.image}
                                    alt={slide.title}
                                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                    style={{ objectPosition: slide.image_position || '50% 50%' }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none rounded-t-2xl" />

            {/* Prev arrow — dims at first slide */}
            <button
                onClick={scrollPrev}
                disabled={selectedIndex === 0}
                className={`absolute z-10 rounded-full flex items-center justify-center transition-opacity ${selectedIndex === 0 ? 'opacity-20 pointer-events-none' : 'opacity-60 hover:opacity-100'}`}
                style={{ width: 36, height: 36, bottom: 112, left: 0, transform: 'translateX(-50%)', background: '#000', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                aria-label="Previous slide"
            >
                <ChevronLeft className="w-5 h-5 text-white" />
            </button>

            {/* Next arrow ↔ Next Chapter tab — swap on last slide */}
            <AnimatePresence mode="wait">
                {showTab ? (
                    <NextChapterTab key="tab" onNextChapter={onNextChapter} nextChapterName={nextChapterName} nextChapterColor={nextChapterColor} />
                ) : (
                    <motion.button
                        key="next-arrow"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: atEnd ? 0.2 : 0.6 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={scrollNext}
                        disabled={atEnd}
                        className={`absolute z-10 rounded-full flex items-center justify-center ${atEnd ? 'pointer-events-none' : 'hover:opacity-100'}`}
                        style={{ width: 36, height: 36, bottom: -18, right: 0, transform: 'translateX(50%)', background: '#000', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                        aria-label="Next slide"
                    >
                        <ChevronRight className="w-5 h-5 text-white" />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
