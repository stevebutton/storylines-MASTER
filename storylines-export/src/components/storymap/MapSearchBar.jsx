import React, { useState, useMemo } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function MapSearchBar({ chapters, onLocationSelect }) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    // Build searchable locations from chapters
    const locations = useMemo(() => {
        const locs = [];
        chapters.forEach((chapter, chapterIndex) => {
            if (chapter.slides) {
                chapter.slides.forEach((slide, slideIndex) => {
                    if (slide.location || slide.title) {
                        locs.push({
                            chapterIndex,
                            slideIndex,
                            title: slide.title,
                            location: slide.location,
                            coordinates: chapter.coordinates
                        });
                    }
                });
            }
        });
        return locs;
    }, [chapters]);

    // Filter locations based on query
    const filteredLocations = useMemo(() => {
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();
        return locations.filter(loc => 
            loc.title?.toLowerCase().includes(lowerQuery) ||
            loc.location?.toLowerCase().includes(lowerQuery)
        );
    }, [query, locations]);

    const handleSelect = (location) => {
        onLocationSelect(location.chapterIndex);
        setQuery('');
        setIsOpen(false);
    };

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Search locations..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        className="pl-10 pr-10 bg-white/95 backdrop-blur-xl border-slate-200/50 shadow-lg rounded-xl"
                    />
                    {query && (
                        <button
                            onClick={() => {
                                setQuery('');
                                setIsOpen(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Results dropdown */}
                {isOpen && filteredLocations.length > 0 && (
                    <div className="absolute top-full mt-2 w-full bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-slate-200/50 overflow-hidden">
                        <div className="max-h-64 overflow-y-auto">
                            {filteredLocations.map((loc, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSelect(loc)}
                                    className={cn(
                                        "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors",
                                        index !== filteredLocations.length - 1 && "border-b border-slate-100"
                                    )}
                                >
                                    <MapPin className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">
                                            {loc.title}
                                        </p>
                                        {loc.location && (
                                            <p className="text-xs text-slate-500 truncate">
                                                {loc.location}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400 shrink-0">
                                        Ch. {loc.chapterIndex + 1}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {isOpen && query && filteredLocations.length === 0 && (
                    <div className="absolute top-full mt-2 w-full bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-slate-200/50 p-4 text-center text-sm text-slate-500">
                        No locations found
                    </div>
                )}
            </div>
        </div>
    );
}