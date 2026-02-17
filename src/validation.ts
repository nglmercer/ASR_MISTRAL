/**
 * Audio validation module
 * Validates audio buffers before sending to transcription API
 */

import { SamplesBuffer } from "miniaudio_node";
import { ValidationResult, DEFAULT_OPTIONS } from "./types.js";
import { analyzeAudio, AudioStats } from "./utils/audio.js";

/**
 * Configuration for audio validation
 */
export interface AudioValidationConfig {
  minDurationMs?: number;
  maxDurationMs?: number;
  minSamples?: number;
  maxSamples?: number;
  allowSilent?: boolean;
  minDbThreshold?: number;
}

/**
 * Default validation configuration
 */
const DEFAULT_VALIDATION_CONFIG: Required<AudioValidationConfig> = {
  minDurationMs: DEFAULT_OPTIONS.minDurationMs,
  maxDurationMs: DEFAULT_OPTIONS.maxDurationMs,
  minSamples: DEFAULT_OPTIONS.minSamples,
  maxSamples: 30 * 48000, // 30 seconds at max sample rate
  allowSilent: false,
  minDbThreshold: -60,
};

/**
 * Validates an audio buffer
 * @param buffer - The SamplesBuffer to validate
 * @param config - Validation configuration (optional)
 * @returns ValidationResult with success status and any errors/warnings
 */
export function validateAudioBuffer(
  buffer: SamplesBuffer,
  config: AudioValidationConfig = {}
): ValidationResult {
  const cfg = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get buffer properties
  const samples = buffer.getSamples();
  const duration = buffer.getDuration() * 1000; // Convert to ms
  const sampleRate = buffer.getSampleRate() || 44100;
  const channels = buffer.getChannels() || 1;
  const numSamples = samples.length;

  // Check if buffer is empty
  if (!samples || numSamples === 0) {
    return {
      isValid: false,
      error: "Audio buffer is empty",
    };
  }

  // Check minimum duration
  if (duration < cfg.minDurationMs) {
    return {
      isValid: false,
      error: `Audio too short: ${duration.toFixed(0)}ms (min: ${cfg.minDurationMs}ms)`,
    };
  }

  // Check maximum duration
  if (duration > cfg.maxDurationMs) {
    return {
      isValid: false,
      error: `Audio too long: ${duration.toFixed(0)}ms (max: ${cfg.maxDurationMs}ms)`,
    };
  }

  // Check minimum samples
  if (numSamples < cfg.minSamples) {
    return {
      isValid: false,
      error: `Insufficient samples: ${numSamples} (min: ${cfg.minSamples})`,
    };
  }

  // Check maximum samples
  if (numSamples > cfg.maxSamples) {
    return {
      isValid: false,
      error: `Too many samples: ${numSamples} (max: ${cfg.maxSamples})`,
    };
  }

  // Analyze audio levels if not allowing silent
  if (!cfg.allowSilent) {
    const stats = analyzeAudio(Array.from(samples));
    
    if (stats.isSilent) {
      return {
        isValid: false,
        error: "Audio is silent - no audio data detected",
      };
    }

    if (stats.rmsDb < cfg.minDbThreshold) {
      warnings.push(`Audio level very low: ${stats.rmsDb.toFixed(1)}dB`);
    }
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validates audio buffer and throws if invalid
 * @param buffer - The SamplesBuffer to validate
 * @param config - Validation configuration (optional)
 * @throws Error if validation fails
 */
export function assertValidAudio(
  buffer: SamplesBuffer,
  config: AudioValidationConfig = {}
): void {
  const result = validateAudioBuffer(buffer, config);
  
  if (!result.isValid) {
    throw new Error(`Audio validation failed: ${result.error}`);
  }

  if (result.warnings) {
    console.warn("Audio validation warnings:", result.warnings.join(", "));
  }
}

/**
 * Gets audio statistics from buffer
 * @param buffer - The SamplesBuffer to analyze
 * @returns AudioStats object with audio metrics
 */
export function getAudioStats(buffer: SamplesBuffer): AudioStats {
  const samples = buffer.getSamples();
  return analyzeAudio(Array.from(samples));
}

/**
 * Formats validation result for display
 * @param result - ValidationResult to format
 * @returns Formatted string for console output
 */
export function formatValidationResult(result: ValidationResult): string {
  if (result.isValid) {
    let msg = "✓ Audio validation passed";
    if (result.warnings && result.warnings.length > 0) {
      msg += ` (with ${result.warnings.length} warning(s))`;
    }
    return msg;
  }

  return `✗ Audio validation failed: ${result.error}`;
}
