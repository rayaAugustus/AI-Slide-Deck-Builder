import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Slide } from '../../types';

interface CanvasProps {
  slide: Slide;
  onUpdateSlide: (newHtml: string) => void;
}

// Helper to check if element is inside our canvas
const isCanvasElement = (element: HTMLElement, canvasId: string) => {
  return element.closest(`#${canvasId}`);
};

const Canvas: React.FC<CanvasProps> = ({ slide, onUpdateSlide }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elStart, setElStart] = useState({ left: 0, top: 0 });

  // Load HTML into the container when slide changes
  // We utilize a key to force re-render when slide ID changes to reset state
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = slide.htmlContent;
      setSelectedEl(null);
    }
  }, [slide.id, slide.htmlContent]);

  // Handle selection
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if clicking background
    if (target === containerRef.current) {
      setSelectedEl(null);
      return;
    }

    // Identify editable elements
    // In a real app, we'd use robust traversing. Here we assume direct children or marked elements.
    const editable = target.closest('[style*="position: absolute"], [data-type], h1, h2, p, img, div');
    
    if (editable && isCanvasElement(editable as HTMLElement, 'canvas-root')) {
      const el = editable as HTMLElement;
      setSelectedEl(el);
      
      // Init Dragging
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      
      // Get current position (fallback to 0 if not set)
      const style = window.getComputedStyle(el);
      const left = parseInt(style.left || '0', 10);
      const top = parseInt(style.top || '0', 10);
      setElStart({ left: isNaN(left) ? 0 : left, top: isNaN(top) ? 0 : top });
      
      e.stopPropagation();
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !selectedEl) return;
    
    // Simple Drag Logic (Absolute positioning)
    // Note: This assumes elements are absolute positioned. 
    // If AI generates flexbox, this simple drag might break layout logic without changing position to absolute first.
    // For MVP, we force position absolute on drag start if needed, but let's assume styled components.
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    selectedEl.style.position = 'absolute'; // Force absolute to allow dragging
    selectedEl.style.left = `${elStart.left + dx}px`;
    selectedEl.style.top = `${elStart.top + dy}px`;
  }, [isDragging, selectedEl, dragStart, elStart]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Save changes
      if (containerRef.current) {
        onUpdateSlide(containerRef.current.innerHTML);
      }
    }
  }, [isDragging, onUpdateSlide]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName.match(/H1|H2|H3|P|SPAN|DIV|LI/)) {
      target.contentEditable = "true";
      target.focus();
      
      // Stop dragging interference
      setIsDragging(false);
      
      const onBlur = () => {
        target.contentEditable = "false";
        target.removeEventListener('blur', onBlur);
        if (containerRef.current) {
          onUpdateSlide(containerRef.current.innerHTML);
        }
      };
      target.addEventListener('blur', onBlur);
    }
  };

  // Global listeners for drag operation
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Delete key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEl) {
        // Don't delete if editing text
        if (selectedEl.isContentEditable) return;
        
        selectedEl.remove();
        setSelectedEl(null);
        if (containerRef.current) {
          onUpdateSlide(containerRef.current.innerHTML);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEl, onUpdateSlide]);


  return (
    <div className="relative w-full h-full bg-gray-100 flex items-center justify-center overflow-auto p-8">
      {/* Aspect Ratio Container (16:9) */}
      <div 
        className="relative bg-white shadow-2xl"
        style={{ width: '960px', height: '540px', minWidth: '960px', minHeight: '540px' }}
      >
        <div 
          id="canvas-root"
          ref={containerRef}
          className="slide-canvas w-full h-full relative overflow-hidden"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        />

        {/* Selection Overlay */}
        {selectedEl && (
          <SelectionOverlay target={selectedEl} />
        )}
      </div>
      
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm border">
        {selectedEl ? `${selectedEl.tagName.toLowerCase()} selected` : 'Canvas Ready'}
      </div>
    </div>
  );
};

// Visual overlay for selected element
const SelectionOverlay: React.FC<{ target: HTMLElement }> = ({ target }) => {
  const [rect, setRect] = useState(target.getBoundingClientRect());

  // Update rect on render loop to track drag
  useEffect(() => {
    const update = () => {
      // Need to calculate relative to the canvas container, not viewport
      const canvas = target.closest('#canvas-root') as HTMLElement;
      if (!canvas) return;
      
      const canvasRect = canvas.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      setRect({
        ...targetRect,
        left: targetRect.left - canvasRect.left,
        top: targetRect.top - canvasRect.top,
        width: target.offsetWidth, // use offset for true dimension
        height: target.offsetHeight
      });
    };

    update();
    const interval = setInterval(update, 16); // 60fps tracking
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div 
      className="absolute border-2 border-blue-500 pointer-events-none z-50 transition-none"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    >
      {/* Handles */}
      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full" />
      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full" />
      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full" />
      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full" />
    </div>
  );
};

export default Canvas;