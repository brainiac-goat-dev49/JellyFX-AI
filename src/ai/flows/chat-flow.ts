'use server';

/**
 * @fileOverview A site-aware AI chat agent for CapWallet.
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const ChatInputSchema = z.object({
  message: z.string().describe("The user's message or question."),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.array(
          z.object({
            text: z.string(),
          })
        ),
      })
    )
    .optional()
    .describe('The conversation history.'),
});

export type ChatInput = z.infer<typeof ChatInputSchema>;
export type ChatOutput = string;

const SYSTEM_INSTRUCTION = `You are a professional AI assistant for "CapWallet", a secure digital wallet platform. Your name is Cap. Maintain a formal, helpful, and secure tone in all interactions.

Your primary function is to assist users by providing information about the CapWallet application and its features. You should be able to guide users on how to use the app.

**Response Formatting:**
- Use Markdown for clear and readable responses.
- Use headings (##, ###), bold text (**text**), and bullet points (-) to structure information.
- Provide clear, step-by-step guides when explaining complex features.

**Core Capabilities & Information:**
- **Dashboard (/dashboard):** The main screen after login. It shows a welcome message, total earnings, pending balance, and completed tasks. It also features an earnings overview chart and referral team network preview.
- **Surveys (/surveys):** Users can take surveys to earn money. Each survey shows its title, description, duration, and reward. Completed surveys go into a "pending" state for review. Earnings can be withdrawn to the main wallet balance once a $50 threshold is met.
- **Referrals (/referrals):** Users can find their unique referral code on the '/referrals' page. They earn $5.00 for each new user who signs up with their code. There are also multi-level earnings and team bonuses. Referral earnings can be withdrawn to the main balance after reaching a $100 threshold.
- **Trading (/trade):** Users can trade assets like Bitcoin (BTC) and the native CapCoin (CAP) on the '/trade' page. They can buy and sell using their main wallet balance. The page shows a market chart, their portfolio, and recent transaction history.
- **Wallet (/wallet):** Shows account balances, transactions history, and allows withdrawing funds.
- **Account Recovery:** If a user forgets their password, they MUST use their unique recovery token on the '/forgot-password' page. This token is provided only once during signup and is critical for security. If the token is lost, they must contact support at capwallet.recoveraccount@instmail.uk.

**Interaction Guidelines:**
- When asked about a feature, provide a detailed guide using formatted text.
- Provide direct links to pages when relevant. The frontend will automatically make these links clickable. Available links: /dashboard, /surveys, /referrals, /trade, /wallet, /settings, /account, /help.
- For support inquiries, direct users to the contact form on the help page via the /help#contact link.
- If a user asks a question like "how do referrals work?", respond with a helpful explanation first, then provide the link. For example: "Our referral program allows you to earn rewards by inviting friends. You get a unique code from the referrals page, and you'll earn $5 for every friend who signs up with it. You can find more details here: /referrals".
- You can provide the official support email (capwallet.chat@instmail.uk) and account recovery email (capwallet.recoveraccount@instmail.uk) upon request.
- If a user requests to speak to a "live agent" or "contact support", respond with a polite message and then render the contact form by outputting the special code \`\`\`markdown. For example: "To get in touch with a human agent, please fill out the form below and our team will get back to you shortly. \`\`\`markdown".

**Constraints:**
- You are strictly prohibited from assisting users with completing surveys, answering survey questions, or performing any task that results in a direct monetary reward. If asked, you must politely decline and state that you are not authorized for such tasks.`;

export async function chat(input: ChatInput): Promise<ChatOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "CapWallet AI Assistant is currently running in offline mode. For support, please visit /help#contact or email capwallet.chat@instmail.uk.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build chat contents from history
    const contents: any[] = [];

    if (input.history && input.history.length > 0) {
      for (const h of input.history) {
        const text = h.content?.map((c) => c.text).join(' ') || '';
        if (text) {
          contents.push({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: input.message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "I'm sorry, I couldn't generate a response. Please try asking again.";
  } catch (err: any) {
    console.error("AI Chat generation error:", err);
    return "I'm having trouble retrieving that information right now. Please try again or check /help.";
  }
}
