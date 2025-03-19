const OpenAI = require("openai");

module.exports = async function handler(req, res) {
  try {
    const { text, apiKey } = req.body;
    
    if (!text || !apiKey) {
      console.error('Missing parameters:', { text: !!text, apiKey: !!apiKey });
      return res.status(400).json({ error: 'Missing required parameters: text and apiKey' });
    }
    
    console.log('Calling OpenAI with text:', text);
    
    const openai = new OpenAI({ apiKey });
    const prompt = `Suggest a single emoji that best represents this text: "${text}"`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10
    });

    const emoji = response.choices[0].message.content.trim();
    console.log('Received emoji:', emoji);
    return res.status(200).json({ emoji });
  } catch (error) {
    console.error('Error in emoji API:', error.message);
    return res.status(500).json({ 
      error: 'Error processing request', 
      message: error.message,
      stack: error.stack
    });
  }
}