import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "POSTER") {
    return corsJson({ error: "Only posters can generate task descriptions" }, { status: 403 });
  }

  try {
    const { brief, category, estimatedBudget } = await req.json();

    if (!brief || brief.trim().length < 3) {
      return corsJson({ error: "Please provide a task title or brief description first" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return corsJson({ error: "AI service not configured" }, { status: 503 });
    }

    const apiUrl = "https://api.groq.com/openai/v1/chat/completions";
    const model = "llama-3.1-8b-instant";

    const systemPrompt = `You are an expert task description writer for Sajilo Kam, a Nepali local services marketplace.
Your job is to expand a task title into a clear, detailed description that helps local professionals understand exactly what is needed.

IMPORTANT: Read the title carefully and infer the specific problem or need. For example:
- "Plumbing pipe" → describe a pipe burst, leak, or blockage issue
- "Cleaning" → describe what rooms/areas need cleaning and what type
- "Electrician" → describe a wiring fault, power outage, or installation need
- "Painting" → describe which walls/rooms and what type of paint job

Given a task title, generate:
1. An improved title (keep it close to the original, max 80 characters)
2. A detailed description (3-5 sentences) that:
   - Describes the specific problem or situation based on the title
   - Explains what the professional needs to do to fix or complete it
   - Mentions expected outcome after the work is done
   - Sounds like a real person describing their actual problem
3. A realistic budget range in NPR (Nepali Rupees) for the Nepal market
4. The most appropriate category and subcategory

Available categories:
- Home Services (Cleaning, Plumbing, Electrical, Gardening)
- Delivery (Groceries, Food, Packages, Furniture)
- Tech & Design (Web Development, Graphic Design, IT Support, Content Writing)
- Education (Tutoring, Music Lessons, Language, Exam Prep)
- Events (Photography, Catering, Decoration, Music/DJ)

Return ONLY valid JSON:
{
  "title": "string",
  "description": "string",
  "suggestedBudget": { "min": number, "max": number },
  "suggestedCategory": "string",
  "suggestedSubCategory": "string"
}`;

    const userPrompt = `Task title: "${brief}"
${category ? `Category hint: ${category}` : ""}
${estimatedBudget ? `Budget hint: NPR ${estimatedBudget}` : ""}

Generate a detailed description for this task.`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 600,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      return corsJson({ error: "AI service error" }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return corsJson({ error: "Failed to generate task description" }, { status: 500 });
    }

    const result = JSON.parse(content);
    return corsJson(result);
  } catch (error) {
    console.error("[AI-TASK-GENERATOR] Error:", error);
    return corsJson({ error: "Internal server error" }, { status: 500 });
  }
}
