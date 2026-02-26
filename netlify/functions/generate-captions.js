const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const VOICE_PROMPTS = {
    berger: 'Write a caption in the style of John Berger (Ways of Seeing): critical, questioning power and context, asking how we are taught to see this image. 2–3 sentences.',
    jobey:  'Write a caption in the style of Liz Jobey: human, relational, focused on memory and emotional truth. 2–3 sentences.',
    fulton: 'Write a caption in the style of Hamish Fulton: sparse, focused on passage, distance, and the physical experience of movement. 1–2 sentences.',
};

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

    const voiceInstruction = caption_voice === 'custom'
        ? `Write a caption according to this approach: ${custom_caption_voice_description}. 2–3 sentences.`
        : (VOICE_PROMPTS[caption_voice] || VOICE_PROMPTS.berger);

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
        const prompt = `Chapter: "${chapter?.name || ''}". Slide: "${slide.title || ''}". ${voiceInstruction}${contextBlock}`;
        try {
            const msg = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 200,
                messages: [{ role: 'user', content: prompt }],
            });
            const description = msg.content[0]?.text?.trim();
            if (description) {
                await supabase.from('slides').update({ description }).eq('id', slide.id);
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
