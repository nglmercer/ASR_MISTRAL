/**
 * Audio segmentation module
 * Handles splitting long audio recordings into manageable segments
 */

import { toWav, analyzeAudio } from "./utils/audio.js";
import {
  AudioBufferInfo,
  AudioSegment,
  SegmentationConfig,
  DEFAULT_SEGMENTATION_CONFIG,
} from "./types.js";

/**
 * Segment audio buffer into smaller chunks
 * Useful for long recordings that need to be processed in parts
 */
export function segmentAudio(
  bufferInfo: AudioBufferInfo,
  config: SegmentationConfig = DEFAULT_SEGMENTATION_CONFIG
): AudioSegment[] {
  const segments: AudioSegment[] = [];
  const { samples, sampleRate, duration } = bufferInfo;

  // If duration is short enough, return as single segment
  if (duration * 1000 <= config.maxSegmentDurationMs) {
    segments.push({
      index: 0,
      startTime: 0,
      endTime: duration * 1000,
      samples: samples,
      duration: duration * 1000,
    });
    return segments;
  }

  // Calculate samples per segment
  const samplesPerMs = sampleRate / 1000;
  const maxSamplesPerSegment = Math.floor(config.maxSegmentDurationMs * samplesPerMs);
  const overlapSamples = Math.floor(config.overlapMs * samplesPerMs);

  let currentIndex = 0;
  let segmentIndex = 0;

  while (currentIndex < samples.length) {
    const endSample = Math.min(currentIndex + maxSamplesPerSegment, samples.length);
    const segmentSamples = samples.slice(currentIndex, endSample);

    const startTimeMs = (currentIndex / sampleRate) * 1000;
    const endTimeMs = (endSample / sampleRate) * 1000;

    segments.push({
      index: segmentIndex,
      startTime: startTimeMs,
      endTime: endTimeMs,
      samples: segmentSamples,
      duration: endTimeMs - startTimeMs,
    });

    // Move to next segment with overlap
    currentIndex = endSample - overlapSamples;
    if (currentIndex >= samples.length - overlapSamples) {
      break;
    }
    segmentIndex++;
  }

  return segments;
}

/**
 * Smart segmentation based on silence detection
 * Splits audio at silence points for better transcription
 */
export function segmentBySilence(
  bufferInfo: AudioBufferInfo,
  config: SegmentationConfig = DEFAULT_SEGMENTATION_CONFIG
): AudioSegment[] {
  const { samples, sampleRate, duration } = bufferInfo;
  const segments: AudioSegment[] = [];

  // If duration is short, return as single segment
  if (duration * 1000 <= config.maxSegmentDurationMs) {
    return [{
      index: 0,
      startTime: 0,
      endTime: duration * 1000,
      samples: samples,
      duration: duration * 1000,
    }];
  }

  // Analyze in chunks to find silence points
  const chunkSizeMs = 100; // Analyze in 100ms chunks
  const samplesPerChunk = Math.floor((sampleRate * chunkSizeMs) / 1000);
  const silencePoints: number[] = [];

  for (let i = 0; i < samples.length; i += samplesPerChunk) {
    const chunkSamples = samples.slice(i, i + samplesPerChunk);
    const stats = analyzeAudio(chunkSamples);

    // If this chunk is below silence threshold, mark it
    if (stats.peakDb < config.silenceThresholdDb) {
      const timeMs = (i / sampleRate) * 1000;
      silencePoints.push(timeMs);
    }
  }

  // Find silence regions (consecutive silence points)
  const silenceRegions = findSilenceRegions(silencePoints, config.minSilenceDurationMs);

  // Create segments based on silence regions
  let lastEndTime = 0;
  let segmentIndex = 0;

  for (const region of silenceRegions) {
    // Check if segment would be too long
    if (region.start - lastEndTime > config.maxSegmentDurationMs) {
      // Split into smaller segments
      const subSegments = splitAtInterval(
        samples,
        sampleRate,
        lastEndTime,
        region.start,
        config.maxSegmentDurationMs
      );
      segments.push(...subSegments.map((seg, i) => ({ ...seg, index: segmentIndex + i })));
      segmentIndex += subSegments.length;
    } else {
      // Create segment from last end to this silence region
      const startSample = Math.floor((lastEndTime / 1000) * sampleRate);
      const endSample = Math.floor((region.start / 1000) * sampleRate);
      const segmentSamples = samples.slice(startSample, endSample);

      if (segmentSamples.length > 0) {
        segments.push({
          index: segmentIndex,
          startTime: lastEndTime,
          endTime: region.start,
          samples: segmentSamples,
          duration: region.start - lastEndTime,
        });
        segmentIndex++;
      }
    }
    lastEndTime = region.end;
  }

  // Add final segment
  if (lastEndTime < duration * 1000) {
    const startSample = Math.floor((lastEndTime / 1000) * sampleRate);
    const segmentSamples = samples.slice(startSample);

    if (segmentSamples.length > 0) {
      segments.push({
        index: segmentIndex,
        startTime: lastEndTime,
        endTime: duration * 1000,
        samples: segmentSamples,
        duration: duration * 1000 - lastEndTime,
      });
    }
  }

  // If no segments were created, return the whole buffer
  if (segments.length === 0) {
    return [{
      index: 0,
      startTime: 0,
      endTime: duration * 1000,
      samples: samples,
      duration: duration * 1000,
    }];
  }

  return segments;
}

/**
 * Find silence regions from silence points
 */
function findSilenceRegions(
  silencePoints: number[],
  minDurationMs: number
): Array<{ start: number; end: number }> {
  const regions: Array<{ start: number; end: number }> = [];

  if (silencePoints.length === 0) {
    return regions;
  }

  let regionStart = silencePoints[0]!;
  let lastPoint = silencePoints[0]!;

  for (let i = 1; i < silencePoints.length; i++) {
    const point = silencePoints[i]!;

    // If gap is too large, end the region
    if (point - lastPoint > 200) { // 200ms gap tolerance
      if (lastPoint - regionStart >= minDurationMs) {
        regions.push({ start: regionStart, end: lastPoint });
      }
      regionStart = point;
    }
    lastPoint = point;
  }

  // Add final region
  if (lastPoint - regionStart >= minDurationMs) {
    regions.push({ start: regionStart, end: lastPoint });
  }

  return regions;
}

/**
 * Split a time range into smaller segments
 */
function splitAtInterval(
  samples: Int16Array | number[],
  sampleRate: number,
  startTimeMs: number,
  endTimeMs: number,
  maxDurationMs: number
): AudioSegment[] {
  const segments: AudioSegment[] = [];
  const totalDuration = endTimeMs - startTimeMs;
  const numSegments = Math.ceil(totalDuration / maxDurationMs);

  for (let i = 0; i < numSegments; i++) {
    const segStartMs = startTimeMs + i * maxDurationMs;
    const segEndMs = Math.min(startTimeMs + (i + 1) * maxDurationMs, endTimeMs);

    const startSample = Math.floor((segStartMs / 1000) * sampleRate);
    const endSample = Math.floor((segEndMs / 1000) * sampleRate);
    const segmentSamples = samples.slice(startSample, endSample);

    segments.push({
      index: i,
      startTime: segStartMs,
      endTime: segEndMs,
      samples: segmentSamples,
      duration: segEndMs - segStartMs,
    });
  }

  return segments;
}

/**
 * Convert audio segment to WAV buffer
 */
export function segmentToWav(
  segment: AudioSegment,
  sampleRate: number,
  channels: number
): Uint8Array {
  return toWav(segment.samples, sampleRate, channels);
}

/**
 * Convert all segments to WAV buffers
 */
export function segmentsToWav(
  segments: AudioSegment[],
  sampleRate: number,
  channels: number
): Array<{ buffer: Uint8Array; segment: AudioSegment }> {
  return segments.map((segment) => ({
    buffer: segmentToWav(segment, sampleRate, channels),
    segment,
  }));
}