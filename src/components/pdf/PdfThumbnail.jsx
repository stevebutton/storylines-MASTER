import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, FileText } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PdfThumbnail({ url, className = '' }) {
    const canvasRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!url) return;

        setIsLoading(true);
        setError(false);

        const loadingTask = pdfjsLib.getDocument(url);
        loadingTask.promise
            .then(async (pdf) => {
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 0.5 });
                
                if (canvasRef.current) {
                    const canvas = canvasRef.current;
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({
                        canvasContext: context,
                        viewport: viewport,
                    }).promise;
                }
                
                setIsLoading(false);
            })
            .catch((err) => {
                console.error('Error loading PDF thumbnail:', err);
                setError(true);
                setIsLoading(false);
            });
    }, [url]);

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center bg-slate-100 ${className}`}>
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-slate-100 ${className}`}>
                <FileText className="w-8 h-8 text-slate-400" />
            </div>
        );
    }

    return (
        <div className={`${className} overflow-hidden bg-white`}>
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
        </div>
    );
}