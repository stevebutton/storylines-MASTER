import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Copy, Check, Wand2, MapPin, FileText, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
            throw new Error('AI generation requires LLM API key — not yet configured');
        } catch (error) {
            console.error('Failed to generate outline:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const generateSlideContent = async () => {
        if (!selectedChapterId) return;

        setIsGenerating(true);
        setResult(null);
        try {
            throw new Error('AI generation requires LLM API key — not yet configured');
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
                className="fixed right-0 top-0 bottom-0 w-[650px] bg-white border-l shadow-2xl z-50 flex flex-col"
            >
                {/* Header */}
                <div className="bg-white border-b shadow-sm">
                    <div className="px-4 py-3">
                        <div className="flex items-center gap-4 mb-4">
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            <Link to={createPageUrl('HomePageView')}>
                                <img
                                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693030a5e25aa73dea8d72c2/91ab42d74_logoadjustedpng.png"
                                    alt="Storylines"
                                    width="250"
                                    height="100"
                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                />
                            </Link>
                            <h1 className="text-[42px] font-bold text-slate-900 flex-1 leading-tight">
                                Story Helper
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="mx-4 mt-4 flex-shrink-0">
                        <TabsTrigger value="outline" className="flex-1">
                            <MapPin className="w-4 h-4 mr-1" /> Story Outline
                        </TabsTrigger>
                        <TabsTrigger value="slides" className="flex-1">
                            <FileText className="w-4 h-4 mr-1" /> Slide Content
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="outline" className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 flex flex-col p-4 space-y-4 min-h-0">
                            <div className="flex-shrink-0">
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

                            {result?.type === 'outline' && (
                                <ScrollArea className="flex-1 border rounded-lg min-h-0">
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
                                    </div>
                                </ScrollArea>
                            )}
                        </div>

                        <div className="flex-shrink-0 p-4 border-t bg-white">
                            <Button 
                                onClick={result?.type === 'outline' ? () => onApplyOutline?.(result.data) : generateOutline} 
                                disabled={isGenerating || (!result?.type && !prompt.trim())}
                                className="w-full bg-amber-600 hover:bg-amber-700"
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                ) : result?.type === 'outline' ? (
                                    <><Check className="w-4 h-4 mr-2" /> Apply to Story</>
                                ) : (
                                    <><Wand2 className="w-4 h-4 mr-2" /> Generate Outline</>
                                )}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="slides" className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 flex flex-col p-4 space-y-4 min-h-0">
                            <div className="flex-shrink-0 space-y-4">
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
                            </div>

                            {result?.type === 'slides' && (
                                <ScrollArea className="flex-1 border rounded-lg min-h-0">
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
                                    </div>
                                </ScrollArea>
                            )}
                        </div>

                        <div className="flex-shrink-0 p-4 border-t bg-white">
                            <Button 
                                onClick={result?.type === 'slides' ? () => onApplySlideContent?.(result.data, result.chapterId) : generateSlideContent} 
                                disabled={isGenerating || (!result?.type && !selectedChapterId)}
                                className="w-full bg-amber-600 hover:bg-amber-700"
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                ) : result?.type === 'slides' ? (
                                    <><Check className="w-4 h-4 mr-2" /> Apply to Chapter</>
                                ) : (
                                    <><Wand2 className="w-4 h-4 mr-2" /> Generate Content</>
                                )}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </AnimatePresence>
    );
}