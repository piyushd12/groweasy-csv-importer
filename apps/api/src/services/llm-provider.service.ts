import Groq from "groq-sdk";
import { config } from "../config";
import { logger } from "../logger";

// ─── Provider Interface ──────────────────────────────────────────────

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
}

export interface LLMProvider {
  name: string;
  call(systemPrompt: string, userPrompt: string): Promise<LLMResponse>;
}

// ─── Groq Provider ──────────────────────────────────────────────────

class GroqProvider implements LLMProvider {
  name = "groq";
  private client: Groq;

  constructor() {
    this.client = new Groq({ apiKey: config.groq.apiKey });
  }

  async call(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model: config.groq.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 8192,
    });

    const content = response.choices[0]?.message?.content || "";
    const elapsed = Date.now() - start;

    logger.info(
      {
        provider: this.name,
        model: config.groq.model,
        elapsed: `${elapsed}ms`,
        tokens: response.usage?.total_tokens,
      },
      "Groq LLM call completed",
    );

    return {
      content,
      provider: this.name,
      model: config.groq.model,
      tokensUsed: response.usage?.total_tokens,
    };
  }
}

// ─── OpenRouter Provider ────────────────────────────────────────────

class OpenRouterProvider implements LLMProvider {
  name = "openrouter";

  async call(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const start = Date.now();

    const response = await fetch(config.openRouter.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openRouter.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://groweasy-csv-importer.vercel.app",
        "X-Title": "GrowEasy CSV Importer",
      },
      body: JSON.stringify({
        model: config.openRouter.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_tokens: 16384,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenRouter API error ${response.status}: ${errorBody}`,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const elapsed = Date.now() - start;

    logger.info(
      {
        provider: this.name,
        model: config.openRouter.model,
        elapsed: `${elapsed}ms`,
        tokens: data.usage?.total_tokens,
      },
      "OpenRouter LLM call completed",
    );

    return {
      content,
      provider: this.name,
      model: config.openRouter.model,
      tokensUsed: data.usage?.total_tokens,
    };
  }
}

// ─── Factory ────────────────────────────────────────────────────────

let groqProvider: GroqProvider | null = null;
let openRouterProvider: OpenRouterProvider | null = null;

export function getPrimaryProvider(): LLMProvider {
  if (!groqProvider) groqProvider = new GroqProvider();
  return groqProvider;
}

export function getFallbackProvider(): LLMProvider {
  if (!openRouterProvider) openRouterProvider = new OpenRouterProvider();
  return openRouterProvider;
}

/**
 * Call the LLM with retry + fallback logic.
 *
 * 1. Try primary (Groq) up to maxRetries+1 times with exponential backoff
 * 2. If all retries fail, try fallback (OpenRouter) with same retry policy
 * 3. If both fail, throw the last error
 */
export async function callWithRetryAndFallback(
  systemPrompt: string,
  userPrompt: string,
  batchId: number,
): Promise<LLMResponse> {
  const providers: LLMProvider[] = [
    getPrimaryProvider(),
    getFallbackProvider(),
  ];

  for (const provider of providers) {
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        logger.info(
          { provider: provider.name, batchId, attempt: attempt + 1 },
          "LLM call attempt",
        );

        const result = await provider.call(systemPrompt, userPrompt);

        // Validate that result is parseable JSON
        JSON.parse(result.content);

        return result;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);

        logger.warn(
          {
            provider: provider.name,
            batchId,
            attempt: attempt + 1,
            error: errorMsg,
          },
          "LLM call failed",
        );

        if (attempt < config.maxRetries) {
          const delay = config.retryDelays[attempt] || 1500;
          logger.info(
            { provider: provider.name, batchId, delayMs: delay },
            "Retrying after delay",
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // If primary failed all retries, log fallback
    if (provider === providers[0]) {
      logger.warn(
        { batchId, fallbackTo: providers[1].name },
        "Primary provider exhausted retries, falling back",
      );
    }
  }

  throw new Error(
    `All LLM providers failed for batch ${batchId} after retries`,
  );
}
