// ============================================================
// Photo Editor — Canvas-based editing with filters and adjustments
// ============================================================

import { useState, useCallback, memo, useEffect, useRef } from 'react';
import {
  Sun, Contrast, Droplet, Palette, RotateCcw, RotateCw, FlipHorizontal,
  FlipVertical, Download, Undo, Redo, ZoomIn, ZoomOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ---- Demo Images ----
const IMAGE_GALLERY = [
  'https://picsum.photos/seed/a/1200/900',
  'https://picsum.photos/seed/b/1200/900',
  'https://picsum.photos/seed/c/1200/900',
  'https://picsum.photos/seed/d/1200/900',
  'https://picsum.photos/seed/e/1200/900',
  'https://picsum.photos/seed/f/1200/900',
];

// ---- Types ----
interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hueRotate: number;
}

interface FilterPreset {
  name: string;
  cssFilter: string;
}

// ---- Filter Presets ----
const FILTER_PRESETS: FilterPreset[] = [
  { name: 'None', cssFilter: 'none' },
  { name: 'Warm', cssFilter: 'sepia(0.2) saturate(1.2) hue-rotate(-10deg)' },
  { name: 'Cool', cssFilter: 'hue-rotate(10deg) saturate(0.9)' },
  { name: 'B&W', cssFilter: 'grayscale(1)' },
  { name: 'Vintage', cssFilter: 'sepia(0.4) contrast(1.1) brightness(0.95)' },
  { name: 'Dramatic', cssFilter: 'contrast(1.4) saturate(1.2)' },
];

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  blur: 0,
  hueRotate: 0,
};

// ---- Adjustment Slider Component ----
const AdjustmentSlider = memo(function AdjustmentSlider({
  icon: Icon, label, value, min, max, onChange
}: {
  icon: LucideIcon; label: string; value: number; min: number; max: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={14} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: 'var(--accent-primary)', height: 4 }}
      />
    </div>
  );
});

