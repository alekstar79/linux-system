// WindowFrame — Draggable, resizable window chrome

import { useCallback, useRef, useState, memo, useEffect } from 'react';
import type { Window } from '@/types';
import { useOS } from '@/hooks/useOSStore';
import * as Icons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const TOP_PANEL_HEIGHT = 28;
const RESIZE_HANDLE_SIZE = 8; // The invisible border area for resizing
const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;

const DynamicIcon = ({ name, ...props }: { name: string } & LucideProps) => {
  const IconComp = (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
  return IconComp ? <IconComp {...props} /> : <Icons.HelpCircle {...props} />;
};

interface WindowFrameProps {
  window: Window;
  children: React.ReactNode;
}

const WindowFrame = memo(function WindowFrame({ window: win, children }: WindowFrameProps) {
  const { dispatch } = useOS();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const winRef = useRef(win);
  winRef.current = win;

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ edge: string; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number; } | null>(null);

  const focusThis = useCallback(() => {
    if (!winRef.current.isFocused && winRef.current.state !== 'minimized') {
      dispatch({ type: 'FOCUS_WINDOW', windowId: winRef.current.id });
    }
  }, [dispatch]);

  const handleTitleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const currentWin = winRef.current;
    if (currentWin.state === 'maximized') return;
    e.preventDefault();
    focusThis();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: currentWin.position.x, origY: currentWin.position.y };
    setIsDragging(true);
  };

  const handleResizeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const edge = e.currentTarget.dataset.edge;
    if (!edge || winRef.current.state === 'maximized') return;
    e.preventDefault();
    e.stopPropagation();
    focusThis();
    const currentWin = winRef.current;
    resizeRef.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      origX: currentWin.position.x,
      origY: currentWin.position.y,
      origW: currentWin.size.width,
      origH: currentWin.size.height,
    };
    setIsResizing(true);
  }, [focusThis]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const { startX, startY, origX, origY } = dragRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let nx = origX + dx;
        let ny = origY + dy;
        ny = Math.max(TOP_PANEL_HEIGHT, ny);
        dispatch({ type: 'MOVE_WINDOW', windowId: winRef.current.id, position: { x: nx, y: ny } });
      } else if (resizeRef.current) {
        const { edge, startX, startY, origX, origY, origW, origH } = resizeRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newX = origX, newY = origY, newW = origW, newH = origH;
        let positionChanged = false;

        if (edge.includes('e')) newW = Math.max(MIN_WIDTH, origW + dx);
        if (edge.includes('s')) newH = Math.max(MIN_HEIGHT, origH + dy);
        if (edge.includes('w')) {
          newW = Math.max(MIN_WIDTH, origW - dx);
          newX = origX + (origW - newW);
          positionChanged = true;
        }
        if (edge.includes('n')) {
          newH = Math.max(MIN_HEIGHT, origH - dy);
          newY = origY + (origH - newH);
          positionChanged = true;
        }

        dispatch({ type: 'RESIZE_WINDOW', windowId: winRef.current.id, size: { width: newW, height: newH } });
        if (positionChanged) {
          dispatch({ type: 'MOVE_WINDOW', windowId: winRef.current.id, position: { x: newX, y: newY } });
        }
      }
    };

    const handleMouseUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setIsDragging(false);
      }
      if (resizeRef.current) {
        resizeRef.current = null;
        setIsResizing(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dispatch]);

  const handleMinimize = useCallback((e: React.MouseEvent) => { e.stopPropagation(); dispatch({ type: 'MINIMIZE_WINDOW', windowId: winRef.current.id }); }, [dispatch]);
  const handleMaximize = useCallback((e: React.MouseEvent) => { e.stopPropagation(); dispatch({ type: winRef.current.state === 'maximized' ? 'RESTORE_WINDOW' : 'MAXIMIZE_WINDOW', windowId: winRef.current.id }); }, [dispatch]);
  const handleClose = useCallback((e: React.MouseEvent) => { e.stopPropagation(); dispatch({ type: 'CLOSE_WINDOW', windowId: winRef.current.id }); }, [dispatch]);
  const handleDoubleClickTitle = useCallback(() => { dispatch({ type: winRef.current.state === 'maximized' ? 'RESTORE_WINDOW' : 'MAXIMIZE_WINDOW', windowId: winRef.current.id }); }, [dispatch]);

  if (win.state === 'minimized') return null;

  const isMaximized = win.state === 'maximized';
  const transition = isDragging || isResizing ? 'none' : 'all 150ms ease';

  const resizeHandles = [
    { edge: 'n', cursor: 'n-resize', style: { top: 0, left: RESIZE_HANDLE_SIZE, right: RESIZE_HANDLE_SIZE, height: RESIZE_HANDLE_SIZE } },
    { edge: 's', cursor: 's-resize', style: { bottom: 0, left: RESIZE_HANDLE_SIZE, right: RESIZE_HANDLE_SIZE, height: RESIZE_HANDLE_SIZE } },
    { edge: 'w', cursor: 'w-resize', style: { top: RESIZE_HANDLE_SIZE, bottom: RESIZE_HANDLE_SIZE, left: 0, width: RESIZE_HANDLE_SIZE } },
    { edge: 'e', cursor: 'e-resize', style: { top: RESIZE_HANDLE_SIZE, bottom: RESIZE_HANDLE_SIZE, right: 0, width: RESIZE_HANDLE_SIZE } },
    { edge: 'nw', cursor: 'nw-resize', style: { top: 0, left: 0, width: RESIZE_HANDLE_SIZE, height: RESIZE_HANDLE_SIZE } },
    { edge: 'ne', cursor: 'ne-resize', style: { top: 0, right: 0, width: RESIZE_HANDLE_SIZE, height: RESIZE_HANDLE_SIZE } },
    { edge: 'sw', cursor: 'sw-resize', style: { bottom: 0, left: 0, width: RESIZE_HANDLE_SIZE, height: RESIZE_HANDLE_SIZE } },
    { edge: 'se', cursor: 'se-resize', style: { bottom: 0, right: 0, width: RESIZE_HANDLE_SIZE, height: RESIZE_HANDLE_SIZE } },
  ];

  return (
    <div
      className="absolute flex flex-col select-none"
      style={{
        left: win.position.x,
        top: win.position.y,
        width: win.size.width,
        height: win.size.height,
        zIndex: win.zIndex,
        borderRadius: isMaximized ? 0 : 12,
        border: `1px solid ${win.isFocused ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: win.isFocused ? '0 8px 32px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
        transition,
        overflow: 'hidden',
      }}
      onMouseDown={focusThis}
    >
      {!isMaximized && resizeHandles.map(({ edge, cursor, style }) => (
        <div
          key={edge}
          data-edge={edge}
          onMouseDown={handleResizeMouseDown}
          style={{ position: 'absolute', zIndex: 3, cursor, ...style }}
        />
      ))}

      <div
        className="flex items-center justify-between shrink-0"
        style={{
          height: 36,
          background: win.isFocused ? '#1A1A1A' : '#141414',
          cursor: isMaximized ? 'default' : 'grab',
          position: 'relative',
          zIndex: 2,
        }}
        onMouseDown={handleTitleMouseDown}
        onDoubleClick={handleDoubleClickTitle}
      >
        <div className="flex items-center gap-2 px-3 overflow-hidden pointer-events-none text-neutral-300">
          <DynamicIcon name={win.icon} size={16} className="shrink-0" />
          <span className="text-xs font-semibold truncate">{win.title}</span>
        </div>
        <div className="flex items-center shrink-0 gap-2 mr-2">
          <button onClick={handleMinimize} className="w-7 h-7 flex items-center justify-center bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-colors text-neutral-300" title="Minimize"><Icons.Minus size={14} /></button>
          <button onClick={handleMaximize} className="w-7 h-7 flex items-center justify-center bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-colors text-neutral-300" title={isMaximized ? 'Restore' : 'Maximize'}>{isMaximized ? <Icons.Copy size={12} /> : <Icons.Square size={12} />}</button>
          <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center bg-white/5 border border-white/10 rounded-md hover:bg-[#F44336] hover:text-white transition-colors text-neutral-300" title="Close"><Icons.X size={14} /></button>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto"
        style={{
          background: 'var(--bg-window)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
});

export default WindowFrame;
