import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/utils/translationDefaults';

export default function VoiceSelectionPanel({ isOpen, onClose, onContinue, defaultLanguage = 'en' }) {
    const [selectedVoice, setSelectedVoice] = useState('berger');
    const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
    const [selectedModel, setSelectedModel] = useState('haiku');
    const [customVoiceDescription, setCustomVoiceDescription] = useState('');
    const [showContext, setShowContext] = useState(false);
    const [storyContext, setStoryContext] = useState({
        story_title: '',
        story_description: '',
        locations: '',
        date_range: '',
        additional_context: ''
    });

    const voices = [
        {
            id: 'berger',
            title: 'Critical Perspective',
            subtitle: 'Ways of Seeing - John Berger',
            description: 'Questions power, context, and how we\'re taught to see',
            bestFor: 'Documentary work, social commentary, travel with critical lens',
            color: 'blue'
        },
        {
            id: 'jobey',
            title: 'Human & Relational',
            subtitle: 'What Would Liz Say - Liz Jobey',
            description: 'Focuses on relationships, memory, and emotional truths',
            bestFor: 'Personal journeys, family stories, intimate documentation',
            color: 'green'
        },
        {
            id: 'fulton',
            title: 'Journey-Focused',
            subtitle: 'The Walk Between Points - Hamish Fulton',
            description: 'Emphasizes passage, distance, and the experience of movement',
            bestFor: 'Hiking, road trips, pilgrimages, journey-based stories',
            color: 'amber'
        },
        {
            id: 'custom',
            title: 'Custom Voice',
            subtitle: 'Your Own Approach',
            description: 'Describe your own approach to captions',
            bestFor: 'Specialized perspectives, specific organizational style',
            color: 'purple'
        }
    ];

    const getAdditionalContextLabel = () => {
        switch(selectedVoice) {
            case 'berger':
                return 'Important social/cultural context:';
            case 'jobey':
                return 'Key people/relationships:';
            case 'fulton':
                return 'Route & total distance/duration:';
            default:
                return null;
        }
    };

    const handleContinue = () => {
        onContinue({
            caption_voice: selectedVoice,
            custom_caption_voice_description: selectedVoice === 'custom' ? customVoiceDescription : null,
            story_context: showContext ? storyContext : null,
            language: selectedLanguage,
            model: selectedModel,
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/30 z-[80]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-[60vw] bg-white shadow-2xl z-[90] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                                <h2 className="text-4xl font-bold text-slate-800">Select Caption Voice</h2>
                                <p className="text-sm text-slate-600 mt-1">Choose how captions will be written for your photos</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Language */}
                            <div className="mb-6">
                                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                                    Caption Language
                                </Label>
                                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
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

                            {/* Model */}
                            <div className="mb-6">
                                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                                    AI Model
                                </Label>
                                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                                    {[
                                        { id: 'haiku',  label: 'Haiku',  sub: 'Fast · placeholder quality' },
                                        { id: 'sonnet', label: 'Sonnet', sub: 'Slower · higher quality' },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedModel(m.id)}
                                            className={`flex-1 px-4 py-3 text-left transition-colors ${
                                                selectedModel === m.id
                                                    ? 'bg-amber-600 text-white'
                                                    : 'bg-white text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="text-sm font-semibold">{m.label}</div>
                                            <div className={`text-xs mt-0.5 ${selectedModel === m.id ? 'text-amber-100' : 'text-slate-400'}`}>
                                                {m.sub}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Voice Options */}
                            <div className="space-y-3 mb-6">
                                {voices.map((voice) => {
                                    const colors = {
                                        blue: { bg: 'bg-blue-50', border: 'border-blue-300', ring: 'ring-blue-500', text: 'text-blue-700' },
                                        green: { bg: 'bg-green-50', border: 'border-green-300', ring: 'ring-green-500', text: 'text-green-700' },
                                        amber: { bg: 'bg-amber-50', border: 'border-amber-300', ring: 'ring-amber-500', text: 'text-amber-700' },
                                        purple: { bg: 'bg-purple-50', border: 'border-purple-300', ring: 'ring-purple-500', text: 'text-purple-700' }
                                    };
                                    const colorSet = colors[voice.color];
                                    const isSelected = selectedVoice === voice.id;

                                    return (
                                        <motion.label
                                            key={voice.id}
                                            className={`
                                                block rounded-lg border-2 p-4 cursor-pointer transition-all
                                                ${isSelected 
                                                    ? `${colorSet.bg} ${colorSet.border} ring-2 ${colorSet.ring}` 
                                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                                }
                                            `}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="radio"
                                                    name="voice"
                                                    value={voice.id}
                                                    checked={isSelected}
                                                    onChange={(e) => setSelectedVoice(e.target.value)}
                                                    className="mt-1 w-4 h-4 text-blue-600"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <h3 className={`text-lg font-semibold ${isSelected ? colorSet.text : 'text-slate-800'}`}>
                                                            {voice.title}
                                                        </h3>
                                                        <span className="text-xs text-slate-500">{voice.subtitle}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-1">{voice.description}</p>
                                                    <p className="text-xs text-slate-500 mt-2">
                                                        <span className="font-medium">Best for:</span> {voice.bestFor}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.label>
                                    );
                                })}
                            </div>

                            {/* Custom Voice Description */}
                            <AnimatePresence>
                                {selectedVoice === 'custom' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-6"
                                    >
                                        <Label htmlFor="customVoice" className="text-sm font-medium text-slate-700 mb-2 block">
                                            Describe your caption approach:
                                        </Label>
                                        <Textarea
                                            id="customVoice"
                                            value={customVoiceDescription}
                                            onChange={(e) => setCustomVoiceDescription(e.target.value)}
                                            placeholder="e.g., 'Write like a naturalist's field notes - observant, specific, focused on flora and fauna'"
                                            className="min-h-[100px]"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Story Context Section */}
                            <div className="border-t pt-6">
                                <button
                                    onClick={() => setShowContext(!showContext)}
                                    className="flex items-center justify-between w-full text-left mb-4"
                                >
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">Story Context</h3>
                                        <p className="text-sm text-slate-600">Optional: Provide additional context for better captions</p>
                                    </div>
                                    {showContext ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </button>

                                <AnimatePresence>
                                    {showContext && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-4"
                                        >
                                            <div>
                                                <Label htmlFor="storyTitle" className="text-sm font-medium text-slate-700 mb-1 block">
                                                    Story Title
                                                </Label>
                                                <Input
                                                    id="storyTitle"
                                                    value={storyContext.story_title}
                                                    onChange={(e) => setStoryContext({...storyContext, story_title: e.target.value})}
                                                    placeholder="Enter story title"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="storyDescription" className="text-sm font-medium text-slate-700 mb-1 block">
                                                    Story Description
                                                </Label>
                                                <Textarea
                                                    id="storyDescription"
                                                    value={storyContext.story_description}
                                                    onChange={(e) => setStoryContext({...storyContext, story_description: e.target.value})}
                                                    placeholder="What is this story about? (1-3 sentences)"
                                                    className="min-h-[80px]"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="locations" className="text-sm font-medium text-slate-700 mb-1 block">
                                                    Location(s)
                                                </Label>
                                                <Input
                                                    id="locations"
                                                    value={storyContext.locations}
                                                    onChange={(e) => setStoryContext({...storyContext, locations: e.target.value})}
                                                    placeholder="e.g., Northern Kenya, Samburu Region"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="dateRange" className="text-sm font-medium text-slate-700 mb-1 block">
                                                    Date Range
                                                </Label>
                                                <Input
                                                    id="dateRange"
                                                    value={storyContext.date_range}
                                                    onChange={(e) => setStoryContext({...storyContext, date_range: e.target.value})}
                                                    placeholder="e.g., March 2024, Summer 2023"
                                                />
                                            </div>

                                            {getAdditionalContextLabel() && (
                                                <div>
                                                    <Label htmlFor="additionalContext" className="text-sm font-medium text-slate-700 mb-1 block">
                                                        {getAdditionalContextLabel()}
                                                    </Label>
                                                    <Textarea
                                                        id="additionalContext"
                                                        value={storyContext.additional_context}
                                                        onChange={(e) => setStoryContext({...storyContext, additional_context: e.target.value})}
                                                        placeholder={
                                                            selectedVoice === 'berger' ? "e.g., Community displacement, land rights issues" :
                                                            selectedVoice === 'jobey' ? "e.g., Local guide Ahmed, village elder Sarah" :
                                                            selectedVoice === 'fulton' ? "e.g., 85km over 5 days, south to north" :
                                                            ""
                                                        }
                                                        className="min-h-[80px]"
                                                    />
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t p-6 flex justify-between items-center">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleContinue}
                                disabled={selectedVoice === 'custom' && !customVoiceDescription.trim()}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                Generate Descriptions
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}