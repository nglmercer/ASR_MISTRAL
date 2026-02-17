/**
 * ASR Mistral Plugin
 * 
 * A Bun plugin for real-time audio speech recognition using Mistral AI.
 * Provides both a plugin interface and programmatic API for recording and transcription.
 * 
 * @example
 * ```typescript
 * import asrMistral from "./plugin.js";
 * 
 * // Use as plugin
 * export default asrMistral;
 * 
 * // Or use programmatically
 * asrMistral.startRecording();
 * const result = await asrMistral.transcribeLastRecording();
 * console.log(result.text);
 * ```
 */

import { definePlugin } from "bun_plugins";
import {
  // Core functions
  startRecording,
  stopRecording,
  getRecorderStatus,
  getAudioBuffer,
  isCurrentlyRecording,
  // Transcription
  transcribeBuffer,
  transcribeWithValidation,
  // Validation
  validateAudioBuffer,
  getAudioStats,
  // Utils
  toWav,
  formatRecorderStatus,
  // Types
  type TranscriptionResponse,
  type TranscriptionOptions,
  type RecorderStatus,
  type ValidationResult,
  type AudioStats,
} from "./index.js";

// ============================================
// Plugin Types
// ============================================

export interface ASRPluginConfig {
  /** Model to use for transcription (default: voxtral-mini-latest) */
  model?: string;
  /** Auto-transcribe on stop (default: true) */
  autoTranscribe?: boolean;
  /** Language code (e.g., 'en', 'es') */
  language?: string;
  /** Prompt to guide transcription */
  prompt?: string;
}

export interface ASREventMap {
  "recording:start": void;
  "recording:stop": { duration: number; samples: number };
  "transcription:start": void;
  "transcription:complete": TranscriptionResponse;
  "transcription:error": Error;
  "validation:failed": ValidationResult;
  "ASR:Result": TranscriptionResponse;
  [key: string]: unknown;
}

export type ASREventType = keyof Omit<ASREventMap, string>;

// ============================================
// Plugin State
// ============================================

type EventListener<T> = (data: T) => void;

class EventEmitter<Events extends { [key: string]: unknown }> {
  private listeners: Map<keyof Events, Set<EventListener<any>>> = new Map();

  on<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.listeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (err) {
        console.error(`Error in event listener for ${String(event)}:`, err);
      }
    });
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

// Singleton instances
let eventEmitter: EventEmitter<ASREventMap> | null = null;
let pluginConfig: ASRPluginConfig = {
  model: "voxtral-mini-latest",
  autoTranscribe: true,
};

// ============================================
// Event Emitter Management
// ============================================

function getEventEmitter(): EventEmitter<ASREventMap> {
  if (!eventEmitter) {
    eventEmitter = new EventEmitter<ASREventMap>();
  }
  return eventEmitter;
}

// ============================================
// Recording Functions
// ============================================

/**
 * Start audio recording
 * @returns true if recording started successfully
 */
export function start(): boolean {
  const result = startRecording();
  if (result) {
    getEventEmitter().emit("recording:start", undefined);
  }
  return result;
}

/**
 * Stop audio recording
 * @returns true if recording stopped successfully
 */
export function stop(): boolean {
  const status = getRecorderStatus();
  const result = stopRecording();
  if (result) {
    getEventEmitter().emit("recording:stop", {
      duration: status.duration,
      samples: status.samplesCount,
    });
  }
  return result;
}

/**
 * Toggle recording state
 * @returns new recording state (true = recording, false = stopped)
 */
export function toggle(): boolean {
  if (isCurrentlyRecording()) {
    stop();
    return false;
  } else {
    start();
    return true;
  }
}

/**
 * Get current recorder status
 */
export function getStatus(): RecorderStatus {
  return getRecorderStatus();
}

/**
 * Check if currently recording
 */
export function isRecording(): boolean {
  return isCurrentlyRecording();
}

/**
 * Format recorder status for display
 */
export function formatStatus(): string {
  return formatRecorderStatus();
}

// ============================================
// Transcription Functions
// ============================================

/**
 * Transcribe the last recording
 * @param options Transcription options (model, language, prompt)
 * @returns Transcription result
 */
export async function transcribe(
  options: TranscriptionOptions = {}
): Promise<TranscriptionResponse> {
  const config = { ...pluginConfig, ...options };
  
  getEventEmitter().emit("transcription:start", undefined);

  try {
    // Get audio buffer
    const audioBuffer = getAudioBuffer();
    
    // Validate audio
    const validation = validateAudioBuffer(audioBuffer);
    if (!validation.isValid) {
      getEventEmitter().emit("validation:failed", validation);
      // Emit error event and throw
      const error = new Error(validation.error || "Invalid audio");
      getEventEmitter().emit("transcription:error", error);
      throw error;
    }

    // Get stats
    const stats = getAudioStats(audioBuffer);
    
    // Convert to WAV
    const samples = audioBuffer.getSamples();
    const sampleRate = audioBuffer.getSampleRate() || 44100;
    const channels = audioBuffer.getChannels() || 1;
    const wavBuffer = toWav(samples, sampleRate, channels);

    // Transcribe
    const result = await transcribeBuffer(wavBuffer, {
      model: config.model,
      language: config.language,
      prompt: config.prompt,
    });

    getEventEmitter().emit("transcription:complete", result);
    getEventEmitter().emit("ASR:Result", result);
    
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    getEventEmitter().emit("transcription:error", err);
    getEventEmitter().emit("ASR:Result", {
      text: `Transcription error: ${err.message}`,
    });
    throw error;
  }
}

