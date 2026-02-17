# ASR with Mistral (Voxtral)

This example demonstrates how to use Mistral's Voxtral model for Automatic Speech Recognition (ASR) using the AI SDK.

## Prerequisites

1. Get your Mistral API key from [https://console.mistral.ai/](https://console.mistral.ai/)
2. Set the environment variable:

```bash
export MISTRAL_API_KEY="your-api-key-here"
```

## Installation

```bash
bun install
```

## Usage

### Transcribe a local audio file

```bash
bun run index.ts /path/to/audio.mp3
```

### Supported Audio Formats

- MP3 (`audio/mpeg`)
- WAV (`audio/wav`)
- M4A (`audio/mp4`)
- WebM (`audio/webm`)
- OGG (`audio/ogg`)
- FLAC (`audio/flac`)

## Code Example

```typescript
import { mistral } from "@ai-sdk/mistral";
import { transcribe } from "ai";
import fs from "fs";

const audioBuffer = fs.readFileSync("audio.mp3");

const result = await transcribe({
  model: mistral.transcription("voxtral-mini-latest"),
  audio: audioBuffer,
  mediaType: "audio/mpeg",
});

console.log(result.text);
```

## Available Models

- `voxtral-mini-latest` - Fast and efficient transcription model
- `voxtral-large-latest` - Higher accuracy for complex audio

## Features

- Automatic language detection
- Timestamp support
- Multiple audio format support
- URL-based transcription

## Resources

- [Mistral AI Documentation](https://docs.mistral.ai/)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
