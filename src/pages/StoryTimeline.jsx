import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * StoryTimeline — retired route.
 *
 * Timeline is now a mode within StoryFullscreen (toggle the Clock icon in the
 * nav pill).  This shim redirects any old /StoryTimeline?storyId=X links so
 * they land on the equivalent StoryFullscreen URL and immediately switch to
 * timeline mode.
 */
export default function StoryTimeline() {
    const [searchParams] = useSearchParams();
    const navigate        = useNavigate();

    useEffect(() => {
        const storyId = searchParams.get('storyId');
        const target  = storyId
            ? `/StoryFullscreen?storyId=${storyId}`
            : '/ProjectInterface';
        navigate(target, { replace: true });
    }, []);

    return null;
}
