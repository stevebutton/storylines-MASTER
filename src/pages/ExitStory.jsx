import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ExitStory() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const storyId = queryParams.get('storyId');



    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center space-y-6"
            >
                <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
                
                <h2 className="text-3xl font-bold text-slate-800">
                    Story Captured Successfully
                </h2>
                
                <p className="text-lg text-slate-700 leading-relaxed">
                    Your field story has been saved. You can view it in the Storylines preview 
                    or create another story from the field.
                </p>

                <div className="pt-4 space-y-3">
                    {storyId && (
                        <Button
                            onClick={() => navigate(`${createPageUrl('StoryMapView')}?storyId=${storyId}`)}
                            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                        >
                            View Story in Storylines
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    )}
                    <Button
                        onClick={() => navigate(createPageUrl('Storyboarder'))}
                        variant="outline"
                        className="w-full h-12"
                    >
                        Create Another Story
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}