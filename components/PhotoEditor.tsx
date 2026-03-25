"use client";

import { useState, useRef, useEffect, useCallback } from 'react';

const FILTERS: { id: string; label: string; css: string }[] = [
  { id: 'normal',  label: 'なし',    css: 'none' },
  { id: 'bright',  label: '明るい',  css: 'brightness(1.25) contrast(1.05)' },
  { id: 'warm',    label: '暖かい',  css: 'sepia(0.35) saturate(1.4) brightness(1.05)' },
  { id: 'cool',    label: 'クール',  css: 'hue-rotate(15deg) saturate(1.2) brightness(1.05)' },
  { id: 'vivid',   label: '鮮やか',  css: 'saturate(1.8) contrast(1.1)' },
  { id: 'vintage', label: 'ヴィンテージ', css: 'sepia(0.5) contrast(1.15) brightness(0.9) saturate(0.8)' },
  { id: 'bw',      label: 'モノクロ', css: 'grayscale(1) contrast(1.1)' },
];

const OUTPUT_SIZE = 900;

interface Props {
  file: File;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export default function PhotoEditor({ file, onConfirm, onCancel }: Props) {
  const [filter, setFilter] = useState('normal');
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);
  const [imgNW, setImgNW] = useState(1);
  const [imgNH, setImgNH] = useState(1);
  const [previewUrl, setPreviewUrl] = useState('');
  const [processing, setProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const CROP = 320; // px of the crop preview

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const img = new Image();
    img.onload = () => {
      setImgNW(img.naturalWidth);
      setImgNH(img.naturalHeight);
      // Initial scale: fill crop area
      const minScale = Math.max(CROP / img.naturalWidth, CROP / img.naturalHeight);
      setScale(minScale);
      // Center
      setOffsetX((CROP - img.naturalWidth * minScale) / 2);
      setOffsetY((CROP - img.naturalHeight * minScale) / 2);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clampOffset = useCallback((ox: number, oy: number, s: number) => {
    const maxX = 0;
    const minX = CROP - imgNW * s;
    const maxY = 0;
    const minY = CROP - imgNH * s;
    return {
      x: Math.min(maxX, Math.max(minX, ox)),
      y: Math.min(maxY, Math.max(minY, oy)),
    };
  }, [imgNW, imgNH]);

  // Pointer drag
  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offsetX, oy: offsetY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const { x, y } = clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy, scale);
    setOffsetX(x);
    setOffsetY(y);
  };

  const onPointerUp = () => { dragRef.current = null; };

  const handleScaleChange = (newScale: number) => {
    const { x, y } = clampOffset(offsetX, offsetY, newScale);
    setScale(newScale);
    setOffsetX(x);
    setOffsetY(y);
  };

  const minScale = Math.max(CROP / imgNW, CROP / imgNH);

  const filterCss = FILTERS.find(f => f.id === filter)?.css ?? 'none';

  const handleConfirm = async () => {
    setProcessing(true);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d')!;

    // Source rect in image coordinates
    const sx = -offsetX / scale;
    const sy = -offsetY / scale;
    const sw = CROP / scale;
    const sh = CROP / scale;

    if (filterCss !== 'none') ctx.filter = filterCss;
    const img = new Image();
    img.src = previewUrl;
    await new Promise<void>((res) => { img.onload = () => res(); if (img.complete) res(); });
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob((blob) => {
      if (!blob) { setProcessing(false); return; }
      const outFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
      onConfirm(outFile);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <h3 className="text-base font-bold text-text-main">写真を編集</h3>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-background-soft text-text-sub hover:text-text-main">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="2" y1="14" x2="14" y2="2"/><line x1="2" y1="2" x2="14" y2="14"/>
            </svg>
          </button>
        </div>

        {/* Crop area */}
        <div className="flex justify-center py-4 bg-gray-100">
          <div
            ref={containerRef}
            style={{ width: CROP, height: CROP, overflow: 'hidden', position: 'relative', cursor: 'grab', userSelect: 'none', touchAction: 'none', borderRadius: 8 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {previewUrl && (
              <img
                src={previewUrl}
                alt="edit"
                draggable={false}
                style={{
                  position: 'absolute',
                  width: imgNW * scale,
                  height: imgNH * scale,
                  left: offsetX,
                  top: offsetY,
                  filter: filterCss === 'none' ? undefined : filterCss,
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            )}
            {/* Grid overlay */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: '33.3%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
              <div style={{ position: 'absolute', left: '66.6%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
              <div style={{ position: 'absolute', top: '33.3%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
              <div style={{ position: 'absolute', top: '66.6%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
            </div>
          </div>
        </div>

        {/* Zoom slider */}
        <div className="px-5 py-3 flex items-center gap-3 border-b border-border-light">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-text-sub flex-shrink-0" viewBox="0 0 16 16">
            <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11M13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0"/>
            <path d="M10.344 11.742q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1 6.5 6.5 0 0 1-1.398 1.4z"/>
            <path fillRule="evenodd" d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5"/>
          </svg>
          <input
            type="range"
            min={minScale}
            max={minScale * 3}
            step={0.01}
            value={scale}
            onChange={(e) => handleScaleChange(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="text-text-sub flex-shrink-0" viewBox="0 0 16 16">
            <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11M13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0"/>
            <path d="M10.344 11.742q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1 6.5 6.5 0 0 1-1.398 1.4z"/>
            <path fillRule="evenodd" d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5"/>
          </svg>
        </div>

        {/* Filter selector */}
        <div className="px-4 py-3 border-b border-border-light">
          <p className="text-[10px] font-bold text-text-sub uppercase tracking-wider mb-2">フィルター</p>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
                  filter === f.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-background-soft'
                }`}
              >
                <div style={{ width: 52, height: 52, overflow: 'hidden', borderRadius: 8 }}>
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt={f.label}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: f.css === 'none' ? undefined : f.css,
                      }}
                    />
                  )}
                </div>
                <span className={`text-[10px] font-bold ${filter === f.id ? 'text-primary' : 'text-text-sub'}`}>
                  {f.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-border-light rounded-xl text-sm font-bold text-text-sub hover:bg-background-soft transition-colors">
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors disabled:opacity-60"
          >
            {processing ? '処理中...' : 'この内容で確定'}
          </button>
        </div>
      </div>
    </div>
  );
}
