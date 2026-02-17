import fs from "fs";
import path from "path";
import { Mistral } from "@mistralai/mistralai";
import { sendBuffer, getBuffer, transcribeBuffer as audioTranscribeBuffer, TranscriptionResponse } from "./src/audio";

/**
 * ASR (Automatic Speech Recognition) with Mistral Voxtral
 * 
 * Mistral's Voxtral model provides speech-to-text transcription capabilities.
 * This module provides functions to transcribe audio files and buffers.
 */

// Re-export the sendBuffer function for external use
export { sendBuffer, getBuffer } from "./src/audio";

// Re-export TranscriptionResponse type
export type { TranscriptionResponse } from "./src/audio";

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
 * Transcribe audio file using Mistral's Voxtral model
 */
export async function transcribeFile(
  audioPath: string,
  options: {
    model?: string;
    language?: string;
  } = {}
): Promise<TranscriptionResponse> {
  const client = getMistralClient();
  const model = options.model || "voxtral-mini-latest";
  
  // Read the audio file
  const audioBuffer = fs.readFileSync(audioPath);
  const ext = path.extname(audioPath).toLowerCase().slice(1);
  
  console.log(`Using model: ${model}`);
  console.log(`Audio format: audio/${ext}`);
  console.log("Sending request to Mistral API...");
  
  const response = await client.audio.transcriptions.complete({
    model: model,
    file: {
      fileName: path.basename(audioPath),
      content: audioBuffer,
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
 * Transcribe audio from URL
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options: {
    model?: string;
    language?: string;
  } = {}
): Promise<TranscriptionResponse> {
  const client = getMistralClient();
  const model = options.model || "voxtral-mini-latest";
  
  console.log(`Using model: ${model}`);
  console.log(`Audio URL: ${audioUrl}`);
  console.log("Sending request to Mistral API...");
  
  // Download the audio file first
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio from URL: ${response.status}`);
  }
  const audioBuffer = Buffer.from(await response.arrayBuffer());
  
  const transcriptionResponse = await client.audio.transcriptions.complete({
    model: model,
    file: {
      fileName: "audio.mp3",
      content: audioBuffer,
    },
    language: options.language,
  });
  
  return {
    text: transcriptionResponse.text,
    language: transcriptionResponse.language ?? undefined,
    segments: transcriptionResponse.segments?.map((seg) => ({
      text: seg.text,
      start: seg.start,
      end: seg.end,
    })),
  };
}

/**
 * Transcribe audio from a SamplesBuffer
 * This is the main function for transcribing recorded audio
 */
export async function transcribeBufferDirect(
  buffer: Parameters<typeof sendBuffer>[0],
  options?: Parameters<typeof sendBuffer>[1]
): Promise<TranscriptionResponse> {
  return audioTranscribeBuffer(options);
}

/**
 * Format seconds to subtitle timestamp (HH:MM:SS.mmm or MM:SS.mmm)
 */
export function formatTime(seconds: number): string {
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
 * Print transcription result with optional segments
 */
export function printTranscription(result: TranscriptionResponse): void {
  console.log("\n========== TRANSCRIPTION ==========");
  console.log(result.text);
  console.log("====================================\n");
  
  if (result.language) {
    console.log(`Detected language: ${result.language}`);
  }
  
  if (result.segments && result.segments.length > 0) {
    console.log("\n--- Subtitles with timestamps ---");
    for (const seg of result.segments) {
      const startTime = formatTime(seg.start);
      const endTime = formatTime(seg.end);
      console.log(`[${startTime} -> ${endTime}] ${seg.text}`);
    }
    console.log("----------------------------------\n");
  }
}

/**
 * Main function - CLI entry point
 */
async function main() {
  console.log("=== Mistral ASR (Voxtral) Example ===\n");
  
  // Check for API key
  if (!process.env.MISTRAL_API_KEY) {
    console.error("Error: MISTRAL_API_KEY environment variable is required");
    console.error("Get your API key from: https://console.mistral.ai/");
    process.exit(1);
  }
  
  const audioFilePath = process.argv[2];
  
  if (audioFilePath && fs.existsSync(audioFilePath)) {
    // Transcribe local file
    console.log(`Transcribing file: ${audioFilePath}\n`);
    
    try {
      const result = await transcribeFile(audioFilePath, {
        model: "voxtral-mini-latest",
      });
      
      printTranscription(result);
    } catch (error) {
      console.error("Transcription error:", error);
      process.exit(1);
    }
  } else if (audioFilePath) {
    console.error(`File not found: ${audioFilePath}`);
    printUsage();
  } else {
    printUsage();
  }
}

function printUsage() {
  console.log("Usage: bun run index.ts <audio-file-path>");
  console.log("\nSupported formats: mp3, wav, m4a, webm, ogg, flac");
  console.log("\nAvailable models:");
  console.log("  - voxtral-mini-latest (fast, efficient)");
  console.log("  - voxtral-large-latest (higher accuracy)");
  console.log("\nFor interactive recording, run: bun run src/audio.ts");
  console.log("\nExample:");
  console.log("  bun run index.ts recording.mp3");
}

// Run main if executed directly
main().catch(console.error);
