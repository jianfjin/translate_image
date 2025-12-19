import React, { useState } from 'react';
import { PlusIcon, XIcon } from './Icons';

interface LanguageSelectorProps {
  selectedLanguages: string[];
  onAddLanguage: (lang: string) => void;
  onRemoveLanguage: (lang: string) => void;
  disabled?: boolean;
}

const COMMON_LANGUAGES = ['Spanish', 'French', 'German', 'Italian', 'Chinese', 'Japanese', 'Korean', 'Portuguese'];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguages,
  onAddLanguage,
  onRemoveLanguage,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim() && !selectedLanguages.includes(inputValue.trim())) {
      onAddLanguage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {selectedLanguages.map((lang) => (
          <span 
            key={lang} 
            className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium border border-indigo-200"
          >
            {lang}
            <button 
              onClick={() => onRemoveLanguage(lang)}
              disabled={disabled}
              className="hover:text-indigo-900 focus:outline-none"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Add language (e.g. Dutch)"
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleAdd}
          disabled={disabled || !inputValue.trim()}
          className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-1">
        <span className="text-xs text-slate-400 py-1">Common:</span>
        {COMMON_LANGUAGES.map(lang => (
          <button
            key={lang}
            onClick={() => !selectedLanguages.includes(lang) && onAddLanguage(lang)}
            disabled={disabled || selectedLanguages.includes(lang)}
            className={`
              text-xs px-2 py-1 rounded border transition-colors
              ${selectedLanguages.includes(lang) 
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}
            `}
          >
            {lang}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;