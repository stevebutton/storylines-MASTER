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
        const gpsLatitude = exifData.GPSLatitude?.value;
        const gpsLongitude = exifData.GPSLongitude?.value;
        const gpsLatRef = exifData.GPSLatitudeRef?.value[0];
        const gpsLonRef = exifData.GPSLongitudeRef?.value[0];

        if (!gpsLatitude || !gpsLongitude || !Array.isArray(gpsLatitude) || !Array.isArray(gpsLongitude)) {
            return null;
        }

        // GPS coordinates are stored as [degrees, minutes, seconds]
        // Each value is a rational number (numerator/denominator)
        const latDegrees = gpsLatitude[0];
        const latMinutes = gpsLatitude[1];
        const latSeconds = gpsLatitude[2];

        const lonDegrees = gpsLongitude[0];
        const lonMinutes = gpsLongitude[1];
        const lonSeconds = gpsLongitude[2];

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