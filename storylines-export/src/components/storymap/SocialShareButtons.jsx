import React, { useState } from 'react';
import { Share2, Facebook, Twitter, Linkedin, Link2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SocialShareButtons({ storyTitle, storyUrl }) {
    const [copied, setCopied] = useState(false);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(storyUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    const shareOnFacebook = () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storyUrl)}`;
        window.open(url, '_blank', 'width=600,height=400');
    };

    const shareOnTwitter = () => {
        const text = encodeURIComponent(storyTitle);
        const url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(storyUrl)}`;
        window.open(url, '_blank', 'width=600,height=400');
    };

    const shareOnLinkedIn = () => {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(storyUrl)}`;
        window.open(url, '_blank', 'width=600,height=400');
    };

    return (
        <div className="flex items-center" style={{ gap: '17px' }}>
            <Share2 className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-500">Share:</span>
            
            <button
                onClick={shareOnFacebook}
                className="p-3 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="Share on Facebook"
            >
                <Facebook className="w-4 h-4 text-slate-600" />
            </button>
            
            <button
                onClick={shareOnTwitter}
                className="p-3 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="Share on Twitter"
            >
                <Twitter className="w-4 h-4 text-slate-600" />
            </button>
            
            <button
                onClick={shareOnLinkedIn}
                className="p-3 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="Share on LinkedIn"
            >
                <Linkedin className="w-4 h-4 text-slate-600" />
            </button>
            
            <button
                onClick={handleCopyLink}
                className={cn(
                    "p-3 rounded-full transition-colors cursor-pointer",
                    copied ? "bg-green-100" : "hover:bg-slate-100"
                )}
                title={copied ? "Link copied!" : "Copy link"}
            >
                {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                ) : (
                    <Link2 className="w-4 h-4 text-slate-600" />
                )}
            </button>
        </div>
    );
}