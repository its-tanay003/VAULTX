const E2B_API_URL = "https://api.e2b.dev";

function getApiKey() {
  const key = process.env.E2B_API_KEY || "mock-api-key";
  return key;
}

export interface E2BSandbox {
  sandboxId: string;
}

export async function createSandbox(timeoutSeconds = 1800): Promise<E2BSandbox> {
  // If no real API key is configured, fallback to mock session id for demo safety
  if (!process.env.E2B_API_KEY) {
    console.warn("[E2B] No E2B_API_KEY found, returning mock sandbox id.");
    return { sandboxId: `mock-sandbox-${Math.random().toString(36).substring(7)}` };
  }

  const res = await fetch(`${E2B_API_URL}/sandboxes`, {
    method: "POST",
    headers: {
      "X-API-KEY": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      templateId: "base",
      timeout: timeoutSeconds,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create E2B sandbox: ${res.status} - ${text}`);
  }

  const data = await res.json();
  return { sandboxId: data.sandboxId };
}

export async function runCommand(sandboxId: string, cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  if (sandboxId.startsWith("mock-sandbox-")) {
    console.log(`[E2B MOCK] Running command inside ${sandboxId}: ${cmd}`);
    return { stdout: "Mock success", stderr: "", exitCode: 0 };
  }

  const res = await fetch(`${E2B_API_URL}/sandboxes/${sandboxId}/commands`, {
    method: "POST",
    headers: {
      "X-API-KEY": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cmd,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`E2B command execution failed: ${res.status} - ${text}`);
  }

  return res.json();
}

export async function writeFile(sandboxId: string, path: string, content: string): Promise<void> {
  if (sandboxId.startsWith("mock-sandbox-")) {
    console.log(`[E2B MOCK] Writing file to ${sandboxId} at ${path}`);
    return;
  }

  const res = await fetch(`${E2B_API_URL}/sandboxes/${sandboxId}/files/${path}`, {
    method: "PUT",
    headers: {
      "X-API-KEY": getApiKey(),
      "Content-Type": "text/plain",
    },
    body: content,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to write file to E2B sandbox: ${res.status} - ${text}`);
  }
}

export async function readFile(sandboxId: string, path: string): Promise<string> {
  if (sandboxId.startsWith("mock-sandbox-")) {
    console.log(`[E2B MOCK] Reading file from ${sandboxId} at ${path}`);
    return `// Mock content for ${path}\nconsole.log("hello world");`;
  }

  const res = await fetch(`${E2B_API_URL}/sandboxes/${sandboxId}/files/${path}`, {
    method: "GET",
    headers: {
      "X-API-KEY": getApiKey(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to read file from E2B sandbox: ${res.status} - ${text}`);
  }

  return res.text();
}

export async function deleteSandbox(sandboxId: string): Promise<void> {
  if (sandboxId.startsWith("mock-sandbox-")) {
    console.log(`[E2B MOCK] Terminating sandbox session ${sandboxId}`);
    return;
  }

  const res = await fetch(`${E2B_API_URL}/sandboxes/${sandboxId}`, {
    method: "DELETE",
    headers: {
      "X-API-KEY": getApiKey(),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to delete E2B sandbox: ${res.status} - ${text}`);
  }
}
