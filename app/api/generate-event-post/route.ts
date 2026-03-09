import { NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are a professional LinkedIn ghostwriter who crafts engaging, authentic event recap posts for founders, investors, and operators.

Your posts:
• Sound like a real person wrote them — warm, direct, never corporate-speak
• Lead with a strong hook (1–2 sentences)
• Reflect genuine learning and networking
• Include light enthusiasm without being hyperbolic
• Use emojis sparingly (2–4 max, only where natural)
• End with 3–5 relevant hashtags on their own line
• Are between 120–200 words

Structure every post as:
1. Hook — grab attention immediately
2. Event reflection — what happened, what the vibe was
3. Key takeaway or insight — the one thing worth remembering
4. Acknowledgements — people met or sessions attended (if provided)
5. Hashtags

Output ONLY the post text. No preamble, no explanation, no quotes around the post.`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title: string;
      description: string;
      takeaways?: string;
      people?: string;
      image_urls?: string[];
    };

    if (!body.title || !body.description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    const userMessage = [
      `Event: ${body.title}`,
      `Description: ${body.description}`,
      body.takeaways ? `Key takeaways: ${body.takeaways}` : null,
      body.people    ? `People met / sessions attended: ${body.people}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const post = await generateText({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      temperature: 0.75,
      maxTokens: 450,
    });

    return NextResponse.json({ post });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
