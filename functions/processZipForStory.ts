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
    const response = await fetch(zipUrl);
    const zipData = await response.arrayBuffer();
    const { entries } = await unzip(zipData);

    const folders = {};

    for (const [path, entry] of Object.entries(entries)) {
        // Skip hidden files and __MACOSX
        if (path.includes('__MACOSX') || path.startsWith('.')) continue;

        // Only process image files
        if (!entry.isDirectory && /\.(jpg|jpeg|png|gif|webp)$/i.test(path)) {
            const pathParts = path.split('/').filter(p => p);

            // If image is in root, skip (we only want folders)
            if (pathParts.length === 1) continue;

            const folderName = pathParts[0];
            const fileName = pathParts[pathParts.length - 1];

            if (!folders[folderName]) {
                folders[folderName] = [];
            }

            const fileBlob = await entry.blob();
            folders[folderName].push({
                name: fileName,
                blob: fileBlob,
                path: path
            });
        }
    }

    return folders;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { zip_url } = await req.json();

        if (!zip_url) {
            return Response.json({ error: 'zip_url is required' }, { status: 400 });
        }

        console.log('📦 Processing zip file:', zip_url);

        // Extract folder/image structure from zip
        const folders = await extractFolderStructure(zip_url);
        console.log('📁 Found folders:', Object.keys(folders));

        // Create Story entity with a placeholder title.
        // generateStoryDescriptions will update the title once the voice + LLM pass runs.
        const story = await base44.asServiceRole.entities.Story.create({
            title: 'Untitled Story',
            subtitle: '',
            category: 'travel',
            is_published: false
        });
        console.log('📖 Created story:', story.id);

        let totalSlides = 0;
        let slidesWithGps = 0;
        const chapterOverviews = [];
        let chapterOrder = 0;

        // Process each folder as a chapter — upload images and extract EXIF coordinates.
        // No LLM calls here; descriptions are generated later by generateStoryDescriptions.
        for (const [folderName, files] of Object.entries(folders)) {
            console.log(`📁 Processing folder: ${folderName} (${files.length} images)`);

            const chapter = await base44.asServiceRole.entities.Chapter.create({
                story_id: story.id,
                name: folderName,
                order: chapterOrder++,
                alignment: 'left'
            });

            let slideOrder = 0;
            for (const file of files) {
                try {
                    // Upload image
                    const uploadedFile = new File([file.blob], file.name, { type: file.blob.type });
                    const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadedFile });

                    // Extract GPS from EXIF
                    const imageBuffer = await file.blob.arrayBuffer();
                    const tags = ExifReader.load(imageBuffer);
                    const coordinates = parseGPSCoordinates(tags);

                    await base44.asServiceRole.entities.Slide.create({
                        chapter_id: chapter.id,
                        order: slideOrder++,
                        image: file_url,
                        coordinates: coordinates || null,
                        zoom: 12
                    });

                    totalSlides++;
                    if (coordinates) slidesWithGps++;
                    console.log(`  ✅ Created slide: ${file.name} - GPS: ${coordinates ? 'Yes' : 'No'}`);
                } catch (error) {
                    console.error(`  ❌ Error processing ${file.name}:`, error);
                }
            }

            chapterOverviews.push({ name: folderName, slide_count: slideOrder });
        }

        console.log(`✅ Created ${chapterOverviews.length} chapters, ${totalSlides} slides`);

        return Response.json({
            story_id: story.id,
            overview: {
                chapter_count: chapterOverviews.length,
                slide_count: totalSlides,
                slides_with_gps: slidesWithGps,
                chapters: chapterOverviews
            }
        });

    } catch (error) {
        console.error('Error processing zip file:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
