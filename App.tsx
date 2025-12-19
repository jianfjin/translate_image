
import React, { useState, useRef, useEffect } from 'react';
import { BotIcon, SendIcon, DownloadIcon, ImageIcon, EyeIcon, TrashIcon } from './components/Icons';
import ImageUploader from './components/ImageUploader';
import LanguageSelector from './components/LanguageSelector';
import AreaSelector from './components/AreaSelector';
import ImagePreview from './components/ImagePreview';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import { UploadedImage, Message, AppState, ProcessingStatus, GeneratedImage, OutputSettings, User } from './types';
import { processImagesWithGemini } from './services/geminiService';

const App = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    uploadedImages: [],
    selectedImageIds: [],
    targetLanguages: [],
    generatedImages: [],
    selectedGeneratedIds: [],
    messages: [{ id: 'welcome', role: 'model', content: 'Ready for translation. Upload images and select target languages to begin.' }],
    status: ProcessingStatus.IDLE,
    outputSettings: {
      prefix: 'translated_',
      suffix: '',
      format: 'png',
      quality: 90,
      resolution: 'original'
    },
    activeTab: 'app'
  });

  const [inputMessage, setInputMessage] = useState('');
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [hasCheckedKey, setHasCheckedKey] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load user from storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('pl_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        
        // Verify user still exists and is not blocked
        const registeredUsers = JSON.parse(localStorage.getItem('pl_registered_users') || '[]');
        const freshUser = registeredUsers.find((u: User) => u.id === user.id);
        
        if (!freshUser || freshUser.isBlocked) {
          handleLogout();
        } else {
          setState(prev => ({ ...prev, user: freshUser }));
        }
      } catch (e) {
        localStorage.removeItem('pl_user');
      }
    }
  }, []);

  useEffect(() => {
    async function checkKey() {
      if (window.aistudio) {
        setApiKeySelected(await window.aistudio.hasSelectedApiKey());
      } else {
        setApiKeySelected(true);
      }
      setHasCheckedKey(true);
    }
    checkKey();
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem('pl_user', JSON.stringify(user));
    setState(prev => ({ ...prev, user }));
  };

  const handleLogout = () => {
    localStorage.removeItem('pl_user');
    setState(prev => ({ ...prev, user: null, activeTab: 'app' }));
  };

  const handleUserDeleted = (deletedId: string) => {
    if (state.user && state.user.id === deletedId) {
      handleLogout();
    }
  };

  const handleUserUpdated = (updatedUser: User) => {
    localStorage.setItem('pl_user', JSON.stringify(updatedUser));
    setState(prev => ({ ...prev, user: updatedUser }));
  };

  const handleImagesAdded = (newImages: UploadedImage[]) => {
    setState(prev => ({
      ...prev,
      uploadedImages: [...prev.uploadedImages, ...newImages],
      selectedImageIds: [...prev.selectedImageIds, ...newImages.map(img => img.id)]
    }));
  };

  const toggleImageSelection = (id: string) => {
    setState(prev => ({
      ...prev,
      selectedImageIds: prev.selectedImageIds.includes(id)
        ? prev.selectedImageIds.filter(i => i !== id)
        : [...prev.selectedImageIds, id]
    }));
  };

  const removeImage = (id: string) => {
    setState(prev => ({
      ...prev,
      uploadedImages: prev.uploadedImages.filter(img => img.id !== id),
      selectedImageIds: prev.selectedImageIds.filter(i => i !== id)
    }));
  };

  const downloadImage = (img: GeneratedImage) => {
    const { prefix, suffix, format } = state.outputSettings;
    const cleanName = img.originalName.replace(/\.[^/.]+$/, "");
    const filename = `${prefix}${cleanName}${suffix}.${format}`;
    
    const link = document.createElement('a');
    link.href = img.url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchDownload = () => {
    const selected = state.generatedImages.filter(img => state.selectedGeneratedIds.includes(img.id));
    selected.forEach((img, i) => {
      setTimeout(() => downloadImage(img), i * 400);
    });
  };

  const updateSettings = (key: keyof OutputSettings, value: any) => {
    setState(prev => ({ ...prev, outputSettings: { ...prev.outputSettings, [key]: value } }));
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (state.selectedImageIds.length === 0 || state.status === ProcessingStatus.PROCESSING) return;

    const activeImages = state.uploadedImages.filter(img => state.selectedImageIds.includes(img.id));
    const isBatchMode = state.targetLanguages.length > 0;
    
    const displayPrompt = isBatchMode 
      ? `Translating into: ${state.targetLanguages.join(', ')}. ${inputMessage}`
      : (inputMessage || 'Translate selected images');

    setState(prev => ({ 
      ...prev, 
      status: ProcessingStatus.PROCESSING,
      messages: [...prev.messages, { id: Date.now().toString(), role: 'user', content: displayPrompt }]
    }));

    try {
      let combinedText = "";

      if (isBatchMode) {
        for (const lang of state.targetLanguages) {
          const prompt = `Translate all text in the images to ${lang} language. ${inputMessage}`;
          const result = await processImagesWithGemini(prompt, activeImages, state.outputSettings);
          
          const newGens = result.generatedImages.map(img => ({
            id: crypto.randomUUID(),
            originalImageId: img.originalId,
            originalName: img.originalName,
            url: img.dataUrl,
            description: `Translated to ${lang}`,
            createdAt: Date.now()
          }));
          
          combinedText += `[${lang}] Processed.\n`;
          
          setState(prev => ({
            ...prev,
            generatedImages: [...newGens, ...prev.generatedImages]
          }));
        }
      } else {
        const result = await processImagesWithGemini(inputMessage || 'Translate all text', activeImages, state.outputSettings);
        const newGens = result.generatedImages.map(img => ({
          id: crypto.randomUUID(),
          originalImageId: img.originalId,
          originalName: img.originalName,
          url: img.dataUrl,
          description: inputMessage || 'Translation complete',
          createdAt: Date.now()
        }));
        combinedText = result.textResponse;
        
        setState(prev => ({
          ...prev,
          generatedImages: [...newGens, ...prev.generatedImages]
        }));
      }

      setState(prev => ({
        ...prev,
        status: ProcessingStatus.COMPLETED,
        messages: [...prev.messages, { id: Date.now().toString(), role: 'model', content: combinedText || "Translation complete." }]
      }));
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setApiKeySelected(false);
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            setApiKeySelected(true);
        }
      }
      setState(prev => ({ ...prev, status: ProcessingStatus.ERROR, errorMessage: err.message }));
    }
  };

  // Auth Guard: Unauthenticated users are gated here
  if (!state.user) {
    return <Login onLogin={handleLogin} />;
  }

  if (!hasCheckedKey) return <div className="h-screen flex items-center justify-center font-bold text-slate-400">Initializing...</div>;

  if (!apiKeySelected) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <BotIcon className="w-16 h-16 text-indigo-600 mb-6" />
        <h1 className="text-2xl font-bold mb-4">API Key Required</h1>
        <p className="text-slate-600 mb-8 max-w-sm">Use a Gemini API key from a paid project to access high-quality image translation.</p>
        <button 
          onClick={async () => {
            if (window.aistudio) {
              await window.aistudio.openSelectKey();
              setApiKeySelected(true);
            }
          }}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700"
        >
          Select API Key
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {editingImageId && (
        <AreaSelector 
          image={state.uploadedImages.find(i => i.id === editingImageId)!} 
          onSave={(sels) => {
            setState(p => ({ ...p, uploadedImages: p.uploadedImages.map(img => img.id === editingImageId ? { ...img, selections: sels } : img) }));
            setEditingImageId(null);
          }}
          onClose={() => setEditingImageId(null)}
        />
      )}

      {previewUrl && <ImagePreview url={previewUrl} onClose={() => setPreviewUrl(null)} />}

      <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-white z-10 shrink-0">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setState(s => ({ ...s, activeTab: 'app' }))}>
            <BotIcon className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
            <h1 className="text-lg md:text-xl font-bold whitespace-nowrap">ProductLens</h1>
          </div>
          
          <nav className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
            <button 
              onClick={() => setState(s => ({ ...s, activeTab: 'app' }))}
              className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-lg transition-all ${state.activeTab === 'app' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Translator
            </button>
            {state.user.role === 'admin' && (
              <button 
                onClick={() => setState(s => ({ ...s, activeTab: 'admin' }))}
                className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold rounded-lg transition-all ${state.activeTab === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Admin Panel
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="text-right hidden sm:flex flex-col items-end">
            <p className="text-xs md:text-sm font-bold text-slate-900 leading-tight">{state.user.name}</p>
            <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${state.user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
              {state.user.role}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-[10px] md:text-xs font-bold text-slate-500 hover:text-red-500 transition-colors bg-slate-50 hover:bg-red-50 px-2 md:px-3 py-1.5 rounded-lg border border-slate-100"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {state.activeTab === 'admin' && state.user.role === 'admin' ? (
          <AdminPanel 
            onClose={() => setState(s => ({ ...s, activeTab: 'app' }))} 
            currentUser={state.user}
            onUserDeleted={handleUserDeleted}
            onUserUpdated={handleUserUpdated}
          />
        ) : (
          <>
            <section className="w-80 border-r bg-white flex flex-col p-4 overflow-y-auto gap-6 shrink-0">
              <div>
                <h2 className="text-xs font-bold text-slate-800 uppercase mb-4 tracking-widest border-b pb-2">Translation Prompt</h2>
                <textarea 
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder="e.g. Use formal tone, match original font..."
                  className="w-full h-32 p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 ring-indigo-500 outline-none bg-slate-50 shadow-inner"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={state.status === ProcessingStatus.PROCESSING}
                  className="w-full mt-2 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {state.status === ProcessingStatus.PROCESSING ? 'Processing...' : <><SendIcon className="w-4 h-4" /> Start Translation</>}
                </button>
              </div>

              <div className="border-t pt-4">
                <h2 className="text-xs font-bold text-slate-800 uppercase mb-4 tracking-widest border-b pb-2">Output Settings</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block mb-1 text-slate-600 font-semibold">Prefix</label>
                      <input type="text" value={state.outputSettings.prefix} onChange={e => updateSettings('prefix', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 focus:ring-1 ring-indigo-400 bg-slate-50" />
                    </div>
                    <div>
                      <label className="block mb-1 text-slate-600 font-semibold">Suffix</label>
                      <input type="text" value={state.outputSettings.suffix} onChange={e => updateSettings('suffix', e.target.value)} className="w-full border border-slate-300 rounded p-1.5 focus:ring-1 ring-indigo-400 bg-slate-50" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs mb-1 text-slate-600 font-semibold">Format & Resolution</label>
                    <div className="flex gap-2">
                      <select value={state.outputSettings.format} onChange={e => updateSettings('format', e.target.value)} className="text-xs border border-slate-300 rounded p-1.5 flex-1 bg-slate-50">
                        <option value="png">PNG</option>
                        <option value="jpeg">JPEG</option>
                      </select>
                      <select value={state.outputSettings.resolution} onChange={e => updateSettings('resolution', e.target.value)} className="text-xs border border-slate-300 rounded p-1.5 flex-1 bg-slate-50">
                        <option value="original">Original</option>
                        <option value="1K">1K</option>
                        <option value="2K">2K</option>
                        <option value="4K">4K</option>
                      </select>
                    </div>
                  </div>

                  {state.outputSettings.format === 'jpeg' && (
                    <div>
                      <label className="flex justify-between text-xs text-slate-600 font-semibold mb-1">
                        <span>JPEG Quality</span>
                        <span>{state.outputSettings.quality}%</span>
                      </label>
                      <input type="range" min="1" max="100" value={state.outputSettings.quality} onChange={e => updateSettings('quality', parseInt(e.target.value))} className="w-full accent-indigo-600" />
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
              <div className="bg-white p-4 border-b flex items-center justify-between shadow-sm z-10 shrink-0">
                <h2 className="font-bold text-slate-700">Source Canvas</h2>
                <div className="flex items-center gap-4">
                   <LanguageSelector selectedLanguages={state.targetLanguages} onAddLanguage={l => setState(s => ({...s, targetLanguages: [...s.targetLanguages, l]}))} onRemoveLanguage={l => setState(s => ({...s, targetLanguages: s.targetLanguages.filter(x => x!==l)}))} />
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <ImageUploader 
                  uploadedImages={state.uploadedImages}
                  selectedImageIds={state.selectedImageIds}
                  onImagesAdded={handleImagesAdded}
                  onToggleSelect={toggleImageSelection}
                  onRemove={removeImage}
                  onOpenAreaSelector={setEditingImageId}
                  onPreview={setPreviewUrl}
                />

                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800">Results Gallery</h3>
                    {state.generatedImages.length > 0 && (
                      <div className="flex gap-2">
                        <button onClick={() => setState(s => ({ ...s, selectedGeneratedIds: s.generatedImages.map(g => g.id) }))} className="text-xs text-indigo-600 hover:underline">Select All</button>
                        {state.selectedGeneratedIds.length > 0 && (
                          <button onClick={handleBatchDownload} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700">
                            Download Selected ({state.selectedGeneratedIds.length})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                    {state.generatedImages.map(img => {
                      const isSel = state.selectedGeneratedIds.includes(img.id);
                      return (
                        <div 
                          key={img.id} 
                          onClick={() => setState(s => ({ ...s, selectedGeneratedIds: isSel ? s.selectedGeneratedIds.filter(id => id !== img.id) : [...s.selectedGeneratedIds, img.id] }))}
                          className={`group relative bg-white rounded-xl p-2 border-2 transition-all cursor-pointer ${isSel ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-transparent shadow-sm hover:border-slate-300'}`}
                        >
                          <img src={img.url} className="w-full aspect-square object-contain bg-slate-50 rounded-lg mb-2" alt="Result" />
                          <div className="text-[10px] text-slate-700 font-mono truncate px-1">
                            {state.outputSettings.prefix}{img.originalName.replace(/\.[^/.]+$/, "")}{state.outputSettings.suffix}.{state.outputSettings.format}
                          </div>
                          <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                               onClick={e => { e.stopPropagation(); setPreviewUrl(img.url); }} 
                               className="bg-white p-1.5 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                               title="Preview Large"
                             >
                               <EyeIcon className="w-4 h-4"/>
                             </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
