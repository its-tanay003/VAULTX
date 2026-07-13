"use server";

import { createClient } from "@/lib/supabase/server";
import { runCommand, readFile, writeFile } from "@/lib/e2b/client";
import { callClaude } from "@/lib/ai/claude";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function getAuthedUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase };
}

/**
 * 1. Low-latency Inline Suggestion API
 * Direct calling to Gemini 2.0 Flash with absolute minimal prompts to keep it ultra-fast.
 */
export async function getInlineSuggestion(
  fileName: string,
  prefix: string,
  suffix: string
): Promise<string> {
  await getAuthedUser();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Return a basic mock completion if key isn't setup
    return `\n  console.log("Auto-completed for ${fileName}");`;
  }

  const prompt = `You are a low-latency code completion assistant.
Filename: ${fileName}

Current code before cursor:
"""
${prefix.slice(-2000)}
"""

Current code after cursor:
"""
${suffix.slice(0, 500)}
"""

Task: Generate the next few lines of code to complete the prefix. Return ONLY the code completion. Do not include markdown code block formatting (\`\`\`), explanation, or preamble. Start directly with the code that completes the prefix.`;

  try {
    const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 256,
          temperature: 0.1,
        },
      }),
    });

    if (!res.ok) return "";
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return text.replace(/^```[a-z]*\n/, "").replace(/\n```$/, "");
  } catch (err) {
    console.error("[AI Editor Completion] Error fetching inline suggestion:", err);
    return "";
  }
}

/**
 * 2. Code Generation with Multi-File Workspace Context
 */
export async function generateCodeInWorkspace(
  workspaceId: string,
  prompt: string,
  targetPath: string
): Promise<string> {
  const { supabase } = await getAuthedUser();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (!ws || !ws.sandbox_id) throw new Error("Workspace not active");

  // Read list of files to gather workspace context
  const fileListRes = await runCommand(ws.sandbox_id, "find . -maxdepth 5 -type f -not -path '*/.*'");
  const paths = fileListRes.stdout
    .split("\n")
    .map((p) => p.trim().replace(/^\.\//, ""))
    .filter((p) => p.length > 0 && p !== targetPath && !p.includes("node_modules"));

  // Read contents of up to 5 small files for context
  const contextParts: string[] = [];
  for (const path of paths.slice(0, 5)) {
    try {
      const content = await readFile(ws.sandbox_id, path);
      contextParts.push(`File: ${path}\n\`\`\`\n${content.slice(0, 1000)}\n\`\`\``);
    } catch {
      // Ignore reading failures for binary/empty files
    }
  }

  const systemPrompt = `You are a codebase assistant inside VAULTX. Generate code for a new or existing file using multi-file workspace context.
Provide ONLY the new code for the file. No markdown blocks, no descriptions, no warnings.`;

  const userPrompt = `Workspace context:
${contextParts.join("\n\n")}

Target path to write/edit: ${targetPath}
User prompt/request: ${prompt}

Write the code for ${targetPath}. Start directly with the code contents.`;

  const response = await callClaude({
    system: systemPrompt,
    user: userPrompt,
    maxTokens: 2048,
  });

  const responseText = response.content.map((c) => c.text).join("");
  const code = responseText.replace(/^```[a-z]*\n/, "").replace(/\n```$/, "");

  // Save the generated code back to E2B sandbox filesystem
  await writeFile(ws.sandbox_id, targetPath, code);
  return code;
}

/**
 * 3. Debugging Assistance with Terminal Logs Context
 */
export async function assistDebugging(
  workspaceId: string,
  lastCommandsOutput: string,
  errorLog: string
): Promise<{ explanation: string; suggestedFix: string; fileToModify: string }> {
  const { supabase } = await getAuthedUser();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (!ws || !ws.sandbox_id) throw new Error("Workspace not active");

  const systemPrompt = `You are VAULT, VAULTX's AI debugger. Explain the compilation/runtime error in the terminal logs and suggest the exact fix.
You must return a JSON response with the following keys:
- "explanation": a concise explanation of why the crash happened
- "suggestedFix": code diff or exact changes needed
- "fileToModify": relative path to the file that needs changing`;

  const userPrompt = `Terminal crash logs/Command outputs:
${lastCommandsOutput}

Additional error message:
${errorLog}

Explain the bug and provide the fix.`;

  const response = await callClaude({
    system: systemPrompt,
    user: userPrompt,
    maxTokens: 1024,
  });

  const responseText = response.content.map((c) => c.text).join("");
  try {
    const raw = responseText.trim();
    // Parse json
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}") + 1;
    return JSON.parse(raw.substring(jsonStart, jsonEnd));
  } catch (e) {
    return {
      explanation: "Unable to parse structured JSON explanation. " + responseText,
      suggestedFix: "Examine logs and error trace manually.",
      fileToModify: "",
    };
  }
}