// ---- Main Photo Editor ----
export default function PhotoEditor() {
  const [images, setImages] = useState<string[]>(IMAGE_GALLERY);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [activeFilter, setActiveFilter] = useState<string>('None');
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<{ adjustments: Adjustments; filter: string; rotation: number; flipH: boolean; flipV: boolean }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);

  const imageSrc = images[currentIndex];

  // This effect now correctly handles the loading state whenever the image source changes.
  useEffect(() => {
    setIsLoading(true);
  }, [imageSrc]);

  const resetAll = useCallback(() => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setActiveFilter('None');
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Centralized logic for changing the image and resetting state
  const changeImage = useCallback((newIndex: number) => {
    if (newIndex >= 0 && newIndex < images.length && newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      resetAll(); // Reset adjustments when changing image
    }
  }, [images.length, currentIndex, resetAll]);

  const undo = () => {
    if (historyIndex > 0) {
      const state = history[historyIndex - 1];
      setAdjustments(state.adjustments);
      setActiveFilter(state.filter);
      setRotation(state.rotation);
      setFlipH(state.flipH);
      setFlipV(state.flipV);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const state = history[historyIndex + 1];
      setAdjustments(state.adjustments);
      setActiveFilter(state.filter);
      setRotation(state.rotation);
      setFlipH(state.flipH);
      setFlipV(state.flipV);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const buildFilterString = useCallback((adj: Adjustments, filterName: string): string => {
    const preset = FILTER_PRESETS.find((f) => f.name === filterName);
    const baseFilter = preset && preset.name !== 'None' ? preset.cssFilter : '';
    const adjFilters = [
      `brightness(${100 + adj.brightness}%)`,
      `contrast(${100 + adj.contrast}%)`,
      `saturate(${100 + adj.saturation}%)`,
      adj.blur > 0 ? `blur(${adj.blur}px)` : '',
      adj.hueRotate !== 0 ? `hue-rotate(${adj.hueRotate}deg)` : '',
    ].filter(Boolean).join(' ');
    return `${baseFilter} ${adjFilters}`.trim();
  }, []);

  const filterString = buildFilterString(adjustments, activeFilter);

  const transformString = `
    rotate(${rotation}deg)
    scaleX(${flipH ? -1 : 1})
    scaleY(${flipV ? -1 : 1})
    scale(${zoom})
  `;

  const exportImage = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.filter = filterString;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
      const link = document.createElement('a');
      link.download = `edited-image-${currentIndex}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    img.src = imageSrc;
  };

  return (
    <div className="flex h-full" style={{ background: 'var(--bg-window)' }}>
      {/* Left Sidebar - Tools */}
      <div className="flex flex-col shrink-0 overflow-y-auto custom-scrollbar" style={{ width: 220, background: 'var(--bg-titlebar)', borderRight: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-1 px-2 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <button onClick={undo} disabled={historyIndex <= 0} className="flex items-center justify-center rounded hover:bg-[var(--bg-hover)] disabled:opacity-30" style={{ width: 28, height: 28 }}>
            <Undo size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="flex items-center justify-center rounded hover:bg-[var(--bg-hover)] disabled:opacity-30" style={{ width: 28, height: 28 }}>
            <Redo size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <div style={{ width: 1, height: 16, background: 'var(--border-subtle)', margin: '0 2px' }} />
          <button onClick={exportImage} className="flex items-center justify-center rounded hover:bg-[var(--bg-hover)]" style={{ width: 28, height: 28 }}>
            <Download size={14} style={{ color: 'var(--accent-primary)' }} />
          </button>
        </div>

        <div className="p-3 flex flex-col gap-3">
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adjustments</h3>
          <AdjustmentSlider icon={Sun} label="Brightness" value={adjustments.brightness} min={-100} max={100} onChange={(v) => setAdjustments((a) => ({ ...a, brightness: v }))} />
          <AdjustmentSlider icon={Contrast} label="Contrast" value={adjustments.contrast} min={-100} max={100} onChange={(v) => setAdjustments((a) => ({ ...a, contrast: v }))} />
          <AdjustmentSlider icon={Droplet} label="Saturation" value={adjustments.saturation} min={-100} max={100} onChange={(v) => setAdjustments((a) => ({ ...a, saturation: v }))} />
          <AdjustmentSlider icon={Palette} label="Hue Rotate" value={adjustments.hueRotate} min={-180} max={180} onChange={(v) => setAdjustments((a) => ({ ...a, hueRotate: v }))} />
        </div>

        <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Filters</h3>
          <div className="grid grid-cols-3 gap-2">
            {FILTER_PRESETS.map((filter) => (
              <button
                key={filter.name}
                onClick={() => setActiveFilter(filter.name)}
                className="flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all"
                style={{
                  background: activeFilter === filter.name ? 'var(--bg-selected)' : 'transparent',
                  border: activeFilter === filter.name ? '2px solid var(--accent-primary)' : '2px solid transparent',
                }}
              >
                <div className="rounded-md overflow-hidden" style={{ width: 50, height: 40, background: '#333' }}>
                  <img src={imageSrc} alt={filter.name} className="w-full h-full object-cover" style={{ filter: filter.cssFilter, transform: 'scale(1.2)' }} />
                </div>
                <span style={{ fontSize: '10px', color: activeFilter === filter.name ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{filter.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Transform</h3>
          <div className="grid grid-cols-2 gap-2">
            <TransformButton icon={RotateCcw} label="Rotate Left" onClick={() => setRotation((r) => r - 90)} />
            <TransformButton icon={RotateCw} label="Rotate Right" onClick={() => setRotation((r) => r + 90)} />
            <TransformButton icon={FlipHorizontal} label="Flip H" onClick={() => setFlipH((f) => !f)} />
            <TransformButton icon={FlipVertical} label="Flip V" onClick={() => setFlipV((f) => !f)} />
          </div>
        </div>

        <div className="p-3 mt-auto" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={resetAll} className="w-full py-2 rounded-lg transition-all hover:bg-[var(--bg-hover)]" style={{ fontSize: '12px', color: 'var(--accent-error)', border: '1px solid var(--border-default)' }}>
            Reset All
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden" style={{ background: '#1A1A1A' }}>
        <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
          {isLoading && <div className="text-white">Loading...</div>}
          <img
            key={imageSrc} // Add key to force re-mount on src change
            src={imageSrc}
            alt="Edit"
            className="max-w-full max-h-full object-contain transition-all"
            style={{
              filter: filterString,
              transform: transformString,
              display: isLoading ? 'none' : 'block',
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            draggable={false}
          />
        </div>

        {/* Bottom Thumbnail/Navigation Bar */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: 'var(--bg-titlebar)', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => changeImage(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            {images.map((img, index) => (
              <button
                key={`${img}-${index}`}
                onClick={() => changeImage(index)}
                className="shrink-0 rounded-md overflow-hidden transition-all"
                style={{
                  width: 60,
                  height: 40,
                  border: currentIndex === index ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  opacity: currentIndex === index ? 1 : 0.6,
                }}
              >
                <img src={img} alt={`Thumbnail ${index}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          <button
            onClick={() => changeImage(currentIndex + 1)}
            disabled={currentIndex === images.length - 1}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Transform Button ----
function TransformButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all hover:bg-[var(--bg-hover)]"
      style={{ fontSize: '11px', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
