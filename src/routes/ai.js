import { Router } from "express";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// POST /api/ai/task-generator
router.post("/task-generator", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "POSTER") return res.status(403).json({ error: "Only posters can generate task descriptions" });

    const { brief, category, estimatedBudget } = req.body;
    if (!brief || brief.trim().length < 3) return res.status(400).json({ error: "Please provide a task title or brief description first" });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI service not configured" });

    const systemPrompt = `You are an expert task description writer for Sajilo Kam, a Nepali local services marketplace.
Given a task title, generate:
1. An improved title (max 80 characters)
2. A detailed description (3-5 sentences) describing the specific problem and expected outcome
3. A realistic budget range in NPR
4. The most appropriate category and subcategory

Available categories: Home Services, Delivery, Tech & Design, Education, Events

Return ONLY valid JSON:
{
  "title": "string",
  "description": "string",
  "suggestedBudget": { "min": number, "max": number },
  "suggestedCategory": "string",
  "suggestedSubCategory": "string"
}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Task title: "${brief}"${category ? `\nCategory hint: ${category}` : ""}${estimatedBudget ? `\nBudget hint: NPR ${estimatedBudget}` : ""}` },
        ],
        max_tokens: 600,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return res.status(500).json({ error: "AI service error" });

    const data = await response.json();
    const result = JSON.parse(data.choices[0]?.message?.content);
    return res.json(result);
  } catch (err) {
    console.error("[AI/TASK-GENERATOR]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/ai/chat
router.post("/chat", requireAuth, async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI Assistant is not configured", reply: "I'm sorry, the AI assistant is currently unavailable." });

    const systemPrompt = `You are a helpful AI assistant for Tasker, a task marketplace platform. User role: ${req.user.role}. Keep responses under 200 words.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }], max_tokens: 300, temperature: 0.7 }),
    });

    if (!response.ok) return res.status(500).json({ error: "AI service error", reply: "I'm having trouble processing your request." });

    const data = await response.json();
    return res.json({ reply: data.choices[0]?.message?.content || "I couldn't generate a response.", usage: { tokens: data.usage?.total_tokens || 0 } });
  } catch (err) {
    console.error("[AI/CHAT]", err);
    return res.status(500).json({ error: "Internal server error", reply: "Something went wrong." });
  }
});

// POST /api/ai/offer-analyzer
router.post("/offer-analyzer", requireAuth, async (req, res) => {
  try {
    const { taskTitle, taskDescription, budget, offers } = req.body;
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI service not configured" });

    const prompt = `Analyze these offers for the task "${taskTitle}" (budget: NPR ${budget}):\n${JSON.stringify(offers, null, 2)}\n\nProvide a brief analysis of each offer and recommend the best one. Return JSON: { "analysis": string, "recommendation": string, "bestOfferId": string }`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: prompt }], max_tokens: 500, response_format: { type: "json_object" } }),
    });

    if (!response.ok) return res.status(500).json({ error: "AI service error" });
    const data = await response.json();
    return res.json(JSON.parse(data.choices[0]?.message?.content));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/ai/category-description
router.post("/category-description", requireAuth, async (req, res) => {
  try {
    const { categoryName } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI service not configured" });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: `Write a 2-sentence description for the service category "${categoryName}" on a Nepali task marketplace. Be concise and professional.` }], max_tokens: 100 }),
    });

    if (!response.ok) return res.status(500).json({ error: "AI service error" });
    const data = await response.json();
    return res.json({ description: data.choices[0]?.message?.content });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
