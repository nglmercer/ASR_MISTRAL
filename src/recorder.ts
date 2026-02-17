/**
 * Audio recorder module
 * Handles audio recording using miniaudio_node
 */

import { AudioRecorder, SamplesBuffer } from "miniaudio_node";
import { RecorderStatus } from "./types.js";

// Singleton recorder instance
let recorder: AudioRecorder | null = null;
let isRecording = false;

/**
 * Gets or creates the audio recorder singleton
 * @returns AudioRecorder instance
 */
export function getRecorder(): AudioRecorder {
  if (!recorder) {
    recorder = new AudioRecorder();
  }
  return recorder;
}

/**
 * Gets the current recording status
 * @returns RecorderStatus with current state
 */
export function getRecorderStatus(): RecorderStatus {
  const rec = getRecorder();
  const buffer = rec.getBuffer();
  
  return {
    isRecording,
    duration: buffer.getDuration(),
    sampleRate: buffer.getSampleRate() || 44100,
    channels: buffer.getChannels() || 1,
    samplesCount: buffer.getSamples().length,
  };
}

/**
 * Starts audio recording
 * @returns true if recording started successfully
 */
export function startRecording(): boolean {
  const rec = getRecorder();
  
  if (isRecording) {
    console.warn("Already recording");
    return false;
  }
  
  rec.start();
  isRecording = true;
  return true;
}

/**
 * Stops audio recording
 * @returns true if recording stopped successfully
 */
export function stopRecording(): boolean {
  if (!isRecording) {
    console.warn("Not currently recording");
    return false;
  }
  
  const rec = getRecorder();
  rec.stop();
  isRecording = false;
  return true;
}

/**
 * Gets the current audio buffer
 * @returns SamplesBuffer with recorded audio
 */
export function getAudioBuffer(): SamplesBuffer {
  return getRecorder().getBuffer();
}

/**
 * Gets the raw samples from the buffer
 * @returns Int16Array with audio samples
 */
export function getSamples(): ReturnType<SamplesBuffer["getSamples"]> {
  return getAudioBuffer().getSamples();
}

/**
 * Checks if currently recording
 * @returns boolean indicating recording state
 */
export function isCurrentlyRecording(): boolean {
  return isRecording;
}

/**
 * Resets the recorder state
 * Useful when you want to clear the buffer
 */
export function resetRecorder(): void {
  if (recorder) {
    if (isRecording) {
      recorder.stop();
    }
    recorder = null;
    isRecording = false;
  }
}

/**
 * Formats recorder status for display
 * @returns Formatted string
 */
export function formatRecorderStatus(): string {
  const status = getRecorderStatus();
  const state = status.isRecording ? "Recording" : "Stopped";
  
  return `[${state}] Duration: ${status.duration.toFixed(2)}s, ` +
         `Rate: ${status.sampleRate}Hz, Channels: ${status.channels}, ` +
         `Samples: ${status.samplesCount}`;
}

// Export for backwards compatibility
export { isRecording };
