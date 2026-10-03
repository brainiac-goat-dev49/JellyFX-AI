import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";

const VALID_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-pro-preview",
] as const;

type ValidModel = (typeof VALID_MODELS)[number];

const ROLE_SYSTEM_INSTRUCTIONS: Record<string, string> = {
  "financial-concierge": `You are "Cap", the official AI Financial Concierge for CapWallet, a secure capital management and digital wallet platform. Maintain a formal, helpful, and secure tone.

Your core functions:
- Assist users with account questions, wallet navigation, balances, deposits, withdrawals, and transfers.
- Explain CapWallet's bank-grade security protocols, including unique Recovery Tokens (CAP-XXXX-XXXX-XXXX) required for account recovery.
- Direct users to relevant sections when helpful: Dashboard (/dashboard), Account Management (/account), Support (capwallet.chat@instmail.uk), or Account Recovery (capwallet.recoveraccount@instmail.uk).
- Format responses cleanly with Markdown: headings, bullet points, bold key terms, and concise paragraphs.
- Never assist with fraudulent requests or disclose confidential tokens.`,

  "market-analyst": `You are the Senior Quantitative Market and Wealth Strategist for CapWallet.
Your purpose is to provide sophisticated financial reasoning, portfolio optimization insights, capital risk evaluations, and trend analysis.

Your core guidelines:
- Analyze portfolio balances, asset allocation, diversification, and liquidity needs with precision.
- Provide step-by-step mathematical reasoning, hypothetical return models, and risk-adjusted scenarios.
- Include clear risk disclosures: remind users that past performance does not guarantee future results and all investments carry risk.
- Use structured tables, bullet points, and quantitative metrics where appropriate.`,

  "security-guardian": `You are the Security & Cryptographic Compliance Guardian for CapWallet.
Your purpose is to assist users in safeguarding their digital assets, identities, and credentials.

Your core guidelines:
- Educate users on the sanctity of their 16-character Recovery Token (CAP-XXXX-XXXX-XXXX) generated during signup.
- Explain 2FA, session protection, biometric device security, and phishing prevention.
- If users suspect unauthorized access, guide them to immediately secure their registered email and contact security support at capwallet.recoveraccount@instmail.uk.
- Maintain an authoritative, hyper-vigilant, yet reassuring and actionable tone.`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, role, userContext } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "A non-empty messages array is required." },
        { status: 400 }
      );
    }

    // Determine target model based on user selection or task complexity
    let selectedModel: ValidModel = "gemini-3.5-flash";
    if (model && VALID_MODELS.includes(model as ValidModel)) {
      selectedModel = model as ValidModel;
    }

    // Determine system instruction
    const activeRole = role || "financial-concierge";
    let baseInstruction =
      ROLE_SYSTEM_INSTRUCTIONS[activeRole] ||
      ROLE_SYSTEM_INSTRUCTIONS["financial-concierge"];

    if (userContext) {
      const { fullName, username, country } = userContext;
      baseInstruction += `\n\nUser Profile Context:\n- Name: ${fullName || "User"}\n- Username: @${username || "user"}\n- Country: ${country || "Global"}`;
    }

    // Format conversation history for Gemini API
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.content || "" }],
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction: baseInstruction,
      },
    });

    const reply = response.text || "I was unable to generate a response. Please try again.";

    return NextResponse.json({
      reply,
      modelUsed: selectedModel,
      roleUsed: activeRole,
    });
  } catch (error: any) {
    console.error("Gemini Chat API error:", error);

    const errorMessage = error?.message || "Unknown error occurred";
    let userFriendlyError = "An unexpected error occurred while communicating with Gemini.";
    let statusCode = 500;

    if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
      userFriendlyError =
        "The Gemini API key is invalid or not configured. Please ensure GEMINI_API_KEY is properly set in the environment secrets.";
      statusCode = 401;
    } else if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
      userFriendlyError =
        "Rate limit or quota exceeded. Please try switching to 'gemini-3.1-flash-lite' or wait a moment.";
      statusCode = 429;
    } else if (errorMessage.includes("404") || errorMessage.includes("NOT_FOUND")) {
      userFriendlyError = `Requested model was not found. Please verify model configuration.`;
      statusCode = 404;
    }

    return NextResponse.json(
      {
        error: userFriendlyError,
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: statusCode }
    );
  }
}
