/*
  ollama.service.js
  Responsible for communicating with the Ollama API.
  It handles retries, request timeouts, JSON parsing, and basic logging.
  No story or game business logic belongs here.
*/

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRY_COUNT = 2;
const DEFAULT_MODEL = 'qwen3:8b';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_STREAM = false;
const DEFAULT_BASE_URL = 'http://localhost:11434';

class OllamaService {
  constructor({ baseUrl, timeout, retries = DEFAULT_RETRY_COUNT, model, temperature, stream } = {}) {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL;
    this.timeout = timeout ?? (process.env.OLLAMA_TIMEOUT ? parseInt(process.env.OLLAMA_TIMEOUT, 10) : DEFAULT_TIMEOUT_MS);
    this.retries = retries;
    this.model = model || process.env.OLLAMA_MODEL || DEFAULT_MODEL;
    this.temperature = temperature ?? (process.env.OLLAMA_TEMPERATURE ? parseFloat(process.env.OLLAMA_TEMPERATURE) : DEFAULT_TEMPERATURE);
    this.stream = stream ?? (process.env.OLLAMA_STREAM === 'true' ? true : DEFAULT_STREAM);

    if (!this.baseUrl) {
      throw new Error('Ollama base URL must be configured.');
    }

    // Ensure the request URL points to the generate endpoint if only a host was provided
    if (this.baseUrl.endsWith('/api/generate')) {
      this.requestUrl = this.baseUrl;
    } else {
      this.requestUrl = `${this.baseUrl.replace(/\/$/, '')}/api/generate`;
    }
  }

  async request(body) {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    };

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(this.requestUrl, { ...requestOptions, signal: controller.signal });
        clearTimeout(timeoutId);

        const text = await response.text();
        const parsed = parseJsonResponse(text);

        if (!response.ok) {
          const errorMessage = parsed?.error || response.statusText || 'Ollama request failed';
          throw new Error(`Ollama error [${response.status}]: ${errorMessage}`);
        }

        return parsed;
      } catch (error) {
        clearTimeout(timeoutId);
        const isLastAttempt = attempt === this.retries;

        console.error(`Ollama request attempt ${attempt + 1} failed: ${error.message}`);

        if (isLastAttempt) {
          throw error;
        }

        await delay(500 * (attempt + 1));
      }
    }

    throw new Error('Ollama request failed after retries.');
  }

  async generateCompletion(prompt, overrides = {}) {
    const payload = {
      model: overrides.model || this.model,
      prompt,
      temperature: overrides.temperature ?? this.temperature,
      stream: overrides.stream ?? this.stream,
      ...overrides.payload,
    };

    return this.request(payload);
  }
}

function parseJsonResponse(text) {
  if (!text) {
    throw new Error('Empty response body from Ollama.');
  }

  try {
    const parsed = JSON.parse(text);

    if (parsed === null || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
      throw new Error('AI response is not valid JSON object or array.');
    }

    return parsed;
  } catch (error) {
    const snippet = String(text).slice(0, 400);
    throw new Error(`Failed to parse Ollama response as JSON: ${error.message}. Raw output: ${snippet}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default OllamaService;
