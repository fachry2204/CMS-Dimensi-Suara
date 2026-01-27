
export interface TrackArtist {
  name: string;
  role: string;
}

export interface TrackContributor {
  name: string;
  type: string;
  role: string;
}

export interface AnalysisSegment {
  start: number;
  end: number;
  status: 'CLEAN' | 'AI_DETECTED' | 'COPYRIGHT_MATCH';
  description?: string;
  confidence: number; // 0-100
}

export interface CopyrightMatch {
  title: string;
  artist: string;
  platform: 'Spotify' | 'YouTube Music';
  matchPercentage: number;
  segmentStart: number;
  segmentEnd: number;
}

export interface AnalysisResult {
  isAnalyzing: boolean;
  isComplete: boolean;
  aiProbability: number; // 0-100
  copyrightMatches: CopyrightMatch[];
  segments: AnalysisSegment[]; // Per 10 seconds
}

export interface Track {
  id: string;
  // Files
  audioFile?: File | null;
  audioClip?: File | null;
  videoFile?: File | null;
  
  // Metadata
  trackNumber: string;
  releaseDate: string;
  isrc: string;
  title: string;
  duration: string; // MM:SS

  // Artists
  artists: TrackArtist[];

  // Details
  genre: string;
  explicitLyrics: string; // 'Yes', 'No', 'Clean'
  composer: string;
  lyricist: string;
  lyrics: string;

  // Additional Contributors
  contributors: TrackContributor[];
  
  // Optional: Store analysis if we want to persist it
  analysis?: AnalysisResult;
}

export interface ReleaseData {
  id?: string; // Unique ID for the list
  status?: 'Pending' | 'Processing' | 'Live' | 'Rejected' | 'Draft';
  submissionDate?: string;
  aggregator?: string; // New Field
  
  // Rejection Data
  rejectionReason?: string;
  rejectionDescription?: string;

  // Step 1
  coverArt: File | null;
  upc: string; 
  title: string;
  language: string; 
  primaryArtists: string[];
  label: string;
  version: string;

  // Step 2
  tracks: Track[];

  // Step 3
  isNewRelease: boolean;
  originalReleaseDate: string;
  plannedReleaseDate: string;
}

export enum Step {
  INFO = 1,
  TRACKS = 2,
  DETAILS = 3,
  REVIEW = 4,
}

export type ReleaseType = 'SINGLE' | 'ALBUM';
