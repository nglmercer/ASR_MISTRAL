/**
 * Shared types and interfaces for ASR MISTRAL
 * Reusable module for audio recording and transcription
 */

// ============================================
// Core Types
// ============================================

/**
 * Transcription response from Mistral API
 */
export interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

/**
 * Audio buffer information
 */
export interface AudioBufferInfo {
  duration: number;
  samples: Int16Array | number[];
  sampleRate: number;
  channels: number;
}

/**
 * Audio segment for processing long recordings
 */
export interface AudioSegment {
  index: number;
  startTime: number;
  endTime: number;
  samples: Int16Array | number[];
  duration: number;
}

// ============================================
// Configuration Types
// ============================================

/**
 * Options for transcription
 */
export interface TranscriptionOptions {
  model?: string;
  language?: string;
  prompt?: string;
}

/**
 * Segmentation configuration
 */
export interface SegmentationConfig {
  maxSegmentDurationMs: number;
  silenceThresholdDb: number;
  minSilenceDurationMs: number;
  overlapMs: number;
}

/**
 * Recorder state
 */
export interface RecorderState {
  isRecording: boolean;
  duration: number;
  sampleRate: number;
  channels: number;
}

/**
 * Audio recording options
 */
export interface AudioRecordingOptions {
  sampleRate?: number;
  channels?: number;
}

/**
 * Recorder status (extended recorder state)
 */
export interface RecorderStatus {
  isRecording: boolean;
  duration: number;
  sampleRate: number;
  channels: number;
  samplesCount: number;
}

/**
 * Validation configuration
 */
export interface AudioValidationConfig {
  minDurationMs?: number;
  maxDurationMs?: number;
  minSamples?: number;
  maxSamples?: number;
  allowSilent?: boolean;
  minDbThreshold?: number;
}

// ============================================
// Validation Types
// ============================================

/**
 * Validation result for audio data
 */
export interface ValidationResult {
  isValid: boolean;
  hasContent?: boolean;
  duration?: number;
  error?: string;
  warning?: string;
  warnings?: string[];
}

/**
 * Detailed validation result for audio data
 */
export interface DetailedValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  stats?: {
    duration: number;
    samples: number;
    peakDb: number;
    rmsDb: number;
    isSilent: boolean;
  };
}

// ============================================
// Callback Types
// ============================================

/**
 * Keyboard event handler
 */
export type KeyboardEventHandler = (event: KeyboardEvent) => void;

/**
 * Keyboard event
 */
export interface KeyboardEvent {
  key: string;
  code: string;
  action: 'press' | 'release';
}

/**
 * Callback for transcription results
 */
export type TranscriptionCallback = (
  result: TranscriptionResponse,
  segment?: AudioSegment
) => void;

/**
 * Callback for recording state changes
 */
export type RecordingStateCallback = (state: RecorderState) => void;

// ============================================
// Default Configurations
// ============================================

/**
 * Default segmentation configuration
 */
export const DEFAULT_SEGMENTATION_CONFIG: SegmentationConfig = {
  maxSegmentDurationMs: 30000, // 30 seconds max per segment
  silenceThresholdDb: -40,     // Consider below -40dB as silence
  minSilenceDurationMs: 500,   // Minimum 500ms of silence to split
  overlapMs: 100,              // 100ms overlap between segments
};

/**
 * Default application options
 */
export const DEFAULT_OPTIONS = {
  model: "voxtral-mini-latest",
  minDurationMs: 500,
  maxDurationMs: 300000, // 5 minutes
  minSamples: 1000,
  sampleRate: 44100,
  channels: 1,
} as const;

// ============================================
// Utility Types
// ============================================

/**
 * API key status
 */
export interface ApiKeyStatus {
  configured: boolean;
  keyPrefix?: string;
}

/**
 * Recording control interface
 */
export interface RecordingControls {
  start: () => boolean;
  stop: () => boolean;
  getStatus: () => RecorderStatus;
  isRecording: () => boolean;
}

/**
 * Transcription result with metadata
 */
export interface TranscriptionResult {
  response: TranscriptionResponse;
  metadata: {
    model: string;
    duration: number;
    timestamp: Date;
  };
}
