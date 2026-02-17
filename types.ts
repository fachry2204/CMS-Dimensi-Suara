
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
  iplFile?: File | string | null;
  
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
  subGenre?: string;
  isInstrumental?: 'Yes' | 'No';
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
  distributionTargets?: { id: string; label: string; logo: string }[];
  
  // Rejection Data
  rejectionReason?: string;
  rejectionDescription?: string;

  // Step 1
  coverArt: File | string | null;
  type?: 'SINGLE' | 'ALBUM'; // Added type
  upc: string;  
  title: string;
  language: string; 
  primaryArtists: string[];
  label: string;
  genre?: string;
  subGenre?: string;
  pLine?: string;
  cLine?: string;
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

// Publishing types removed

// --- USER MANAGEMENT TYPES ---

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Operator' | 'User'; // User = Registered User
  status: 'Active' | 'Inactive' | 'Pending' | 'Review' | 'Approved' | 'Rejected';
  joinedDate: string;
  password?: string; // Optional for UI display
  profilePicture?: string;
  rejection_reason?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// --- REPORT & REVENUE TYPES ---

export interface ReportData {
  id: string;
  upc: string;
  isrc: string;
  title: string;
  artist: string;
  platform: string;
  country: string;
  quantity: number;
  revenue: number;
  period: string; // YYYY-MM
  originalFileName: string;
  uploadTimestamp?: string;
  status?: 'Pending' | 'Reviewed';
  verificationStatus?: 'Unchecked' | 'Valid' | 'No User';
}

export interface AggregatedStats {
  totalRevenue: number;
  totalStreams: number;
  topTracks: { title: string; revenue: number; streams: number }[];
  topPlatforms: { name: string; revenue: number }[];
  topCountries: { code: string; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}
