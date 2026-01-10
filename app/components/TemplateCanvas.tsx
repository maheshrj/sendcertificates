'use client';

import { useEffect, useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { DraggablePlaceholder } from './DraggablePlaceholder';
import { ResizableDraggableSignature } from './DraggableSignature';
import { Placeholder, Signature, QRPlaceholder } from '@/app/types';
import { DraggableQRPlaceholder } from './DraggableQRPlaceholder';


type Props = {
  imageUrl?: string;
  placeholders: Placeholder[];
  signatures: Signature[];
  onPlaceholderMove: (id: string, position: { x: number; y: number }) => void;
  onSignatureMove: (id: string, position: { x: number; y: number }) => void;
  onSignatureResize: (id: string, style: { Width: number; Height: number }) => void;
  onSignatureDelete: (id: string) => void;  // New prop for handling signature deletion
  onPlaceholderSelect?: (id: string | null) => void;
  onSignatureSelect?: (id: string | null) => void;
  selectedPlaceholderId?: string | null;
  selectedSignatureId?: string | null;
  qrPlaceholders: QRPlaceholder[];
  onQRPlaceholderMove: (id: string, position: { x: number; y: number }) => void;
  onQRPlaceholderResize: (id: string, style: { Width: number; Height: number }) => void;
  onQRPlaceholderDelete: (id: string) => void;
  onQRPlaceholderSelect?: (id: string | null) => void;
  selectedQRPlaceholderId?: string | null;
};

export function TemplateCanvas({
  imageUrl,
  placeholders,
  signatures,
  qrPlaceholders,
  onPlaceholderMove,
  onSignatureMove,
  onSignatureResize,
  onSignatureDelete,
  onQRPlaceholderMove,
  onQRPlaceholderResize,
  onQRPlaceholderDelete,
  onPlaceholderSelect,
  onSignatureSelect,
  onQRPlaceholderSelect,
  selectedPlaceholderId,
  selectedSignatureId,
  selectedQRPlaceholderId,
}: Props) {
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const [, dropPlaceholder] = useDrop({
    accept: 'placeholder',
    drop: (item: { id: string }, monitor) => {
      const clientOffset = monitor.getClientOffset();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (clientOffset && canvasRect) {
        const x = (clientOffset.x - canvasRect.left) / scale;
        const y = (clientOffset.y - canvasRect.top) / scale;
        onPlaceholderMove(item.id, { x, y });
      }
    },
  });

  const [, dropSignature] = useDrop({
    accept: 'signature',
    drop: (item: { id: string }, monitor) => {
      const clientOffset = monitor.getClientOffset();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (clientOffset && canvasRect) {
        const x = (clientOffset.x - canvasRect.left) / scale;
        const y = (clientOffset.y - canvasRect.top) / scale;
        onSignatureMove(item.id, { x, y });
      }
    },
  });

  useEffect(() => {
    if (imageUrl) {
      const img = new window.Image();
      img.src = imageUrl;
      img.onload = () => {
        const viewportWidth = window.innerWidth * 0.9;
        const viewportHeight = window.innerHeight * 0.8;
        const widthScale = viewportWidth / img.width;
        const heightScale = viewportHeight / img.height;
        const newScale = Math.min(widthScale, heightScale, 1);

        setCanvasSize({
          width: img.width * newScale,
          height: img.height * newScale,
        });
        setScale(newScale);
      };
    }
  }, [imageUrl]);

  const setDropRef = (element: HTMLDivElement | null) => {
    if (element) {
      dropPlaceholder(element);
      dropSignature(element);
      canvasRef.current = element;
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (onPlaceholderSelect) onPlaceholderSelect(null);
      if (onSignatureSelect) onSignatureSelect(null);
      if (onQRPlaceholderSelect) onQRPlaceholderSelect(null);
    }
  };

  return (
    <div
      ref={setDropRef}
      onClick={handleCanvasClick}
      style={{
        position: 'relative',
        width: `${canvasSize.width}px`,
        height: `${canvasSize.height}px`,
        border: '1px solid #ddd',
        backgroundColor: '#f9fafb',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Certificate template"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#aaa',
            fontSize: '18px',
          }}
        >
          No template image uploaded
        </div>
      )}
      {placeholders.map((placeholder) => (
        <DraggablePlaceholder
          key={placeholder.id}
          placeholder={placeholder}
          scale={scale}
          onPositionChange={onPlaceholderMove}
          onSelect={onPlaceholderSelect ? () => onPlaceholderSelect(placeholder.id) : undefined}
          isSelected={selectedPlaceholderId === placeholder.id}
        />
      ))}
      {signatures.map((signature) => (
        <ResizableDraggableSignature
          key={signature.id}
          signature={signature}
          scale={scale}
          onPositionChange={onSignatureMove}
          onResize={onSignatureResize}
          onDelete={onSignatureDelete}  // Pass the delete handler to the signature component
          onSelect={onSignatureSelect ? () => onSignatureSelect(signature.id) : undefined}
          isSelected={selectedSignatureId === signature.id}
        />
      ))}
      {qrPlaceholders.map((qrPlaceholder) => (
        <DraggableQRPlaceholder
          key={qrPlaceholder.id}
          qrPlaceholder={qrPlaceholder}
          scale={scale}
          onPositionChange={onQRPlaceholderMove}
          onResize={onQRPlaceholderResize}
          onDelete={onQRPlaceholderDelete}
          onSelect={onQRPlaceholderSelect ? () => onQRPlaceholderSelect(qrPlaceholder.id) : undefined}
          isSelected={selectedQRPlaceholderId === qrPlaceholder.id}
        />
      ))}
    </div>
  );
}