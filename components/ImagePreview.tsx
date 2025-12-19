
import React from 'react';
import { XIcon } from './Icons';

interface ImagePreviewProps {
  url: string;
  onClose: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ url, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-12 animate-in fade-in zoom-in duration-200"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-50 shadow-lg"
      >
        <XIcon className="w-8 h-8" />
      </button>
      
      <div 
        className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={url} 
          alt="Preview" 
          className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
        />
      </div>
    </div>
  );
};

export default ImagePreview;
