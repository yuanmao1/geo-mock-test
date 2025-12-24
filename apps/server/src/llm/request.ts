import type { ProviderConfig } from './providerConfig';

export async function requestChatCompletion(config: ProviderConfig, model: string, prompt: string, temperature = 0.7) {
  if (!config.apiKey) throw new Error('API key not configured');

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content as string | undefined;
}

