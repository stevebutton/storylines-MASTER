/**
 * Dev-only test story for the Cesium photorealistic-3D renderer.
 * Access via /CesiumTest in development.
 */
export const CESIUM_TEST_STORY = {
    id: 'test-cesium-story',
    title: 'Brittany coast — 3D test',
    map_style: 'photorealistic-3d',
    chapters: [
        {
            id: 'test-ch-1',
            name: 'Le Minihic sur Rance',
            description: 'Testing tile coverage over the Rance valley.',
            cesiumCamera: {
                lng: -1.983, lat: 48.547, alt: 1400,
                heading: 0, pitch: -42, duration: 0,
            },
        },
        {
            id: 'test-ch-2',
            name: 'Dinard',
            description: 'Testing coverage over the waterfront.',
            cesiumCamera: {
                lng: -2.057, lat: 48.631, alt: 420,
                heading: 100, pitch: -20, duration: 4,
            },
        },
        {
            id: 'test-ch-3',
            name: 'Saint-Malo — intra-muros',
            description: 'Testing coverage over the walled city.',
            cesiumCamera: {
                path: [
                    { lng: -1.999, lat: 48.649, alt: 1800, heading:  30, pitch: -42, duration: 0 },
                    { lng: -2.001, lat: 48.648, alt:  380, heading: 150, pitch: -18, duration: 5 },
                    { lng: -2.003, lat: 48.646, alt:  180, heading: 200, pitch:  -8, duration: 4 },
                ],
            },
        },
        {
            id: 'test-ch-4',
            name: 'Marseille',
            description: 'Testing coverage over Vieux-Port.',
            cesiumCamera: {
                lng: 5.374, lat: 43.293, alt: 600,
                heading: 80, pitch: -22, duration: 4,
            },
        },
    ],
}

export const defaultStory = {
    title: "A Journey Through Time",
    subtitle: "Exploring the world's most iconic landmarks and the stories they hold",
    author: "Interactive Storytelling",
    chapters: [
        {
            id: 1,
            coordinates: [41.8902, 12.4922],
            zoom: 15,
            mapStyle: "light",
            alignment: "left",
            slides: [
                {
                    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80",
                    title: "The Eternal City Awakens",
                    description: "Our journey begins in Rome, where ancient ruins stand as silent witnesses to millennia of human history.",
                    location: "Rome, Italy"
                },
                {
                    image: "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&q=80",
                    title: "The Colosseum",
                    description: "The Colosseum rises against the morning sky, its weathered stones holding echoes of gladiators and emperors.",
                    location: "Rome, Italy"
                },
                {
                    image: "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=800&q=80",
                    title: "Roman Streets",
                    description: "Narrow cobblestone streets wind through ancient neighborhoods, where every corner reveals another layer of history.",
                    location: "Rome, Italy"
                }
            ]
        },
        {
            id: 2,
            coordinates: [48.8584, 2.2945],
            zoom: 14,
            mapStyle: "light",
            alignment: "right",
            slides: [
                {
                    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
                    title: "City of Light",
                    description: "Paris enchants with its timeless elegance. The Eiffel Tower stands as an icon of romance and dreams.",
                    location: "Paris, France"
                },
                {
                    image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80",
                    title: "Parisian Boulevards",
                    description: "Grand boulevards stretch toward distant horizons, lined with cafés where artists and philosophers once gathered.",
                    location: "Paris, France"
                },
                {
                    image: "https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=800&q=80",
                    title: "The Seine",
                    description: "The Seine winds through the heart of Paris, its bridges connecting centuries of art, culture, and love.",
                    location: "Paris, France"
                }
            ]
        },
        {
            id: 3,
            coordinates: [41.0082, 28.9784],
            zoom: 13,
            mapStyle: "light",
            alignment: "left",
            slides: [
                {
                    image: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80",
                    title: "Where East Meets West",
                    description: "Istanbul straddles two continents, a city where minarets pierce the sky alongside Byzantine domes.",
                    location: "Istanbul, Turkey"
                },
                {
                    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80",
                    title: "The Bosphorus",
                    description: "The Bosphorus carries ships between worlds, as it has for thousands of years.",
                    location: "Istanbul, Turkey"
                }
            ]
        },
        {
            id: 4,
            coordinates: [29.9792, 31.1342],
            zoom: 15,
            mapStyle: "satellite",
            alignment: "center",
            slides: [
                {
                    image: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=800&q=80",
                    title: "Ancient Wonders",
                    description: "The Pyramids of Giza stand eternal against the desert sands, monuments to human ambition.",
                    location: "Giza, Egypt"
                },
                {
                    image: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80",
                    title: "The Great Sphinx",
                    description: "The Sphinx guards the pyramids, its weathered face holding secrets of the ancient pharaohs.",
                    location: "Giza, Egypt"
                },
                {
                    image: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800&q=80",
                    title: "Desert Mysteries",
                    description: "These monuments have watched civilizations rise and fall, remaining as mysterious as the day they were built.",
                    location: "Giza, Egypt"
                }
            ]
        },
        {
            id: 5,
            coordinates: [45.4408, 12.3155],
            zoom: 15,
            mapStyle: "light",
            alignment: "right",
            slides: [
                {
                    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80",
                    title: "The Floating City",
                    description: "Venice rises from the lagoon like a dream made real. Gondolas glide through narrow canals.",
                    location: "Venice, Italy"
                },
                {
                    image: "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=800&q=80",
                    title: "Venetian Palazzos",
                    description: "Grand palazzos have defied the waters for centuries, their reflections dancing on the waves.",
                    location: "Venice, Italy"
                }
            ]
        },
        {
            id: 6,
            coordinates: [35.6762, 139.6503],
            zoom: 12,
            mapStyle: "dark",
            alignment: "left",
            slides: [
                {
                    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
                    title: "Land of the Rising Sun",
                    description: "Tokyo pulses with an energy found nowhere else on Earth.",
                    location: "Tokyo, Japan"
                },
                {
                    image: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80",
                    title: "Ancient Traditions",
                    description: "Ancient temples stand in the shadow of neon towers, tradition and innovation in harmony.",
                    location: "Tokyo, Japan"
                },
                {
                    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&q=80",
                    title: "Neon Nights",
                    description: "When darkness falls, Tokyo transforms into a glowing wonderland of lights and possibilities.",
                    location: "Tokyo, Japan"
                }
            ]
        }
    ]
};