import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import ExifReader from 'npm:exifreader@4.23.3';

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
        console.log('=== EXIF GPS DATA EXTRACTION ===');
        console.log('GPSLatitude tag:', JSON.stringify(exifData.GPSLatitude, null, 2));
        console.log('GPSLongitude tag:', JSON.stringify(exifData.GPSLongitude, null, 2));
        console.log('GPSLatitudeRef tag:', JSON.stringify(exifData.GPSLatitudeRef, null, 2));
        console.log('GPSLongitudeRef tag:', JSON.stringify(exifData.GPSLongitudeRef, null, 2));
        
        const gpsLatitude = exifData.GPSLatitude?.value;
        const gpsLongitude = exifData.GPSLongitude?.value;
        const gpsLatRef = exifData.GPSLatitudeRef?.value[0];
        const gpsLonRef = exifData.GPSLongitudeRef?.value[0];

        console.log('Extracted values:');
        console.log('- gpsLatitude:', gpsLatitude);
        console.log('- gpsLongitude:', gpsLongitude);
        console.log('- gpsLatRef:', gpsLatRef);
        console.log('- gpsLonRef:', gpsLonRef);

        if (!gpsLatitude || !gpsLongitude || !Array.isArray(gpsLatitude) || !Array.isArray(gpsLongitude)) {
            console.log('❌ Missing or invalid GPS data');
            return null;
        }

        // GPS coordinates are stored as [degrees, minutes, seconds]
        // Each value is an array [numerator, denominator]
        // Convert to decimal numbers
        const latDegrees = gpsLatitude[0][0] / gpsLatitude[0][1];
        const latMinutes = gpsLatitude[1][0] / gpsLatitude[1][1];
        const latSeconds = gpsLatitude[2][0] / gpsLatitude[2][1];

        const lonDegrees = gpsLongitude[0][0] / gpsLongitude[0][1];
        const lonMinutes = gpsLongitude[1][0] / gpsLongitude[1][1];
        const lonSeconds = gpsLongitude[2][0] / gpsLongitude[2][1];

        console.log('Converted DMS values:');
        console.log(`- Latitude: ${latDegrees}° ${latMinutes}' ${latSeconds}" ${gpsLatRef}`);
        console.log(`- Longitude: ${lonDegrees}° ${lonMinutes}' ${lonSeconds}" ${gpsLonRef}`);

        const lat = dmsToDecimal(
            latDegrees,
            latMinutes,
            latSeconds,
            gpsLatRef
        );

        const lon = dmsToDecimal(
            lonDegrees,
            lonMinutes,
            lonSeconds,
            gpsLonRef
        );

        console.log(`✅ Final coordinates: [${lat}, ${lon}]`);
        console.log('=================================');

        return [lat, lon];
    } catch (error) {
        console.error('Error parsing GPS coordinates:', error);
        return null;
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_urls } = await req.json();

        if (!file_urls || !Array.isArray(file_urls)) {
            return Response.json({ error: 'file_urls array is required' }, { status: 400 });
        }

        const results = [];

        for (const fileUrl of file_urls) {
            try {
                // Fetch the image file
                const imageResponse = await fetch(fileUrl);
                const imageBuffer = await imageResponse.arrayBuffer();

                // Extract EXIF data
                const tags = ExifReader.load(imageBuffer);

                // Parse GPS coordinates
                const coordinates = parseGPSCoordinates(tags);

                results.push({
                    image_url: fileUrl,
                    coordinates: coordinates || null,
                    has_gps_data: coordinates !== null
                });
            } catch (error) {
                console.error(`Error processing ${fileUrl}:`, error);
                results.push({
                    image_url: fileUrl,
                    coordinates: null,
                    has_gps_data: false,
                    error: error.message
                });
            }
        }

        return Response.json({ results });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});