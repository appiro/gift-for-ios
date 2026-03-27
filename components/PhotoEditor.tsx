"use client";

import { useState, useRef, useEffect, useCallback } from 'react';

interface FilterDef {
  id: string; label: string;
  brightness: number; contrast: number; sepia: number;
  saturate: number; hueRotate: number; grayscale: number;
}

const FILTER_DEFS: FilterDef[] = [
  { id: 'normal',  label: 'なし',        brightness: 1,    contrast: 1,    sepia: 0,    saturate: 1,   hueRotate: 0,  grayscale: 0 },
  { id: 'bright',  label: '明るい',      brightness: 1.25, contrast: 1.05, sepia: 0,    saturate: 1,   hueRotate: 0,  grayscale: 0 },
  { id: 'warm',    label: '暖かい',      brightness: 1.05, contrast: 1,    sepia: 0.35, saturate: 1.4, hueRotate: 0,  grayscale: 0 },
  { id: 'cool',    label: 'クール',      brightness: 1.05, contrast: 1,    sepia: 0,    saturate: 1.2, hueRotate: 15, grayscale: 0 },
  { id: 'vivid',   label: '鮮やか',      brightness: 1,    contrast: 1.1,  sepia: 0,    saturate: 1.8, hueRotate: 0,  grayscale: 0 },
  { id: 'vintage', label: 'ヴィンテージ', brightness: 0.9,  contrast: 1.15, sepia: 0.5,  saturate: 0.8, hueRotate: 0,  grayscale: 0 },
  { id: 'bw',      label: 'モノクロ',    brightness: 1,    contrast: 1.1,  sepia: 0,    saturate: 1,   hueRotate: 0,  grayscale: 1 },
];

function buildFilterCss(def: FilterDef, strength: number): string {
  if (def.id === 'normal') return 'none';
  const s = strength / 100;
  const lerp = (n: number, t: number) => n + (t - n) * s;
  return [
    `brightness(${lerp(1, def.brightness).toFixed(3)})`,
    `contrast(${lerp(1, def.contrast).toFixed(3)})`,
    `sepia(${lerp(0, def.sepia).toFixed(3)})`,
    `saturate(${lerp(1, def.saturate).toFixed(3)})`,
    `hue-rotate(${lerp(0, def.hueRotate).toFixed(1)}deg)`,
    `grayscale(${lerp(0, def.grayscale).toFixed(3)})`,
  ].join(' ');
}

const OUTPUT_SIZE = 900;
const CROP = 300;

