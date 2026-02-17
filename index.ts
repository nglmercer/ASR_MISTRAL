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
}


main().catch(console.error);
