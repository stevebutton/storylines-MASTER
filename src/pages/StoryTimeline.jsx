import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * StoryTimeline — redirect shim.
 *
 * Timeline is a mode within the story overlay inside StoryMapView.
 * Old /StoryTimeline?storyId=X links are redirected to the equivalent
 * StoryMapView URL so the overlay opens directly in timeline mode.
 */
export default function StoryTimeline() {
    const [searchParams] = useSearchParams();
    const navigate        = useNavigate();

    useEffect(() => {
        const storyId = searchParams.get('storyId');
        if (!storyId) { navigate('/ProjectInterface', { replace: true }); return; }
        navigate(`/StoryMapView?id=${storyId}&view=timeline`, { replace: true });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return null;
}
