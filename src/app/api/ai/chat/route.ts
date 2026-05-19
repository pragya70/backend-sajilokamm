import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/unifiedAuth";
import { corsJson, optionsResponse } from "@/lib/mobileAuth";

export async function OPTIONS() {
  return optionsResponse();
}

/**
 * POST /api/ai/chat
 * AI Assistant for helping users with platform questions
 * 
 * Body: { message: string, context?: string }
 * Returns: { reply: string, suggestions?: string[] }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return corsJson({ error: "Unauthorized" }, { status: 401 });

  try {
    const { message, context } = await req.json();

    if (!message || message.trim().length === 0) {
      return corsJson({ error: "Message is required" }, { status: 400 });
    }

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "your_openai_api_key_here") {
      return corsJson(
        { 
          error: "AI Assistant is not configured. Please set OPENAI_API_KEY in .env",
          reply: "I'm sorry, the AI assistant is currently unavailable. Please contact support for help."
        },
        { status: 503 }
      );
    }

    // System prompt with platform knowledge
    const systemPrompt = `You are a helpful AI assistant for Tasker, a task marketplace platform where:
- POSTERS create tasks and set budgets
- TASKERS make offers to complete tasks
- Tasks go through states: PENDING_APPROVAL → OPEN → IN_PROGRESS → COMPLETED
- Users must complete KYC verification to accept offers
- Payment happens after task completion
- Disputes can be opened if there are issues
- Users can chat privately with friends only

Your role is to:
1. Answer questions about how the platform works
2. Guide users through processes (posting tasks, making offers, payments, KYC)
3. Explain task statuses and what actions are available
4. Help troubleshoot common issues
5. Be friendly, concise, and helpful

User context: ${context || "General user"}
User role: ${user.role}

Keep responses under 200 words. If you don't know something specific, suggest contacting support.`;

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Fast and cost-effective
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API error:", error);
      return corsJson(
        { 
          error: "AI service error",
          reply: "I'm having trouble processing your request right now. Please try again or contact support."
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";

    // Generate contextual suggestions based on user role
    const suggestions = generateSuggestions(user.role, context);

    return corsJson({
      reply,
      suggestions,
      usage: {
        tokens: data.usage?.total_tokens || 0,
      },
    });
  } catch (error) {
    console.error("[AI-CHAT] Error:", error);
    return corsJson(
      { 
        error: "Internal server error",
        reply: "Something went wrong. Please try again later."
      },
      { status: 500 }
    );
  }
}

/**
 * Generate helpful suggestions based on user role and context
 */
function generateSuggestions(role: string, context?: string): string[] {
  const commonSuggestions = [
    "How do I post a task?",
    "What are the payment methods?",
    "How does KYC verification work?",
  ];

  if (role === "POSTER") {
    return [
      "How do I choose the best offer?",
      "Can I cancel a task after accepting an offer?",
      "What happens if I'm not satisfied with the work?",
    ];
  }

  if (role === "TASKER") {
    return [
      "How do I make a competitive offer?",
      "When do I get paid?",
      "What if the poster doesn't respond?",
    ];
  }

  if (role === "ADMIN") {
    return [
      "How do I resolve disputes?",
      "How do I approve pending tasks?",
      "How do I manage user verification?",
    ];
  }

  return commonSuggestions;
}
