/**
 * ElevenLabs Text-to-Speech Service
 * Supports official ElevenLabs API for generating lifelike voice coaching feedback.
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
// Default to 'Rachel' (calm, clear professional coach voice) or custom voice ID
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

export interface GenerateSpeechResult {
  audioBuffer?: Buffer;
  mimeType: string;
  fallback: boolean;
  message?: string;
}

export class ElevenLabsService {
  /**
   * Synthesize spoken audio for coaching feedback via ElevenLabs API.
   * Returns audio buffer (MP3) or signals fallback if key is missing/unconfigured.
   */
  static async generateCoachVoice(
    text: string,
    voiceId: string = DEFAULT_VOICE_ID
  ): Promise<GenerateSpeechResult> {
    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error("Text is required for voice feedback generation.");
    }

    if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY.includes("your_elevenlabs")) {
      return {
        fallback: true,
        mimeType: "audio/mpeg",
        message: "ELEVENLABS_API_KEY not configured. Falling back to browser speech synthesis.",
      };
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY.trim(),
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: "eleven_turbo_v2_5", // Lowest latency turbo model for live demos
            voice_settings: {
              stability: 0.65,
              similarity_boost: 0.75,
              style: 0.1,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`ElevenLabs API error (${response.status}):`, errorText);
        return {
          fallback: true,
          mimeType: "audio/mpeg",
          message: `ElevenLabs API error (${response.status}). Using browser speech fallback.`,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        audioBuffer: Buffer.from(arrayBuffer),
        mimeType: "audio/mpeg",
        fallback: false,
      };
    } catch (err: any) {
      console.warn("ElevenLabs network failure, using fallback:", err.message || err);
      return {
        fallback: true,
        mimeType: "audio/mpeg",
        message: err.message || "ElevenLabs network error",
      };
    }
  }

  /**
   * Synthesizes a punchy, spoken audio script comparing Session N vs Session N-1.
   */
  static composeSpokenFeedbackScript(params: {
    wpm: number;
    wpmDelta?: number;
    fillerCount: number;
    fillerReductionPct?: number;
    gazePct: number;
    growthArea?: string;
  }): string {
    const { wpm, fillerCount, fillerReductionPct, gazePct, growthArea } = params;
    const lines: string[] = [];

    // Pacing sentence
    if (wpm >= 130 && wpm <= 155) {
      lines.push(`Your pace was well controlled at ${wpm} words per minute.`);
    } else if (wpm > 155) {
      lines.push(`You spoke at a rapid pace of ${wpm} words per minute. Aim to pause and slow your tempo.`);
    } else {
      lines.push(`Your pace was ${wpm} words per minute. Aim for a slightly crisper cadence.`);
    }

    // Filler / Improvement sentence
    if (fillerReductionPct && fillerReductionPct > 0) {
      lines.push(`Great work: verbal filler words dropped by ${fillerReductionPct} percent.`);
    } else if (fillerCount > 4) {
      lines.push(`You had ${fillerCount} verbal filler words. Practice replacing them with intentional silent pauses.`);
    }

    // Gaze sentence
    if (gazePct >= 80) {
      lines.push("Camera eye contact was steady and authoritative.");
    } else {
      lines.push("Eye contact remains your biggest growth area. Keep your gaze anchored to the camera lens.");
    }

    if (growthArea) {
      lines.push(`Focus next on: ${growthArea}.`);
    }

    return lines.join(" ");
  }
}
