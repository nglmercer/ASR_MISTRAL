/**
 * Audio recorder entry point
 * Simple CLI for recording and transcribing audio using Mistral ASR
 * 
 * Usage:
 *   bun ./src/audio.ts
 * 
 * Controls:
 *   Space - Start/Stop recording
 *   Escape - Exit
 */

import { AudioRecorder, SamplesBuffer } from "miniaudio_node";
import { startListener, KeyCode } from "rdev-node";
import { Mistral } from "@mistralai/mistralai";
import { toWav } from "./utils/audio.js";
import { 
  validateAudioBuffer, 
  formatValidationResult,
  getAudioStats 
} from "./validation.js";
import { TranscriptionResponse, DEFAULT_OPTIONS } from "./types.js";

// Singleton recorder
const recorder = new AudioRecorder();
let isRecording = false;

/**
 * Get or create Mistral client
 */
function getMistralClient(): Mistral {
  const apiKey = process.env.MISTRAL_API_KEY;
  
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY environment variable is required");
  }
  
  return new Mistral({ apiKey });
}

/**
 * Send audio buffer to Mistral API for transcription
 */
async function sendBuffer(
  buffer: Uint8Array,
  options: {
    model?: string;
    language?: string;
  } = {}
): Promise<TranscriptionResponse> {
  const client = getMistralClient();
  const model = options.model || DEFAULT_OPTIONS.model;

  const response = await client.audio.transcriptions.complete({
    model: model,
    file: {
      fileName: "recording.wav",
      content: buffer,
    },
    language: options.language,
  });
  
  return {
    text: response.text || "",
    language: response.language ?? undefined,
    segments: response.segments?.map((seg) => ({
      text: seg.text,
      start: seg.start,
      end: seg.end,
    })),
  };
}

/**
 * Process the recorded audio buffer
 */
async function processAudio(cb = (result: TranscriptionResponse) => {console.log(result);}) {
  const audioBuffer = recorder.getBuffer();
  
  // Validate the buffer first
  const validation = validateAudioBuffer(audioBuffer);
  console.log(formatValidationResult(validation));
  
  if (!validation.isValid) {
    console.log("Recording discarded - invalid audio");
    return;
  }
  
  // Get audio stats for display
  const stats = getAudioStats(audioBuffer);
  console.log(`Audio stats: peak ${stats.peakDb.toFixed(1)}dB, RMS ${stats.rmsDb.toFixed(1)}dB`);
  
  // Convert to WAV
  const samples = audioBuffer.getSamples();
  const sampleRate = audioBuffer.getSampleRate() || 44100;
  const channels = audioBuffer.getChannels() || 1;
  const buffer = toWav(samples, sampleRate, channels);

  try {
    const transcription = await sendBuffer(buffer);
    
    // Display results
    if (transcription.text && transcription.text.trim()) {
      cb(transcription);
    } else {
      cb({
        text: "No speech detected in audio",
      });
    }
  
  } catch (error) {
    cb({
      text: "Transcription error: " + error,
    });
  }
}

// Setup keyboard listener
startListener((event) => {
  const { keyPress } = event;
  
  if (keyPress) {
    if (keyPress.key === KeyCode.Space) {
      if (isRecording) {
        recorder.stop();
        isRecording = false;
        // Process the recorded audio
        processAudio((result) => {
          console.log(result);
        }).catch((err) => {
          console.error("Error processing audio:", err);
        });
      } else {
        recorder.start();
        isRecording = true;
        console.log("🔴 Recording... (press Space to stop)");
      }
    }
    
    if (keyPress.key === KeyCode.Escape) {
      if (isRecording) {
        recorder.stop();
        isRecording = false;
      }
      process.exit(0);
    }
  }
  
  return event;
});

// Print help on startup
console.log(`
  [Space]  - Start/Stop recording
  [Escape] - Exit
`);

// Export for external use
export { recorder, isRecording, sendBuffer };
