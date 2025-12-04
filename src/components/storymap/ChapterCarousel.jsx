import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChapterCarousel({ images, title }) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    React.useEffect(() => {
        if (!emblaApi) return;
        
        const onSelect = () => {
            setSelectedIndex(emblaApi.selectedScrollSnap());
        };
        
        emblaApi.on('select', onSelect);
        return () => emblaApi.off('select', onSelect);
    }, [emblaApi]);

    const scrollPrev = () => emblaApi?.scrollPrev();
    const scrollNext = () => emblaApi?.scrollNext();

    if (!images || images.length === 0) return null;

    // Single image - no carousel needed
    if (images.length === 1) {
        return (
            <div className="relative h-48 md:h-56 overflow-hidden">
                <img 
                    src={images[0]} 
                    alt={title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
        );
    }

    return (
        <div className="relative h-48 md:h-56 overflow-hidden group">
            <div ref={emblaRef} className="h-full">
                <div className="flex h-full">
                    {images.map((image, index) => (
                        <div key={index} className="flex-[0_0_100%] min-w-0 h-full">
                            <img 
                                src={image} 
                                alt={`${title} - ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            
            {/* Navigation arrows */}
            <button 
                onClick={scrollPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <button 
                onClick={scrollNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
                <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
            
            {/* Dots indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, index) => (
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