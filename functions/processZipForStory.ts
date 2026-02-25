import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import ExifReader from 'npm:exifreader@4.23.3';
import { unzip } from 'npm:unzipit@1.4.3';

// Convert DMS (Degrees, Minutes, Seconds) to Decimal Degrees
function dmsToDecimal(degrees, minutes, seconds, direction) {
    let decimal = degrees + minutes / 60 + seconds / 3600;
    if (direction === 'S' || direction === 'W') {
        decimal = -decimal;
    }
    return decimal;
}

// Parse GPS coordinates from EXIF data
function parseGPSCoordinates(exifData) {
    try {
        const gpsLatitude = exifData.GPSLatitude?.value;
        const gpsLongitude = exifData.GPSLongitude?.value;
        const gpsLatRef = exifData.GPSLatitudeRef?.value[0];
        const gpsLonRef = exifData.GPSLongitudeRef?.value[0];

        if (!gpsLatitude || !gpsLongitude || !Array.isArray(gpsLatitude) || !Array.isArray(gpsLongitude)) {
            return null;
        }

        const latDegrees = gpsLatitude[0][0] / gpsLatitude[0][1];
        const latMinutes = gpsLatitude[1][0] / gpsLatitude[1][1];
        const latSeconds = gpsLatitude[2][0] / gpsLatitude[2][1];

        const lonDegrees = gpsLongitude[0][0] / gpsLongitude[0][1];
        const lonMinutes = gpsLongitude[1][0] / gpsLongitude[1][1];
        const lonSeconds = gpsLongitude[2][0] / gpsLongitude[2][1];

        const lat = dmsToDecimal(latDegrees, latMinutes, latSeconds, gpsLatRef);
        const lon = dmsToDecimal(lonDegrees, lonMinutes, lonSeconds, gpsLonRef);

        return [lat, lon];
    } catch (error) {
        return null;
    }
}

