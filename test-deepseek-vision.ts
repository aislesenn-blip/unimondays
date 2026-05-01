import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function main() {
  try {
    const { text } = await generateText({
      model: openrouter('deepseek/deepseek-v4-pro'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image' },
            { type: 'image', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1200px-React-icon.svg.png' }
          ],
        },
      ],
    });
    console.log("Response:", text);
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

main();
