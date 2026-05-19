import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { categoryName, subCategories } = await req.json();

    if (!categoryName || categoryName.trim().length < 2) {
      return NextResponse.json(
        { error: "Please provide a category name" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const apiUrl = "https://api.groq.com/openai/v1/chat/completions";
    const model = "llama-3.1-8b-instant";

    const systemPrompt = `You are an expert content writer for SajhiKaam, a Nepali local services marketplace.
Your job is to write clear, professional, and engaging category descriptions that help users understand what services are available in each category.

Given a category name and optionally its subcategories, generate:
1. A detailed description (2-3 sentences) that:
   - Explains what types of services are included in this category
   - Highlights the benefits of using these services
   - Mentions common use cases or scenarios
   - Uses professional but friendly tone
   - Is optimized for search engines (SEO-friendly)

2. An SEO meta title (50-60 characters)
3. An SEO meta description (150-160 characters)

Return ONLY valid JSON:
{
  "description": "string",
  "metaTitle": "string",
  "metaDescription": "string"
}`;

    const subCatInfo = subCategories && subCategories.length > 0
      ? `\nSubcategories: ${subCategories.join(", ")}`
      : "";

    const userPrompt = `Category name: "${categoryName}"${subCatInfo}

Generate a professional description and SEO metadata for this service category.`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("Groq API error:", await response.text());
      return NextResponse.json(
        { error: "AI service error" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Failed to generate description" },
        { status: 500 }
      );
    }

    const result = JSON.parse(content);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AI-CATEGORY-DESCRIPTION] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
