/**
 * Transcription module for Mistral API
 * Handles audio transcription with validation and error handling
 */

import { Mistral } from "@mistralai/mistralai";
import {
  TranscriptionResponse,
  TranscriptionOptions,
  ValidationResult,
  AudioSegment,
} from "./types.js";

/**
 * Mistral client singleton
 */
let mistralClient: Mistral | null = null;

/**
 * Get or create Mistral client
 */
export function getMistralClient(): Mistral {
  const apiKey = process.env.MISTRAL_API_KEY;
  
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY environment variable is required");
  }
  
  if (!mistralClient) {
    mistralClient = new Mistral({ apiKey });
  }
  
  return mistralClient;
}

/**
 * Transcribe audio buffer using Mistral API
 */
export async function transcribeBuffer(
  buffer: Uint8Array,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResponse> {
  const client = getMistralClient();
  const model = options.model || "voxtral-mini-latest";

  const response = await client.audio.transcriptions.complete({
    model: model,
    file: {
      fileName: "recording.wav",
      content: buffer,
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
 * Transcribe with validation
 * Returns null if validation fails
 */
export async function transcribeWithValidation(
  buffer: Uint8Array,
  validation: ValidationResult,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResponse | null> {
  // Check if buffer is valid
  if (!validation.isValid) {
    console.error(`Transcription skipped: ${validation.error}`);
    return null;
  }

  // Warn about potential issues
  if (validation.warning) {
    console.warn(`Warning: ${validation.warning}`);
  }

  // Skip if no content (silent audio)
  if (!validation.hasContent) {
    console.log("Skipping transcription: Audio appears to be silent");
    return {
      text: "",
      language: undefined,
      segments: [],
    };
  }

  return transcribeBuffer(buffer, options);
}

/**
 * Transcribe an audio segment
 */
export async function transcribeSegment(
  buffer: Uint8Array,
  segment: AudioSegment,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResponse & { segment: AudioSegment }> {
  const result = await transcribeBuffer(buffer, options);
  return {
    ...result,
    segment,
  };
}

/**
 * Transcribe multiple segments and combine results
 */
export async function transcribeSegments(
  segments: Array<{ buffer: Uint8Array; segment: AudioSegment }>,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResponse> {
  const results: Array<TranscriptionResponse & { segment: AudioSegment }> = [];

  for (const { buffer, segment } of segments) {
    try {
      const result = await transcribeSegment(buffer, segment, options);
      results.push(result);
    } catch (error) {
      console.error(`Error transcribing segment ${segment.index}:`, error);
    }
  }

  // Combine results
  const combinedText = results
    .filter((r) => r.text.trim().length > 0)
    .map((r) => r.text)
    .join(" ");

  const allSegments = results.flatMap((r) =>
    (r.segments || []).map((seg) => ({
      ...seg,
      start: seg.start + r.segment.startTime / 1000,
      end: seg.end + r.segment.startTime / 1000,
    }))
  );

  return {
    text: combinedText,
    language: results[0]?.language,
    segments: allSegments,
  };
}

/**
 * Check if transcription result has meaningful content
 */
export function hasContent(result: TranscriptionResponse): boolean {
  return result.text.trim().length > 0;
}

/**
 * Format transcription result for display
 */
export function formatResult(result: TranscriptionResponse): string {
  const lines: string[] = [];
  
  if (result.text) {
    lines.push(`Text: ${result.text}`);
  }
  
  if (result.language) {
    lines.push(`Language: ${result.language}`);
  }
  
  if (result.segments && result.segments.length > 0) {
    lines.push(`Segments: ${result.segments.length}`);
    result.segments.forEach((seg, i) => {
      lines.push(`  [${i + 1}] ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s: ${seg.text}`);
    });
  }
  
  return lines.join("\n");
}
