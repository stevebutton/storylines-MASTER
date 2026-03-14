import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StoryHeader from '@/components/storymap/StoryHeader';
import StoryMapBanner from '@/components/storymap/StoryMapBanner';
import ProjectDescriptionSection from '@/components/storymap/ProjectDescriptionSection';
import InteractiveStoryMap from '@/components/storymap/InteractiveStoryMap';

export default function HomePageView() {
    const [hp, setHp] = useState(null);
    const [allStories, setAllStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGlobeVisible, setIsGlobeVisible] = useState(false);
    const [overviewDismissed, setOverviewDismissed] = useState(false);
    const globeRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [{ data: hpData }, { data: stories }, { data: chapters }] = await Promise.all([
                supabase.from('homepage').select('*').eq('id', 1).single(),
                supabase.from('stories').select('*').eq('is_published', true),
                supabase.from('chapters').select('id,story_id,coordinates').order('order'),
            ]);

            setHp(hpData || {});

            const storiesWithCoords = (stories || []).map(story => {
                const storyChapters = (chapters || []).filter(c => c.story_id === story.id);
                const firstChapterWithCoords = storyChapters.find(c => c.coordinates && c.coordinates.length === 2);
                return {
                    ...story,
                    coordinates: story.coordinates || firstChapterWithCoords?.coordinates || null,
                };
            }).filter(s => s.coordinates);

            setAllStories(storiesWithCoords);
        } catch (error) {
            console.error('Failed to load homepage data:', error);
            setHp({});
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            if (!globeRef.current) return;
            const rect = globeRef.current.getBoundingClientRect();
            setIsGlobeVisible(rect.top < window.innerHeight && rect.bottom > 0);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const target = el.getBoundingClientRect().top + window.scrollY;
        const start = window.scrollY;
        const distance = target - start;
        const duration = 1800;
        let startTime = null;
        const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const animate = (now) => {
            if (!startTime) startTime = now;
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            window.scrollTo(0, start + distance * ease(progress));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    };

    const handleExplore = () => {
        scrollToSection('globe-section');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Hero */}
            <div className="relative h-screen">
                <StoryHeader
                    title={hp.hero_title}
                    subtitle={hp.hero_subtitle}
                    heroImage={hp.hero_image}
                    heroVideo={hp.hero_video}
                    heroType={hp.hero_type || 'image'}
                    heroVideoLoop={hp.hero_video_loop !== false}
                    mapStyle={hp.map_style || 'a'}
                    onExplore={handleExplore}
                />
            </div>

            {/* Globe — full viewport, with Overview overlaid on top */}
            {hp.globe_enabled !== false && (
                <div id="globe-section" ref={globeRef} className="relative">
                    {/* Globe fills the section (InteractiveStoryMap is h-screen internally) */}
                    <InteractiveStoryMap
                        stories={allStories}
                        isVisible={isGlobeVisible}
                        showMarkers={overviewDismissed}
                        showCategories={overviewDismissed}
                        mapStyle={hp.map_style || 'a'}
                    />

                    {/* Overview panel floats over the globe */}
                    {hp.overview_enabled && (
                        <AnimatePresence>
                            {!overviewDismissed && (
                                <motion.div
                                    className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1, transition: { delay: 0.6, duration: 1.2 } }}
                                    exit={{ opacity: 0, transition: { duration: 0.6 } }}
                                >
                                    <ProjectDescriptionSection
                                        heading={hp.overview_heading || 'Overview'}
                                        description={hp.overview_body}
                                        backgroundImage={hp.overview_bg_image}
                                        mapStyle={hp.map_style || 'a'}
                                        onContinue={() => setOverviewDismissed(true)}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            )}

            {/* Banner — animates in when globe is visible */}
            {hp.globe_enabled !== false && (
                <StoryMapBanner
                    isVisible={isGlobeVisible}
                    storyTitle={hp.globe_heading || 'Explore Our Stories'}
                    hasChapters={false}
                    mapStyle={hp.map_style || 'a'}
                    centered
                />
            )}

            {/* Footer */}
            {hp.footer_enabled && (
                <footer
                    className="w-full bg-black flex items-center justify-center px-8"
                    style={{ minHeight: 240 }}
                >
                    {hp.footer_content ? (
                        <div
                            className="prose prose-invert prose-sm max-w-4xl text-center text-white/60"
                            dangerouslySetInnerHTML={{ __html: hp.footer_content }}
                        />
                    ) : (
                        <p className="text-white/20 text-sm italic">Footer — add content in the editor</p>
                    )}
                </footer>
            )}
        </div>
    );
}
