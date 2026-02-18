import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Download, Printer, Search, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PdfViewer({ url, className = '' }) {
    const canvasRef = useRef(null);
    const thumbnailsRef = useRef([]);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(0.75);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showThumbnails, setShowThumbnails] = useState(true);
    const [thumbnails, setThumbnails] = useState([]);

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
                generateThumbnails(pdf);
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

    // Generate thumbnails
    const generateThumbnails = async (pdf) => {
        const thumbs = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.3 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            thumbs.push({
                pageNum: i,
                dataUrl: canvas.toDataURL(),
            });
        }
        setThumbnails(thumbs);
    };

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

    // Search functionality
    const handleSearch = async () => {
        if (!pdfDoc || !searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        const results = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');

            if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
                results.push(i);
            }
        }
        setSearchResults(results);
        if (results.length > 0) {
            setCurrentPage(results[0]);
        }
    };

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
        <div className={`flex h-full ${className}`}>
            {/* Thumbnail Sidebar */}
            {showThumbnails && (
                <div className="w-48 border-r bg-slate-50 overflow-y-auto p-2">
                    <div className="space-y-2">
                        {thumbnails.map((thumb) => (
                            <button
                                key={thumb.pageNum}
                                onClick={() => setCurrentPage(thumb.pageNum)}
                                className={cn(
                                    "w-full rounded-lg overflow-hidden border-2 transition-all",
                                    currentPage === thumb.pageNum
                                        ? "border-amber-600 shadow-md"
                                        : "border-transparent hover:border-slate-300"
                                )}
                            >
                                <img
                                    src={thumb.dataUrl}
                                    alt={`Page ${thumb.pageNum}`}
                                    className="w-full"
                                />
                                <div className="text-xs text-center py-1 bg-white">
                                    Page {thumb.pageNum}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Viewer */}
            <div className="flex-1 flex flex-col">
                {/* Controls */}
                <div className="flex items-center justify-between p-4 border-b bg-slate-50 flex-wrap gap-2">
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

                    {/* Search Bar */}
                    <div className="flex items-center gap-2">
                        <Input
                            type="text"
                            placeholder="Search in document..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-48 h-8 text-sm"
                        />
                        <Button variant="outline" size="sm" onClick={handleSearch}>
                            <Search className="w-4 h-4" />
                        </Button>
                        {searchResults.length > 0 && (
                            <span className="text-xs text-slate-600">
                                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowThumbnails(!showThumbnails)}
                            className={showThumbnails ? 'bg-amber-50' : ''}
                        >
                            <Grid className="w-4 h-4" />
                        </Button>
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
        </div>
    );
}
