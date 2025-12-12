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

// Helper to find the best selectable candidate (handling gradient text wrappers, etc)
const getSelectableElement = (target: HTMLElement, root: HTMLElement): HTMLElement | null => {
  // 1. First find the closest "logical" element
  let candidate = target.closest('[data-editable], h1, h2, h3, h4, h5, h6, p, img, li, span, button, a') as HTMLElement;
  
  // If we clicked a random div that isn't the root, maybe select it if it has content (like a card)
  if (!candidate && target !== root && target.tagName === 'DIV') {
      candidate = target;
  }

  if (!candidate) return null;

  // 2. Check for "Gradient Text" or special styling wrappers
  // If the parent has background-clip: text, we MUST select the parent to keep the style valid
  // We perform a short climb to check for specific visual wrappers
  let current = candidate;
  // Check up to 2 levels up
  for (let i = 0; i < 2; i++) {
     if (current.parentElement && current.parentElement !== root) {
        const parent = current.parentElement;
        const style = window.getComputedStyle(parent);
        if (style.backgroundClip === 'text' || style.webkitBackgroundClip === 'text') {
           candidate = parent;
           current = parent;
        } else {
           break;
        }
     }
  }

  return candidate;
};

const Canvas: React.FC<CanvasProps> = ({ slide, onUpdateSlide }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  
  // Use refs for drag state to ensure high-performance updates without re-renders during drag
  const dragRef = useRef({
    isDown: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    initialLeft: 0,
    initialTop: 0,
    // Removed placeholder ref as we now use position: relative
  });

  // Load HTML into the container when slide changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = slide.htmlContent;
      setSelectedEl(null);
    }
  }, [slide.id, slide.htmlContent]);

  // Handle selection and Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const root = containerRef.current;
    
    if (!root || target === root) {
      setSelectedEl(null);
      return;
    }

    if (!isCanvasElement(target, 'canvas-root')) return;

    // Use smart selection logic
    const el = getSelectableElement(target, root);
    
    if (el && isCanvasElement(el, 'canvas-root')) {
      // Avoid selecting the canvas root itself
      if (el === root) return;

      setSelectedEl(el);
      
      e.stopPropagation();
      e.preventDefault(); 

      // Initialize drag state, but DO NOT start dragging yet (wait for threshold)
      dragRef.current = {
        isDown: true,
        isDragging: false,
        startX: e.clientX,
        startY: e.clientY,
        initialLeft: 0,
        initialTop: 0
      };
    }
  };

  const initDrag = (el: HTMLElement) => {
      // STRATEGY: Use position: relative.
      // This allows the element to move visually while KEEPING its original space in the document flow.
      // This prevents siblings from collapsing or jumping (the "adsorption effect").
      
      const computed = window.getComputedStyle(el);
      let pos = computed.position;
      
      // If it's static, upgrade to relative so 'left' and 'top' work
      if (pos === 'static') {
          el.style.position = 'relative';
          pos = 'relative';
      }

      // Calculate starting offset
      let startLeft = 0;
      let startTop = 0;

      if (pos === 'absolute' || pos === 'fixed') {
         // For absolute elements, use the computed values (or 0 if auto)
         // We handle 'auto' carefully.
         startLeft = parseFloat(computed.left) || 0;
         startTop = parseFloat(computed.top) || 0;
      } else {
         // For relative elements, 'left' acts as an offset from the static position.
         // Default (auto) is 0 offset. We prefer reading from inline style if set, 
         // as computed style for relative often resolves to pixel values that might be confusing if transformed.
         startLeft = parseFloat(el.style.left) || 0;
         startTop = parseFloat(el.style.top) || 0;
      }

      dragRef.current.initialLeft = startLeft;
      dragRef.current.initialTop = startTop;
      dragRef.current.isDragging = true;
      
      // Visual feedback
      el.style.zIndex = '100'; // Bring to front temporarily
      el.style.cursor = 'grabbing';
      el.style.transition = 'none'; // Disable transitions during drag for responsiveness
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current.isDown || !selectedEl) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    // Check threshold if not yet dragging
    if (!dragRef.current.isDragging) {
       // 5px threshold prevents accidental drags when clicking to edit
       if (Math.hypot(dx, dy) > 5) {
          initDrag(selectedEl);
       }
    }

    // Apply Drag
    if (dragRef.current.isDragging) {
       // Simply add delta to initial positions
       selectedEl.style.left = `${dragRef.current.initialLeft + dx}px`;
       selectedEl.style.top = `${dragRef.current.initialTop + dy}px`;
    }
  }, [selectedEl]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.isDown) {
      if (dragRef.current.isDragging) {
        if (selectedEl) {
            selectedEl.style.zIndex = '';
            selectedEl.style.cursor = '';
            // We DO NOT revert position or remove placeholders.
            // The element stays 'relative' (or absolute) with the new left/top values.
            // The original space is preserved by the 'relative' nature (or originally absolute nature).
        }
        // Save changes
        if (containerRef.current) {
          onUpdateSlide(containerRef.current.innerHTML);
        }
      }
      
      // Reset State
      dragRef.current = {
        isDown: false,
        isDragging: false,
        startX: 0,
        startY: 0,
        initialLeft: 0,
        initialTop: 0
      };
    }
  }, [selectedEl, onUpdateSlide]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const editableEl = target.closest('[contenteditable], h1, h2, h3, p, span, li') as HTMLElement;
    
    if (editableEl) {
      e.stopPropagation();
      editableEl.contentEditable = "true";
      editableEl.focus();
      
      // Force stop any dragging
      dragRef.current.isDown = false;
      dragRef.current.isDragging = false;
      
      const onBlur = () => {
        editableEl.contentEditable = "false";
        editableEl.removeEventListener('blur', onBlur);
        if (containerRef.current) {
          onUpdateSlide(containerRef.current.innerHTML);
        }
      };
      editableEl.addEventListener('blur', onBlur);
    }
  };

  // Bind global event listeners for drag
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="relative w-full h-full bg-[#f3f4f6] flex items-center justify-center overflow-auto p-8">
      {/* Aspect Ratio Container (16:9) */}
      <div 
        className="relative bg-white shadow-2xl transition-all duration-300 ease-in-out"
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
    </div>
  );
};

// Visual overlay for selected element
const SelectionOverlay: React.FC<{ target: HTMLElement }> = ({ target }) => {
  const [rect, setRect] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      // Must look up canvas dynamically in case of reparenting or changes
      const canvas = document.getElementById('canvas-root');
      if (!canvas || !target.isConnected) return;
      
      const canvasRect = canvas.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      setRect({
        left: targetRect.left - canvasRect.left,
        top: targetRect.top - canvasRect.top,
        width: targetRect.width,
        height: targetRect.height
      });
    };

    update();
    const interval = setInterval(update, 16); 
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, [target]);

  return (
    <div 
      className="absolute border-2 border-blue-600 pointer-events-none z-50 transition-none"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    >
      <div className="absolute -top-3 left-0 bg-blue-600 text-white text-[10px] px-1.5 rounded-t font-mono">
        {target.tagName.toLowerCase()}
      </div>
      {/* Handles */}
      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow" />
      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow" />
      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow" />
      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full shadow" />
    </div>
  );
};

export default Canvas;