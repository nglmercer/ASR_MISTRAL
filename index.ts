import { mistral } from "@ai-sdk/mistral";
import { transcribe } from "ai";
import fs from "fs";
import path from "path";

/**
 * Example: ASR (Automatic Speech Recognition) with Mistral Voxtral
 * 
 * Mistral's Voxtral model provides speech-to-text transcription capabilities.
 * This example demonstrates how to transcribe audio files using the AI SDK.
 */

async function main() {
  // Check for API key
  if (!process.env.MISTRAL_API_KEY) {
    console.error("Error: MISTRAL_API_KEY environment variable is required");
    console.error("Get your API key from: https://console.mistral.ai/");
    process.exit(1);
  }

  // Example 1: Transcribe from a local audio file
  const audioFilePath = process.argv[2];

  if (audioFilePath && fs.existsSync(audioFilePath)) {
    console.log(`Transcribing file: ${audioFilePath}`);
    await transcribeFromFile(audioFilePath);
  } else if (audioFilePath) {
    console.error(`File not found: ${audioFilePath}`);
    console.log("\nUsage: bun run index.ts <audio-file-path>");
    console.log("Supported formats: mp3, wav, m4a, webm, ogg, flac");
  } else {
    console.log("=== Mistral ASR Example ===\n");
    console.log("Usage: bun run index.ts <audio-file-path>");
    console.log("Supported formats: mp3, wav, m4a, webm, ogg, flac\n");
    
    // Example with URL
    console.log("Example: Transcribing from URL...");
    await transcribeFromUrl();
  }
}

/**
 * Transcribe audio from a local file
 */
async function transcribeFromFile(filePath: string) {
  try {
    const audioBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);
    
    // Map file extension to MIME type
    const mimeTypes: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      m4a: "audio/mp4",
      webm: "audio/webm",
      ogg: "audio/ogg",
      flac: "audio/flac",
    };
    
    const mimeType = mimeTypes[ext] || "audio/mpeg";

    const result = await transcribe({
      model: mistral.transcription("voxtral-mini-latest"),
      audio: audioBuffer,
      mediaType: mimeType,
    });

    console.log("\n=== Transcription Result ===");
    console.log(result.text);
    console.log("\n--- Metadata ---");
    console.log(`Language: ${result.language || "detected automatically"}`);
    console.log(`Duration: ${result.durationSeconds?.toFixed(2) || "N/A"} seconds`);
  } catch (error) {
    console.error("Transcription error:", error);
  }
}

/**
 * Transcribe audio from a URL
 */
async function transcribeFromUrl() {
  // Example public audio URL (you can replace with any accessible audio URL)
  const audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

  try {
    const result = await transcribe({
      model: mistral.transcription("voxtral-mini-latest"),
      audio: new URL(audioUrl),
    });

    console.log("\n=== Transcription Result ===");
    console.log(result.text);
    console.log("\n--- Metadata ---");
    console.log(`Language: ${result.language || "detected automatically"}`);
    console.log(`Duration: ${result.durationSeconds?.toFixed(2) || "N/A"} seconds`);
  } catch (error) {
    console.error("Transcription error:", error);
  }
}

/**
 * Transcribe with additional options
 */
async function transcribeWithOptions(filePath: string) {
  const audioBuffer = fs.readFileSync(filePath);

  const result = await transcribe({
    model: mistral.transcription("voxtral-mini-latest"),
    audio: audioBuffer,
    mediaType: "audio/mpeg",
    // Additional options (if supported):
    // language: "en", // Hint for language detection
  });

  return result;
}

main().catch(console.error);
