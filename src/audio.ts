import { AudioRecorder, SamplesBuffer } from "miniaudio_node";
import { startListener, KeyCode } from "rdev-node";
import { Mistral } from "@mistralai/mistralai";

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

const recorder = new AudioRecorder();
// shortcut to start, stop and print the audio buffer
// space to start and stop
// esc to exit
let isRecording = false;
startListener((event) => {
  const { keyPress } = event;
  if (keyPress) {
    if (keyPress.key === KeyCode.Space) {
      if (isRecording) {
        recorder.stop();
        isRecording = false;
        // Handle async function in event listener
        printAudioBuffer().catch((err) => {
          console.error("Transcription error:", err);
        });
      } else {
        recorder.start();
        isRecording = true;
      }
    }
    if (keyPress.key === KeyCode.Escape) {
      process.exit(0);
    }
  }
  return event;
});

async function printAudioBuffer() {
  const audioBuffer = recorder.getBuffer();
  
  // Get buffer info
  const duration = audioBuffer.getDuration();
  const sampleRate = audioBuffer.getSampleRate();
  
  console.log("\n--- Sending audio to Mistral API ---");
  console.log(`Duration: ${duration.toFixed(2)}s | Sample rate: ${sampleRate} Hz`);
  
  try {
    const transcription = await sendBuffer(audioBuffer);
    
    // Print subtitles
    console.log("\n========== TRANSCRIPTION ==========");
    console.log(transcription.text);
    console.log("====================================\n");
    
    // If we have segments, print them with timestamps
    if (transcription.segments && transcription.segments.length > 0) {
      console.log("--- Subtitles with timestamps ---");
      for (const seg of transcription.segments) {
        const startTime = formatTime(seg.start);
        const endTime = formatTime(seg.end);
        console.log(`[${startTime} -> ${endTime}] ${seg.text}`);
      }
      console.log("----------------------------------\n");
    }
    
  } catch (error) {
    console.error("Transcription error:", error);
  }
}

/**
 * Format seconds to HH:MM:SS.mmm
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms
      .toString()
      .padStart(3, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

/**
 * Convert SamplesBuffer to WAV file bytes (16-bit PCM)
 */
function samplesBufferToWav(buffer: SamplesBuffer): Uint8Array {
  const samples = buffer.getSamples();
  const sampleRate = buffer.getSampleRate();
  const channels = buffer.getChannels();
  const numSamples = samples.length;
  
  // WAV file structure
  const bytesPerSample = 2; // 16-bit
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  const headerSize = 44;
  
  const wavBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(wavBuffer);
  
  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  writeString(view, 8, "WAVE");
  
  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Chunk size
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // Bits per sample
  
  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);
  
  // Write samples (convert float to 16-bit PCM)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Clamp sample value to [-1, 1] and convert to 16-bit
    const rawSample = samples[i] ?? 0;
    const sample = Math.max(-1, Math.min(1, rawSample));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }
  
  return new Uint8Array(wavBuffer);
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

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
 * Send SamplesBuffer to Mistral API for transcription
 */
export async function sendBuffer(
  buffer: SamplesBuffer,
  options: {
    model?: string;
    language?: string;
  } = {}
): Promise<TranscriptionResponse> {
  const client = getMistralClient();
  const model = options.model || "voxtral-mini-latest";
  
  // Convert buffer to WAV bytes
  const wavBytes = samplesBufferToWav(buffer);
  
  console.log(`Using model: ${model}`);
  console.log(`Audio format: audio/wav`);
  console.log(`Buffer duration: ${buffer.getDuration().toFixed(2)}s`);
  console.log(`Sample rate: ${buffer.getSampleRate()} Hz`);
  console.log(`Channels: ${buffer.getChannels()}`);
  console.log("Sending request to Mistral API...");
  
  const response = await client.audio.transcriptions.complete({
    model: model,
    file: {
      fileName: "recording.wav",
      content: wavBytes,
    },
    language: options.language,
  });
  
  return {
    text: response.text,
    language: response.language ?? undefined,
    segments: response.segments?.map((seg) => ({
      text: seg.text,
      start: seg.start,
      end: seg.end,
    })),
  };
}

/**
 * Get the current audio buffer from the recorder
 */
export function getBuffer(): SamplesBuffer {
  return recorder.getBuffer();
}

/**
 * Transcribe the current buffer
 */
export async function transcribeBuffer(
  options?: {
    model?: string;
    language?: string;
  }
): Promise<TranscriptionResponse> {
  const buffer = recorder.getBuffer();
  return sendBuffer(buffer, options);
}

export { recorder, isRecording };