interface Props {
  file: File;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export default function PhotoEditor({ file, onConfirm, onCancel }: Props) {
  const [filterId, setFilterId] = useState('normal');
  const [filterStrength, setFilterStrength] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);
  const [imgNW, setImgNW] = useState(1);
  const [imgNH, setImgNH] = useState(1);
  const [sourceUrl, setSourceUrl] = useState('');
  const [processedUrl, setProcessedUrl] = useState('');
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [processing, setProcessing] = useState(false);

  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ lastDist: number } | null>(null);
  const processedUrlRef = useRef('');

  // Load original file
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Rebuild processed image when source/rotation/flip changes
  useEffect(() => {
    if (!sourceUrl) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const rotated90 = rotation === 90 || rotation === 270;
      const w = rotated90 ? img.naturalHeight : img.naturalWidth;
      const h = rotated90 ? img.naturalWidth : img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(w / 2, h / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      canvas.toBlob((blob) => {
        if (!blob || cancelled) return;
        const url = URL.createObjectURL(blob);
        URL.revokeObjectURL(processedUrlRef.current);
        processedUrlRef.current = url;
        setProcessedUrl(url);
        setImgNW(w);
        setImgNH(h);
        const minS = Math.max(CROP / w, CROP / h);
        setScale(minS);
        setOffsetX((CROP - w * minS) / 2);
        setOffsetY((CROP - h * minS) / 2);
      });
    };
    img.src = sourceUrl;
    return () => { cancelled = true; };
  }, [sourceUrl, rotation, flipH, flipV]);

  // Cleanup processedUrl on unmount
  useEffect(() => () => URL.revokeObjectURL(processedUrlRef.current), []);

  const minScale = Math.max(CROP / imgNW, CROP / imgNH);

  const clampOffset = useCallback(
    (ox: number, oy: number, s: number) => ({
      x: Math.min(0, Math.max(CROP - imgNW * s, ox)),
      y: Math.min(0, Math.max(CROP - imgNH * s, oy)),
    }),
    [imgNW, imgNH]
  );

  const handleScaleChange = (newScale: number) => {
    const clamped = Math.max(minScale, Math.min(minScale * 3, newScale));
    const { x, y } = clampOffset(offsetX, offsetY, clamped);
    setScale(clamped);
    setOffsetX(x);
    setOffsetY(y);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offsetX, oy: offsetY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { x, y } = clampOffset(
      dragRef.current.ox + e.clientX - dragRef.current.startX,
      dragRef.current.oy + e.clientY - dragRef.current.startY,
      scale
    );
    setOffsetX(x);
    setOffsetY(y);
  };
  const onPointerUp = () => { dragRef.current = null; };

  // Pinch-to-zoom
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { lastDist: Math.sqrt(dx * dx + dy * dy) };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      handleScaleChange(scale * (dist / pinchRef.current.lastDist));
      pinchRef.current.lastDist = dist;
    }
  };
  const onTouchEnd = () => { pinchRef.current = null; };

  const filterDef = FILTER_DEFS.find(f => f.id === filterId) ?? FILTER_DEFS[0];
  const filterCss = buildFilterCss(filterDef, filterStrength);

  const handleConfirm = async () => {
    setProcessing(true);
    const img = new Image();
    img.src = processedUrl;
    await new Promise<void>((res) => { img.onload = () => res(); if (img.complete) res(); });

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d')!;
    if (filterCss !== 'none') ctx.filter = filterCss;
    ctx.drawImage(img, -offsetX / scale, -offsetY / scale, CROP / scale, CROP / scale, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob((blob) => {
      if (!blob) { setProcessing(false); return; }
      onConfirm(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm flex flex-col overflow-hidden" style={{ maxHeight: '95dvh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-light flex-shrink-0">
          <h3 className="text-base font-bold text-text-main">写真を編集</h3>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-background-soft text-text-sub">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="2" y1="14" x2="14" y2="2"/><line x1="2" y1="2" x2="14" y2="14"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Crop area */}
          <div className="flex justify-center py-3 bg-gray-100">
            <div
              style={{ width: CROP, height: CROP, overflow: 'hidden', position: 'relative', cursor: 'grab', userSelect: 'none', touchAction: 'none', borderRadius: 8 }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {processedUrl && (
                <img
                  src={processedUrl}
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
                {['33.3%', '66.6%'].map(p => (
                  <div key={p}>
                    <div style={{ position: 'absolute', left: p, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.35)' }} />
                    <div style={{ position: 'absolute', top: p, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.35)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transform controls */}
          <div className="flex items-center justify-around px-4 py-2.5 border-b border-border-light">
            {[
              { label: '左回転', action: () => setRotation(r => (r - 90 + 360) % 360), active: false, icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/>
                  <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/>
                </svg>
              )},
              { label: '右回転', action: () => setRotation(r => (r + 90) % 360), active: false, icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
                  <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
                </svg>
              )},
              { label: '左右反転', action: () => setFlipH(v => !v), active: flipH, icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 .5a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-1 0V1A.5.5 0 0 1 8 .5M2.646 5.646a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L4.293 8 2.646 6.354a.5.5 0 0 1 0-.708m10.708 0a.5.5 0 0 1 0 .708L11.707 8l1.647 1.646a.5.5 0 0 1-.708.708l-2-2a.5.5 0 0 1 0-.708l2-2a.5.5 0 0 1 .708 0"/>
                </svg>
              )},
              { label: '上下反転', action: () => setFlipV(v => !v), active: flipV, icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 .5a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-1 0V1A.5.5 0 0 1 8 .5" style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}/>
                  <path d="M.5 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1H1A.5.5 0 0 1 .5 8M5.646 2.646a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L7.293 5 5.646 3.354a.5.5 0 0 1 0-.708m4.708 6a.5.5 0 0 1 0 .708L8.707 11l1.647 1.646a.5.5 0 0 1-.708.708l-2-2a.5.5 0 0 1 0-.708l2-2a.5.5 0 0 1 .708 0"/>
                </svg>
              )},
            ].map(({ label, action, active, icon }) => (
              <button
                key={label}
                onClick={action}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl active:scale-95 transition-all ${active ? 'bg-primary/10 text-primary' : 'text-text-sub'}`}
              >
                {icon}
                <span className="text-[9px] font-bold">{label}</span>
              </button>
            ))}
          </div>

          {/* Zoom slider */}
          <div className="px-5 py-2.5 flex items-center gap-3 border-b border-border-light">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="text-text-sub flex-shrink-0" viewBox="0 0 16 16">
              <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11M13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0"/>
              <path d="M10.344 11.742q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1 6.5 6.5 0 0 1-1.398 1.4z"/>
              <path fillRule="evenodd" d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5"/>
            </svg>
            <input type="range" min={minScale} max={minScale * 3} step={0.01} value={scale}
              onChange={(e) => handleScaleChange(Number(e.target.value))} className="flex-1 accent-primary" />
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="text-text-sub flex-shrink-0" viewBox="0 0 16 16">
              <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11M13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0"/>
              <path d="M10.344 11.742q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1 6.5 6.5 0 0 1-1.398 1.4z"/>
              <path fillRule="evenodd" d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5"/>
            </svg>
          </div>

          {/* Filter selector */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold text-text-sub uppercase tracking-wider mb-2">フィルター</p>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {FILTER_DEFS.map((f) => (
                <button key={f.id} onClick={() => setFilterId(f.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${filterId === f.id ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                >
                  <div style={{ width: 52, height: 52, overflow: 'hidden', borderRadius: 8 }}>
                    {processedUrl && (
                      <img src={processedUrl} alt={f.label}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: buildFilterCss(f, 100) === 'none' ? undefined : buildFilterCss(f, 100) }}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold ${filterId === f.id ? 'text-primary' : 'text-text-sub'}`}>{f.label}</span>
                </button>
              ))}
            </div>

            {/* Filter strength slider */}
            {filterId !== 'normal' && (
              <div className="flex items-center gap-3 mt-3">
                <span className="text-[10px] text-text-sub w-4">弱</span>
                <input type="range" min={0} max={100} step={1} value={filterStrength}
                  onChange={(e) => setFilterStrength(Number(e.target.value))} className="flex-1 accent-primary" />
                <span className="text-[10px] text-text-sub w-8 text-right">{filterStrength}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-3 border-t border-border-light flex-shrink-0">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-border-light rounded-xl text-sm font-bold text-text-sub">
            キャンセル
          </button>
          <button onClick={handleConfirm} disabled={processing}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-60">
            {processing ? '処理中...' : 'この内容で確定'}
          </button>
        </div>
      </div>
    </div>
  );
}
