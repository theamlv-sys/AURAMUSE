export enum ProjectType {
  NOVEL = 'NOVEL',
  SCREENPLAY = 'SCREENPLAY',
  YOUTUBE = 'YOUTUBE',
  ESSAY = 'ESSAY',
  CHILDRENS_BOOK = 'CHILDRENS_BOOK',
  EMAIL = 'EMAIL',
  TECHNICAL = 'TECHNICAL',
  LYRICS = 'LYRICS',
  GENERAL = 'GENERAL'
}

export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  content: string;
  createdAt: number;
}

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  type?: 'text' | 'image' | 'video';
  mediaUrl?: string; // For images/videos generated or uploaded
}

export interface Asset {
  id: string;
  type: 'image' | 'video' | 'pdf' | 'link';
  url: string; // URL for link, dataURL for files
  mimeType: string; // 'application/pdf', 'text/plain' (for links)
  name: string;
  base64?: string; // For API transmission (files)
  textContent?: string; // For links
}

export interface GeminiConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export interface AIResponse {
  text: string;
  editorUpdate?: string;
}