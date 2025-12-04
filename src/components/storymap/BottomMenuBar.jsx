import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { List, Plus, Map } from 'lucide-react';

export default function BottomMenuBar() {
    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-white/95 backdrop-blur-xl rounded-full shadow-lg border border-slate-200/50 px-2 py-2 flex items-center gap-1">
                <Link 
                    to={createPageUrl('Stories')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    <List className="w-4 h-4" />
                    <span className="text-sm font-medium">My Stories</span>
                </Link>
                <Link 
                    to={createPageUrl('StoryEditor')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Create</span>
                </Link>
                <Link 
                    to={createPageUrl('StoryMap')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    <Map className="w-4 h-4" />
                    <span className="text-sm font-medium">Main Story</span>
                </Link>
            </div>
        </div>
    );
}