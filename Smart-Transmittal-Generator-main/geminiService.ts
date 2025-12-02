import { GoogleGenAI, Type } from "@google/genai";
import { TransmittalItem } from "./types";

const getStoredApiKey = (): string | null => {
  return localStorage.getItem('gemini_api_key');
};

// Helper function to split array into chunks
const chunkArray = (array: any[], size: number) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  contentBase64?: string; // Optional content for deep scan
}

/**
 * Downloads a file from Google Drive and returns base64 content
 */
const downloadFileContent = async (fileId: string, apiKey: string): Promise<string | null> => {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (error) {
    console.warn(`Failed to download content for file ${fileId}`, error);
    return null;
  }
};

export const listGoogleDriveFiles = async (
  folderIdOrUrl: string,
  customApiKey?: string,
  scanSubfolders: boolean = false
): Promise<DriveFile[]> => {
  let folderId = folderIdOrUrl;
  
  const urlMatch = folderIdOrUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (urlMatch && urlMatch[1]) {
    folderId = urlMatch[1];
  }

  const apiKey = customApiKey || getStoredApiKey();

  if (!apiKey) {
    throw new Error("No API Key configured. Please set your API key in Settings.");
  }

  const filesFound: DriveFile[] = [];
  const folderQueue: string[] = [folderId];
  const visitedFolders = new Set<string>();
  
  const MAX_FOLDERS_TO_SCAN = scanSubfolders ? 50 : 1;
  let foldersProcessed = 0;

  while (folderQueue.length > 0) {
    if (foldersProcessed >= MAX_FOLDERS_TO_SCAN) break;

    const currentFolderId = folderQueue.shift();
    if (!currentFolderId || visitedFolders.has(currentFolderId)) continue;

    visitedFolders.add(currentFolderId);
    foldersProcessed++;

    let pageToken = '';

    try {
      do {
        const query = `'${currentFolderId}' in parents and trashed = false`;
        const fields = 'nextPageToken,files(id,name,mimeType)';
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${fields}&key=${apiKey}&pageSize=1000&pageToken=${pageToken}`;

        const response = await fetch(url);
        
        if (!response.ok) {
           const errorData = await response.json().catch(() => ({}));
           const errorMessage = errorData.error?.message || `Status ${response.status}`;
           if (foldersProcessed === 1) throw new Error(errorMessage);
           break; 
        }

        const data = await response.json();
        const files = data.files || [];

        for (const file of files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            if (scanSubfolders) folderQueue.push(file.id);
          } else {
            if (file.name) {
                filesFound.push({
                    id: file.id,
                    name: file.name,
                    mimeType: file.mimeType
                });
            }
          }
        }

        pageToken = data.nextPageToken || '';

      } while (pageToken);

    } catch (error) {
      if (foldersProcessed === 1) throw error;
      console.error(error);
    }
  }

  return filesFound;
};

export const processFilesWithGemini = async (
  files: (string | DriveFile)[],
  projectName: string,
  enableDeepAnalysis: boolean = false,
  apiKeyOverride?: string
): Promise<TransmittalItem[]> => {
  
  const apiKey = apiKeyOverride || getStoredApiKey();
  if (!apiKey) throw new Error("No API Key configured. Please set your API key in Settings.");

  const ai = new GoogleGenAI({ apiKey });

  const normalizedFiles: DriveFile[] = files.map(f => {
    if (typeof f === 'string') return { id: '', name: f, mimeType: 'application/octet-stream' };
    return f;
  });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            originalFilename: { type: Type.STRING },
            qty: { type: Type.STRING },
            documentType: { type: Type.STRING }, // New Field
            description: { type: Type.STRING },  // New Field
            remarks: { type: Type.STRING }
          },
          required: ["originalFilename", "qty", "documentType", "description", "remarks"]
        }
      }
    },
    required: ["items"]
  };

  const BATCH_SIZE = enableDeepAnalysis ? 3 : 30;
  const batches = chunkArray(normalizedFiles, BATCH_SIZE);
  let allItems: any[] = [];

  try {
    const promises = batches.map(async (batch, index) => {
      let parts: any[] = [];

      if (enableDeepAnalysis) {
        for (const file of batch) {
            let hasContent = false;
            if (file.id && (file.mimeType.includes('pdf') || file.mimeType.includes('image'))) {
                try {
                    const base64 = await downloadFileContent(file.id, apiKey);
                    if (base64) {
                        parts.push({
                            inlineData: {
                                mimeType: file.mimeType,
                                data: base64
                            }
                        });
                        parts.push({ text: `Above is content for file: ${file.name}` });
                        hasContent = true;
                    }
                } catch (e) {
                    console.warn("Skipping deep scan", file.name);
                }
            }
            if (!hasContent) {
                parts.push({ text: `File Name Only: ${file.name}` });
            }
        }
      } else {
        const names = batch.map(f => f.name);
        parts.push({ text: `File List:\n${JSON.stringify(names)}` });
      }

      const promptText = `
        You are an expert Document Controller.
        Context Project: ${projectName}
        
        Task: Categorize and Describe the files for a transmittal form.
        ${enableDeepAnalysis ? "CRITICAL: Read the document content/Title Block to find the most accurate information." : "Infer information from the filenames."}
        
        Output Rules:
        1.  qty: "1".
        2.  documentType: CATEGORIZE the file into a high-level type. Examples: "Architectural Plan", "Structural Drawing", "Letter of Intent", "Project Specification", "Financial Report", "Memo".
        3.  description: Provide a SPECIFIC, detailed summary of the document's content.
            -   Examples: "Ground Floor Layout and Dimensions", "Column and Beam Reinforcement Details for Section A", "Request for Information regarding HVAC system".
            -   If a revision is found (e.g., Rev A, V2), include it here, like "Ground Floor Plan [Rev A]".
            -   REMOVE file extensions.
        4.  remarks: Return an empty string "".

        If deep analysis fails or file content is missing for an item, fall back to analyzing its filename.
      `;

      parts.push({ text: promptText });

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash", // Good for multi-modal
          contents: { parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
          },
        });

        const text = response.text;
        if (!text) return [];
        const data = JSON.parse(text.trim());
        
        // Match results back to original filenames
        const processedItems = (data.items || []).map((item: any) => {
          // A simple heuristic to find the matching original file name
          const original = batch.find(f => f.name.includes(item.originalFilename) || item.originalFilename.includes(f.name));
          return {
            ...item,
            originalFilename: original ? original.name : item.originalFilename
          };
        });

        return processedItems;
      } catch (e) {
        console.error(`Batch ${index} error:`, e);
        return [];
      }
    });

    const results = await Promise.all(promises);
    results.forEach(batchItems => allItems.push(...batchItems));

    if (allItems.length === 0 && normalizedFiles.length > 0) {
      throw new Error("No items processed. API might be blocked or empty.");
    }

    return allItems.map((item: any, index: number) => ({
      ...item,
      id: `doc-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }));

  } catch (error: any) {
    console.error("Gemini Process Error:", error);
    throw new Error(`AI Processing Failed: ${error.message}`);
  }
};