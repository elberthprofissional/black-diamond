import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface PhotoCropperProps {
  isOpen: boolean;
  imageFile: File | null;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const CIRCLE_SIZE = 240;
const MIN_SCALE = 1;
const MAX_SCALE = 3;

const PhotoCropper: React.FC<PhotoCropperProps> = ({ isOpen, imageFile, onConfirm, onCancel }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      setScale(1);
      setOffset({ x: 0, y: 0 });
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setOffsetStart({ ...offset });
    },
    [offset]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.x;
      const dy = touch.clientY - dragStart.y;
      setOffset({
        x: offsetStart.x + dx,
        y: offsetStart.y + dy,
      });
    },
    [isDragging, dragStart, offsetStart]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setOffsetStart({ ...offset });
    },
    [offset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset({
        x: offsetStart.x + dx,
        y: offsetStart.y + dy,
      });
    },
    [isDragging, dragStart, offsetStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta)));
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(MAX_SCALE, prev + 0.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(MIN_SCALE, prev - 0.2));
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Draw circular clip
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();

    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve) => {
      img.onload = () => {
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let drawWidth = outputSize * scale;
        let drawHeight = outputSize * scale;

        if (imgAspect > 1) {
          drawHeight = drawWidth / imgAspect;
        } else {
          drawWidth = drawHeight * imgAspect;
        }

        const x = (outputSize - drawWidth) / 2 + offset.x;
        const y = (outputSize - drawHeight) / 2 + offset.y;

        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        resolve();
      };
      img.src = imageUrl;
    });

    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      'image/webp',
      0.85
    );
  }, [imageUrl, scale, offset, onConfirm]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] bg-[#0a0a0a] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 shrink-0">
          <button
            onClick={onCancel}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X size={20} className="text-zinc-300" />
          </button>
          <span className="text-sm font-semibold text-white">Ajustar foto</span>
          <button
            onClick={handleConfirm}
            className="h-8 px-4 flex items-center justify-center rounded-full bg-[#C5A059] hover:bg-[#A68233] text-black text-[11px] font-bold transition-all cursor-pointer"
          >
            Usar foto
          </button>
        </div>

        {/* Cropper Area */}
        <div className="flex-1 flex items-center justify-center px-4 pb-4">
          <div
            ref={containerRef}
            className="relative select-none"
            style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {/* Image */}
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  borderRadius: '50%',
                }}
                draggable={false}
              />
            )}

            {/* Circle mask overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Outer dark area */}
              <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} className="absolute inset-0">
                <defs>
                  <mask id="circleMask">
                    <rect width={CIRCLE_SIZE} height={CIRCLE_SIZE} fill="white" />
                    <circle
                      cx={CIRCLE_SIZE / 2}
                      cy={CIRCLE_SIZE / 2}
                      r={CIRCLE_SIZE / 2 - 2}
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  width={CIRCLE_SIZE}
                  height={CIRCLE_SIZE}
                  fill="rgba(0,0,0,0.6)"
                  mask="url(#circleMask)"
                />
              </svg>

              {/* Circle border */}
              <div
                className="absolute border-2 border-white/30 rounded-full"
                style={{
                  width: CIRCLE_SIZE - 4,
                  height: CIRCLE_SIZE - 4,
                  top: 2,
                  left: 2,
                }}
              />

              {/* Corner guides */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-white/40 rounded-full" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-white/40 rounded-full" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-3 bg-white/40 rounded-full" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-3 bg-white/40 rounded-full" />
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="shrink-0 px-4 pb-8 pt-2">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] transition-colors cursor-pointer"
            >
              <ZoomOut size={16} className="text-zinc-400" />
            </button>
            <div className="flex-1 relative h-1 bg-white/[0.06] rounded-full">
              <input
                type="range"
                min={MIN_SCALE * 100}
                max={MAX_SCALE * 100}
                value={scale * 100}
                onChange={(e) => setScale(parseInt(e.target.value) / 100)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className="absolute top-0 left-0 h-full bg-[#C5A059] rounded-full transition-all"
                style={{ width: `${((scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#C5A059] rounded-full shadow-lg shadow-black/30 transition-all pointer-events-none"
                style={{
                  left: `calc(${((scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100}% - 8px)`,
                }}
              />
            </div>
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] transition-colors cursor-pointer"
            >
              <ZoomIn size={16} className="text-zinc-400" />
            </button>
          </div>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="w-full py-3 flex items-center justify-center gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <RotateCcw size={14} className="text-zinc-400" />
            <span className="text-[12px] text-zinc-400">Resetar posição</span>
          </button>

          {/* Hint */}
          <p className="text-center text-[10px] text-zinc-600 mt-3">
            Arraste para posicionar • Pinça ou scroll pra dar zoom
          </p>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </AnimatePresence>
  );
};

export default PhotoCropper;
