import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import DocumentManagerContent from '@/components/documents/DocumentManagerContent';
import { ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

export default function StoryLibrary() {
    const [searchParams] = useSearchParams();
    const storyId = searchParams.get('storyId');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link to={`${createPageUrl('StoryMapView')}?id=${storyId}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-light text-slate-800">Story Document Library</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Manage and access all documents associated with this story
                        </p>
                    </div>
                </div>

                {/* Document Manager */}
                <DocumentManagerContent storyId={storyId} />
            </div>
        </div>
    );
}