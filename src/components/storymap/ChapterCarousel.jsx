import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <iframe
            src={embedUrl}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full object-cover"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        ></iframe>
    );
};

export default function ChapterCarousel({ slides, onSlideChange, onImageClick }) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
    const [selectedIndex, setSelectedIndex] = React.useState(0);

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

    // Single slide - no carousel controls needed
    if (slides.length === 1) {
        return (
            <div className="relative h-[300px] overflow-hidden group cursor-pointer" onClick={() => onImageClick?.(0)}>
                {slides[0].video_url ? (
                    <VideoEmbed url={slides[0].video_url} />
                ) : (
                    <img 
                        src={slides[0].image} 
                        alt={slides[0].title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
        );
    }

    return (
        <div className="relative h-[300px] overflow-hidden group">
            <div ref={emblaRef} className="h-full">
                <div className="flex h-full">
                    {slides.map((slide, index) => (
                        <div 
                            key={index} 
                            className="flex-[0_0_100%] min-w-0 h-full cursor-pointer relative"
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
            
            {/* Navigation arrows */}
            <button 
                onClick={scrollPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
            >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <button 
                onClick={scrollNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
            >
                <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
            
            {/* Dots indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => emblaApi?.scrollTo(index)}
                        className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            selectedIndex === index 
                                ? "bg-white w-4" 
                                : "bg-white/50 hover:bg-white/70"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}