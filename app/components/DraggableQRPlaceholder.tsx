import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { QRPlaceholder, Position, Style } from '@/app/types';



interface Props {
  qrPlaceholder: QRPlaceholder;
  scale: number;
  onPositionChange: (id: string, position: Position) => void;
  onResize: (id: string, style: Style) => void;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
}

export function DraggableQRPlaceholder({
  qrPlaceholder,
  scale,
  onPositionChange,
  onResize,
  onSelect,
  onDelete,
  isSelected,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const initialSize = useRef<Style | null>(null);
  const initialMousePos = useRef<Position | null>(null);
  const initialElementPos = useRef<Position | null>(null);
  const [imageError, setImageError] = useState(false);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isResizing) return;
    
    e.stopPropagation();
    const touch = 'touches' in e ? e.touches[0] : e;
    
    setIsDragging(true);
    initialMousePos.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    initialElementPos.current = {
      x: qrPlaceholder.position.x,
      y: qrPlaceholder.position.y
    };
  }, [isResizing, qrPlaceholder.position]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !initialMousePos.current || !initialElementPos.current) return;

    e.preventDefault();
    const touch = 'touches' in e ? e.touches[0] : e;
    
    const deltaX = (touch.clientX - initialMousePos.current.x) / scale;
    const deltaY = (touch.clientY - initialMousePos.current.y) / scale;

    const newX = Math.round(initialElementPos.current.x + deltaX);
    const newY = Math.round(initialElementPos.current.y + deltaY);

    onPositionChange(qrPlaceholder.id, { x: newX, y: newY });
  }, [isDragging, scale, onPositionChange, qrPlaceholder.id]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    initialMousePos.current = null;
    initialElementPos.current = null;
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing || !initialMousePos.current || !initialSize.current) return;

    e.preventDefault();
    const touch = 'touches' in e ? e.touches[0] : e;
    
    const deltaX = (touch.clientX - initialMousePos.current.x) / scale;
    const deltaY = (touch.clientY - initialMousePos.current.y) / scale;

    const aspectRatio = initialSize.current.Width / initialSize.current.Height;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    let newWidth: number;
    let newHeight: number;

    if (absDeltaX > absDeltaY) {
      newWidth = Math.max(50, initialSize.current.Width + deltaX);
      newHeight = newWidth / aspectRatio;
    } else {
      newHeight = Math.max(50, initialSize.current.Height + deltaY);
      newWidth = newHeight * aspectRatio;
    }

    onResize(qrPlaceholder.id, {
      Width: Math.round(newWidth),
      Height: Math.round(newHeight),
    });
  }, [isResizing, scale, onResize, qrPlaceholder.id]);

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const touch = 'touches' in e ? e.touches[0] : e;

    setIsResizing(true);
    initialMousePos.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    initialSize.current = {
      Width: qrPlaceholder.style.Width,
      Height: qrPlaceholder.style.Height,
    };
  }, [qrPlaceholder.style]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    initialMousePos.current = null;
    initialSize.current = null;
  }, []);


  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);

      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      window.addEventListener('touchmove', handleResizeMove, { passive: false });
      window.addEventListener('touchend', handleResizeEnd);

      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
        window.removeEventListener('touchmove', handleResizeMove);
        window.removeEventListener('touchend', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(qrPlaceholder.id);
  }, [onSelect, qrPlaceholder.id]);

  const handleDelete = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onDelete?.(qrPlaceholder.id);
  }, [onDelete, qrPlaceholder.id]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    onResize(qrPlaceholder.id, { Width: 200, Height: 100 });
  }, [qrPlaceholder.id, onResize]);


  return (
    <div
      ref={ref}
      onClick={handleClick}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      className="absolute shadow-sm bg-white transition-colors touch-none"
      style={{
        left: `${qrPlaceholder.position.x * scale}px`,
        top: `${qrPlaceholder.position.y * scale}px`,
        width: `${qrPlaceholder.style.Width * scale}px`,
        height: `${qrPlaceholder.style.Height * scale}px`,
        transform: 'translate(-50%, -50%)',
        cursor: isResizing ? 'nwse-resize' : 'move',
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging || isResizing ? 1000 : 1,
        border: isSelected ? '2px solid blue' : '1px solid transparent',
      }}
    >
      {/* Delete button */}
      <div
        className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors shadow-md"
        onClick={handleDelete}
        onTouchEnd={handleDelete}
      >
        <X className="w-4 h-4 text-white" />
      </div>

      {/* QR Code placeholder image */}
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <img
          src="/qrplaceholder.png" // Add a placeholder QR image to your public folder
          alt="QR Code Placeholder"
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
        className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize rounded-full"
        style={{
          transform: 'translate(50%, 50%)',
          touchAction: 'none',
        }}
      />
    </div>
  );
}