export const LANGUAGE_DEFAULTS = {
    en: {
        chapter_prefix:   'Chapter',
        map_view:         'Map View',
        story_view:       'Story View',
        library_view:     'Library View',
        end_label:        'End',
        back_to_beginning:'Back to Beginning',
        follow_the_story: 'Follow the Story',
        project_timeline: 'Project Timeline',
        thank_you:        'Thank you for exploring this story',
        more_stories:     'More Stories',
    },
    fr: {
        chapter_prefix:   'Chapitre',
        map_view:         'Vue carte',
        story_view:       'Vue récit',
        library_view:     'Médiathèque',
        end_label:        'Fin',
        back_to_beginning:'Retour au début',
        follow_the_story: 'Suivre le récit',
        project_timeline: 'Chronologie du projet',
        thank_you:        "Merci d'avoir exploré cette histoire",
        more_stories:     "Plus d'histoires",
    },
    es: {
        chapter_prefix:   'Capítulo',
        map_view:         'Vista mapa',
        story_view:       'Vista relato',
        library_view:     'Biblioteca',
        end_label:        'Fin',
        back_to_beginning:'Volver al inicio',
        follow_the_story: 'Sigue el relato',
        project_timeline: 'Cronología del proyecto',
        thank_you:        'Gracias por explorar esta historia',
        more_stories:     'Más historias',
    },
};

export const TRANSLATION_FIELD_LABELS = {
    chapter_prefix:    'Chapter prefix',
    map_view:          'Map View button',
    story_view:        'Story View button',
    library_view:      'Library View button',
    end_label:         '"End" label',
    back_to_beginning: '"Back to Beginning" button',
    follow_the_story:  '"Follow the Story" mode label',
    project_timeline:  '"Project Timeline" mode label',
    thank_you:         'Closing tagline',
    more_stories:      '"More Stories" heading',
};

export const SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
];

/** Pure t() function — for use outside React context (e.g. inside useMemo in StoryMapView) */
export function getT(language = 'en', translations = {}) {
    return (key) =>
        translations?.[key] ||
        LANGUAGE_DEFAULTS[language]?.[key] ||
        LANGUAGE_DEFAULTS.en[key] ||
        key;
}

/** Returns a full set of default strings for the given language */
export function getDefaultTranslations(language) {
    return { ...(LANGUAGE_DEFAULTS[language] || LANGUAGE_DEFAULTS.en) };
}
