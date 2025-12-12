import React from 'react';
import { Slide } from '../types';
import { Trash2, Copy } from 'lucide-react';

interface SlideThumbnailProps {
  slide: Slide;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const SlideThumbnail: React.FC<SlideThumbnailProps> = ({ 
  slide, 
  index, 
  isActive, 
  onClick, 
  onDelete 
}) => {
  return (
    <div 
      className={`group relative flex flex-col gap-1 cursor-pointer transition-all duration-200 ${
        isActive ? 'scale-105' : 'hover:scale-102'
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-center text-xs text-gray-500 px-1">
        <span className="font-medium">Slide {index + 1}</span>
      </div>
      
      <div 
        className={`relative aspect-video bg-white rounded-lg shadow-sm border-2 overflow-hidden ${
          isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 group-hover:border-gray-300'
        }`}
      >
        {/* Miniature preview - utilizing CSS scaling to fit the HTML content into a thumbnail */}
        <div className="w-[960px] h-[540px] origin-top-left transform scale-[0.2] pointer-events-none select-none bg-white">
          <div dangerouslySetInnerHTML={{ __html: slide.htmlContent }} className="w-full h-full p-4 overflow-hidden" />
        </div>

        {/* Hover Actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onDelete}
            className="p-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-sm"
            title="Delete Slide"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlideThumbnail;