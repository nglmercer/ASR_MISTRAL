/**
 * ASR Mistral - Audio Speech Recognition with Mistral AI
 * 
 * Modular TypeScript library for recording audio and transcribing using
 * Mistral's speech-to-text API.
 * 
 * @example
 * ```typescript
 * import { startRecording, stopRecording, transcribeBuffer } from './index.js';
 * 
 * // Start recording
 * startRecording();
 * 
 * // ... record audio ...
 * 
 * // Stop and transcribe
 * const buffer = stopRecording();
 * const result = await transcribeBuffer(buffer);
 * console.log(result.text);
 * ```
 */

// ============================================
// Re-export all modules
// ============================================

// Types
export * from "./types.js";

// Recorder
export {
  getRecorder,
  getRecorderStatus,
  startRecording,
  stopRecording,
  getAudioBuffer,
  isCurrentlyRecording,
  resetRecorder,
  formatRecorderStatus,
} from "./recorder.js";

// Validation
export {
  validateAudioBuffer,
  assertValidAudio,
  getAudioStats,
  formatValidationResult,
} from "./validation.js";

// Transcription
export {
  getMistralClient,
  transcribeBuffer,
  transcribeWithValidation,
  transcribeSegments,
  transcribeSegment,
  hasContent,
  formatResult,
} from "./transcription.js";

// Keyboard
export {
  KeyboardHandler,
  setupKeyboard,
} from "./keyboard.js";

// Segmentation
export {
  segmentAudio,
  segmentBySilence,
  segmentsToWav,
} from "./segmentation.js";

// Utils
export {
  toWav,
  analyzeAudio,
  createLevelBar,
  saveWavFile,
  formatDuration,
  getLevelColor,
  clearLine,
  AudioStats,
  colors,
} from "./utils/audio.js";

// ============================================
// Default configurations
// ============================================

export {
  DEFAULT_SEGMENTATION_CONFIG,
  DEFAULT_OPTIONS,
} from "./types.js";

export type {
  TranscriptionResponse,
  AudioBufferInfo,
  AudioSegment,
  TranscriptionOptions,
  SegmentationConfig,
  RecorderState,
  AudioRecordingOptions,
  RecorderStatus,
  AudioValidationConfig,
  ValidationResult,
  DetailedValidationResult,
  KeyboardEventHandler,
  KeyboardEvent,
  TranscriptionCallback,
  RecordingStateCallback,
  ApiKeyStatus,
  RecordingControls,
  TranscriptionResult,
} from "./types.js";
