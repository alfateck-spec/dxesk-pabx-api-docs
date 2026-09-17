# Audio Requirements

Every prompt the platform plays has to meet these constraints exactly. Upload them to
[DRM](/api/content-upload) and reference the returned `contentId` from an
[outbound call](/api/outbound-call).

| Property | Requirement |
| --- | --- |
| Format | `.wav` only |
| Bit depth | 8-bit |
| Sample rate | 8000 Hz (8 kHz) |
| Channels | Mono (single channel) |

Anything else is rejected.

## Converting

`ffmpeg` handles all three constraints in one pass:

```bash
ffmpeg -i input.mp3 -ar 8000 -ac 1 -acodec pcm_u8 output.wav
```

| Flag | Sets |
| --- | --- |
| `-ar 8000` | 8 kHz sample rate |
| `-ac 1` | Mono |
| `-acodec pcm_u8` | 8-bit unsigned PCM |

With `sox`:

```bash
sox input.wav -r 8000 -c 1 -b 8 -e unsigned-integer output.wav
```

## Verifying before upload

Check a file locally rather than finding out from a rejected API call:

```bash
ffprobe -v error -show_entries stream=codec_name,sample_rate,channels \
  -of default=noprint_wrappers=1 output.wav
```

Expected:

```
codec_name=pcm_u8
sample_rate=8000
channels=1
```

A WAV header check in TypeScript needs no dependencies, since the fields sit at fixed
offsets:

```ts
import { readFile } from "node:fs/promises";

export async function isValidPrompt(path: string): Promise<boolean> {
  const buf = await readFile(path);

  if (buf.length < 44) return false;
  if (buf.toString("ascii", 0, 4) !== "RIFF") return false;
  if (buf.toString("ascii", 8, 12) !== "WAVE") return false;

  const channels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const bitsPerSample = buf.readUInt16LE(34);

  return channels === 1 && sampleRate === 8000 && bitsPerSample === 8;
}
```

This reads the canonical 44-byte header. Files carrying extra metadata chunks before
`fmt ` need a real parser, but `ffmpeg` output with the flags above is canonical.

::: tip 8-bit at 8 kHz sounds thin, and that is expected
These are telephony constraints, not quality settings. Record or synthesise at a higher
rate and downsample as the final step. Converting up from an already degraded file only
compounds the artefacts.
:::

## Reuse over re-upload

Content in DRM is independent of phone numbers. Upload a prompt once with
[Content Upload](/api/content-upload), keep the `contentId`, and reference it from every
[outbound call](/api/outbound-call) that needs it.
