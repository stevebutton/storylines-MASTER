import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Copy, Check, Wand2, MapPin, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIAssistant({ 
    isOpen, 
    onClose, 
    story, 
    chapters, 
    slides,
    onApplyOutline,
    onApplySlideContent 
}) {
    const [activeTab, setActiveTab] = useState('outline');
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);
    const [selectedChapterId, setSelectedChapterId] = useState(null);

    const generateOutline = async () => {
        if (!prompt.trim()) return;
        
        setIsGenerating(true);
        setResult(null);
        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `You are a creative storytelling assistant for an interactive story map application. 
                
Generate a detailed story outline for the following theme/location: "${prompt}"

The outline should include:
1. A compelling title and subtitle
2. 3-5 chapters, each representing a different location or phase of the journey
3. For each chapter, provide:
   - A suggested location name and approximate coordinates (latitude, longitude)
   - 2-3 slides with titles and brief descriptions
   - Mood/atmosphere suggestions

Make it engaging, visual, and suitable for a map-based storytelling experience.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        subtitle: { type: "string" },
                        chapters: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    location: { type: "string" },
                                    coordinates: { 
                                        type: "array", 
                                        items: { type: "number" } 
                                    },
                                    mood: { type: "string" },
                                    slides: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                title: { type: "string" },
                                                description: { type: "string" },
                                                imageIdea: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            setResult({ type: 'outline', data: response });
        } catch (error) {
            console.error('Failed to generate outline:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const generateSlideContent = async () => {
        if (!selectedChapterId) return;
        
        const chapter = chapters.find(c => c.id === selectedChapterId);
        const chapterSlides = slides.filter(s => s.chapter_id === selectedChapterId);
        
        setIsGenerating(true);
        setResult(null);
        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `You are a creative writing assistant for an interactive story map.

Story context:
- Story title: ${story?.title || 'Untitled'}
- Story subtitle: ${story?.subtitle || 'No subtitle'}

Current chapter has ${chapterSlides.length} slides. ${chapterSlides.length > 0 ? `Existing slide titles: ${chapterSlides.map(s => s.title).filter(Boolean).join(', ')}` : ''}

Additional context from user: ${prompt || 'None provided'}

Generate compelling content for ${chapterSlides.length > 0 ? 'improving existing slides' : '3 new slides'} that would fit this chapter. For each slide provide:
1. An engaging title
2. A descriptive paragraph (2-3 sentences) that paints a vivid picture
3. A suggested image description for what photo would work well
4. A suggested location label`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        slides: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    description: { type: "string" },
                                    imageIdea: { type: "string" },
                                    location: { type: "string" }
                                }
                            }
                        },
                        chapterMood: { type: "string" }
                    }
                }
            });
            setResult({ type: 'slides', data: response, chapterId: selectedChapterId });
        } catch (error) {
            console.error('Failed to generate slide content:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(JSON.stringify(text, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                className="fixed right-0 top-0 bottom-0 w-[400px] bg-white border-l shadow-2xl z-50 flex flex-col"
            >
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Sparkles className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-800">AI Assistant</h2>
                            <p className="text-xs text-slate-500">Story writing helper</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <TabsList className="mx-4 mt-4">
                        <TabsTrigger value="outline" className="flex-1">
                            <MapPin className="w-4 h-4 mr-1" /> Story Outline
                        </TabsTrigger>
                        <TabsTrigger value="slides" className="flex-1">
                            <FileText className="w-4 h-4 mr-1" /> Slide Content
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="outline" className="flex-1 flex flex-col p-4 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Describe your story theme or location
                            </label>
                            <Textarea
                                placeholder="E.g., 'A journey through ancient Rome exploring the Colosseum, Forum, and Palatine Hill' or 'A coastal road trip from San Francisco to Los Angeles'"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="h-24"
                            />
                        </div>
                        <Button 
                            onClick={generateOutline} 
                            disabled={isGenerating || !prompt.trim()}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {isGenerating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Wand2 className="w-4 h-4 mr-2" />
                            )}
                            Generate Outline
                        </Button>

                        {result?.type === 'outline' && (
                            <ScrollArea className="flex-1 border rounded-lg">
                                <div className="p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-lg text-slate-800">{result.data.title}</h3>
                                        <Button variant="ghost" size="icon" onClick={() => handleCopy(result.data)}>
                                            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-sm text-slate-600">{result.data.subtitle}</p>
                                    
                                    {result.data.chapters?.map((chapter, idx) => (
                                        <Card key={idx} className="bg-slate-50">
                                            <CardHeader className="py-3">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-amber-600" />
                                                    {chapter.location}
                                                </CardTitle>
                                                {chapter.mood && (
                                                    <p className="text-xs text-slate-500 italic">{chapter.mood}</p>
                                                )}
                                            </CardHeader>
                                            <CardContent className="py-2 space-y-2">
                                                {chapter.slides?.map((slide, sIdx) => (
                                                    <div key={sIdx} className="text-xs border-l-2 border-amber-300 pl-2">
                                                        <p className="font-medium">{slide.title}</p>
                                                        <p className="text-slate-500">{slide.description}</p>
                                                    </div>
                                                ))}
                                                </CardContent>
                                                </Card>
                                                ))}

                                                <Button 
                                                onClick={() => onApplyOutline?.(result.data)} 
                                                className="w-full bg-amber-600 hover:bg-amber-700"
                                                >
                                                Apply to Story
                                                </Button>
                                </div>
                            </ScrollArea>
                        )}
                    </TabsContent>

                    <TabsContent value="slides" className="flex-1 flex flex-col p-4 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Select chapter
                            </label>
                            <select
                                value={selectedChapterId || ''}
                                onChange={(e) => setSelectedChapterId(e.target.value)}
                                className="w-full p-2 border rounded-lg text-sm"
                            >
                                <option value="">Choose a chapter...</option>
                                {chapters.map((chapter, idx) => (
                                    <option key={chapter.id} value={chapter.id}>
                                        Chapter {idx + 1}: {slides.find(s => s.chapter_id === chapter.id)?.title || 'Untitled'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Additional context (optional)
                            </label>
                            <Textarea
                                placeholder="E.g., 'Focus on the food and local cuisine' or 'Emphasize the historical significance'"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="h-20"
                            />
                        </div>
                        <Button 
                            onClick={generateSlideContent} 
                            disabled={isGenerating || !selectedChapterId}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {isGenerating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Wand2 className="w-4 h-4 mr-2" />
                            )}
                            Generate Content
                        </Button>

                        {result?.type === 'slides' && (
                            <ScrollArea className="flex-1 border rounded-lg">
                                <div className="p-4 space-y-3">
                                    {result.data.chapterMood && (
                                        <p className="text-sm text-slate-500 italic border-l-2 border-amber-300 pl-2">
                                            {result.data.chapterMood}
                                        </p>
                                    )}
                                    {result.data.slides?.map((slide, idx) => (
                                        <Card key={idx} className="bg-slate-50">
                                            <CardContent className="py-3 space-y-2">
                                                <p className="font-medium text-slate-800">{slide.title}</p>
                                                <p className="text-sm text-slate-600">{slide.description}</p>
                                                {slide.location && (
                                                    <p className="text-xs text-amber-600 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {slide.location}
                                                    </p>
                                                )}
                                                {slide.imageIdea && (
                                                    <p className="text-xs text-slate-400 italic">
                                                        📷 {slide.imageIdea}
                                                    </p>
                                                )}
                                            </CardContent>
                                            </Card>
                                            ))}

                                            <Button 
                                            onClick={() => onApplySlideContent?.(result.data, result.chapterId)} 
                                            className="w-full bg-amber-600 hover:bg-amber-700"
                                            >
                                            Apply to Chapter
                                            </Button>
                                </div>
                            </ScrollArea>
                        )}
                    </TabsContent>
                </Tabs>
            </motion.div>
        </AnimatePresence>
    );
}