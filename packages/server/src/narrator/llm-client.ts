// ============================================================================
// Kontext Server — LLM Client (Claude primary, Gemini fallback)
// ============================================================================

import Anthropic from '@anthropic-ai/sdk';

export interface LLMResponse {
  text: string;
  provider: string;
  model: string;
  tokensUsed: number;
}

export class LLMClient {
  private anthropicApiKey: string | undefined;
  private gcpProjectId: string;
  private gcpRegion: string;

  constructor() {
    this.anthropicApiKey = process.env['ANTHROPIC_API_KEY'];
    this.gcpProjectId = process.env['GCP_PROJECT_ID'] ?? 'kontext-verify-sdk';
    this.gcpRegion = process.env['GCP_REGION'] ?? 'us-central1';
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    // Try Claude first
    if (this.anthropicApiKey) {
      try {
        return await this.callClaude(systemPrompt, userPrompt);
      } catch (err) {
        console.warn('[Narrator LLM] Claude failed, falling back to Gemini:', (err as Error).message);
      }
    }

    // Fallback to Gemini via Vertex AI
    try {
      return await this.callGemini(systemPrompt, userPrompt);
    } catch (err) {
      throw new Error(`All LLM providers failed. Last error: ${(err as Error).message}`);
    }
  }

  private async callClaude(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const client = new Anthropic({ apiKey: this.anthropicApiKey });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await client.messages.create(
        {
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        },
        { signal: controller.signal },
      );

      const textBlock = response.content.find((b) => b.type === 'text');
      const text = textBlock && 'text' in textBlock ? textBlock.text : '';
      const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

      return {
        text,
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        tokensUsed,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callGemini(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    // Get access token from GCP metadata server (Cloud Run) or ADC
    const accessToken = await this.getGcpAccessToken();

    const url = `https://${this.gcpRegion}-aiplatform.googleapis.com/v1/projects/${this.gcpProjectId}/locations/${this.gcpRegion}/publishers/google/models/gemini-2.5-pro:generateContent`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.2,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errBody}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: { totalTokenCount?: number };
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const tokensUsed = data.usageMetadata?.totalTokenCount ?? 0;

      return {
        text,
        provider: 'google-vertex',
        model: 'gemini-2.5-pro',
        tokensUsed,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getGcpAccessToken(): Promise<string> {
    // Try metadata server first (Cloud Run / GCE)
    try {
      const res = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        {
          headers: { 'Metadata-Flavor': 'Google' },
          signal: AbortSignal.timeout(2_000),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as { access_token: string };
        return data.access_token;
      }
    } catch {
      // Not on GCP — fall through
    }

    // Fallback: GOOGLE_ACCESS_TOKEN env var (for local dev)
    const token = process.env['GOOGLE_ACCESS_TOKEN'];
    if (token) return token;

    throw new Error('No GCP access token available. Set GOOGLE_ACCESS_TOKEN for local development.');
  }
}
