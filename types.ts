
export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UploadedImage {
  id: string;
  url: string; // Base64 or Blob URL
  file?: File;
  name: string;
  mimeType: string;
  selections?: Selection[];
}

export interface GeneratedImage {
  id: string;
  originalImageId: string;
  originalName: string;
  url: string;
  description: string;
  createdAt: number;
}

export interface OutputSettings {
  prefix: string;
  suffix: string;
  format: 'png' | 'jpeg';
  quality: number;
  resolution: 'original' | '1K' | '2K' | '4K';
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  attachments?: string[];
  isError?: boolean;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface AppState {
  uploadedImages: UploadedImage[];
  selectedImageIds: string[];
  targetLanguages: string[];
  generatedImages: GeneratedImage[];
  selectedGeneratedIds: string[];
  messages: Message[];
  status: ProcessingStatus;
  errorMessage?: string;
  outputSettings: OutputSettings;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}
