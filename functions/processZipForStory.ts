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
            
            // Get the file content
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
        
        // Extract folder structure
        const folders = await extractFolderStructure(zip_url);
        console.log('📁 Found folders:', Object.keys(folders));
        
        const chapters = [];
        
        // Process each folder as a chapter
        for (const [folderName, files] of Object.entries(folders)) {
            console.log(`📁 Processing folder: ${folderName} (${files.length} images)`);
            
            const slides = [];
            
            // Process each image in the folder
            for (const file of files) {
                try {
                    // Upload image to Base44
                    const uploadedFile = new File([file.blob], file.name, { type: file.blob.type });
                    const { file_url } = await base44.integrations.Core.UploadFile({ 
                        file: uploadedFile 
                    });
                    
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
                    
                    console.log(`  ✅ Processed: ${file.name} - GPS: ${coordinates ? 'Yes' : 'No'}`);
                } catch (error) {
                    console.error(`  ❌ Error processing ${file.name}:`, error);
                }
            }
            
            chapters.push({
                folder_name: folderName,
                slides: slides
            });
        }
        
        console.log(`✅ Processed ${chapters.length} chapters`);
        
        // Generate descriptions using LLM
        console.log('🤖 Generating descriptions with AI...');
        
        const chaptersWithDescriptions = [];
        
        for (const chapter of chapters) {
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
            
            // Generate descriptions for all slides in this chapter
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `You are analyzing field documentation images for a professional geographic narrative aimed at NGOs and consulting organizations.

FOLDER NAME: ${chapter.folder_name}

EXTRACTED GPS COORDINATES (Decimal Degrees):
${coordinateContext}

For each image provided:
1. Use the EXACT GPS coordinates listed above (already in decimal degree format: [latitude, longitude]).
2. Identify the location name based on the coordinates and image content.
3. Create a descriptive title and detailed narrative description suitable for professional reports.
4. Include the exact image_url that corresponds to this slide.

If an image has no GPS data, analyze the image to identify the location visually and provide estimated coordinates.

Return structured data for each slide with: image_url, title, location name, description, and coordinates in [latitude, longitude] format.`,
                file_urls: imageUrls,
                add_context_from_internet: true,
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
            
            chaptersWithDescriptions.push({
                folder_name: chapter.folder_name,
                slides: response.slides
            });
            
            console.log(`  ✅ Generated descriptions for: ${chapter.folder_name}`);
        }
        
        // Generate overall story title and subtitle
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
        
        return Response.json({
            title: storyResponse.title,
            subtitle: storyResponse.subtitle,
            chapters: chaptersWithDescriptions
        });
        
    } catch (error) {
        console.error('Error processing zip file:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});