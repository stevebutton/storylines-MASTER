import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function InterviewModePanel({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Welcome to Interview Mode. We'll help you structure your project narrative through a series of focused questions. Let's begin: What is the central theme or focus of your project? Provide a location, concept, or key area of work." }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [storyData, setStoryData] = useState({});
    const messagesEndRef = useRef(null);

    const interviewSteps = [
        { key: 'theme', prompt: "What is the central theme or focus of your project? Provide a location, concept, or key area of work." },
        { key: 'chapters', prompt: "Excellent. How many key sections or geographic areas should this narrative cover? (e.g., 3-5)" },
        { key: 'style', prompt: "What approach should the narrative take? (e.g., analytical, educational, impact-focused, observational)" },
        { key: 'details', prompt: "Please provide any specific details to include: key locations, stakeholder perspectives, contextual background, or critical milestones." }
    ];

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!userInput.trim() || isProcessing) return;

        const newMessages = [...messages, { role: 'user', content: userInput }];
        setMessages(newMessages);
        
        const currentAnswer = userInput;
        setUserInput('');
        setIsProcessing(true);

        // Store the answer
        const stepKey = interviewSteps[currentStep].key;
        const updatedStoryData = { ...storyData, [stepKey]: currentAnswer };
        setStoryData(updatedStoryData);

        // Move to next step or finalize
        if (currentStep < interviewSteps.length - 1) {
            setTimeout(() => {
                const nextStep = currentStep + 1;
                setMessages([...newMessages, { 
                    role: 'assistant', 
                    content: interviewSteps[nextStep].prompt 
                }]);
                setCurrentStep(nextStep);
                setIsProcessing(false);
            }, 800);
        } else {
            // Generate the story
            await generateStory(updatedStoryData);
        }
    };

    const generateStory = async (data) => {
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: '✓ Thank you. We\'ll now generate your project narrative outline...' 
        }]);

        try {
            const prompt = `Based on this interview:
- Theme/Concept: ${data.theme}
- Number of chapters: ${data.chapters}
- Tone/Style: ${data.style}
- Details: ${data.details}

Create a detailed story outline with title, subtitle, and chapters with locations and slide content.`;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        subtitle: { type: "string" },
                        author: { type: "string" },
                        category: { type: "string" },
                        chapters: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    location: { type: "string" },
                                    coordinates: {
                                        type: "array",
                                        items: { type: "number" }
                                    },
                                    slides: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                title: { type: "string" },
                                                description: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `✓ Narrative structure created: "${response.title}". Building your project now...` 
            }]);

            // Create the story
            const newStory = await base44.entities.Story.create({
                title: response.title,
                subtitle: response.subtitle,
                author: response.author || 'Unknown',
                category: response.category || 'other',
                is_published: false
            });

            // Create chapters and slides
            for (let i = 0; i < response.chapters.length; i++) {
                const chapterData = response.chapters[i];
                const newChapter = await base44.entities.Chapter.create({
                    story_id: newStory.id,
                    order: i,
                    coordinates: chapterData.coordinates || [0, 0],
                    zoom: 12,
                    map_style: 'light',
                    alignment: 'left'
                });

                for (let j = 0; j < chapterData.slides.length; j++) {
                    const slideData = chapterData.slides[j];
                    await base44.entities.Slide.create({
                        chapter_id: newChapter.id,
                        order: j,
                        title: slideData.title,
                        description: slideData.description,
                        location: chapterData.location
                    });
                }
            }

            setTimeout(() => {
                navigate(`${createPageUrl('StoryEditor')}?id=${newStory.id}`);
            }, 1500);

        } catch (error) {
            console.error('Failed to generate story:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'An error occurred during processing. Please try again.' 
            }]);
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[69]"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-[60vw] bg-white shadow-2xl z-[80] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-8 h-8 text-amber-600" />
                                <div>
                                    <h2 className="text-4xl font-bold text-slate-800">Interview Mode</h2>
                                    <p className="text-sm text-slate-600 mt-1">Structured guidance for developing your project narrative</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Progress */}
                        <div className="px-6 py-3 bg-slate-50 border-b">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <span>Step {currentStep + 1} of {interviewSteps.length}</span>
                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <motion.div 
                                        className="h-full bg-amber-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((currentStep + 1) / interviewSteps.length) * 100}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                        msg.role === 'user' 
                                            ? 'bg-amber-600 text-white' 
                                            : 'bg-slate-100 text-slate-800'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </motion.div>
                            ))}
                            {isProcessing && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-slate-100 text-slate-800 rounded-2xl px-4 py-3 flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Thinking...</span>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="border-t p-4 bg-white">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Type your answer..."
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    disabled={isProcessing}
                                    className="flex-1"
                                />
                                <Button 
                                    onClick={handleSendMessage}
                                    disabled={!userInput.trim() || isProcessing}
                                    className="bg-amber-600 hover:bg-amber-700"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}