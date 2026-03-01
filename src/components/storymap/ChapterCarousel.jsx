import React from 'react';
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

export default function ChapterCarousel({ slides, onSlideChange, onImageClick, scrollToRef }) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
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

    // Single slide — no nav controls needed
    if (slides.length === 1) {
        return (
            <div>
                <div
                    className="relative h-[300px] overflow-hidden"
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
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-[300px] overflow-hidden">
            <div ref={emblaRef} className="h-full">
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
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

            {/* Navigation arrows — overlaid left/right at bottom of image */}
            <button
                onClick={scrollPrev}
                className="absolute left-3 z-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-100"
                style={{ width: 36, height: 36, bottom: 112, background: '#000', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', opacity: 0.7 }}
                aria-label="Previous slide"
            >
                <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
                onClick={scrollNext}
                className="absolute right-3 z-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-100"
                style={{ width: 36, height: 36, bottom: 37, background: '#000', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', opacity: 0.7 }}
                aria-label="Next slide"
            >
                <ChevronRight className="w-5 h-5 text-white" />
            </button>
        </div>
    );
}