// Extract image files from folder structure
async function extractFolderStructure(zipUrl) {
    console.log('📦 Fetching zip file from:', zipUrl);
    const response = await fetch(zipUrl);
    const zipData = await response.arrayBuffer();
    console.log('📦 Zip file size:', (zipData.byteLength / 1024 / 1024).toFixed(2), 'MB');
    
    const { entries } = await unzip(zipData);
    console.log('📦 Total entries in zip:', Object.keys(entries).length);
    
    const folders = {};
    
    for (const [path, entry] of Object.entries(entries)) {
        // Skip hidden files and __MACOSX
        if (path.includes('__MACOSX') || path.startsWith('.')) {
            console.log('⏩ Skipping hidden/system file:', path);
            continue;
        }
        
        // Only process image files
        if (!entry.isDirectory && /\.(jpg|jpeg|png|gif|webp)$/i.test(path)) {
            const pathParts = path.split('/').filter(p => p && p.trim());
            console.log('📄 Processing path:', path, '-> Parts:', pathParts);
            
            // If image is in root, skip (we only want folders)
            if (pathParts.length === 1) {
                console.log('⏩ Skipping root-level image:', path);
                continue;
            }
            
            // Use the immediate parent folder of the image as the chapter name
            // This handles both flat (folder/image.jpg) and nested (wrapper/folder/image.jpg) structures
            const folderName = pathParts[pathParts.length - 2];
            const fileName = pathParts[pathParts.length - 1];
            
            console.log(`📁 Assigning to folder "${folderName}": ${fileName}`);
            
            if (!folders[folderName]) {
                folders[folderName] = [];
                console.log(`✨ Created new folder: "${folderName}"`);
            }
            
            // Get the file content
            const fileBlob = await entry.blob();
            folders[folderName].push({
                name: fileName,
                blob: fileBlob,
                path: path
            });
        } else if (entry.isDirectory) {
            console.log('📂 Directory entry:', path);
        } else {
            console.log('⏩ Skipping non-image file:', path);
        }
    }
    
    console.log('📊 Final folder structure:', Object.keys(folders).map(k => `${k}: ${folders[k].length} images`));
    
    return folders;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { zip_url, caption_voice, custom_caption_voice_description, story_context } = await req.json();

        if (!zip_url) {
            return Response.json({ error: 'zip_url is required' }, { status: 400 });
        }

        // Default to 'berger' voice if not specified
        const selectedVoice = caption_voice || 'berger';

        console.log('📦 Processing zip file:', zip_url);
        console.log('🎤 Voice config:', { caption_voice: selectedVoice, has_custom_description: !!custom_caption_voice_description, has_context: !!story_context });
        console.log('⏱️ Process started at:', new Date().toISOString());
        
        // Extract folder structure
        console.log('⏱️ Starting folder extraction...');
        const folders = await extractFolderStructure(zip_url);
        console.log('📁 Found folders:', Object.keys(folders));
        console.log('⏱️ Folder extraction completed at:', new Date().toISOString());
        
        const chapters = [];
        
        // Process each folder as a chapter
        for (const [folderName, files] of Object.entries(folders)) {
            console.log(`📁 Processing folder: ${folderName} (${files.length} images)`);
            
            const slides = [];
            
            // Process each image in the folder
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    console.log(`  ⏱️ [${i+1}/${files.length}] Starting ${file.name}...`);
                    // Upload image to Base44
                    const uploadedFile = new File([file.blob], file.name, { type: file.blob.type });
                    const { file_url } = await base44.integrations.Core.UploadFile({ 
                        file: uploadedFile 
                    });
                    console.log(`  ⏱️ [${i+1}/${files.length}] Uploaded ${file.name}`);
                    
                    // Extract EXIF coordinates
                    const imageBuffer = await file.blob.arrayBuffer();
                    const tags = ExifReader.load(imageBuffer);
                    const coordinates = parseGPSCoordinates(tags);
                    
                    slides.push({
                        image_url: file_url,
                        coordinates: coordinates || null,
                        has_gps_data: coordinates !== null,
                        filename: file.name
                    });
                    
                    console.log(`  ✅ [${i+1}/${files.length}] Processed: ${file.name} - GPS: ${coordinates ? 'Yes' : 'No'}`);
                } catch (error) {
                    console.error(`  ❌ Error processing ${file.name}:`, error);
                }
            }
            
            chapters.push({
                folder_name: folderName,
                slides: slides
            });
        }
        
        console.log(`✅ Processed ${chapters.length} chapters with total ${chapters.reduce((sum, c) => sum + c.slides.length, 0)} slides`);
        console.log('⏱️ Image processing completed at:', new Date().toISOString());
        
        // Get voice system prompt
        const getVoiceSystemPrompt = (voice, customDescription) => {
            const voicePrompts = {
                berger: `You are analyzing photographs for a map-based storytelling application. Generate captions that embody John Berger's critical approach from "Ways of Seeing."

For each image, consider:

1. PERSPECTIVE & CHOICE
- Who took this photo and from what position? What does their vantage point reveal?
- What's deliberately included or excluded from the frame?
- How does the photographer's position relative to the subject affect meaning?

2. CONTEXT & MEANING
- How does this image's location on the map influence its interpretation?
- What comes before and after this image in the sequence?
- What assumptions might viewers bring based on the place or subject?

3. POWER & REPRESENTATION
- Who has the power to look, and who is being looked at?
- If people are present: Are they aware of being photographed? How does this change the image?
- Whose story is being told, and whose might be missing?

4. SEEING vs. BEING TAUGHT TO SEE
- What clichés or conventions does this image invoke or challenge?
- How might we see this differently if we questioned our assumptions?
- What does this image suggest about ownership, possession, or relationships?

CAPTION STYLE:
- Use direct, conversational, accessible language
- Avoid flowery or poetic descriptions
- Write in first-person when appropriate (the photographer's perspective)
- Be grounded and specific, not metaphorical
- Pose questions or observations that invite critical engagement
- Keep it authentic - like a thoughtful friend describing what they noticed

Generate captions that make viewers more conscious of HOW they're seeing, not just WHAT they're seeing.`,

                jobey: `You are analyzing photographs for a map-based storytelling application. Generate captions in the spirit of Liz Jobey's approach to photography criticism - thoughtful, personal, attentive to relationships and emotional truths.

For each image, consider:

1. THE PHOTOGRAPHER-SUBJECT RELATIONSHIP
- What does this image reveal about the relationship between photographer and subject?
- Is there intimacy, distance, trust, tension?
- Was the subject aware of being photographed?

2. MEMORY & TRUTH
- What kind of truth is this photograph trying to capture - documentary, emotional, psychological?
- How might this image function as memory? Whose memory?
- What's the difference between what the camera recorded and what the photographer saw or felt?

3. BIOGRAPHICAL & CONTEXTUAL DETAIL
- What can we learn about the photographer's interests or emotional state from this choice?
- What biographical details might help us understand why this image matters?
- How does the location or time period inform what we're seeing?

4. THE INTERIOR LIFE
- What interior, psychological truth might this photograph be reaching for?
- What emotion or feeling state does it capture or evoke?
- How does it picture something internal - loneliness vs. solitude, joy vs. performance?

CAPTION STYLE:
- Write with warmth and intelligence - accessible but never condescending
- Be personally engaged without being overly personal
- Use specific, observant detail rather than grand statements
- Connect the visual to the human - always return to people and relationships
- Allow space for ambiguity and multiple interpretations

Generate captions that reveal the human relationships and emotional truths within and behind the images.`,

                fulton: `You are analyzing photographs for a map-based storytelling application where users move between geolocated images. Generate captions in the spirit of Hamish Fulton's walking art - where the journey between points matters as much as the destinations themselves.

CORE PRINCIPLE: The photograph is evidence of passage. A marker of an unrepeatable experience. The real work is the journey between images.

For each image, consider:

1. THE WALK BETWEEN
- What happened in the space between this image and the last?
- How far? How long? In what direction?
- The route itself is the story - the images are just cairns along the way

2. OBJECTIVE FACTS (always include some)
- Distance walked/traveled between points
- Duration of journey segment
- Direction (north, southeast, uphill, following river)
- Date, time of day
- Weather conditions
- Elevation gained or lost

3. SUBJECTIVE ENCOUNTERS (select sparingly)
- What was noticed: birds, stones, water, moonlight, sounds
- Brief physical sensations: tired legs, wind, hunger
- Single moments of awareness or perception

4. EVIDENCE NOT DOCUMENTATION
- This image marks "I was here" not "this is what here looks like"
- What does this photograph condense about the experience of arrival at this point?

CAPTION STRUCTURE OPTIONS:

A. PURE FACTS (Fulton's signature style):
"FROM [previous location] TO [this location]
[distance] [direction]
[duration]
[date]"

B. FACTS + SINGLE OBSERVATION:
"[distance and direction]
[one encounter or sensation]
[date]"

STYLE RULES:
- Extreme economy - every word must carry weight
- Consider using ALL CAPS for certain elements
- No poetry, no metaphor, no elaboration
- Facts are often sufficient
- If subjective, be specific and spare: "three ravens" not "birds flying overhead"
- Simple in means, rich in ends

You're marking passage between points. The journey between images is the invisible artwork.`,

                custom: `You are analyzing photographs for a map-based storytelling application. Generate captions using this approach:

${customDescription}

Apply this perspective consistently across all captions while remaining attentive to the specific content of each photograph.`
            };

            return voicePrompts[voice] || voicePrompts.berger;
        };

        const voiceSystemPrompt = getVoiceSystemPrompt(selectedVoice, custom_caption_voice_description);

        // Build story context string
        let contextString = '';
        if (story_context) {
            contextString = `
STORY CONTEXT:
${story_context.story_title ? `Title: ${story_context.story_title}` : ''}
${story_context.story_description ? `Description: ${story_context.story_description}` : ''}
${story_context.locations ? `Locations: ${story_context.locations}` : ''}
${story_context.date_range ? `Date Range: ${story_context.date_range}` : ''}
${story_context.additional_context ? `Additional Context: ${story_context.additional_context}` : ''}
`;
        }

        // Generate descriptions using LLM
        console.log('🤖 Generating descriptions with AI...');
        console.log('📝 Using voice:', selectedVoice);
        console.log('⏱️ LLM processing started at:', new Date().toISOString());
        
        const chaptersWithDescriptions = [];
        
        for (let chapterIdx = 0; chapterIdx < chapters.length; chapterIdx++) {
            const chapter = chapters[chapterIdx];
            console.log(`⏱️ [${chapterIdx + 1}/${chapters.length}] Processing chapter: ${chapter.folder_name}...`);
            // Build coordinate context for this chapter
            const coordinateContext = chapter.slides
                .map((slide, idx) => {
                    if (slide.has_gps_data) {
                        return `Image ${idx + 1} (${slide.filename}): GPS coordinates [${slide.coordinates[0]}, ${slide.coordinates[1]}]`;
                    }
                    return `Image ${idx + 1} (${slide.filename}): No GPS data available`;
                })
                .join('\n');
            
            // Get all image URLs for this chapter
            const imageUrls = chapter.slides.map(s => s.image_url);
            console.log(`⏱️ [${chapterIdx + 1}/${chapters.length}] Calling LLM with ${imageUrls.length} images...`);
            
            // Generate descriptions for all slides in this chapter
            const llmStartTime = Date.now();
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `${voiceSystemPrompt}

${contextString}

FOLDER NAME: ${chapter.folder_name}

EXTRACTED GPS COORDINATES (Decimal Degrees):
${coordinateContext}

For each image provided:
1. Use the EXACT GPS coordinates listed above (already in decimal degree format: [latitude, longitude]).
2. Identify the location name based on the coordinates and image content.
3. Create a title and description following the voice approach described above.
4. Include the exact image_url that corresponds to this slide.

If an image has no GPS data, analyze the image to identify the location visually and provide estimated coordinates.

Return structured data for each slide with: image_url, title, location name, description, and coordinates in [latitude, longitude] format.`,
                file_urls: imageUrls,
                add_context_from_internet: false,
                response_json_schema: {
                    type: "object",
                    properties: {
                        slides: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    location: { type: "string" },
                                    description: { type: "string" },
                                    coordinates: {
                                        type: "array",
                                        items: { type: "number" }
                                    },
                                    image_url: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });
            
            const llmDuration = ((Date.now() - llmStartTime) / 1000).toFixed(2);
            console.log(`⏱️ [${chapterIdx + 1}/${chapters.length}] LLM call completed in ${llmDuration}s`);
            
            chaptersWithDescriptions.push({
                folder_name: chapter.folder_name,
                slides: response.slides
            });
            
            console.log(`  ✅ [${chapterIdx + 1}/${chapters.length}] Generated descriptions for: ${chapter.folder_name}`);
        }
        
        console.log('⏱️ All LLM processing completed at:', new Date().toISOString());
        
        // Generate overall story title and subtitle
        console.log('⏱️ Generating story metadata...');
        const storyResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `Based on the following chapters from a professional field documentation project, create a concise story title (maximum 34 characters) and subtitle suitable for NGO or consulting organization audiences.

CHAPTERS:
${chaptersWithDescriptions.map(c => `- ${c.folder_name}`).join('\n')}

The title should be professional and descriptive.`,
            add_context_from_internet: false,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    subtitle: { type: "string" }
                }
            }
        });
        
        console.log('⏱️ Story metadata generated');
        console.log('⏱️ Total process completed at:', new Date().toISOString());
        
        return Response.json({
            title: storyResponse.title,
            subtitle: storyResponse.subtitle,
            chapters: chaptersWithDescriptions
        });
        
    } catch (error) {
        console.error('❌ Error processing zip file:', error);
        console.error('❌ Error occurred at:', new Date().toISOString());
        return Response.json({ error: error.message }, { status: 500 });
    }
});