# ASR MISTRAL - Audio Speech Recognition with Mistral AI

A modular TypeScript library for recording audio and transcribing using Mistral's Voxtral speech-to-text API. Features automatic segmentation for long recordings, data validation, and reusable modules.

## Features

- 🎤 **Audio Recording** - Record audio from microphone with real-time monitoring
- 🤖 **Mistral Voxtral API** - Transcribe audio using Mistral's speech-to-text model
- ✂️ **Automatic Segmentation** - Long recordings are automatically split using silence detection
- ✅ **Data Validation** - Audio buffers are validated before transcription
- ⌨️ **Keyboard Shortcuts** - Press SPACE to record, ESC to exit
- 📦 **Modular Architecture** - Each module can be imported independently

## Prerequisites

1. Get your Mistral API key from [https://console.mistral.ai/](https://console.mistral.ai/)
2. Set the environment variable:

```bash
export MISTRAL_API_KEY="your-api-key-here"
```

Or create a `.env` file:

```
MISTRAL_API_KEY=your-api-key-here
```

## Installation

```bash
bun install
```

## Quick Start

### Run the interactive recorder

```bash
bun ./src/index.ts
```

- Press **SPACE** to start/stop recording
- Press **ESC** to exit
- The transcription will be displayed after stopping

### Programmatic Usage

```typescript
import {
  startRecording,
  stopRecording,
  getSamples,
  transcribeBuffer,
  toWav,
  getRecorderStatus,
} from "./src/index.js";

// Start recording
startRecording();

// Wait for some time...
await new Promise((resolve) => setTimeout(resolve, 5000));

// Stop recording
stopRecording();

// Get audio data
const samples = getSamples();
const status = getRecorderStatus();
const wavBuffer = toWav(samples, status.sampleRate, status.channels);

// Transcribe
const result = await transcribeBuffer(wavBuffer);
console.log(result.text);
```

## Module Structure

```
src/
├── index.ts          # Main entry point, re-exports all modules
├── types.ts          # Shared TypeScript interfaces and types
├── recorder.ts       # Audio recording functionality
├── transcription.ts  # Mistral API transcription
├── validation.ts     # Audio validation utilities
├── segmentation.ts   # Audio segmentation for long recordings
├── keyboard.ts       # Keyboard shortcuts handling
└── utils/
    └── audio.ts      # Audio utility functions (WAV conversion, analysis)
```

## API Reference

### Recording

```typescript
import {
  startRecording,
  stopRecording,
  getRecorder,
  getRecorderStatus,
  getAudioBuffer,
  getSamples,
  isCurrentlyRecording,
  resetRecorder,
} from "./src/index.js";

// Start recording
startRecording();

// Stop recording
stopRecording();

// Check if recording
if (isCurrentlyRecording()) {
  console.log("Currently recording...");
}

// Get recorder status
const status = getRecorderStatus();
console.log(
  `Duration: ${status.duration}s, Sample Rate: ${status.sampleRate}Hz`,
);

// Get raw samples
const samples = getSamples(); // Int16Array
```

### Transcription

```typescript
import {
  transcribeBuffer,
  transcribeWithValidation,
  transcribeSegments,
  hasContent,
  formatResult,
} from "./src/index.js";

// Simple transcription
const result = await transcribeBuffer(wavBuffer, {
  model: "voxtral-mini-latest",
  language: "es", // Optional: specify language
});

// Transcribe with validation
const validation = validateAudioBuffer(samples, duration);
const result = await transcribeWithValidation(wavBuffer, validation);

// Check if result has content
if (hasContent(result)) {
  console.log(formatResult(result));
}
```

### Validation

```typescript
import {
  validateAudioBuffer,
  assertValidAudio,
  getAudioStats,
} from "./src/index.js";

// Validate audio before transcription
const validation = validateAudioBuffer(samples, duration);

if (!validation.isValid) {
  console.error(`Error: ${validation.error}`);
}

if (validation.warnings) {
  validation.warnings.forEach((w) => console.warn(w));
}

// Get audio statistics
const stats = getAudioStats(samples);
console.log(`Peak: ${stats.peakDb}dB, RMS: ${stats.rmsDb}dB`);
```

### Segmentation

```typescript
import { segmentAudio, segmentBySilence, segmentsToWav } from "./src/index.js";

// Simple time-based segmentation
const segments = segmentAudio(bufferInfo, {
  maxSegmentDurationMs: 30000, // 30 seconds max
  silenceThresholdDb: -40,
  minSilenceDurationMs: 500,
  overlapMs: 100,
});

// Smart segmentation based on silence
const segments = segmentBySilence(bufferInfo, config);

// Convert segments to WAV buffers
const wavSegments = segmentsToWav(segments, sampleRate, channels);

// Transcribe all segments
const result = await transcribeSegments(wavSegments);
```

### Audio Utilities

```typescript
import {
  toWav,
  analyzeAudio,
  createLevelBar,
  saveWavFile,
  formatDuration,
  colors,
} from "./src/index.js";

// Convert samples to WAV format
const wavBuffer = toWav(samples, sampleRate, channels);

// Analyze audio
const stats = analyzeAudio(samples);
console.log(`Peak: ${stats.peakDb}dB, Silent: ${stats.isSilent}`);

// Create visual level bar
const bar = createLevelBar(stats.peakDb, 25);
console.log(bar);

// Save to file
saveWavFile(samples, sampleRate, channels, "recording.wav");

// Format duration
console.log(formatDuration(125.5)); // "02:05"
```

### Keyboard Shortcuts

```typescript
import { KeyboardHandler, setupKeyboard } from "./src/index.js";

// Simple setup
const handler = setupKeyboard({
  onStartRecording: () => startRecording(),
  onStopRecording: () => stopRecording(),
  onExit: () => process.exit(0),
});

// Custom configuration
const handler = new KeyboardHandler(
  {
    onStartRecording: toggleRecording,
    onStopRecording: () => {},
    onExit: exitApp,
  },
  {
    recordKey: KeyCode.Space,
    exitKey: KeyCode.Escape,
  },
);

handler.start();
```

## Types

```typescript
// Transcription response
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

// Audio buffer information
interface AudioBufferInfo {
  duration: number;
  samples: Int16Array | number[];
  sampleRate: number;
  channels: number;
}

// Validation result
interface ValidationResult {
  isValid: boolean;
  hasContent?: boolean;
  duration?: number;
  error?: string;
  warnings?: string[];
}

// Segmentation configuration
interface SegmentationConfig {
  maxSegmentDurationMs: number;
  silenceThresholdDb: number;
  minSilenceDurationMs: number;
  overlapMs: number;
}
```

## Configuration

Default segmentation configuration:

```typescript
const DEFAULT_SEGMENTATION_CONFIG = {
  maxSegmentDurationMs: 30000, // 30 seconds max per segment
  silenceThresholdDb: -40, // Below -40dB considered silence
  minSilenceDurationMs: 500, // 500ms minimum silence to split
  overlapMs: 100, // 100ms overlap between segments
};
```

## Dependencies

- **miniaudio_node** - Audio recording and playback
- **@mistralai/mistralai** - Mistral AI API client
- **rdev-node** - Keyboard event listening

## License

MIT
