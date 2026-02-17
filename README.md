# ASR with Mistral (Voxtral)

This example demonstrates how to use Mistral's Voxtral model for Automatic Speech Recognition (ASR).

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

## Available Models

- `voxtral-mini-latest` - Fast and efficient transcription model
- `voxtral-large-latest` - Higher accuracy for complex audio

## Code Example

```typescript
import fs from "fs";

const MISTRAL_API_URL = "https://api.mistral.ai/v1";

async function transcribeAudio(audioPath: string) {
  const audioBuffer = fs.readFileSync(audioPath);
  const base64Audio = audioBuffer.toString("base64");
  const dataUri = `data:audio/mpeg;base64,${base64Audio}`;

  const response = await fetch(`${MISTRAL_API_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "voxtral-mini-latest",
      file: dataUri,
    }),
  });

  return response.json();
}

const result = await transcribeAudio("audio.mp3");
console.log(result.text);
```

## Features

- Automatic language detection
- Timestamp segments
- Multiple audio format support
- URL-based transcription

## Resources

- [Mistral AI Documentation](https://docs.mistral.ai/)
- [Voxtral API Reference](https://docs.mistral.ai/capabilities/speech_to_text/)
