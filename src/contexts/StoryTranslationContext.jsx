import React, { createContext, useContext, useMemo } from 'react';
import { getT } from '@/utils/translationDefaults';

const StoryTranslationContext = createContext({ t: (key) => key });

export function StoryTranslationProvider({ language = 'en', translations = {}, children }) {
    const t = useMemo(() => getT(language, translations), [language, translations]);
    return (
        <StoryTranslationContext.Provider value={{ t }}>
            {children}
        </StoryTranslationContext.Provider>
    );
}

export function useTranslation() {
    return useContext(StoryTranslationContext);
}
