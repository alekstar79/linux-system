// Desktop — Wallpaper + draggable desktop icons + context menu

import { useCallback, memo, useState, useRef } from 'react';
import { useOS } from '@/hooks/useOSStore';
import * as Icons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { DesktopIcon as DesktopIconType } from '@/types';

const DynamicIcon = ({ name, ...props }: { name: string } & LucideProps) => {
  const IconComp = (Icons as unknown as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
  return IconComp ? <IconComp {...props} /> : <Icons.HelpCircle {...props} />;
};

const GRID_X = 80;
const GRID_Y = 90;

const Desktop = memo(function Desktop() {
  const { state, dispatch } = useOS();
  const { desktopIcons, theme } = state;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const iconStartPos = useRef({ x: 0, y: 0 });
  const desktopRef = useRef<HTMLDivElement>(null);
  const draggedIconRef = useRef<HTMLDivElement>(null);

  const handleIconClick = useCallback((e: React.MouseEvent, iconId: string) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_DESKTOP_ICON', id: iconId });
  }, [dispatch]);

  const handleIconDoubleClick = useCallback((e: React.MouseEvent, appId: string | undefined) => {
    e.stopPropagation();
    if (appId) {
      dispatch({ type: 'OPEN_WINDOW', appId });
    }
  }, [dispatch]);

  const handleIconMouseDown = useCallback((e: React.MouseEvent, icon: DesktopIconType) => {
    e.stopPropagation();
    // Only start dragging with the primary mouse button
    if (e.button !== 0) return;

    setDraggingId(icon.id);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    iconStartPos.current = { x: icon.position.x, y: icon.position.y };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingId || !draggedIconRef.current) return;

    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    const newX = iconStartPos.current.x + dx;
    const newY = iconStartPos.current.y + dy;

    // Update position visually for smooth dragging
    draggedIconRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  }, [draggingId]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!draggingId) return;

    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    // If it was just a click (minimal movement), don't move the icon
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
      setDraggingId(null);
      if (draggedIconRef.current) {
        draggedIconRef.current.style.transform = 'translate(0, 0)';
      }
      return;
    }

    const desktopRect = desktopRef.current?.getBoundingClientRect();
    if (desktopRect) {
      const finalX = iconStartPos.current.x + dx;
      const finalY = iconStartPos.current.y + dy;

      // Snap to grid
      const snappedX = Math.round(finalX / GRID_X) * GRID_X;
      const snappedY = Math.round(finalY / GRID_Y) * GRID_Y;

      dispatch({
        type: 'UPDATE_DESKTOP_ICON_POSITION',
        id: draggingId,
        position: { x: Math.max(16, snappedX), y: Math.max(16, snappedY) },
      });
    }

    if (draggedIconRef.current) {
      draggedIconRef.current.style.transform = 'translate(0, 0)';
    }
    setDraggingId(null);
  }, [draggingId, dispatch]);

  // Attach global mouse listeners for dragging
  useState(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });

  const handleDesktopContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dispatch({ type: 'SELECT_DESKTOP_ICON', id: null });
    dispatch({
      type: 'SHOW_CONTEXT_MENU',
      x: e.clientX,
      y: e.clientY,
      menuType: 'desktop',
      items: [
        { id: 'new-folder', label: 'New Folder', icon: 'FolderPlus', action: 'NEW_FOLDER' },
        { id: 'new-doc', label: 'New Document', icon: 'FilePlus', action: 'NEW_DOCUMENT' },
        { id: 'div1', label: '', action: '', divider: true },
        { id: 'open-term', label: 'Open in Terminal', icon: 'Terminal', action: 'OPEN_APP:terminal' },
        { id: 'div2', label: '', action: '', divider: true },
        { id: 'change-bg', label: 'Change Background', icon: 'Image', action: 'CHANGE_BG' },
        { id: 'arrange', label: 'Arrange Icons', icon: 'LayoutGrid', action: 'ARRANGE_ICONS' },
        { id: 'div3', label: '', action: '', divider: true },
        { id: 'display-settings', label: 'Display Settings', icon: 'Monitor', action: 'SHOW_SETTINGS' },
      ],
    });
  }, [dispatch]);

  return (
    <div
      ref={desktopRef}
      className="fixed inset-0 z-10"
      style={{
        backgroundImage: `url(${theme.wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        top: 28,
        bottom: 48,
      }}
      onContextMenu={handleDesktopContextMenu}
      onClick={() => dispatch({ type: 'SELECT_DESKTOP_ICON', id: null })}
    >
      {/* Desktop Icons */}
      {desktopIcons.map((icon) => (
        <div
          key={icon.id}
          ref={draggingId === icon.id ? draggedIconRef : null}
          className="absolute flex flex-col items-center gap-1 cursor-pointer group"
          style={{
            left: icon.position.x,
            top: icon.position.y,
            width: 64,
            zIndex: draggingId === icon.id ? 20 : 10,
            transition: draggingId === icon.id ? 'none' : 'all 150ms ease',
            animation: 'iconAppear 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onClick={(e) => handleIconClick(e, icon.id)}
          onDoubleClick={(e) => handleIconDoubleClick(e, icon.appId)}
          onMouseDown={(e) => handleIconMouseDown(e, icon)}
          onContextMenu={(e) => {
            e.stopPropagation();
            dispatch({ type: 'SELECT_DESKTOP_ICON', id: icon.id });
            dispatch({
              type: 'SHOW_CONTEXT_MENU',
              x: e.clientX,
              y: e.clientY,
              menuType: 'file',
              items: [
                { id: 'open', label: 'Open', icon: 'ExternalLink', action: `OPEN_APP:${icon.appId}` },
                { id: 'div1', label: '', action: '', divider: true },
                { id: 'cut', label: 'Cut', icon: 'Scissors', action: 'CUT' },
                { id: 'copy', label: 'Copy', icon: 'Copy', action: 'COPY' },
                { id: 'rename', label: 'Rename', icon: 'Edit', action: 'RENAME' },
                { id: 'div2', label: '', action: '', divider: true },
                { id: 'trash', label: 'Move to Trash', icon: 'Trash2', action: 'TRASH' },
              ],
              contextData: { iconId: icon.id },
            });
          }}
        >
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: icon.isSelected ? 'rgba(124,77,255,0.20)' : 'transparent',
              border: icon.isSelected ? '1px dashed rgba(124,77,255,0.50)' : '1px solid transparent',
              pointerEvents: 'none', // Prevent icon/image from capturing mouse events
            }}
          >
            <DynamicIcon
              name={icon.icon}
              size={32}
              className="text-[var(--text-primary)] drop-shadow-lg"
              style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
            />
          </div>
          <span
            className="text-[10px] font-medium text-center px-1 py-0.5 rounded max-w-[72px] truncate leading-tight"
            style={{
              color: '#E0E0E0',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              background: icon.isSelected ? 'rgba(124,77,255,0.30)' : 'transparent',
              pointerEvents: 'none', // Prevent text from capturing mouse events
            }}
          >
            {icon.name}
          </span>
        </div>
      ))}

      <style>{`
        @keyframes iconAppear {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
});

export default Desktop;
