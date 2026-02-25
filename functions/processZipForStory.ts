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

        const { zip_url } = await req.json();

        if (!zip_url) {
            return Response.json({ error: 'zip_url is required' }, { status: 400 });
        }

        console.log('📦 Processing zip file:', zip_url);
        console.log('⏱️ Upload process started at:', new Date().toISOString());
        
        // Extract folder structure
        console.log('⏱️ Starting folder extraction...');
        const folders = await extractFolderStructure(zip_url);
        console.log('📁 Found folders:', Object.keys(folders));
        console.log('⏱️ Folder extraction completed at:', new Date().toISOString());

        // Create story
        const tempStory = await base44.asServiceRole.entities.Story.create({
            title: "Untitled Story",
            is_published: false
        });

        console.log('✨ Created story with ID:', tempStory.id);

        // Process each folder as a chapter
        for (let chapterOrder = 0; chapterOrder < Object.entries(folders).length; chapterOrder++) {
            const [folderName, files] = Object.entries(folders)[chapterOrder];
            console.log(`📁 Processing folder: ${folderName} (${files.length} images)`);
            
            const newChapter = await base44.asServiceRole.entities.Chapter.create({
                story_id: tempStory.id,
                name: folderName,
                order: chapterOrder,
                alignment: 'left'
            });

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
                    
                    // Create slide
                    await base44.asServiceRole.entities.Slide.create({
                        chapter_id: newChapter.id,
                        order: i,
                        image: file_url,
                        title: file.name.split('.').slice(0, -1).join('.'),
                        coordinates: coordinates || null,
                        zoom: 12
                    });
                    
                    console.log(`  ✅ [${i+1}/${files.length}] Processed: ${file.name} - GPS: ${coordinates ? 'Yes' : 'No'}`);
                } catch (error) {
                    console.error(`  ❌ Error processing ${file.name}:`, error);
                }
            }
        }
        
        console.log(`✅ Story structure created successfully with ID: ${tempStory.id}`);
        console.log('⏱️ Process completed at:', new Date().toISOString());
        
        return Response.json({
            story_id: tempStory.id
        });
        
    } catch (error) {
        console.error('❌ Error processing zip file:', error);
        console.error('❌ Error occurred at:', new Date().toISOString());
        return Response.json({ error: error.message }, { status: 500 });
    }
});