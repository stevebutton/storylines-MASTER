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
        const gpsLatitude = exifData.GPSLatitude?.description;
        const gpsLongitude = exifData.GPSLongitude?.description;
        const gpsLatRef = exifData.GPSLatitudeRef?.value[0];
        const gpsLonRef = exifData.GPSLongitudeRef?.value[0];

        if (!gpsLatitude || !gpsLongitude) {
            return null;
        }

        // Parse DMS format: "44°1'52.13"" or similar
        const latMatch = gpsLatitude.match(/(\d+)°\s*(\d+)'\s*([\d.]+)/);
        const lonMatch = gpsLongitude.match(/(\d+)°\s*(\d+)'\s*([\d.]+)/);

        if (!latMatch || !lonMatch) {
            return null;
        }

        const lat = dmsToDecimal(
            parseFloat(latMatch[1]),
            parseFloat(latMatch[2]),
            parseFloat(latMatch[3]),
            gpsLatRef
        );

        const lon = dmsToDecimal(
            parseFloat(lonMatch[1]),
            parseFloat(lonMatch[2]),
            parseFloat(lonMatch[3]),
            gpsLonRef
        );

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