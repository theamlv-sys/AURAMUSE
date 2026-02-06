
export enum ProjectType {
    NOVEL = 'NOVEL',
    SCREENPLAY = 'SCREENPLAY',
    YOUTUBE = 'YOUTUBE',
    ESSAY = 'ESSAY',
    CHILDRENS_BOOK = 'CHILDRENS_BOOK',
    EMAIL = 'EMAIL',
    TECHNICAL = 'TECHNICAL',
    LYRICS = 'LYRICS',
    AD = 'AD',
    COMMERCIAL = 'COMMERCIAL',
    SOCIAL_MEDIA = 'SOCIAL_MEDIA',
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
    type?: 'text' | 'image' | 'video' | 'audio';
    mediaUrl?: string; // For images/videos generated or uploaded
}

export interface Asset {
    id: string;
    type: 'image' | 'video' | 'pdf' | 'link' | 'audio';
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
    editorAppend?: string;
}

export type VoiceName =
    | 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Leda' | 'Orus' | 'Aoede'
    | 'Callirrhoe' | 'Autonoe' | 'Enceladus' | 'Iapetus' | 'Umbriel' | 'Algieba'
    | 'Despina' | 'Erinome' | 'Algenib' | 'Rasalgethi' | 'Laomedeia' | 'Achernar'
    | 'Alnilam' | 'Schedar' | 'Gacrux' | 'Pulcherrima' | 'Achird' | 'Zubenelgenubi'
    | 'Vindemiatrix' | 'Sadachbia' | 'Sadaltager' | 'Sulafat';

export interface VoiceConfig {
    name: VoiceName;
    gender: 'Male' | 'Female';
    style: string;
}

export const AVAILABLE_VOICES: VoiceConfig[] = [
    { name: 'Zephyr', gender: 'Female', style: 'Bright' },
    { name: 'Puck', gender: 'Male', style: 'Upbeat' },
    { name: 'Charon', gender: 'Male', style: 'Informative' },
    { name: 'Kore', gender: 'Female', style: 'Firm' },
    { name: 'Fenrir', gender: 'Male', style: 'Excitable' },
    { name: 'Leda', gender: 'Female', style: 'Youthful' },
    { name: 'Orus', gender: 'Male', style: 'Firm' },
    { name: 'Aoede', gender: 'Female', style: 'Breezy' },
    { name: 'Callirrhoe', gender: 'Female', style: 'Easy-going' },
    { name: 'Autonoe', gender: 'Female', style: 'Bright' },
    { name: 'Enceladus', gender: 'Male', style: 'Breathy' },
    { name: 'Iapetus', gender: 'Male', style: 'Clear' },
    { name: 'Umbriel', gender: 'Male', style: 'Easy-going' },
    { name: 'Algieba', gender: 'Male', style: 'Smooth' },
    { name: 'Despina', gender: 'Female', style: 'Smooth' },
    { name: 'Erinome', gender: 'Female', style: 'Clear' },
    { name: 'Algenib', gender: 'Male', style: 'Gravelly' },
    { name: 'Rasalgethi', gender: 'Female', style: 'Informative' },
    { name: 'Laomedeia', gender: 'Female', style: 'Upbeat' },
    { name: 'Achernar', gender: 'Male', style: 'Soft' },
    { name: 'Alnilam', gender: 'Male', style: 'Firm' },
    { name: 'Schedar', gender: 'Male', style: 'Even' },
    { name: 'Gacrux', gender: 'Female', style: 'Mature' },
    { name: 'Pulcherrima', gender: 'Female', style: 'Forward' },
    { name: 'Achird', gender: 'Female', style: 'Friendly' },
    { name: 'Zubenelgenubi', gender: 'Male', style: 'Casual' },
    { name: 'Vindemiatrix', gender: 'Female', style: 'Gentle' },
    { name: 'Sadachbia', gender: 'Female', style: 'Lively' },
    { name: 'Sadaltager', gender: 'Female', style: 'Knowledgeable' },
    { name: 'Sulafat', gender: 'Female', style: 'Warm' },
];

export interface TTSCharacterSettings {
    description: string;
    style: string;
    pacing: string;
    accent: string;
}

export interface TTSCharacter {
    character: string;
    voice: VoiceName;
    settings: TTSCharacterSettings;
    autoSetInput: string;
    isAutoSetting: boolean;
    isExpanded: boolean;
}

