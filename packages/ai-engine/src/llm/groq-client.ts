export type GroqConfig = {
  apiKey: string;
  model?: string;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type StreamCallback = (token: string) => void;

export class GroqClient {
  private apiKey: string;
  private model: string;

  constructor(config: GroqConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'llama-3.3-70b-versatile';
  }

  async generate(
    systemPrompt: string,
    userContent: string,
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(`Groq API error: ${JSON.stringify(err)}`);
        }

        const json = (await response.json()) as { choices: { message: { content: string } }[] };
        return json.choices[0]?.message?.content ?? '';
      } catch (err) {
        lastError = err as Error;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError ?? new Error('Groq generate failed after 3 attempts');
  }

  async generateStream(
    systemPrompt: string,
    userContent: string,
    onToken: StreamCallback,
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.1,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Groq Stream error: ${JSON.stringify(err)}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Failed to get response body reader');

    let fullText = '';
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullText += content;
              onToken(content);
            }
          } catch (e) {
            console.error('Error parsing Groq stream chunk', e);
          }
        }
      }
    }

    return fullText;
  }
}
