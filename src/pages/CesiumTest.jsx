import { useState } from 'react'
import { CESIUM_TEST_STORY } from '@/components/storymap/storyData'
import StoryMapRenderer from '@/components/map/StoryMapRenderer'

/**
 * Dev-only smoke-test page for the Cesium photorealistic-3D renderer.
 * Navigate to /CesiumTest to verify camera moves, chapter switching, and cleanup.
 *
 * NOT intended for production use — add CESIUM_TEST to ADMIN_PAGES or
 * remove the route entry before shipping.
 */
export default function CesiumTest() {
    const [chapterIdx, setChapterIdx] = useState(0)
    const chapters = CESIUM_TEST_STORY.chapters
    const currentChapter = chapters[chapterIdx]

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#0e0e0e' }}>
            {/* Map fills the viewport */}
            <StoryMapRenderer
                story={CESIUM_TEST_STORY}
                currentChapter={currentChapter}
            />

            {/* Chapter nav overlay */}
            <div style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                padding: '10px 20px',
                borderRadius: 999,
                fontFamily: 'sans-serif',
                color: 'white',
                fontSize: 13,
            }}>
                <button
                    disabled={chapterIdx === 0}
                    onClick={() => setChapterIdx(i => i - 1)}
                    style={{ opacity: chapterIdx === 0 ? 0.3 : 1, cursor: 'pointer', background: 'none', border: 'none', color: 'white', fontSize: 18 }}
                >
                    ‹
                </button>

                <span>
                    {chapterIdx + 1} / {chapters.length} — {currentChapter.name}
                </span>

                <button
                    disabled={chapterIdx === chapters.length - 1}
                    onClick={() => setChapterIdx(i => i + 1)}
                    style={{ opacity: chapterIdx === chapters.length - 1 ? 0.3 : 1, cursor: 'pointer', background: 'none', border: 'none', color: 'white', fontSize: 18 }}
                >
                    ›
                </button>
            </div>

            {/* Chapter description */}
            <div style={{
                position: 'absolute',
                bottom: 32,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                padding: '10px 20px',
                borderRadius: 12,
                fontFamily: 'sans-serif',
                color: 'rgba(255,255,255,0.75)',
                fontSize: 13,
                maxWidth: 440,
                textAlign: 'center',
            }}>
                {currentChapter.description}
            </div>
        </div>
    )
}