/**
 * Transcribe with validation
 * @param options Transcription options
 * @returns Transcription result or null if validation fails
 */
export async function transcribeWithValidate(
  options: TranscriptionOptions = {}
): Promise<TranscriptionResponse | null> {
  const config = { ...pluginConfig, ...options };
  
  getEventEmitter().emit("transcription:start", undefined);

  try {
    const audioBuffer = getAudioBuffer();
    const validation = validateAudioBuffer(audioBuffer);
    
    if (!validation.isValid) {
      getEventEmitter().emit("validation:failed", validation);
      return null;
    }

    const samples = audioBuffer.getSamples();
    const sampleRate = audioBuffer.getSampleRate() || 44100;
    const channels = audioBuffer.getChannels() || 1;
    const wavBuffer = toWav(samples, sampleRate, channels);

    const result = await transcribeWithValidation(wavBuffer, validation, {
      model: config.model,
      language: config.language,
      prompt: config.prompt,
    });

    if (result) {
      getEventEmitter().emit("transcription:complete", result);
      getEventEmitter().emit("ASR:Result", result);
    }
    
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    getEventEmitter().emit("transcription:error", err);
    throw error;
  }
}

/**
 * Convenience function: stop recording and transcribe
 * @param options Transcription options
 * @returns Transcription result
 */
export async function stopAndTranscribe(
  options: TranscriptionOptions = {}
): Promise<TranscriptionResponse> {
  stop();
  return transcribe(options);
}

// ============================================
// Audio Buffer Access
// ============================================

/**
 * Get the current audio buffer
 */
export function getBuffer() {
  return getAudioBuffer();
}

/**
 * Get audio statistics
 */
export function getStats(): AudioStats {
  const buffer = getAudioBuffer();
  return getAudioStats(buffer);
}

/**
 * Validate current recording
 */
export function validate(): ValidationResult {
  const buffer = getAudioBuffer();
  return validateAudioBuffer(buffer);
}

// ============================================
// Event System
// ============================================

/**
 * Subscribe to ASR events
 * @example
 * asrMistral.on("recording:start", () => console.log("Recording started"));
 * asrMistral.on("transcription:complete", (result) => console.log(result.text));
 */
export function on<K extends keyof ASREventMap>(
  event: K,
  listener: EventListener<ASREventMap[K]>
): void {
  getEventEmitter().on(event, listener);
}

/**
 * Unsubscribe from ASR events
 */
export function off<K extends keyof ASREventMap>(
  event: K,
  listener: EventListener<ASREventMap[K]>
): void {
  getEventEmitter().off(event, listener);
}

/**
 * Subscribe to transcription results (alias for on("ASR:Result", ...))
 */
export function onResult(listener: EventListener<TranscriptionResponse>): void {
  getEventEmitter().on("ASR:Result", listener);
}

/**
 * Remove all event listeners
 */
export function removeAllListeners(): void {
  getEventEmitter().removeAllListeners();
}

// ============================================
// Configuration
// ============================================

/**
 * Configure the plugin
 */
export function configure(config: Partial<ASRPluginConfig>): void {
  pluginConfig = { ...pluginConfig, ...config };
}

/**
 * Get current configuration
 */
export function getConfig(): Readonly<ASRPluginConfig> {
  return { ...pluginConfig };
}

// ============================================
// Cleanup
// ============================================

/**
 * Cleanup resources
 */
export function dispose(): void {
  if (isCurrentlyRecording()) {
    stopRecording();
  }
  removeAllListeners();
}

// ============================================
// Plugin Export
// ============================================

/**
 * Create the Bun plugin
 */
function createPlugin() {
  return definePlugin({
    name: "asr_mistral",
    version: "1.0.0",
    onLoad(context) {
      // Register simple event handlers for plugin context
      // Using void functions to avoid callback type issues
      context.on("ASR:Start", () => {
        start();
      });

      context.on("ASR:Stop", () => {
        stop();
      });

      context.on("ASR:Transcribe", () => {
        // Fire and forget - user can subscribe to events for results
        transcribe().catch(err => console.error("Transcription error:", err));
      });

      context.on("ASR:Toggle", () => {
        toggle();
      });
    },
    onUnload() {
      dispose();
    },
  });
}

// ============================================
// Main API Export
// ============================================

/**
 * Complete ASR Mistral API
 * Provides both plugin integration and programmatic use
 */
export const asrMistral = {
  // Plugin instance
  plugin: createPlugin(),
  
  // Recording control
  start,
  stop,
  toggle,
  getStatus,
  isRecording,
  formatStatus,
  
  // Transcription
  transcribe,
  transcribeWithValidate,
  stopAndTranscribe,
  
  // Audio access
  getBuffer,
  getStats,
  validate,
  
  // Events
  on,
  off,
  onResult,
  removeAllListeners,
  
  // Configuration
  configure,
  getConfig,
  
  // Cleanup
  dispose,
};

// Export the plugin as a named export for Bun
export { createPlugin };

// Default export for convenience
export default asrMistral;
