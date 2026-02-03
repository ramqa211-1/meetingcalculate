export interface ChatMessage {
  role: string;
  content: string;
}

export async function callOpenAI(messages: ChatMessage[]) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not set');
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || `OpenAI error: ${response.status}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (content == null) {
    throw new Error('Invalid OpenAI response');
  }
  return { response: content, data };
}
