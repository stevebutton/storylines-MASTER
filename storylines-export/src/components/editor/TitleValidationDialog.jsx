import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function TitleValidationDialog({ isOpen, onClose, title, onEdit }) {
    const characterCount = title?.length || 0;
    const overLimit = characterCount - 34;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md z-[100000]">
                <DialogHeader>
                    <div className="flex items-start gap-3 mb-2">
                        <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                        <div>
                            <DialogTitle className="text-left">Title Length Exceeds Limit</DialogTitle>
                        </div>
                    </div>
                    <DialogDescription className="text-left">
                        Your story title contains <span className="font-semibold text-slate-900">{characterCount} characters</span>, 
                        which exceeds the maximum limit of <span className="font-semibold text-slate-900">34 characters</span>.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 pt-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-amber-900 mb-2">Current Title:</p>
                        <p className="text-sm text-slate-700 break-words">{title}</p>
                        <p className="text-xs text-amber-700 mt-2">
                            Please reduce by {overLimit} character{overLimit !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <p className="text-sm text-slate-600">
                        Shorter titles are more effective for display across devices and improve engagement. 
                        Please edit your title to meet the character limit.
                    </p>

                    <Button 
                        onClick={onEdit} 
                        className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                        Edit Title
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}