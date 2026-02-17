import fs from "fs";
import path from "path";

/**
 * Example: ASR (Automatic Speech Recognition) with Mistral Voxtral
 * 
 * Mistral's Voxtral model provides speech-to-text transcription capabilities.
 * This example demonstrates how to transcribe audio files using Mistral's API.
 * 
 * Note: The @ai-sdk/mistral package doesn't yet support transcription models,
 * so we use the Mistral API directly.
 */

// Mistral API configuration
const MISTRAL_API_URL = "https://api.mistral.ai/v1";

interface TranscriptionResponse {
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
 * Transcribe audio using Mistral's Voxtral model
 */
async function transcribeAudio(
  audioPath: string,
  options: {
    model?: string;
    language?: string;
  } = {}
): Promise<TranscriptionResponse> {
  const apiKey = process.env.MISTRAL_API_KEY;
  
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY environment variable is required");
  }

  const model = options.model || "voxtral-mini-latest";
  
  // Read the audio file
  const audioBuffer = fs.readFileSync(audioPath);
  const ext = path.extname(audioPath).toLowerCase().slice(1);
  
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
  const base64Audio = audioBuffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64Audio}`;

  console.log(`Using model: ${model}`);
  console.log(`Audio format: ${mimeType}`);
  console.log("Sending request to Mistral API...");

  const response = await fetch(`${MISTRAL_API_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      file: dataUri,
      language: options.language,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<TranscriptionResponse>;
}

/**
 * Transcribe audio from URL
 */
async function transcribeFromUrl(
  audioUrl: string,
  options: {
    model?: string;
    language?: string;
  } = {}
): Promise<TranscriptionResponse> {
  const apiKey = process.env.MISTRAL_API_KEY;
  
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY environment variable is required");
  }

  const model = options.model || "voxtral-mini-latest";

  console.log(`Using model: ${model}`);
  console.log(`Audio URL: ${audioUrl}`);
  console.log("Sending request to Mistral API...");

  const response = await fetch(`${MISTRAL_API_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      url: audioUrl,
      language: options.language,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<TranscriptionResponse>;
}

/**
 * Main function
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
      const result = await transcribeAudio(audioFilePath, {
        model: "voxtral-mini-latest",
      });

      console.log("\n=== Transcription Result ===");
      console.log(result.text);
      
      if (result.language) {
        console.log(`\nDetected language: ${result.language}`);
      }
      
      if (result.duration) {
        console.log(`Duration: ${result.duration.toFixed(2)} seconds`);
      }
      
      if (result.segments && result.segments.length > 0) {
        console.log("\n--- Segments ---");
        result.segments.forEach((seg, i) => {
          console.log(`[${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s] ${seg.text}`);
        });
      }
    } catch (error) {
      console.error("Transcription error:", error);
      process.exit(1);
    }
  } else if (audioFilePath) {
    console.error(`File not found: ${audioFilePath}`);
    printUsage();
  } else {
    printUsage();
    
    // Example: transcribe from URL (commented out to avoid unnecessary API calls)
    /*
    console.log("\nExample: Transcribing from URL...");
    const result = await transcribeFromUrl(
      "https://example.com/audio.mp3",
      { model: "voxtral-mini-latest" }
    );
    console.log(result.text);
    */
  }
}

function printUsage() {
  console.log("Usage: bun run index.ts <audio-file-path>");
  console.log("\nSupported formats: mp3, wav, m4a, webm, ogg, flac");
  console.log("\nAvailable models:");
  console.log("  - voxtral-mini-latest (fast, efficient)");
  console.log("  - voxtral-large-latest (higher accuracy)");
  console.log("\nExample:");
  console.log("  bun run index.ts recording.mp3");
}

main().catch(console.error);
