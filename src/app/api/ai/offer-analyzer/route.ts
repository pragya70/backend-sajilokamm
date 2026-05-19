import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return optionsResponse();
}

/**
 * POST /api/ai/offer-analyzer
 * AI-powered offer analysis and recommendation
 * 
 * Body: { taskId: string }
 * 
 * Returns: {
 *   analysis: string,
 *   recommendations: Array<{
 *     offerId: string,
 *     score: number,
 *     pros: string[],
 *     cons: string[],
 *     recommendation: string
 *   }>,
 *   summary: string
 * }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  try {
    const { taskId } = await req.json();

    if (!taskId) {
      return corsJson({ error: "Task ID is required" }, { status: 400 });
    }

    // Fetch task with offers
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        offers: {
          where: { status: "PENDING" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                rating: true,
                reviewCount: true,
                badges: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!task) {
      return corsJson({ error: "Task not found" }, { status: 404 });
    }

    // Only task owner can analyze offers
    if (task.userId !== user.id) {
      return corsJson({ error: "You can only analyze offers for your own tasks" }, { status: 403 });
    }

    if (task.offers.length === 0) {
      return corsJson({ 
        analysis: "No offers received yet. Your task is still open for bids.",
        recommendations: [],
        summary: "Wait for taskers to submit their offers."
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "your_openai_api_key_here") {
      return corsJson({ error: "AI service not configured" }, { status: 503 });
    }

    // Prepare offer data for AI analysis
    const offerData = task.offers.map((offer, index) => ({
      id: offer.id,
      number: index + 1,
      price: offer.price,
      message: offer.message,
      tasker: {
        name: offer.user.name,
        rating: offer.user.rating,
        reviewCount: offer.user.reviewCount,
        badges: offer.user.badges,
        accountAge: Math.floor(
          (Date.now() - new Date(offer.user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
    }));

    const systemPrompt = `You are an expert at analyzing service offers and helping clients choose the best provider.

Analyze each offer based on:
1. Price competitiveness (compared to task budget: $${task.budget})
2. Tasker credibility (rating, reviews, badges, account age)
3. Offer message quality (professionalism, understanding of requirements, proposed approach)
4. Value for money

For each offer, provide:
- Score (0-100)
- 2-3 pros
- 1-2 cons (if any)
- Brief recommendation

Return ONLY valid JSON in this exact format:
{
  "analysis": "Overall analysis of all offers (2-3 sentences)",
  "recommendations": [
    {
      "offerId": "string",
      "score": number,
      "pros": ["string", "string"],
      "cons": ["string"],
      "recommendation": "string"
    }
  ],
  "summary": "Final recommendation on which offer to accept (1-2 sentences)"
}`;

    const userPrompt = `Task: ${task.title}
Budget: $${task.budget}
Description: ${task.description}

Offers received:
${JSON.stringify(offerData, null, 2)}

Analyze these offers and recommend the best choice.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1200,
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
      return corsJson({ error: "Failed to analyze offers" }, { status: 500 });
    }

    const result = JSON.parse(content);

    return corsJson({
      ...result,
      totalOffers: task.offers.length,
      usage: {
        tokens: data.usage?.total_tokens || 0,
      },
    });
  } catch (error) {
    console.error("[AI-OFFER-ANALYZER] Error:", error);
    return corsJson({ error: "Internal server error" }, { status: 500 });
  }
}
