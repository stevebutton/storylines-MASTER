const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const LANGUAGE_NAMES = { en: 'English', fr: 'French', es: 'Spanish' };

const VOICE_STYLES = {
    berger: 'in the style of John Berger (Ways of Seeing): critical, questioning power and context, asking how we are taught to see this image',
    jobey:  'in the style of Liz Jobey: human, relational, focused on memory and emotional truth',
    fulton: 'in the style of Hamish Fulton: sparse, focused on passage, distance, and the physical experience of movement',
};

async function reverseGeocode(lat, lng, token) {
    if (!token) { console.error('[geocode] No Mapbox token available'); return null; }
    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,place&limit=1&access_token=${token}`;
        const res = await fetch(url);
        if (!res.ok) { console.error('[geocode] API error', res.status); return null; }
        const data    = await res.json();
        const feature = data.features?.[0];
        if (!feature) return null;
        const placeName = feature.text;
        const city      = feature.context?.find(c => c.id.startsWith('place'))?.text;
        const country   = feature.context?.find(c => c.id.startsWith('country'))?.text;
        const parts     = [placeName, city, country].filter(Boolean);
        const result    = parts.length > 1 ? parts.join(', ') : feature.place_name;
        console.log('[geocode]', lat, lng, '→', result);
        return result;
    } catch (e) {
        console.error('[geocode] Exception', e?.message);
        return null;
    }
}

function parseJson(raw) {
    if (!raw) return null;
    try {
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        return JSON.parse(cleaned);
    } catch {
        return null;
    }
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST')
        return { statusCode: 405, body: 'Method Not Allowed' };

    const {
        story_id,
        caption_voice,
        custom_caption_voice_description,
        story_context,
        slide_ids,
        language,
        is_full_run,
        model,
    } = JSON.parse(event.body || '{}');

    if (!story_id)
        return { statusCode: 400, body: JSON.stringify({ error: 'story_id required' }) };

    const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const languageName = LANGUAGE_NAMES[language] || 'English';
    const mapboxToken  = process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_API_KEY;
    const modelId      = model === 'sonnet' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

    const voiceStyle = caption_voice === 'custom'
        ? `according to this approach: ${custom_caption_voice_description}`
        : (VOICE_STYLES[caption_voice] || VOICE_STYLES.berger);

    const contextBlock = story_context
        ? ` Story context — title: "${story_context.story_title}". ${story_context.story_description || ''} Locations: ${story_context.locations || ''}. Date: ${story_context.date_range || ''}.${story_context.additional_context ? ' ' + story_context.additional_context : ''}`
        : '';

    const { data: chapters } = await supabase
        .from('chapters').select('id,name').eq('story_id', story_id).order('order');

    // is_full_run: explicit flag sent by client after all slide batches complete —
    // skips slides and only generates chapter names/descriptions + story title/subtitle.
    // Legacy path (no slide_ids at all) processes slides AND metadata in one call.
    const isExplicitFullRun = is_full_run === true;
    const isMetadataRun     = isExplicitFullRun || !Array.isArray(slide_ids) || slide_ids.length === 0;

    // ── 1. SLIDES ─────────────────────────────────────────────────────────────
    // Skipped when this is the dedicated metadata call (is_full_run: true).
    let updatedCount    = 0;
    const slidesByChapter = {};  // original slide titles grouped by chapter_id

    if (!isExplicitFullRun) {
        let slidesQuery = supabase
            .from('slides').select('id,title,chapter_id,coordinates')
            .in('chapter_id', (chapters || []).map(c => c.id)).order('order');
        if (Array.isArray(slide_ids) && slide_ids.length > 0) {
            slidesQuery = slidesQuery.in('id', slide_ids);
        }
        const { data: slides } = await slidesQuery;

        // Build chapter→slide-titles map for later use in chapter generation
        for (const slide of (slides || [])) {
            if (!slidesByChapter[slide.chapter_id]) slidesByChapter[slide.chapter_id] = [];
            if (slide.title) slidesByChapter[slide.chapter_id].push(slide.title);
        }

        const slideResults = await Promise.all((slides || []).map(async (slide) => {
            const chapter = (chapters || []).find(c => c.id === slide.chapter_id);

            const coords = Array.isArray(slide.coordinates) && slide.coordinates.length === 2
                ? slide.coordinates : null;

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
                const msg    = await anthropic.messages.create({
                    model:      modelId,
                    max_tokens: 700,
                    messages:   [{ role: 'user', content: prompt }],
                });
                const parsed = parseJson(msg.content[0]?.text?.trim());
                if (!parsed) return false;

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
                console.error('[slide] Failed', slide.id, e?.message);
                return false;
            }
        }));

        updatedCount = slideResults.filter(Boolean).length;
    }

    // ── 2. CHAPTERS + 3. STORY ────────────────────────────────────────────────
    // Runs on: explicit is_full_run call, OR legacy single call with no slide_ids.
    if (isMetadataRun) {

        // For the explicit full-run call, slide titles aren't in slidesByChapter yet
        // (slides were processed in earlier batch calls). Fetch them fresh.
        if (isExplicitFullRun) {
            const { data: allSlides } = await supabase
                .from('slides').select('id,title,chapter_id')
                .in('chapter_id', (chapters || []).map(c => c.id)).order('order');
            for (const slide of (allSlides || [])) {
                if (!slidesByChapter[slide.chapter_id]) slidesByChapter[slide.chapter_id] = [];
                if (slide.title) slidesByChapter[slide.chapter_id].push(slide.title);
            }
        }

        // ── 2. Chapter names + descriptions ───────────────────────────────────
        const chapterResults = await Promise.all((chapters || []).map(async (ch) => {
            const slideTitles = (slidesByChapter[ch.id] || []).join(', ');
            if (!slideTitles) return { id: ch.id, name: ch.name };

            const prompt = `You are writing ${voiceStyle}.

This chapter contains images titled: "${slideTitles}".${contextBlock}

Write all output in ${languageName}.

Respond with valid JSON only, no other text:
{
  "name": "Chapter title. Maximum 40 characters.",
  "description": "Chapter description for the chapter card. Maximum 200 characters."
}`;

            try {
                const msg    = await anthropic.messages.create({
                    model:      modelId,
                    max_tokens: 150,
                    messages:   [{ role: 'user', content: prompt }],
                });
                const parsed = parseJson(msg.content[0]?.text?.trim());
                if (!parsed) return { id: ch.id, name: ch.name };

                const name        = parsed.name?.trim()        || ch.name;
                const description = parsed.description?.trim() || null;

                await supabase.from('chapters').update({ name, description }).eq('id', ch.id);
                console.log('[chapter] Generated:', name);
                return { id: ch.id, name };
            } catch (e) {
                console.error('[chapter] Failed', ch.id, e?.message);
                return { id: ch.id, name: ch.name };
            }
        }));

        // ── 3. Story title + subtitle ──────────────────────────────────────────
        try {
            const generatedChapterNames = chapterResults
                .map(r => r?.name).filter(Boolean).join(', ');

            const prompt = `You are writing ${voiceStyle}.

Story chapters: "${generatedChapterNames}".${contextBlock}

Write all output in ${languageName}.

Respond with valid JSON only, no other text:
{
  "title": "Story title. Maximum 60 characters.",
  "subtitle": "Story subtitle. Maximum 45 characters."
}`;

            const msg    = await anthropic.messages.create({
                model:      modelId,
                max_tokens: 100,
                messages:   [{ role: 'user', content: prompt }],
            });
            const parsed = parseJson(msg.content[0]?.text?.trim());

            if (parsed?.title || parsed?.subtitle) {
                const update = {};
                if (parsed.title?.trim())    update.title    = parsed.title.trim();
                if (parsed.subtitle?.trim()) update.subtitle = parsed.subtitle.trim();
                await supabase.from('stories').update(update).eq('id', story_id);
                console.log('[story] title:', update.title, '| subtitle:', update.subtitle);
            }
        } catch (e) {
            console.error('[story] Failed', e?.message);
        }
    }

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, updated_count: updatedCount }),
    };
};
