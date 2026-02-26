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
        if (!url) {
            setIsLoading(false);
            setError(true);
            return;
        }

        let isMounted = true;
        setIsLoading(true);
        setError(false);

        const loadPdfAndRenderThumbnail = async () => {
            if (pdfRef.current) {
                pdfRef.current.destroy();
                pdfRef.current = null;
            }

            try {
                console.log('[THUMB] Loading PDF:', url.substring(0, 50));
                const pdf = await pdfjsLib.getDocument(url).promise;
                console.log('[THUMB] PDF loaded, pages:', pdf.numPages);
                
                if (!isMounted) {
                    pdf.destroy();
                    return;
                }
                pdfRef.current = pdf;
                
                const page = await pdf.getPage(1);
                console.log('[THUMB] Got page 1');
                
                if (canvasRef.current && isMounted) {
                    const canvas = canvasRef.current;
                    const container = canvas.parentElement;
                    
                    // Get container dimensions
                    const containerWidth = container?.offsetWidth || 300;
                    const containerHeight = container?.offsetHeight || 200;
                    console.log('[THUMB] Container:', containerWidth, 'x', containerHeight);
                    
                    // Get PDF page dimensions at scale 1
                    const viewport = page.getViewport({ scale: 1 });
                    const pageAspect = viewport.width / viewport.height;
                    const containerAspect = containerWidth / containerHeight;
                    
                    // Calculate scale to fit PDF in container
                    let scale;
                    if (pageAspect > containerAspect) {
                        // PDF is wider - fit to width
                        scale = containerWidth / viewport.width;
                    } else {
                        // PDF is taller - fit to height
                        scale = containerHeight / viewport.height;
                    }
                    console.log('[THUMB] Calculated scale:', scale);
                    
                    // Create viewport with calculated scale
                    const scaledViewport = page.getViewport({ scale });
                    
                    const context = canvas.getContext('2d');
                    canvas.width = scaledViewport.width;
                    canvas.height = scaledViewport.height;
                    console.log('[THUMB] Canvas size:', canvas.width, 'x', canvas.height);
                    
                    await page.render({
                        canvasContext: context,
                        viewport: scaledViewport,
                    }).promise;
                    console.log('[THUMB] ✓ Render complete!');
                } else {
                    console.log('[THUMB] No canvas or unmounted');
                }
                
                if (isMounted) {
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('[THUMB] Error:', err);
                if (isMounted) {
                    setError(true);
                    setIsLoading(false);
                }
            }
        };

        loadPdfAndRenderThumbnail();

        return () => {
            isMounted = false;
            if (pdfRef.current) {
                pdfRef.current.destroy();
                pdfRef.current = null;
            }
        };
    }, [url]);

    return (
        <div className={`${className} overflow-hidden bg-white flex items-center justify-center relative`}>
            <canvas ref={canvasRef} className="max-w-full max-h-full" />
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                    <FileText className="w-8 h-8 text-slate-400" />
                </div>
            )}
        </div>
    );
}