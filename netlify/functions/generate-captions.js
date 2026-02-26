const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const VOICE_STYLES = {
    berger: 'in the style of John Berger (Ways of Seeing): critical, questioning power and context, asking how we are taught to see this image',
    jobey:  'in the style of Liz Jobey: human, relational, focused on memory and emotional truth',
    fulton: 'in the style of Hamish Fulton: sparse, focused on passage, distance, and the physical experience of movement',
};

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

    const { story_id, caption_voice, custom_caption_voice_description, story_context } =
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
    const { data: slides } = await supabase
        .from('slides').select('id,title,chapter_id')
        .in('chapter_id', (chapters || []).map(c => c.id)).order('order');

    let updatedCount = 0;
    for (const slide of (slides || [])) {
        const chapter = (chapters || []).find(c => c.id === slide.chapter_id);

        const prompt = `You are writing ${voiceStyle}.

Chapter: "${chapter?.name || ''}". Image: "${slide.title || ''}".${contextBlock}

Respond with valid JSON only, no other text:
{
  "title": "A compelling slide title in this voice style. 4–8 words.",
  "text": "Up to 1440 characters total. Begin with a self-contained lead-in of no more than 340 characters that works as a standalone caption, then continue with extended description for the remaining characters. The total must exceed 340 characters."
}`;

        try {
            const msg = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 600,
                messages: [{ role: 'user', content: prompt }],
            });

            const raw = msg.content[0]?.text?.trim();
            if (!raw) continue;

            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch {
                // If JSON parse fails, skip this slide
                continue;
            }

            const title = parsed.title?.trim() || slide.title;
            const [description, extended_content] = splitAtBoundary(parsed.text?.trim() || '', 340);

            if (description) {
                await supabase.from('slides').update({
                    title,
                    description,
                    extended_content: extended_content || null,
                }).eq('id', slide.id);
                updatedCount++;
            }
        } catch { /* skip individual failures */ }
    }

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, updated_count: updatedCount }),
    };
};
