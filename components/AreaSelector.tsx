
import React, { useState, useRef } from 'react';
import { UploadedImage, Selection } from '../types';
import { XIcon, TrashIcon } from './Icons';

interface AreaSelectorProps {
  image: UploadedImage;
  onSave: (selections: Selection[]) => void;
  onClose: () => void;
}

const AreaSelector: React.FC<AreaSelectorProps> = ({ image, onSave, onClose }) => {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [selections, setSelections] = useState<Selection[]>(image.selections || []);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCoordinates = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate coordinates relative to the image container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    return {
      x: Math.max(0, Math.min(x, rect.width)),
      y: Math.max(0, Math.min(y, rect.height))
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCoordinates(e);
    setStartPos(coords);
    setCurrentPos(coords);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startPos) return;
    setCurrentPos(getCoordinates(e));
  };

  const handleMouseUp = () => {
    if (startPos && currentPos && imgRef.current) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(startPos.x - currentPos.x);
      const height = Math.abs(startPos.y - currentPos.y);
      
      const imgWidth = imgRef.current.clientWidth;
      const imgHeight = imgRef.current.clientHeight;

      // Filter out tiny clicks/noise
      if (width > 5 && height > 5) {
          setSelections(prev => [...prev, {
            x: Math.round((x / imgWidth) * 1000),
            y: Math.round((y / imgHeight) * 1000),
            width: Math.round((width / imgWidth) * 1000),
            height: Math.round((height / imgHeight) * 1000),
          }]);
      }
    }
    setStartPos(null);
    setCurrentPos(null);
  };

  const normalizedToPx = (sel: Selection) => {
    if (!imgRef.current) return null;
    const w = imgRef.current.clientWidth;
    const h = imgRef.current.clientHeight;
    return {
      left: (sel.x / 1000) * w,
      top: (sel.y / 1000) * h,
      width: (sel.width / 1000) * w,
      height: (sel.height / 1000) * h,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 md:p-8">
      <div className="relative w-full max-w-6xl h-full flex flex-col gap-4">
        <div className="flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-bold">Define Translation Areas</h2>
            <p className="text-sm text-slate-400">Click and drag precisely on the text you want to translate. Non-selected areas will be ignored.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
            <div 
              className="flex-[3] relative bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-white/10"
            >
              <div 
                ref={containerRef}
                className="relative inline-block select-none cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                  <img 
                    ref={imgRef}
                    src={image.url} 
                    alt="Source" 
                    className="max-w-full max-h-full object-contain pointer-events-none select-none block"
                    draggable={false}
                  />
                  
                  {/* Active drawing box */}
                  {startPos && currentPos && (
                    <div 
                      className="absolute border-2 border-indigo-400 bg-indigo-400/20 pointer-events-none z-20"
                      style={{
                        left: Math.min(startPos.x, currentPos.x),
                        top: Math.min(startPos.y, currentPos.y),
                        width: Math.abs(startPos.x - currentPos.x),
                        height: Math.abs(startPos.y - currentPos.y),
                      }}
                    />
                  )}

                  {/* Saved selection boxes */}
                  {selections.map((sel, idx) => {
                    const style = normalizedToPx(sel);
                    return style ? (
                        <div 
                          key={idx}
                          className="absolute border-2 border-indigo-500 bg-indigo-500/10 flex items-center justify-center z-10"
                          style={style}
                        >
                            <div className="bg-indigo-600 text-white text-[10px] px-1 absolute -top-4 -left-0.5 rounded-sm font-bold shadow-md">
                                Area {idx + 1}
                            </div>
                        </div>
                    ) : null;
                  })}
              </div>
            </div>

            <div className="flex-1 bg-white/10 rounded-xl border border-white/20 p-4 flex flex-col min-w-[240px]">
                <h3 className="text-white text-sm font-bold mb-4 flex items-center justify-between border-b border-white/10 pb-2">
                    Translation Regions ({selections.length})
                    <button onClick={() => setSelections([])} className="text-xs text-red-400 hover:text-red-300 font-medium">Clear All</button>
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {selections.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center px-4 italic">
                        No regions selected. Translation will apply to the entire image unless you select specific areas.
                      </div>
                    ) : (
                      selections.map((_, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-2 text-white text-xs border border-white/5">
                              <span>Region #{idx + 1}</span>
                              <button onClick={() => setSelections(s => s.filter((_, i) => i !== idx))} className="text-red-400 p-1 hover:bg-red-400/10 rounded">
                                  <TrashIcon className="w-4 h-4" />
                              </button>
                          </div>
                      ))
                    )}
                </div>
                <div className="mt-4 space-y-2">
                    <button onClick={() => onSave(selections)} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg">Apply Selection</button>
                    <button onClick={onClose} className="w-full py-2.5 bg-white/10 text-white rounded-lg font-bold hover:bg-white/20 transition-colors">Cancel</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AreaSelector;
