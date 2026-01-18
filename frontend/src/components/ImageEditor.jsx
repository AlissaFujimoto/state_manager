import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { useGesture } from '@use-gesture/react';
import getCroppedImg from '../utils/canvasUtils';
import { X, Check, RotateCw, RotateCcw, ZoomIn, ZoomOut, Sun, Contrast } from 'lucide-react';

const ImageEditor = ({ imageSrc, onCancel, onSave }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const containerRef = useRef(null);
    const [cropSize, setCropSize] = useState({ width: 280, height: 280 });

    useEffect(() => {
        const updateSize = () => {
            // Responsive crop size calculation
            const isMobile = window.innerWidth < 768;
            const size = isMobile ? Math.min(window.innerWidth - 40, 220) : 280;
            setCropSize({ width: size, height: size });
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Main container gestures (Rotate only - Zoom/Pan handled by Cropper)
    useGesture(
        {
            onPinch: ({ offset: [d], event }) => {
                event.preventDefault();
                const newZoom = 1 + d / 50;
                setZoom(Math.min(3, Math.max(1, newZoom)));
            },
            onRotate: ({ movement: [rotation] }) => {
                setRotation((prev) => (prev + rotation) % 360);
            },
            onWheel: ({ movement: [, y], event }) => {
                event.preventDefault();
                const newZoom = zoom + (y * -0.002);
                setZoom(Math.min(3, Math.max(1, newZoom)));
            }
        },
        {
            target: containerRef,
            eventOptions: { passive: false }
        }
    );

    // Zoom Handle Logic (Borders & Corners)
    const bindZoomHandle = useGesture({
        onDrag: ({ movement: [x, y], args: [direction], memo = zoom }) => {
            let delta = 0;
            // Sensitivity
            const s = 0.005;
            // Inverted logic as requested: Dragging "In" -> Zoom In?
            // "drag the border to internal position the scale should the opposite"
            // Previous: Right (+) -> Zoom In.
            // Inverted: Right (+) -> Zoom Out.
            if (direction === 'right') delta = -x * s;
            if (direction === 'left') delta = x * s;
            if (direction === 'bottom') delta = -y * s;
            if (direction === 'top') delta = y * s;

            // Corners inverted too
            if (direction === 'tr') delta = (-x + y) * s;
            if (direction === 'tl') delta = (x + y) * s;
            if (direction === 'br') delta = (-x - y) * s;
            if (direction === 'bl') delta = (x - y) * s;

            const newZoom = memo + delta;
            setZoom(Math.min(3, Math.max(1, newZoom)));
            return memo;
        }
    });

    // Rotate Handle Logic (Top)
    const bindRotateHandle = useGesture({
        onDrag: ({ movement: [mx], memo = rotation }) => {
            const s = 0.5;
            setRotation((memo + mx * s) % 360);
            return memo;
        }
    });


    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        try {
            const croppedImageBlob = await getCroppedImg(
                imageSrc,
                croppedAreaPixels,
                rotation,
                { horizontal: false, vertical: false },
                brightness,
                contrast,
                512, // outputWidth
                512  // outputHeight
            );
            onSave(croppedImageBlob);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 animate-in fade-in duration-200 h-[100svh] flex flex-col md:h-full md:p-8 md:grid md:place-items-center overflow-hidden">
            <div className="flex flex-col flex-1 w-full h-full md:h-auto md:w-full md:max-w-2xl md:bg-white md:rounded-2xl md:shadow-2xl md:overflow-hidden">
                <div className="relative flex-1 bg-black touch-none min-h-0 md:flex-none md:h-[400px]" ref={containerRef}>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={1}
                        cropSize={cropSize}
                        showGrid={true}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        style={{
                            containerStyle: { background: '#000' },
                            mediaStyle: { filter: `brightness(${brightness}%) contrast(${contrast}%)` },
                            cropAreaStyle: { border: '2px solid rgba(255, 255, 255, 0.5)', transition: '0.2s' }
                        }}
                    />

                    {/* Transform Overlay - Hidden on mobile, visible on desktop (md+) */}
                    <div
                        className="absolute pointer-events-none hidden md:block top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                        style={{ width: cropSize.width, height: cropSize.height }}
                    >
                        {/* Rotation Handle (Top) - Elegant Floating Bubble - Closer offset (-top-12) */}
                        <div {...bindRotateHandle()} className="absolute -top-12 left-1/2 -translate-x-1/2 w-10 h-10 cursor-grab active:cursor-grabbing pointer-events-auto flex items-center justify-center group touch-none z-20 transition-transform hover:scale-110">
                            <div className="w-8 h-8 bg-white/90 backdrop-blur rounded-full shadow-xl flex items-center justify-center border border-white/20">
                                <RotateCw className="w-4 h-4 text-slate-800" />
                            </div>
                        </div>

                        {/* Border Handles (Zoom) */}
                        <div {...bindZoomHandle('top')} className="absolute top-0 left-0 right-0 h-4 -mt-2 cursor-ns-resize pointer-events-auto flex justify-center group z-10"><div className="w-12 h-1 bg-white/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                        <div {...bindZoomHandle('bottom')} className="absolute bottom-0 left-0 right-0 h-4 -mb-2 cursor-ns-resize pointer-events-auto flex justify-center group z-10"><div className="w-12 h-1 bg-white/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                        <div {...bindZoomHandle('left')} className="absolute top-0 bottom-0 left-0 w-4 -ml-2 cursor-ew-resize pointer-events-auto flex items-center group z-10"><div className="h-12 w-1 bg-white/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                        <div {...bindZoomHandle('right')} className="absolute top-0 bottom-0 right-0 w-4 -mr-2 cursor-ew-resize pointer-events-auto flex items-center group z-10"><div className="h-12 w-1 bg-white/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" /></div>

                        {/* Corner Handles (Zoom) - Hidden visuals, just hit areas */}
                        <div {...bindZoomHandle('tl')} className="absolute -top-2 -left-2 w-8 h-8 cursor-nwse-resize pointer-events-auto z-20" />
                        <div {...bindZoomHandle('tr')} className="absolute -top-2 -right-2 w-8 h-8 cursor-nesw-resize pointer-events-auto z-20" />
                        <div {...bindZoomHandle('bl')} className="absolute -bottom-2 -left-2 w-8 h-8 cursor-nesw-resize pointer-events-auto z-20" />
                        <div {...bindZoomHandle('br')} className="absolute -bottom-2 -right-2 w-8 h-8 cursor-nwse-resize pointer-events-auto z-20" />
                    </div>
                </div>

                <div className="bg-white px-4 pb-20 pt-2 md:p-6 rounded-t-2xl space-y-2 md:space-y-6 max-w-2xl mx-auto w-full shadow-2xl shrink-0 z-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 md:gap-y-4">
                        {/* Zoom - Hidden on mobile (use gestures) */}
                        <div className="space-y-2 hidden md:block">
                            <div className="flex items-center justify-between text-sm text-slate-500 font-medium">
                                <span className="flex items-center gap-2"><ZoomIn className="w-4 h-4" /> Zoom</span>
                                <span>{zoom.toFixed(1)}x</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setZoom(Math.max(1, zoom - 0.5))}
                                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-all"
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                />
                                <button
                                    onClick={() => setZoom(Math.min(3, zoom + 0.5))}
                                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-all"
                                    title="Zoom In"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Rotation - Hidden on mobile (use gestures) */}
                        <div className="space-y-2 hidden md:block">
                            <div className="flex items-center justify-between text-sm text-slate-500 font-medium">
                                <span className="flex items-center gap-2"><RotateCw className="w-4 h-4" /> Rotate</span>
                                <span>{rotation}°</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-all"
                                    title="Rotate -90°"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                                <input
                                    type="range"
                                    value={rotation}
                                    min={0}
                                    max={360}
                                    step={1}
                                    aria-labelledby="Rotation"
                                    onChange={(e) => setRotation(Number(e.target.value))}
                                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                />
                                <button
                                    onClick={() => setRotation((r) => (r + 90) % 360)}
                                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-all"
                                    title="Rotate +90°"
                                >
                                    <RotateCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Brightness */}
                        <div className="space-y-1 md:space-y-2">
                            <div className="flex items-center justify-between text-xs md:text-sm text-slate-500 font-medium">
                                <span className="flex items-center gap-2"><Sun className="w-4 h-4" /> Brightness</span>
                                <span>{brightness}%</span>
                            </div>
                            <input
                                type="range"
                                value={brightness}
                                min={0}
                                max={200}
                                step={1}
                                aria-labelledby="Brightness"
                                onChange={(e) => setBrightness(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600 touch-pan-x"
                            />
                        </div>

                        {/* Contrast */}
                        <div className="space-y-1 md:space-y-2">
                            <div className="flex items-center justify-between text-xs md:text-sm text-slate-500 font-medium">
                                <span className="flex items-center gap-2"><Contrast className="w-4 h-4" /> Contrast</span>
                                <span>{contrast}%</span>
                            </div>
                            <input
                                type="range"
                                value={contrast}
                                min={0}
                                max={200}
                                step={1}
                                aria-labelledby="Contrast"
                                onChange={(e) => setContrast(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600 touch-pan-x"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 md:pt-4 border-t border-slate-100">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 md:px-6 md:py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all flex items-center gap-2 text-sm md:text-base"
                        >
                            <X className="w-4 h-4 md:w-5 md:h-5" /> Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 md:px-6 md:py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200 text-sm md:text-base"
                        >
                            <Check className="w-4 h-4 md:w-5 md:h-5" /> Save Image
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;
