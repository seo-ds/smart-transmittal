import React, { useState, useEffect } from 'react';
import { X, Key, Save, Trash2, Eye, EyeOff } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  savedKey: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, savedKey }) => {
  const [inputKey, setInputKey] = useState(savedKey);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setInputKey(savedKey);
  }, [savedKey, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4 transform transition-all scale-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            API Key Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          Enter your Google Gemini API Key below. This key will be used for AI processing and Google Drive scanning.
        </p>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Key className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type={showKey ? "text" : "password"}
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Enter API Key (AIza...)"
            className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm shadow-sm"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
            title={showKey ? "Hide Key" : "Show Key"}
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { onSave(''); onClose(); }}
            className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            title="Remove stored key"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <div className="flex-1"></div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(inputKey); onClose(); }}
            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Key
          </button>
        </div>
        
        <p className="text-xs text-slate-400 mt-6 text-center border-t border-slate-100 pt-3">
          Your key is stored securely in your browser's Local Storage.
        </p>
      </div>
    </div>
  );
};