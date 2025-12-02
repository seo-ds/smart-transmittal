import React, { useState, ChangeEvent } from 'react';
import { UploadCloud, List, Loader2, Play, HardDrive, AlertTriangle, FolderTree, Eye } from 'lucide-react';
import { listGoogleDriveFiles, DriveFile } from './geminiService';

interface FileInputProps {
  onProcess: (files: any[], deepAnalysis?: boolean) => void;
  isScanning: boolean;
  driveId: string;
}

export const FileInput: React.FC<FileInputProps> = ({ onProcess, isScanning, driveId }) => {
  const [mode, setMode] = useState<'upload' | 'paste' | 'drive'>('upload');
  const [textInput, setTextInput] = useState('');
  const [localDriveId, setLocalDriveId] = useState(driveId);
  const [scanSubfolders, setScanSubfolders] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState(false);
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const names = Array.from(e.target.files).map((f: File) => f.name);
      onProcess(names, false);
    }
  };

  const handlePasteProcess = () => {
    const lines = textInput.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) onProcess(lines, false);
  };

  const handleDriveScan = async () => {
    if (!localDriveId) return;
    
    setIsFetchingDrive(true);
    setScanError(null);

    try {
        const files: DriveFile[] = await listGoogleDriveFiles(localDriveId, undefined, scanSubfolders);
        if (files.length === 0) {
          setScanError("No files found in this folder (and subfolders).");
        } else {
          // Pass the full file objects + the API Key (needed for downloading content)
          onProcess(files, deepAnalysis);
        }
    } catch (e: any) {
        setScanError(e.message || "Could not scan Drive folder.");
    } finally {
      setIsFetchingDrive(false);
    }
  };

  const handleChangeKey = async () => {
    try {
      if ((window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
        setScanError(null);
      } else {
        alert("API Key selection is not available.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isApiKeyError = scanError && (
    scanError.includes("API_KEY") || 
    scanError.toLowerCase().includes("api key")
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button 
          onClick={() => { setMode('upload'); setScanError(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${mode === 'upload' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Select Files
        </button>
        <button 
          onClick={() => { setMode('paste'); setScanError(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${mode === 'paste' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Paste List
        </button>
        <button 
          onClick={() => { setMode('drive'); setScanError(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${mode === 'drive' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Google Drive
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[150px] flex flex-col justify-center">
        {isScanning ? (
          <div className="flex flex-col items-center justify-center py-8 text-blue-600">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm font-medium">
               {deepAnalysis ? "Performing Deep Analysis (Reading Files)..." : "Encoding Transmittal..."}
            </p>
            <p className="text-xs text-slate-400">
               {deepAnalysis ? "This may take a moment per file" : "Gemini is analyzing document titles"}
            </p>
          </div>
        ) : (
          <>
            {mode === 'upload' && (
              <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors">
                <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
                <span className="text-sm font-medium text-slate-700">Click to select files</span>
                <span className="text-xs text-slate-400 mt-1">or drag and drop here</span>
                <input type="file" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            )}

            {mode === 'paste' && (
              <div className="flex flex-col gap-2">
                <textarea 
                  className="w-full h-32 p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none font-mono"
                  placeholder="Paste filenames here, one per line..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
                <button 
                  onClick={handlePasteProcess}
                  disabled={!textInput.trim()}
                  className="self-end px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <List className="w-4 h-4" />
                  Process List
                </button>
              </div>
            )}

            {mode === 'drive' && (
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl text-center">
                 <HardDrive className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                 <p className="text-sm text-slate-700 mb-4">
                   Enter a <strong>Public</strong> Google Drive Folder ID or URL.
                 </p>
                 
                 <div className="max-w-md mx-auto space-y-3">
                   <input 
                      type="text" 
                      value={localDriveId}
                      onChange={(e) => setLocalDriveId(e.target.value)}
                      placeholder="Folder ID (e.g. 1A2b3C...) or URL"
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-center"
                   />

                   {/* Options Row */}
                   <div className="flex items-center justify-center gap-4 text-sm text-slate-600 py-2">
                      <div className="flex items-center gap-2">
                          <input 
                            id="scanSubfolders"
                            type="checkbox" 
                            checked={scanSubfolders}
                            onChange={(e) => setScanSubfolders(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="scanSubfolders" className="cursor-pointer select-none flex items-center gap-1">
                            <FolderTree className="w-3 h-3" />
                            Subfolders
                          </label>
                      </div>
                      
                      <div className="flex items-center gap-2" title="Reads first page of PDFs for exact metadata. Slower.">
                          <input 
                            id="deepAnalysis"
                            type="checkbox" 
                            checked={deepAnalysis}
                            onChange={(e) => setDeepAnalysis(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="deepAnalysis" className="cursor-pointer select-none flex items-center gap-1 text-indigo-700 font-medium">
                            <Eye className="w-3 h-3" />
                            Deep Analysis
                          </label>
                      </div>
                   </div>
                   
                   <button 
                     onClick={handleDriveScan}
                     disabled={!localDriveId || isFetchingDrive}
                     className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-shadow shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {isFetchingDrive ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Scanning Drive...
                        </>
                     ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Scan Folder
                        </>
                     )}
                   </button>
                   
                   {scanError && (
                     <div className="text-left mt-3 p-3 bg-red-100 border border-red-200 text-red-700 text-xs rounded-lg">
                       <div className="flex gap-2 items-start">
                         <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                         <div className="flex-1">
                           <span className="font-bold block mb-1">Scan Failed</span>
                           {scanError}
                         </div>
                       </div>
                       {isApiKeyError && (
                         <div className="mt-3 pl-6">
                           <button 
                               onClick={handleChangeKey}
                               className="text-xs bg-white border border-red-300 px-2 py-1 rounded"
                           >
                               Change Key
                           </button>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};