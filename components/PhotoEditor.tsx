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

type Snapshot = {
  rotation: number; flipH: boolean; flipV: boolean;
  filterId: string; filterStrength: number;
};

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
  const [rotation, setRotation] = useState(0);   // fine adjust: -30..+30 deg
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'zoom' | 'angle' | 'filter'>('zoom');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [cropPx, setCropPx] = useState(340);

  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ lastDist: number } | null>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const cropPxRef = useRef(340);
  const filterStrengthRef = useRef(100);
  const rotationRef = useRef(0);

  // History via refs to avoid stale closures
  const histRef = useRef<Snapshot[]>([{ rotation: 0, flipH: false, flipV: false, filterId: 'normal', filterStrength: 100 }]);
  const histIdxRef = useRef(0);

  const syncHistoryUI = () => {
    setCanUndo(histIdxRef.current > 0);
    setCanRedo(histIdxRef.current < histRef.current.length - 1);
  };

  const pushHistory = (snap: Snapshot) => {
    histRef.current = histRef.current.slice(0, histIdxRef.current + 1);
    histRef.current.push(snap);
    histIdxRef.current = histRef.current.length - 1;
    syncHistoryUI();
  };

  const applySnap = (snap: Snapshot) => {
    setRotation(snap.rotation);
    rotationRef.current = snap.rotation;
    setFlipH(snap.flipH);
    setFlipV(snap.flipV);
    setFilterId(snap.filterId);
    setFilterStrength(snap.filterStrength);
    filterStrengthRef.current = snap.filterStrength;
  };

  const undo = () => {
    if (histIdxRef.current <= 0) return;
    histIdxRef.current--;
    applySnap(histRef.current[histIdxRef.current]);
    syncHistoryUI();
  };

  const redo = () => {
    if (histIdxRef.current >= histRef.current.length - 1) return;
    histIdxRef.current++;
    applySnap(histRef.current[histIdxRef.current]);
    syncHistoryUI();
  };

  // Load file and measure container in one shot
  useEffect(() => {
    if (cropContainerRef.current) {
      const w = cropContainerRef.current.offsetWidth;
      if (w > 0) { setCropPx(w); cropPxRef.current = w; }
    }

    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    const img = new Image();
    img.onload = () => {
      const cp = cropPxRef.current;
      const minS = Math.max(cp / img.naturalWidth, cp / img.naturalHeight);
      setImgNW(img.naturalWidth);
      setImgNH(img.naturalHeight);
      setScale(minS);
      setOffsetX((cp - img.naturalWidth * minS) / 2);
      setOffsetY((cp - img.naturalHeight * minS) / 2);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const minScale = Math.max(cropPx / Math.max(imgNW, 1), cropPx / Math.max(imgNH, 1));

  const clampOffset = useCallback(
    (ox: number, oy: number, s: number) => ({
      x: Math.min(0, Math.max(cropPx - imgNW * s, ox)),
      y: Math.min(0, Math.max(cropPx - imgNH * s, oy)),
    }),
    [imgNW, imgNH, cropPx]
  );

  const handleScaleChange = (newScale: number) => {
    const clamped = Math.max(minScale, Math.min(minScale * 3, newScale));
    const { x, y } = clampOffset(offsetX, offsetY, clamped);
    setScale(clamped); setOffsetX(x); setOffsetY(y);
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
    setOffsetX(x); setOffsetY(y);
  };
  const onPointerUp = () => { dragRef.current = null; };

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

  const currentSnap = (): Snapshot => ({
    rotation: rotationRef.current, flipH, flipV,
    filterId, filterStrength: filterStrengthRef.current,
  });

  const filterDef = FILTER_DEFS.find(f => f.id === filterId) ?? FILTER_DEFS[0];
  const filterCss = buildFilterCss(filterDef, filterStrength);
  const zoomPct = Math.round(scale / minScale * 100);

  const handleConfirm = async () => {
    setProcessing(true);
    const img = new Image();
    img.src = sourceUrl;
    await new Promise<void>((res) => { img.onload = () => res(); if (img.complete) res(); });

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE; canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d')!;
    if (filterCss !== 'none') ctx.filter = filterCss;

    // Replicate CSS transform: rotate + flip around image center
    const ratio = OUTPUT_SIZE / cropPx;
    const cx = (offsetX + imgNW * scale / 2) * ratio;
    const cy = (offsetY + imgNH * scale / 2) * ratio;
    ctx.translate(cx, cy);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(
      img,
      -imgNW * scale / 2 * ratio,
      -imgNH * scale / 2 * ratio,
      imgNW * scale * ratio,
      imgNH * scale * ratio,
    );

    canvas.toBlob((blob) => {
      if (!blob) { setProcessing(false); return; }
      onConfirm(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  const imgTransform = `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;

  return (
    <div
      className="fixed inset-0 z-[300] bg-black flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onCancel} className="w-9 h-9 flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 16 16">
            <line x1="2" y1="14" x2="14" y2="2"/><line x1="2" y1="2" x2="14" y2="14"/>
          </svg>
        </button>
        <span className="text-sm font-bold text-white">写真を編集</span>
        <button onClick={handleConfirm} disabled={processing}
          className="text-sm font-bold text-primary disabled:opacity-50 px-2">
          {processing ? '処理中...' : '完了'}
        </button>
      </div>

      {/* Image crop area */}
      <div className="flex-1 relative bg-black flex items-center justify-center min-h-0 py-2">
        <div
          ref={cropContainerRef}
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            overflow: 'hidden',
            position: 'relative',
            cursor: 'grab',
            touchAction: 'none',
            maxHeight: '100%',
            maxWidth: '100%',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {sourceUrl && (
            <img
              src={sourceUrl}
              alt="edit"
              draggable={false}
              style={{
                position: 'absolute',
                width: imgNW * scale,
                height: imgNH * scale,
                maxWidth: 'none',
                maxHeight: 'none',
                left: offsetX,
                top: offsetY,
                transform: imgTransform,
                transformOrigin: 'center center',
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
                <div style={{ position: 'absolute', left: p, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.2)' }} />
                <div style={{ position: 'absolute', top: p, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.2)' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="absolute bottom-4 right-3 flex gap-2">
          {[
            { label: 'undo', action: undo, disabled: !canUndo, icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/>
                <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/>
              </svg>
            )},
            { label: 'redo', action: redo, disabled: !canRedo, icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
              </svg>
            )},
          ].map(({ label, action, disabled, icon }) => (
            <button key={label} onClick={action} disabled={disabled}
              className="w-9 h-9 bg-black/60 rounded-lg flex items-center justify-center text-white disabled:opacity-25 active:scale-90 transition-transform">
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-black flex-shrink-0 border-t border-white/10">
        <div className="flex">
          {(['zoom', 'angle', 'filter'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-bold border-t-2 transition-colors ${activeTab === tab ? 'border-white text-white' : 'border-transparent text-white/35'}`}>
              {tab === 'zoom' ? 'ズーム' : tab === 'angle' ? '角度' : 'フィルタ'}
            </button>
          ))}
        </div>

        <div className="px-4 py-3 min-h-[105px]">
          {/* ズーム tab */}
          {activeTab === 'zoom' && (
            <div className="flex items-center justify-center gap-8 h-full pt-2">
              <button
                onClick={() => handleScaleChange(scale - minScale * 0.1)}
                disabled={scale <= minScale + 0.001}
                className="w-12 h-12 rounded-full bg-white/10 text-white text-2xl font-light flex items-center justify-center disabled:opacity-25 active:scale-90 transition-all"
              >−</button>
              <span className="text-white text-base font-bold w-16 text-center">{zoomPct}%</span>
              <button
                onClick={() => handleScaleChange(scale + minScale * 0.1)}
                disabled={scale >= minScale * 3 - 0.001}
                className="w-12 h-12 rounded-full bg-white/10 text-white text-2xl font-light flex items-center justify-center disabled:opacity-25 active:scale-90 transition-all"
              >＋</button>
            </div>
          )}

          {/* 角度 tab */}
          {activeTab === 'angle' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/50 w-8 flex-shrink-0">−30°</span>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={0.5}
                  value={rotation}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setRotation(v);
                    rotationRef.current = v;
                  }}
                  onMouseUp={() => pushHistory({ ...currentSnap(), rotation: rotationRef.current })}
                  onTouchEnd={() => pushHistory({ ...currentSnap(), rotation: rotationRef.current })}
                  className="flex-1 accent-primary"
                />
                <span className="text-[10px] text-white/50 w-8 flex-shrink-0 text-right">+30°</span>
                <span className="text-xs font-bold text-white w-12 text-right flex-shrink-0">
                  {rotation > 0 ? '+' : ''}{rotation.toFixed(1)}°
                </span>
              </div>
              <div className="flex items-center justify-around">
                {[
                  { label: '左右反転', active: flipH,
                    action: () => { const v = !flipH; setFlipH(v); pushHistory({ ...currentSnap(), flipH: v }); },
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16"><path d="M8 .5a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-1 0V1A.5.5 0 0 1 8 .5M2.646 5.646a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L4.293 8 2.646 6.354a.5.5 0 0 1 0-.708m10.708 0a.5.5 0 0 1 0 .708L11.707 8l1.647 1.646a.5.5 0 0 1-.708.708l-2-2a.5.5 0 0 1 0-.708l2-2a.5.5 0 0 1 .708 0"/></svg>
                  },
                  { label: '上下反転', active: flipV,
                    action: () => { const v = !flipV; setFlipV(v); pushHistory({ ...currentSnap(), flipV: v }); },
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1H1A.5.5 0 0 1 .5 8M5.646 2.646a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L7.293 5 5.646 3.354a.5.5 0 0 1 0-.708m4.708 6a.5.5 0 0 1 0 .708L8.707 11l1.647 1.646a.5.5 0 0 1-.708.708l-2-2a.5.5 0 0 1 0-.708l2-2a.5.5 0 0 1 .708 0"/></svg>
                  },
                ].map(({ label, action, icon, active }) => (
                  <button key={label} onClick={action}
                    className={`flex flex-col items-center gap-1.5 px-6 active:scale-90 transition-transform ${active ? 'text-primary' : 'text-white/70'}`}>
                    {icon}
                    <span className="text-[10px] font-bold">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* フィルタ tab */}
          {activeTab === 'filter' && (
            <div className="space-y-3">
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                {FILTER_DEFS.map((f) => (
                  <button key={f.id}
                    onClick={() => { setFilterId(f.id); pushHistory({ ...currentSnap(), filterId: f.id }); }}
                    className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-opacity ${filterId === f.id ? 'opacity-100' : 'opacity-50'}`}
                  >
                    <div style={{ width: 52, height: 52, overflow: 'hidden', borderRadius: 8, border: filterId === f.id ? '2px solid white' : '2px solid transparent' }}>
                      {sourceUrl && (
                        <img src={sourceUrl} alt={f.label}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', maxWidth: 'none',
                            filter: buildFilterCss(f, 100) === 'none' ? undefined : buildFilterCss(f, 100) }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-white">{f.label}</span>
                  </button>
                ))}
              </div>
              {filterId !== 'normal' && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/50 w-4">弱</span>
                  <input type="range" min={0} max={100} step={1} value={filterStrength}
                    onChange={(e) => { const v = Number(e.target.value); setFilterStrength(v); filterStrengthRef.current = v; }}
                    onMouseUp={() => pushHistory({ ...currentSnap(), filterStrength: filterStrengthRef.current })}
                    onTouchEnd={() => pushHistory({ ...currentSnap(), filterStrength: filterStrengthRef.current })}
                    className="flex-1 accent-primary" />
                  <span className="text-[10px] text-white/50 w-8 text-right">{filterStrength}%</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
