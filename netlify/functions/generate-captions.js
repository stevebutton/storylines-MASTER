const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const VOICE_STYLES = {
    berger: 'in the style of John Berger (Ways of Seeing): critical, questioning power and context, asking how we are taught to see this image',
    jobey:  'in the style of Liz Jobey: human, relational, focused on memory and emotional truth',
    fulton: 'in the style of Hamish Fulton: sparse, focused on passage, distance, and the physical experience of movement',
};

// Reverse geocode [lat, lng] → "Place, Country" using Mapbox. Returns null on failure.
async function reverseGeocode(lat, lng, token) {
    if (!token) return null;
    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,place&limit=1&access_token=${token}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const feature = data.features?.[0];
        if (!feature) return null;
        const placeName = feature.text;
        const country = feature.context?.find(c => c.id.startsWith('country'))?.text;
        return country ? `${placeName}, ${country}` : feature.place_name;
    } catch {
        return null;
    }
}

// Split text at a word boundary at or before maxChars
function splitAtBoundary(text, maxChars) {
    if (!text) return ['', ''];
    if (text.length <= maxChars) return [text, ''];
    const slice = text.slice(0, maxChars);
    const lastBreak = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('\n'));
    const splitPoint = lastBreak > 0 ? lastBreak : maxChars;
    return [text.slice(0, splitPoint).trim(), text.slice(splitPoint).trim()];
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST')
        return { statusCode: 405, body: 'Method Not Allowed' };

    const { story_id, caption_voice, custom_caption_voice_description, story_context, slide_ids } =
        JSON.parse(event.body || '{}');
    if (!story_id)
        return { statusCode: 400, body: JSON.stringify({ error: 'story_id required' }) };

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const voiceStyle = caption_voice === 'custom'
        ? `according to this approach: ${custom_caption_voice_description}`
        : (VOICE_STYLES[caption_voice] || VOICE_STYLES.berger);

    const contextBlock = story_context
        ? ` Story context — title: "${story_context.story_title}". ${story_context.story_description || ''} Locations: ${story_context.locations || ''}. Date: ${story_context.date_range || ''}.${story_context.additional_context ? ' ' + story_context.additional_context : ''}`
        : '';

    const { data: chapters } = await supabase
        .from('chapters').select('id,name').eq('story_id', story_id).order('order');

    // If slide_ids provided (batched call from client), only fetch those slides.
    // Otherwise fall back to fetching all slides for the story.
    let slidesQuery = supabase
        .from('slides').select('id,title,chapter_id,coordinates')
        .in('chapter_id', (chapters || []).map(c => c.id)).order('order');
    if (Array.isArray(slide_ids) && slide_ids.length > 0) {
        slidesQuery = slidesQuery.in('id', slide_ids);
    }
    const { data: slides } = await slidesQuery;

    // Process concurrently — safe because the client sends small batches (≤4 slides)
    let updatedCount = 0;
    const results = await Promise.all((slides || []).map(async (slide) => {
        const chapter = (chapters || []).find(c => c.id === slide.chapter_id);

        const coords = Array.isArray(slide.coordinates) && slide.coordinates.length === 2
            ? slide.coordinates : null;

        // Resolve accurate location via Mapbox before calling Claude
        const mapboxLocation = coords
            ? await reverseGeocode(coords[0], coords[1], process.env.VITE_MAPBOX_API_KEY)
            : null;

        const locationBlock = mapboxLocation ? ` Location: ${mapboxLocation}.` : '';

        const prompt = `You are writing ${voiceStyle}.

Chapter: "${chapter?.name || ''}". Image: "${slide.title || ''}".${locationBlock}${contextBlock}

Respond with valid JSON only, no other text:
{
  "title": "A compelling slide title in this voice style. 4–8 words.",
  "text": "Up to 1440 characters total. Begin with a self-contained lead-in of no more than 320 characters that works as a standalone caption, then continue with extended description for the remaining characters. The total must exceed 320 characters."
}`;

        try {
            const msg = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 700,
                messages: [{ role: 'user', content: prompt }],
            });

            const raw = msg.content[0]?.text?.trim();
            if (!raw) return false;

            // Strip markdown code fences if present
            const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

            let parsed;
            try {
                parsed = JSON.parse(cleaned);
            } catch {
                return false;
            }

            const title = parsed.title?.trim() || slide.title;
            const [description, extended_content] = splitAtBoundary(parsed.text?.trim() || '', 320);

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
    updatedCount = results.filter(Boolean).length;

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, updated_count: updatedCount }),
    };
};
