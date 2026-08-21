import { OpenRouter } from "@openrouter/sdk";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env
const envPath = resolve('.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

async function fetchWithRetry(model: string, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${retries}] Requesting ${model}...`);
      const stream = await openrouter.chat.send({
        chatRequest: {
          model,
          messages: [
            {
              role: "user",
              content: "How many r's are in the word 'strawberry'?"
            }
          ],
          stream: true
        }
      });

      let response = "";
      for await (const chunk of (stream as AsyncIterable<any>)) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          response += content;
          process.stdout.write(content);
        }

        // Usage information comes in the final chunk
        if (chunk.usage) {
          console.log("\n\nReasoning tokens:", chunk.usage.completionTokensDetails?.reasoningTokens ?? 0);
          console.log("Total tokens:", chunk.usage.totalTokens);
        }
      }
      return;
    } catch (err: any) {
      if (err?.statusCode === 429 && attempt < retries) {
        const waitSec = err?.error?.metadata?.retry_after_seconds || 5;
        console.warn(`\n⚠️  Model is temporarily rate-limited upstream. Retrying in ${waitSec}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  const model = process.env.AGENT_MODEL || "z-ai/glm-5.2:free";
  console.log(`Starting OpenRouter SDK streaming demo`);
  console.log(`Selected Model: ${model}\n`);

  await fetchWithRetry(model);
}

main().catch((err) => {
  console.error("\n❌ Request failed:", err.message || err);
  console.log("\nTip: Free models share global upstream rate limits. You can switch models in .env:");
  console.log("  AGENT_MODEL=meta-llama/llama-3.3-70b-instruct:free");
  console.log("  AGENT_MODEL=deepseek/deepseek-r1:free");
  console.log("  AGENT_MODEL=google/gemini-2.0-flash-exp:free");
});
