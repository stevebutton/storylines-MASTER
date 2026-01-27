import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Download, Printer } from 'lucide-react';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PdfViewer({ url, className = '' }) {
    const canvasRef = useRef(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.5);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load PDF document
    useEffect(() => {
        if (!url) return;

        setIsLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument(url);
        loadingTask.promise
            .then((pdf) => {
                setPdfDoc(pdf);
                setTotalPages(pdf.numPages);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error('Error loading PDF:', err);
                setError('Failed to load PDF document');
                setIsLoading(false);
            });

        return () => {
            if (pdfDoc) {
                pdfDoc.destroy();
            }
        };
    }, [url]);

    // Render current page
    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        pdfDoc.getPage(currentPage).then((page) => {
            const viewport = page.getViewport({ scale });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };

            page.render(renderContext);
        });
    }, [pdfDoc, currentPage, scale]);

    const goToPrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const zoomIn = () => {
        setScale(Math.min(scale + 0.25, 3));
    };

    const zoomOut = () => {
        setScale(Math.max(scale - 0.25, 0.5));
    };

    const handleSave = () => {
        const link = document.createElement('a');
        link.href = url;
        link.download = url.split('/').pop() || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        const printWindow = window.open(url);
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Controls */}
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-slate-600">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={zoomOut}>
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-slate-600">{Math.round(scale * 100)}%</span>
                    <Button variant="outline" size="sm" onClick={zoomIn}>
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-slate-200 mx-2" />
                    <Button variant="outline" size="sm" onClick={handleSave}>
                        <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* PDF Canvas */}
            <div className="flex-1 overflow-auto bg-slate-100 p-4">
                <div className="flex justify-center">
                    <canvas ref={canvasRef} className="shadow-lg" />
                </div>
            </div>
        </div>
    );
}