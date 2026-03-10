const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const LANGUAGE_NAMES = { en: 'English', fr: 'French', es: 'Spanish' };

const VOICE_STYLES = {
    berger: 'in the style of John Berger (Ways of Seeing): critical, questioning power and context, asking how we are taught to see this image',
    jobey:  'in the style of Liz Jobey: human, relational, focused on memory and emotional truth',
    fulton: 'in the style of Hamish Fulton: sparse, focused on passage, distance, and the physical experience of movement',
};

// Reverse geocode [lat, lng] → "Place, Country" using Mapbox. Returns null on failure.
async function reverseGeocode(lat, lng, token) {
    if (!token) { console.error('[geocode] No Mapbox token available'); return null; }
    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,place&limit=1&access_token=${token}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error('[geocode] Mapbox API error', res.status, await res.text());
            return null;
        }
        const data = await res.json();
        const feature = data.features?.[0];
        if (!feature) { console.error('[geocode] No features returned for', lat, lng); return null; }
        const placeName = feature.text;
        const city    = feature.context?.find(c => c.id.startsWith('place'))?.text;
        const country = feature.context?.find(c => c.id.startsWith('country'))?.text;
        const parts   = [placeName, city, country].filter(Boolean);
        const result  = parts.length > 1 ? parts.join(', ') : feature.place_name;
        console.log('[geocode]', lat, lng, '→', result);
        return result;
    } catch (e) {
        console.error('[geocode] Exception', e?.message);
        return null;
    }
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST')
        return { statusCode: 405, body: 'Method Not Allowed' };

    const { story_id, caption_voice, custom_caption_voice_description, story_context, slide_ids, language } =
        JSON.parse(event.body || '{}');
    if (!story_id)
        return { statusCode: 400, body: JSON.stringify({ error: 'story_id required' }) };

    const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const languageName = LANGUAGE_NAMES[language] || 'English';

    const voiceStyle = caption_voice === 'custom'
        ? `according to this approach: ${custom_caption_voice_description}`
        : (VOICE_STYLES[caption_voice] || VOICE_STYLES.berger);

    const contextBlock = story_context
        ? ` Story context — title: "${story_context.story_title}". ${story_context.story_description || ''} Locations: ${story_context.locations || ''}. Date: ${story_context.date_range || ''}.${story_context.additional_context ? ' ' + story_context.additional_context : ''}`
        : '';

    const { data: chapters } = await supabase
        .from('chapters').select('id,name').eq('story_id', story_id).order('order');

    // Full-story run: no slide_ids provided (or empty array)
    const isFullRun = !Array.isArray(slide_ids) || slide_ids.length === 0;

    // If slide_ids provided (batched call from client), only fetch those slides.
    // Otherwise fall back to fetching all slides for the story.
    let slidesQuery = supabase
        .from('slides').select('id,title,chapter_id,coordinates')
        .in('chapter_id', (chapters || []).map(c => c.id)).order('order');
    if (!isFullRun) {
        slidesQuery = slidesQuery.in('id', slide_ids);
    }
    const { data: slides } = await slidesQuery;

    // Process slides concurrently — safe because the client sends small batches (≤4 slides)
    const results = await Promise.all((slides || []).map(async (slide) => {
        const chapter = (chapters || []).find(c => c.id === slide.chapter_id);

        const coords = Array.isArray(slide.coordinates) && slide.coordinates.length === 2
            ? slide.coordinates : null;

        // Resolve accurate location via Mapbox before calling Claude
        const mapboxToken   = process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_API_KEY;
        const mapboxLocation = coords
            ? await reverseGeocode(coords[0], coords[1], mapboxToken)
            : null;

        const locationBlock = mapboxLocation ? ` Location: ${mapboxLocation}.` : '';

        const prompt = `You are writing ${voiceStyle}.

Chapter: "${chapter?.name || ''}". Image: "${slide.title || ''}".${locationBlock}${contextBlock}

Write all output in ${languageName}.

Respond with valid JSON only, no other text:
{
  "title": "Slide title in this voice style. Maximum 30 characters.",
  "description": "Self-contained caption that works as a standalone. Maximum 300 characters.",
  "extended_content": "Deeper exploration of the image in this voice style. Maximum 1200 characters."
}`;

        try {
            const msg = await anthropic.messages.create({
                model:      'claude-haiku-4-5-20251001',
                max_tokens: 700,
                messages:   [{ role: 'user', content: prompt }],
            });

            const raw = msg.content[0]?.text?.trim();
            if (!raw) return false;

            const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

            let parsed;
            try { parsed = JSON.parse(cleaned); } catch { return false; }

            const title            = parsed.title?.trim()            || slide.title;
            const description      = parsed.description?.trim()      || '';
            const extended_content = parsed.extended_content?.trim() || null;

            if (description) {
                await supabase.from('slides').update({
                    title,
                    description,
                    extended_content: extended_content || null,
                    ...(mapboxLocation ? { location: mapboxLocation } : {}),
                }).eq('id', slide.id);
                return true;
            }
            return false;
        } catch (e) {
            console.error('[captions] Failed slide', slide.id, e?.message);
            return false;
        }
    }));

    const updatedCount = results.filter(Boolean).length;

    // ── Story subtitle — only on full-story runs ──────────────────────────────
    if (isFullRun) {
        try {
            const { data: storyData } = await supabase
                .from('stories').select('title').eq('id', story_id).single();

            const chapterNames = (chapters || [])
                .map(c => c.name).filter(Boolean).join(', ');

            const subtitlePrompt = `Story title: "${storyData?.title || ''}". Chapters: ${chapterNames || 'various'}.

Write a compelling story subtitle of no more than 45 characters in ${languageName}.

Respond with valid JSON only, no other text:
{ "subtitle": "..." }`;

            const subtitleMsg = await anthropic.messages.create({
                model:      'claude-haiku-4-5-20251001',
                max_tokens: 60,
                messages:   [{ role: 'user', content: subtitlePrompt }],
            });

            const subtitleRaw     = subtitleMsg.content[0]?.text?.trim();
            const subtitleCleaned = subtitleRaw?.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            const subtitleParsed  = subtitleCleaned ? JSON.parse(subtitleCleaned) : null;
            const subtitle        = subtitleParsed?.subtitle?.trim();

            if (subtitle) {
                await supabase.from('stories').update({ subtitle }).eq('id', story_id);
                console.log('[subtitle] Generated:', subtitle);
            }
        } catch (e) {
            console.error('[subtitle] Failed', e?.message);
        }
    }

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, updated_count: updatedCount }),
    };
};
