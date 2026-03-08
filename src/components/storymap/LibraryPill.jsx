import React from 'react';
import { Upload } from 'lucide-react';
import { pillShell, pillBtn, pillDivider } from './StoryViewPill';

/**
 * LibraryPill — Library view context sub-pill.
 *
 * Placeholder bar for Library-specific actions.
 * No positioning — rendered inside the sub-pill wrapper in StoryMapView.
 */
export default function LibraryPill({ onUpload }) {
    return (
        <div className={pillShell}>
            <button
                onClick={onUpload}
                className={pillBtn}
                title="Upload document"
                aria-label="Upload document"
            >
                <Upload className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium whitespace-nowrap">Upload Document</span>
            </button>
        </div>
    );
}
