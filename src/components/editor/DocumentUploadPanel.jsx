import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const TEMPLATE_CONTENT = `# Project Chronicle: [Insert Project Name]
Subtitle: [Brief, Professional Overview of Project]

## Chapter 1: Project Inception and Objectives
Location: [Project Planning Location, e.g., Headquarters, Department Name]
Description: Detail the initial concept, core objectives, and strategic alignment of the project.

*   Slide: Initial Stakeholder Briefing
    Description: Overview of the project's foundational goals and preliminary scope presented to key stakeholders.
    Location: Executive Boardroom
    Image Idea: Professional meeting setting, presentation slides.

*   Slide: Resource Allocation and Team Formation
    Description: Documentation of the approved budget, allocated resources, and the formation of the core project team.
    Location: Project Management Office
    Image Idea: Organizational chart, team members collaborating.

## Chapter 2: Development and Implementation Phase
Location: [Development Site/Facility, e.g., Research Lab, Production Floor]
Description: Document the key stages of development, implementation, and any significant milestones achieved.

*   Slide: Prototype Development and Testing
    Description: Presentation of the initial prototype, including its design, functionality, and results from preliminary testing.
    Location: R&D Laboratory
    Image Idea: Technical drawings, testing equipment, data readouts.

*   Slide: System Integration and Verification
    Description: Description of the integration process for various system components and the verification protocols employed.
    Location: Integration Facility
    Image Idea: Interconnected systems, diagnostic tools.

## Chapter 3: Deployment and Impact Analysis
Location: [Deployment Location, e.g., Client Site, Market Region]
Description: Summarize the deployment process, initial performance metrics, and an analysis of the project's impact.

*   Slide: Rollout Strategy and Execution
    Description: Outline of the phased deployment strategy and a summary of its execution in target environments.
    Location: Operations Center
    Image Idea: Deployment dashboard, operational team.

*   Slide: Post-Deployment Performance Review
    Description: Evaluation of the project's performance against established KPIs and early feedback from end-users or beneficiaries.
    Location: Data Analysis Hub
    Image Idea: Performance graphs, user satisfaction metrics.

## Chapter 4: Future Outlook and Recommendations
Location: [Strategic Planning Area, e.g., Future Initiatives Workshop]
Description: Discuss potential future enhancements, long-term sustainability plans, and strategic recommendations.

*   Slide: Scalability and Future Enhancements
    Description: Projection of the project's scalability and proposed enhancements for future iterations.
    Location: Innovation Meeting
    Image Idea: Brainstorming session, conceptual designs.

*   Slide: Lessons Learned and Best Practices
    Description: Compilation of key lessons learned during the project lifecycle and identification of best practices for future endeavors.
    Location: Knowledge Sharing Session
    Image Idea: Team debrief, documented procedures.
`;

