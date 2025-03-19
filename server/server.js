const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(cors({ 
  origin: ["chrome-extension://"],
  methods: ["POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json({ limit: "10kb" }));

// Rate limiting
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

app.post("/api/emoji", async (req, res) => {
  const { text, apiKey } = req.body;

  if (!text || !apiKey) {
    return res.status(400).json({ 
      error: "Missing required parameters" 
    });
  }

  if (text.length > 200) {
    return res.status(400).json({ 
      error: "Text too long. Maximum 200 characters allowed." 
    });
  }

  const openai = new OpenAI({ apiKey });
  const prompt = `Suggest a single emoji that best represents this text: "${text}"`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
      temperature: 0.7,
      presence_penalty: 0,
      frequency_penalty: 0
    });

    const emoji = response.choices[0].message.content.trim();
    
    if (!emoji) {
      throw new Error("No emoji generated");
    }

    res.status(200).json({ emoji });
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message || "Failed to fetch emoji";
    res.status(error.response?.status || 500).json({ 
      error: errorMessage 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ 
    error: "Internal server error" 
  });
});

app.listen(PORT, () => {
  // Keep one console.log for server startup - useful for deployment
  console.log(`Server running on port ${PORT}`);
});