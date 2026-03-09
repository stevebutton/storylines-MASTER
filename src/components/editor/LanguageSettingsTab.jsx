import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    LANGUAGE_DEFAULTS,
    TRANSLATION_FIELD_LABELS,
    SUPPORTED_LANGUAGES,
} from '@/utils/translationDefaults';

export default function LanguageSettingsTab({ item, onUpdate }) {
    const language     = item.story_language || 'en';
    const translations = item.translations   || {};
    const defaults     = LANGUAGE_DEFAULTS[language] || LANGUAGE_DEFAULTS.en;

    const handleLanguageChange = (newLang) => {
        onUpdate({ ...item, story_language: newLang });
    };

    const handleTranslationChange = (key, value) => {
        const next = { ...translations };
        if (value.trim() === '') {
            delete next[key];
        } else {
            next[key] = value;
        }
        onUpdate({ ...item, translations: next });
    };

    return (
        <div className="space-y-6">
            <div>
                <Label className="text-sm font-semibold text-slate-900">Base Language</Label>
                <p className="text-xs text-slate-500 mt-0.5 mb-2">
                    Sets the language for viewer-facing text. The editor always stays in English.
                </p>
                <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {SUPPORTED_LANGUAGES.map(lang => (
                            <SelectItem key={lang.code} value={lang.code}>{lang.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label className="text-sm font-semibold text-slate-900">Translation Overrides</Label>
                <p className="text-xs text-slate-500 mt-0.5 mb-4">
                    Personalise any viewer-facing string. Leave blank to use the language default shown in the placeholder.
                </p>
                <div className="space-y-3">
                    {Object.keys(TRANSLATION_FIELD_LABELS).map(key => (
                        <div key={key}>
                            <Label className="text-xs text-slate-600 mb-1 block">
                                {TRANSLATION_FIELD_LABELS[key]}
                            </Label>
                            <Input
                                value={translations[key] || ''}
                                onChange={(e) => handleTranslationChange(key, e.target.value)}
                                placeholder={defaults[key] || key}
                                className="text-sm"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
