/**
 * ElevenLabs Text-to-Speech Service
 * Supports official ElevenLabs API for generating lifelike voice coaching feedback.
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
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
   * Returns audio buffer (MP3) or signals fallback if key is missing/unconfigured or network fails.
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

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
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.warn(`ElevenLabs API returned ${response.status}: ${errorText}. Using Web Speech fallback.`);
        return {
          fallback: true,
          mimeType: "audio/mpeg",
          message: `ElevenLabs API error (${response.status}). Using fallback.`,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      return {
        audioBuffer,
        mimeType: "audio/mpeg",
        fallback: false,
      };
    } catch (err: any) {
      console.warn("ElevenLabs network failure, using fallback:", err?.message || err);
      return {
        fallback: true,
        mimeType: "audio/mpeg",
        message: "Network failure reaching ElevenLabs. Using fallback voice.",
      };
    }
  }

  /**
   * Helper to format a coach voice critique prompt based on telemetry and feedback.
   */
  static composeSpokenFeedbackScript(params: {
    wpm: number;
    wpmDelta?: number;
    fillerCount: number;
    fillerReductionPct?: number;
    gazePct: number;
    growthArea?: string;
  }): string {
    const { wpm, fillerCount, fillerReductionPct = 0, gazePct, growthArea = "consistent pacing" } = params;

    let script = "";

    if (fillerReductionPct > 0) {
      script += `Outstanding progress! Your verbal fillers decreased by ${fillerReductionPct} percent. `;
    } else if (fillerCount <= 2) {
      script += "Excellent delivery control with minimal filler words. ";
    } else {
      script += `You registered ${fillerCount} filler words. Practice replacing fillers with deliberate pauses. `;
    }

    if (wpm >= 130 && wpm <= 155) {
      script += `Your pacing was locked at an optimal ${wpm} words per minute. `;
    } else if (wpm > 155) {
      script += `Your pace was slightly rushed at ${wpm} words per minute. Try easing your tempo. `;
    } else {
      script += `Your speaking rate was ${wpm} words per minute. Aim for 130 to 155 words per minute. `;
    }

    if (gazePct >= 80) {
      script += `Camera eye contact was steady at ${gazePct} percent. `;
    } else {
      script += `Eye contact was at ${gazePct} percent. Keep your gaze anchored directly to the camera lens. `;
    }

    script += `For your next answer, prioritize: ${growthArea}.`;

    return script;
  }

  static formatCoachingScript(params: {
    wpm: number;
    fillerCount: number;
    fillerReductionPct?: number;
    gazePct: number;
    growthArea: string;
  }): string {
    return this.composeSpokenFeedbackScript(params);
  }
}
