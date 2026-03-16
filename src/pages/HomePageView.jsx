import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StoryHeader from '@/components/storymap/StoryHeader';
import StoryMapBanner from '@/components/storymap/StoryMapBanner';
import ProjectDescriptionSection from '@/components/storymap/ProjectDescriptionSection';
import InteractiveStoryMap from '@/components/storymap/InteractiveStoryMap';
import AboutPanel from '@/components/storymap/AboutPanel';

export default function HomePageView() {
    const [hp, setHp] = useState(null);
    const [allStories, setAllStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGlobeVisible, setIsGlobeVisible] = useState(false);
    const [hasGlobeAppeared, setHasGlobeAppeared] = useState(false);
    const [overviewDismissed, setOverviewDismissed] = useState(false);
    const [globeRotationSpeed, setGlobeRotationSpeed] = useState(0);
    const [showAboutPanel, setShowAboutPanel] = useState(false);
    const globeRef = useRef(null);
    const navigate = useNavigate();

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
            const visible = rect.top < window.innerHeight && rect.bottom > 0;
            setIsGlobeVisible(visible);
            if (visible) setHasGlobeAppeared(true);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Stage 1: globe scrolls into view → slow rotation
    useEffect(() => {
        if (!hasGlobeAppeared || !hp) return;
        if (!hp.overview_enabled) {
            setGlobeRotationSpeed(1.0); // no overview — full speed immediately
            return;
        }
        setGlobeRotationSpeed(0.4);
    }, [hasGlobeAppeared, hp]);

    // Stage 2: overview text arrives (contentDelay = 4s) → come to rest
    useEffect(() => {
        if (!hasGlobeAppeared || !hp?.overview_enabled || overviewDismissed) return;
        const timer = setTimeout(() => setGlobeRotationSpeed(0), 4000);
        return () => clearTimeout(timer);
    }, [hasGlobeAppeared]);

    // Stage 3: overview dismissed → full speed
    useEffect(() => {
        if (overviewDismissed) setGlobeRotationSpeed(1.0);
    }, [overviewDismissed]);

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
                        showMarkers={overviewDismissed || !hp.overview_enabled}
                        showCategories={overviewDismissed || !hp.overview_enabled}
                        rotationSpeed={globeRotationSpeed}
                        mapStyle={hp.map_style || 'a'}
                    />

                    {/* Overview panel — mounts only once the globe scrolls into view,
                        so the delay timer starts from the moment the user arrives */}
                    {/* Scroll escape zone — intercepts pointer/scroll events so the bottom
                        160px of the globe section scrolls the page rather than spinning the map */}
                    <div className="absolute bottom-0 left-0 right-0 z-[1]" style={{ height: '180px' }} />

                    {hp.overview_enabled && (
                        <AnimatePresence>
                            {hasGlobeAppeared && !overviewDismissed && (
                                <motion.div
                                    className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
                                    initial={{ opacity: 0, y: 100 }}
                                    animate={{ opacity: 1, y: 0, transition: { delay: 2.5, duration: 2, ease: 'easeOut' } }}
                                    exit={{ opacity: 0, y: -80, transition: { duration: 0.7, ease: 'easeIn' } }}
                                >
                                    <ProjectDescriptionSection
                                        heading={hp.overview_heading || 'Overview'}
                                        description={hp.overview_body}
                                        backgroundImage={hp.overview_bg_image}
                                        mapStyle={hp.map_style || 'a'}
                                        onContinue={() => setOverviewDismissed(true)}
                                        contentDelay={3.5}
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
                    hasAbout={!!(hp.about_org_name || hp.about_who_we_are || hp.about_what_we_do)}
                    onOpenAbout={() => setShowAboutPanel(true)}
                    onEditStory={() => navigate(createPageUrl('HomePageEditor'))}
                />
            )}

            {/* Info / About panel */}
            <AboutPanel
                isOpen={showAboutPanel}
                onClose={() => setShowAboutPanel(false)}
                story={hp}
            />

            {/* Footer */}
            {hp.footer_enabled && (
                <footer
                    className="w-full bg-black px-12 py-14"
                    style={{ minHeight: 400 }}
                >
                    <div className="max-w-6xl mx-auto grid grid-cols-3 gap-12">
                        {[
                            { key: 'footer_col1', label: 'Column 1' },
                            { key: 'footer_col2', label: 'Column 2' },
                            { key: 'footer_col3', label: 'Column 3' },
                        ].map(({ key, label }) => (
                            hp[key] ? (
                                <div
                                    key={key}
                                    className="prose prose-invert prose-sm max-w-none text-white/60"
                                    dangerouslySetInnerHTML={{ __html: hp[key] }}
                                />
                            ) : (
                                <p key={key} className="text-white/20 text-sm italic">{label} — add content in editor</p>
                            )
                        ))}
                    </div>
                </footer>
            )}
        </div>
    );
}
