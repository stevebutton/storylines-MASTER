import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * StoryFullscreen — redirect shim.
 *
 * Old direct links (/StoryFullscreen?storyId=X&chapterId=Y&slideId=Z) are
 * redirected to StoryMapView with the ?view=story overlay param so the map
 * stays alive and the story viewer opens as an in-page overlay.
 */
export default function StoryFullscreen() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const storyId   = searchParams.get('storyId');
        const chapterId = searchParams.get('chapterId');
        const slideId   = searchParams.get('slideId');
        if (!storyId) { navigate('/'); return; }

        let url = `/StoryMapView?id=${storyId}&view=story`;
        if (chapterId) url += `&chapterId=${chapterId}`;
        if (slideId)   url += `&slideId=${slideId}`;
        navigate(url, { replace: true });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return null;
}
