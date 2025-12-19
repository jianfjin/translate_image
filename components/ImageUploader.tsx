
import React, { useCallback, useState } from 'react';
import { UploadIcon, PlusIcon, XIcon, CrosshairIcon, EyeIcon } from './Icons';
import { UploadedImage } from '../types';

interface ImageUploaderProps {
  onImagesAdded: (images: UploadedImage[]) => void;
  uploadedImages: UploadedImage[];
  selectedImageIds: string[];
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenAreaSelector: (id: string) => void;
  onPreview: (url: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImagesAdded, 
  uploadedImages, 
  selectedImageIds, 
  onToggleSelect, 
  onRemove,
  onOpenAreaSelector,
  onPreview
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = useCallback((file: File): Promise<UploadedImage> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          mimeType: file.type,
          url: e.target?.result as string,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
      const processed = await Promise.all(files.map(processFile));
      onImagesAdded(processed);
    }
  }, [onImagesAdded, processFile]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        const processed = await Promise.all(files.map(processFile));
        onImagesAdded(processed);
        e.target.value = '';
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;

    try {
        const response = await fetch(urlInput);
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
            alert('URL is not a valid image');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            onImagesAdded([{
                id: crypto.randomUUID(),
                url: base64data,
                name: 'From URL',
                mimeType: blob.type
            }]);
            setUrlInput('');
        };
        reader.readAsDataURL(blob);
    } catch (err) {
        alert('Failed to load image from URL. CORS restrictions may apply.');
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
        {/* Upload Area */}
        <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`
                border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer
                flex flex-col items-center justify-center gap-2 min-h-[160px]
                ${isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}
            `}
        >
            <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileInput}
                className="hidden" 
                id="file-upload" 
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <UploadIcon className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-700">Click to upload or drag & drop</p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP</p>
            </label>

            <div className="w-full flex items-center gap-2 mt-4 max-w-xs">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-xs text-slate-400">OR</span>
                <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            <form onSubmit={handleUrlSubmit} className="flex w-full max-w-xs mt-2 gap-2">
                <input 
                    type="text" 
                    placeholder="Paste image URL" 
                    className="flex-1 text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                />
                <button type="submit" className="text-xs bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-900">
                    Add
                </button>
            </form>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {uploadedImages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <p className="text-sm">No images selected.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {uploadedImages.map((img) => {
                        const isSelected = selectedImageIds.includes(img.id);
                        const hasSelections = !!img.selections && img.selections.length > 0;
                        return (
                            <div 
                                key={img.id} 
                                onClick={() => onToggleSelect(img.id)}
                                className={`
                                    relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer group
                                    ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-400'}
                                `}
                            >
                                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                                
                                {isSelected && (
                                    <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-0.5 z-30">
                                        <PlusIcon className="w-3 h-3 transform rotate-45" /> 
                                    </div>
                                )}

                                {hasSelections && (
                                  <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded font-bold z-30 shadow-sm border border-indigo-400">
                                    {img.selections!.length} AREA{img.selections!.length > 1 ? 'S' : ''} SET
                                  </div>
                                )}
                                
                                <div className="absolute bottom-2 right-2 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onPreview(img.url); }}
                                        className="bg-white/95 text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 shadow-sm border border-slate-100"
                                        title="Preview Large"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onOpenAreaSelector(img.id); }}
                                        className="bg-white/95 text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 shadow-sm border border-slate-100"
                                        title="Select Area"
                                    >
                                        <CrosshairIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
                                        className="bg-white/95 text-red-500 p-1.5 rounded-lg hover:bg-red-50 shadow-sm border border-slate-100"
                                        title="Remove Image"
                                    >
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    <p className="text-white text-[10px] truncate">{img.name}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};

export default ImageUploader;