export default function DocumentUploadPanel({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState('instructions'); // instructions, processing, success, error

    const downloadTemplate = () => {
        const blob = new Blob([TEMPLATE_CONTENT], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'story-outline-template.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const processDocument = async () => {
        if (!file) return;

        setIsProcessing(true);
        setStep('processing');

        try {
            // Upload the document
            const { file_url } = await base44.integrations.Core.UploadFile({ file });

            // Extract story structure from document
            const storyData = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url,
                json_schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        subtitle: { type: "string" },
                        author: { type: "string" },
                        chapters: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    location: { type: "string" },
                                    description: { type: "string" },
                                    slides: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                title: { type: "string" },
                                                description: { type: "string" },
                                                location: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (storyData.status === 'error') {
                throw new Error(storyData.details);
            }

            // Create the story
            const newStory = await base44.entities.Story.create({
                title: storyData.output.title,
                subtitle: storyData.output.subtitle,
                author: storyData.output.author,
                is_published: false
            });

            // Create chapters and slides
            for (let i = 0; i < storyData.output.chapters.length; i++) {
                const chapterData = storyData.output.chapters[i];
                const newChapter = await base44.entities.Chapter.create({
                    story_id: newStory.id,
                    order: i,
                    coordinates: [0, 0],
                    zoom: 12,
                    map_style: 'light',
                    alignment: 'left'
                });

                for (let j = 0; j < (chapterData.slides || []).length; j++) {
                    const slideData = chapterData.slides[j];
                    await base44.entities.Slide.create({
                        chapter_id: newChapter.id,
                        order: j,
                        title: slideData.title,
                        description: slideData.description,
                        location: slideData.location || chapterData.location
                    });
                }
            }

            setStep('success');
            setTimeout(() => {
                navigate(`${createPageUrl('StoryEditor')}?id=${newStory.id}`);
            }, 1500);

        } catch (error) {
            console.error('Failed to process document:', error);
            setStep('error');
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
                        onClick={step === 'instructions' ? onClose : undefined}
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
                        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
                            <div className="flex items-center gap-3">
                                <FileText className="w-8 h-8 text-purple-600" />
                                <div>
                                    <h2 className="text-4xl font-bold text-slate-800">Upload Your Outline</h2>
                                    <p className="text-sm text-slate-600 mt-1">Transform your document into an interactive story</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} disabled={isProcessing}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Instructions Step */}
                            {step === 'instructions' && (
                                <div className="space-y-8">
                                    {/* Overview */}
                                    <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-r-lg">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-purple-900 mb-2">
                                                    How It Works
                                                </h3>
                                                <p className="text-slate-700 leading-relaxed">
                                                    Upload a structured document containing your story outline, and our AI will automatically 
                                                    transform it into chapters and slides. Your document should follow a clear format with 
                                                    a title, chapter headings, and scene descriptions.
                                                </p>
                                            </div>
                                            <Button
                                                onClick={downloadTemplate}
                                                variant="outline"
                                                size="sm"
                                                className="ml-4 border-purple-300 text-purple-700 hover:bg-purple-100 flex-shrink-0"
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download Template
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Step-by-Step Instructions */}
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-4">
                                            Preparing Your Document
                                        </h3>

                                        {/* Step 1 */}
                                        <div className="mb-6">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                                                    1
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-slate-800 mb-2">Start with Your Story Title</h4>
                                                    <p className="text-sm text-slate-600 mb-3">
                                                        Begin your document with a clear title and optional subtitle.
                                                    </p>
                                                    <div className="bg-slate-100 rounded-lg p-4 font-mono text-sm">
                                                        <div className="text-purple-600"># The Ancient City of Petra</div>
                                                        <div className="text-slate-600 mt-1">Subtitle: A Journey Through Rose-Red History</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="mb-6">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                                                    2
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-slate-800 mb-2">Define Your Chapters</h4>
                                                    <p className="text-sm text-slate-600 mb-3">
                                                        Use headings for each chapter. Include the location and a brief description.
                                                    </p>
                                                    <div className="bg-slate-100 rounded-lg p-4 font-mono text-sm">
                                                        <div className="text-purple-600">## Chapter 1: Arrival in Wadi Musa</div>
                                                        <div className="text-slate-600 mt-2">Location: Wadi Musa, Jordan</div>
                                                        <div className="text-slate-600 mt-1">Description: Our adventure begins in the bustling town of Wadi Musa, the gateway to Petra.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="mb-6">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                                                    3
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-slate-800 mb-2">Add Slides Within Chapters</h4>
                                                    <p className="text-sm text-slate-600 mb-3">
                                                        Under each chapter, list the individual scenes or moments that make up that chapter.
                                                    </p>
                                                    <div className="bg-slate-100 rounded-lg p-4 font-mono text-sm space-y-3">
                                                        <div>
                                                            <div className="text-purple-600">• Slide: First Glimpse of the Siq</div>
                                                            <div className="text-slate-600 ml-4 mt-1">Description: Walking through the narrow canyon with towering cliffs.</div>
                                                            <div className="text-slate-600 ml-4">Location: The Siq entrance</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-purple-600">• Slide: The Treasury (Al-Khazneh)</div>
                                                            <div className="text-slate-600 ml-4 mt-1">Description: The magnificent facade carved into the cliff.</div>
                                                            <div className="text-slate-600 ml-4">Location: The Treasury, Petra</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Step 4 */}
                                        <div className="mb-6">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                                                    4
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-slate-800 mb-2">Choose Your File Format</h4>
                                                    <p className="text-sm text-slate-600">
                                                        Save your document as a plain text file (.txt), Markdown (.md), or Word document (.docx).
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Upload Section */}
                                    <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 bg-purple-50/50">
                                        {!file ? (
                                            <div className="text-center">
                                                <Upload className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                                                <h3 className="font-semibold text-slate-800 mb-2">
                                                    Ready to Upload?
                                                </h3>
                                                <p className="text-sm text-slate-600 mb-4">
                                                    Select your prepared outline document
                                                </p>
                                                <input
                                                    type="file"
                                                    accept=".txt,.md,.doc,.docx"
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                    id="doc-upload"
                                                />
                                                <label htmlFor="doc-upload">
                                                    <Button className="bg-purple-600 hover:bg-purple-700" asChild>
                                                        <span>Choose Document</span>
                                                    </Button>
                                                </label>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center justify-between mb-4 p-4 bg-white rounded-lg border border-purple-200">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="w-5 h-5 text-purple-600" />
                                                        <div>
                                                            <p className="font-medium text-slate-800">{file.name}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {(file.size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setFile(null)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    onClick={processDocument}
                                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                                >
                                                    Process Document & Create Story
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Processing Step */}
                            {step === 'processing' && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="w-16 h-16 animate-spin text-purple-600 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                        Analyzing Your Document...
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        Extracting chapters, slides, and creating your story structure
                                    </p>
                                </div>
                            )}

                            {/* Success Step */}
                            {step === 'success' && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                        Story Created Successfully!
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        Redirecting to the editor...
                                    </p>
                                </div>
                            )}

                            {/* Error Step */}
                            {step === 'error' && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                        Processing Failed
                                    </h3>
                                    <p className="text-sm text-slate-600 mb-6">
                                        We couldn't extract the story structure from your document. Please check the format and try again.
                                    </p>
                                    <Button
                                        onClick={() => {
                                            setFile(null);
                                            setStep('instructions');
                                        }}
                                        variant="outline"
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}