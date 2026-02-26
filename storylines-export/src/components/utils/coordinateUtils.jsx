/**
 * Utility functions for working with map coordinates
 * Ensures consistent coordinate handling across the application
 */

/**
 * Normalizes a coordinate to a fixed precision to prevent floating-point comparison issues
 * @param {number} coord - The coordinate value (latitude or longitude)
 * @param {number} precision - Number of decimal places (default: 6)
 * @returns {number} - Normalized coordinate
 */
export function normalizeCoordinate(coord, precision = 6) {
    if (coord === null || coord === undefined || isNaN(coord) || !isFinite(coord)) {
        return null;
    }
    return parseFloat(coord.toFixed(precision));
}

/**
 * Normalizes a coordinate pair [lat, lng]
 * @param {Array} coords - Coordinate pair [lat, lng]
 * @param {number} precision - Number of decimal places (default: 6)
 * @returns {Array|null} - Normalized coordinate pair or null if invalid
 */
export function normalizeCoordinatePair(coords, precision = 6) {
    if (!coords || !Array.isArray(coords) || coords.length !== 2) {
        return null;
    }
    
    const lat = normalizeCoordinate(coords[0], precision);
    const lng = normalizeCoordinate(coords[1], precision);
    
    if (lat === null || lng === null) {
        return null;
    }
    
    return [lat, lng];
}

/**
 * Checks if two coordinate pairs are equal (after normalization)
 * @param {Array} coord1 - First coordinate pair [lat, lng]
 * @param {Array} coord2 - Second coordinate pair [lat, lng]
 * @param {number} precision - Number of decimal places (default: 6)
 * @returns {boolean} - True if coordinates are equal
 */
export function areCoordinatesEqual(coord1, coord2, precision = 6) {
    const normalized1 = normalizeCoordinatePair(coord1, precision);
    const normalized2 = normalizeCoordinatePair(coord2, precision);
    
    if (!normalized1 || !normalized2) {
        return false;
    }
    
    return normalized1[0] === normalized2[0] && normalized1[1] === normalized2[1];
}

/**
 * Validates if a coordinate pair is valid
 * @param {Array} coords - Coordinate pair [lat, lng]
 * @returns {boolean} - True if valid
 */
export function isValidCoordinatePair(coords) {
    return normalizeCoordinatePair(coords) !== null;
}