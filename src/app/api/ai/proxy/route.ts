import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";

// Convert Google Gemini structure to OpenAI structure for OpenRouter
function convertGoogleToOpenAI(body: any ) {
    if (!body.contents) return body;

    const messages = body.contents.map((content: any ) => {
        let parts = content.parts;
        if (!Array.isArray(parts)) parts = [parts];

        const openAiContent: any [] = [];
        parts.forEach((part: any ) => {
            if (part.text) {
                openAiContent.push({ type: "text", text: part.text });
            }
            if (part.inlineData) {
                const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                openAiContent.push({ type: "image_url", image_url: { url: dataUrl } });
            }
        });

        // if only text, we can simplify
        if (openAiContent.length === 1 && openAiContent[0].type === "text") {
            return { role: content.role === "model" ? "assistant" : "user", content: openAiContent[0].text };
        }

        return {
            role: content.role === "model" ? "assistant" : "user",
            content: openAiContent
        };
    });

    const newBody: any  = {
        model: "google/gemini-2.5-pro",
        messages: messages
    };

    if (body.generationConfig) {
        if (body.generationConfig.temperature !== undefined) newBody.temperature = body.generationConfig.temperature;
        if (body.generationConfig.maxOutputTokens !== undefined) newBody.max_tokens = body.generationConfig.maxOutputTokens;
        if (body.generationConfig.responseMimeType === "application/json") {
            newBody.response_format = { type: "json_object" };
        }
    }

    return newBody;
}

export async function POST(request: NextRequest) {
  // Ensure the user is authenticated to prevent public abuse of the API proxy
  const user = await validateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server" }, { status: 500 });
  }

  try {
    const body = await request.json();

    const openRouterBody = body.contents ? convertGoogleToOpenAI(body) : body;

    if (!openRouterBody.model) {
        openRouterBody.model = "google/gemini-2.5-pro";
    }

    // Proxy the request directly to OpenRouter API
    const response = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Automated Grading System'
      },
      body: JSON.stringify(openRouterBody)
    });

    const data = await response.json();

    if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
    }

    // Convert back from OpenAI format to Google format just in case the client expects it
    if (data.choices && data.choices.length > 0) {
        const textResponse = data.choices[0].message?.content || "";
        return NextResponse.json({
            candidates: [
                {
                    content: {
                        parts: [{ text: textResponse }]
                    }
                }
            ]
        });
    }

    return NextResponse.json(data);
  } catch (error: any ) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
