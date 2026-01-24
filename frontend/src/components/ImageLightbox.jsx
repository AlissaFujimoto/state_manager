import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import CompressedImage from './CompressedImage';

/**
 * Image Lightbox Modal
 * Allows users to view, zoom, pan, and navigate through images
 */
const ImageLightbox = ({ images, initialIndex = 0, isOpen, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    useEffect(() => {
        // Reset zoom and position when changing images
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
    }, [currentIndex]);

    useEffect(() => {
        // Keyboard navigation
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    handlePrevious();
                    break;
                case 'ArrowRight':
                    handleNext();
                    break;
                case '+':
                case '=':
                    handleZoomIn();
                    break;
                case '-':
                    handleZoomOut();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex, zoom]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.5, 4));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.5, 1));
        if (zoom <= 1.5) {
            setPosition({ x: 0, y: 0 });
        }
    };

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    const handleMouseDown = (e) => {
        if (zoom > 1) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging && zoom > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (!isOpen || !images || images.length === 0) return null;

    return createPortal(
        <AnimatePresence>
            <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm"
                onClick={onClose}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[110] p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-white" />
                </button>

                {/* Controls */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full p-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        disabled={zoom <= 1}
                    >
                        <ZoomOut className="w-5 h-5 text-white" />
                    </button>
                    <span className="text-white text-sm font-medium px-2">{Math.round(zoom * 100)}%</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        disabled={zoom >= 4}
                    >
                        <ZoomIn className="w-5 h-5 text-white" />
                    </button>
                    <div className="w-px h-6 bg-white/20 mx-1"></div>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleRotate(); }}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <RotateCw className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[110] bg-white/10 backdrop-blur-md rounded-full px-4 py-2">
                    <span className="text-white text-sm font-medium">
                        {currentIndex + 1} / {images.length}
                    </span>
                </div>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-[110] p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-[110] p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <ChevronRight className="w-6 h-6 text-white" />
                        </button>
                    </>
                )}

                {/* Image Container */}
                <div
                    className="absolute inset-0 flex items-center justify-center p-16"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                >
                    <Motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                            opacity: 1,
                            scale: zoom,
                            x: position.x,
                            y: position.y,
                            rotate: rotation
                        }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                            duration: isDragging ? 0 : 0.2,
                            ease: "easeOut"
                        }}
                        style={{
                            transformOrigin: 'center center',
                        }}
                        className="max-w-full max-h-full"
                    >
                        <CompressedImage
                            src={images[currentIndex]}
                            alt={`Image ${currentIndex + 1}`}
                            className="max-w-full max-h-full object-contain select-none"
                            style={{ pointerEvents: 'none' }}
                        />
                    </Motion.div>
                </div>

                {/* Thumbnail Strip */}
                {images.length > 1 && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[110] flex gap-2 bg-white/10 backdrop-blur-md rounded-full p-2 max-w-[90vw] overflow-x-auto">
                        {images.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${idx === currentIndex ? 'border-white scale-110' : 'border-white/30 hover:border-white/60'
                                    }`}
                            >
                                <CompressedImage
                                    src={img}
                                    alt={`Thumbnail ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </Motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default ImageLightbox;
