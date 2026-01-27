import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, FileText } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PdfThumbnail({ url, className = '' }) {
    const canvasRef = useRef(null);
    const pdfRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        console.log('[PdfThumbnail] useEffect triggered, url:', url);
        
        if (!url) {
            console.log('[PdfThumbnail] No URL provided');
            setIsLoading(false);
            setError(true);
            return;
        }

        let isMounted = true;
        setIsLoading(true);
        setError(false);

        const loadPdfAndRenderThumbnail = async () => {
            console.log('[PdfThumbnail] Starting PDF load...');
            
            if (pdfRef.current) {
                pdfRef.current.destroy();
                pdfRef.current = null;
            }

            try {
                console.log('[PdfThumbnail] Fetching PDF document...');
                const pdf = await pdfjsLib.getDocument(url).promise;
                console.log('[PdfThumbnail] PDF loaded successfully, pages:', pdf.numPages);
                
                if (!isMounted) {
                    console.log('[PdfThumbnail] Component unmounted, aborting');
                    pdf.destroy();
                    return;
                }
                pdfRef.current = pdf;
                
                console.log('[PdfThumbnail] Getting first page...');
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 0.5 });
                console.log('[PdfThumbnail] Viewport dimensions:', viewport.width, 'x', viewport.height);
                
                if (canvasRef.current && isMounted) {
                    const canvas = canvasRef.current;
                    const context = canvas.getContext('2d', { willReadFrequently: true });
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    console.log('[PdfThumbnail] Rendering to canvas...');
                    await page.render({
                        canvasContext: context,
                        viewport: viewport,
                    }).promise;
                    console.log('[PdfThumbnail] Render complete!');
                } else {
                    console.log('[PdfThumbnail] Canvas not available or unmounted');
                }
                
                if (isMounted) {
                    console.log('[PdfThumbnail] Setting loading to false');
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('[PdfThumbnail] Error loading PDF:', err);
                if (isMounted) {
                    setError(true);
                    setIsLoading(false);
                }
            }
        };

        loadPdfAndRenderThumbnail();

        return () => {
            console.log('[PdfThumbnail] Cleanup');
            isMounted = false;
            if (pdfRef.current) {
                pdfRef.current.destroy();
                pdfRef.current = null;
            }
        };
    }, [url]);

    console.log('[PdfThumbnail] Render - isLoading:', isLoading, 'error:', error, 'className:', className);

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center bg-slate-100 min-h-[100px] ${className}`}>
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-slate-100 min-h-[100px] ${className}`}>
                <FileText className="w-8 h-8 text-slate-400" />
            </div>
        );
    }

    return (
        <div className={`${className} overflow-hidden bg-white min-h-[100px]`}>
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
        </div>
    );
}