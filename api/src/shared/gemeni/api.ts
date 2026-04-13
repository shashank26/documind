import { Config } from '../../config';

const { GEMENI_API_KEY } = Config;

export const getEmbedding = async (prompt: string) => {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMENI_API_KEY,
      },
      body: JSON.stringify({
        content: {
          parts: [{ text: prompt }],
        },
        outputDimensionality: 768,
      }),
    },
  );
  const data = await res.json();
  return data?.embedding?.values;
};

export const promptLLM = async (prompt: string) => {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMENI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    console.error(JSON.stringify(data));
  }
  return data?.candidates?.[0]?.content?.parts?.[0]?.text;
};
