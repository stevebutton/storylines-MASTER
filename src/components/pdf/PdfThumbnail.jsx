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
                const pdf = await pdfjsLib.getDocument(url).promise;
                
                if (!isMounted) {
                    pdf.destroy();
                    return;
                }
                pdfRef.current = pdf;
                
                const page = await pdf.getPage(1);
                
                if (canvasRef.current && isMounted) {
                    const canvas = canvasRef.current;
                    const container = canvas.parentElement;
                    
                    // Get container dimensions
                    const containerWidth = container?.offsetWidth || 300;
                    const containerHeight = container?.offsetHeight || 200;
                    
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
                    
                    // Create viewport with calculated scale
                    const scaledViewport = page.getViewport({ scale });
                    
                    const context = canvas.getContext('2d');
                    canvas.width = scaledViewport.width;
                    canvas.height = scaledViewport.height;
                    
                    await page.render({
                        canvasContext: context,
                        viewport: scaledViewport,
                    }).promise;
                }
                
                if (isMounted) {
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
            isMounted = false;
            if (pdfRef.current) {
                pdfRef.current.destroy();
                pdfRef.current = null;
            }
        };
    }, [url]);

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