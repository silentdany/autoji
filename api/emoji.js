import { OpenAI } from "ai";

export default async function handler(req, res) {
  const { text, apiKey } = req.body;

  const openai = new OpenAI({ apiKey });
  const prompt = `Suggest a single emoji that best represents this text: "${text}"`;
  
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 10
  });

  const emoji = response.choices[0].message.content.trim();
  res.status(200).json({ emoji });
}