export interface TTSDirectorConfig {
    audioProfile: string;
    scene: string;
    style: string;
    pacing: string;
    accent: string;
}

export interface TTSState {
    text: string;
    mode: 'single' | 'multi';
    selectedSingleVoice: VoiceName;
    isDirectorMode: boolean;
    directorConfig: TTSDirectorConfig;
    characters: TTSCharacter[];
    direction: string;
    autoGenerateTrigger: boolean;
}

// --- NEW COMMERCIAL & BIBLE FEATURES ---

export interface StoryBibleEntry {
    id: string;
    projectType: ProjectType; // Added for isolation
    category: 'character' | 'world' | 'style';
    name: string;
    description: string;
}

export interface VersionSnapshot {
    id: string;
    projectType: ProjectType; // Added for isolation
    timestamp: number;
    content: string;
    description: string;
}

export type SubscriptionTier = 'FREE' | 'SCRIBE' | 'AUTEUR' | 'SHOWRUNNER';

export interface CreditTransaction {
    id: string;
    timestamp: number;
    type: 'purchase' | 'usage';
    item: 'video' | 'image' | 'voice' | 'audio' | 'pack';
    amount: number; // Positive for purchase, negative for usage
    description: string;
}

export interface UsageStats {
    videosGenerated: number;
    imagesGenerated: number;
    audioMinutesGenerated: number;
    voiceMinutesUsed: number; // For live voice mode
    voiceBalance: number; // Minutes remaining
    imageBalance: number; // Images remaining
    videoBalance: number; // Videos remaining
    audioBalance: number; // Audio characters remaining
    history: CreditTransaction[];
}

export interface PlanLimits {
    videos: number; // Total quota
    images: number;
    maxVoiceMinutes: number;
    voiceCredits: number; // Bonus/initial credits
    imageCredits: number;
    videoCredits: number;
    audioCredits: number;
    hasEnsembleCast: boolean;
    hasVoiceAssistant: boolean;
    hasBible: boolean;
    hasVeo: boolean;
    hasAudioStudio: boolean;
    maxAudioCharsPerGen: number; // Regulation for TTS Studio
}

export const TIERS: Record<SubscriptionTier, { name: string, price: number, limits: PlanLimits }> = {
    FREE: {
        name: 'Visitor',
        price: 0,
        limits: {
            videos: 0, images: 0, maxVoiceMinutes: 0,
            voiceCredits: 0, imageCredits: 0, videoCredits: 0, audioCredits: 0,
            hasEnsembleCast: false, hasVoiceAssistant: false, hasBible: false, hasVeo: false,
            hasAudioStudio: false, maxAudioCharsPerGen: 0
        }
    },
    SCRIBE: {
        name: 'Scribe',
        price: 29,
        limits: {
            videos: 0, images: 20, maxVoiceMinutes: 0,
            voiceCredits: 0, imageCredits: 10, videoCredits: 0, audioCredits: 1000,
            hasEnsembleCast: false, hasVoiceAssistant: false, hasBible: true, hasVeo: false,
            hasAudioStudio: true, maxAudioCharsPerGen: 1000
        }
    },
    AUTEUR: {
        name: 'Auteur',
        price: 79,
        limits: {
            videos: 5, images: 100, maxVoiceMinutes: 60,
            voiceCredits: 20, imageCredits: 50, videoCredits: 3, audioCredits: 5000,
            hasEnsembleCast: true, hasVoiceAssistant: true, hasBible: true, hasVeo: true,
            hasAudioStudio: true, maxAudioCharsPerGen: 5000
        }
    },
    SHOWRUNNER: {
        name: 'Showrunner',
        price: 199,
        limits: {
            videos: 25, images: 500, maxVoiceMinutes: 300,
            voiceCredits: 100, imageCredits: 200, videoCredits: 10, audioCredits: 15000,
            hasEnsembleCast: true, hasVoiceAssistant: true, hasBible: true, hasVeo: true,
            hasAudioStudio: true, maxAudioCharsPerGen: 15000
        }
    }
};

export interface SavedProject {
    id: string;
    title: string;
    type: ProjectType;
    content: string;
    lastModified: number;
    previewSnippet: string;
}

export type ViewMode = 'HOME' | 'PROJECTS' | 'ASSETS' | 'SETTINGS' | 'EDITOR';
