/**
 * Capability Registry Drift Verifier / Sync Checker
 *
 * Compares app routes in `app/(dashboard)/dashboard` against `lib/agent/capability-registry.ts`
 * to detect any unmapped routes or missing capabilities before deployment.
 */

import * as fs from "fs";
import * as path from "path";
import { CAPABILITY_REGISTRY } from "../lib/agent/capability-registry";

function getAllPageRoutes(dir: string, baseRoute = "/dashboard"): string[] {
  const routes: string[] = [];
  if (!fs.existsSync(dir)) return routes;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Ignore internal next directories or group folders
      if (entry.name.startsWith("(") && entry.name.endsWith(")")) {
        routes.push(...getAllPageRoutes(path.join(dir, entry.name), baseRoute));
      } else {
        const subRoute = `${baseRoute}/${entry.name}`;
        routes.push(...getAllPageRoutes(path.join(dir, entry.name), subRoute));
      }
    } else if (entry.name === "page.tsx" || entry.name === "page.jsx" || entry.name === "page.ts") {
      routes.push(baseRoute);
    }
  }

  return Array.from(new Set(routes));
}

export function verifyCapabilityRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const dashboardDir = path.resolve(process.cwd(), "app/(dashboard)/dashboard");
  const actualRoutes = getAllPageRoutes(dashboardDir);

  const registeredRoutePatterns = new Set(
    CAPABILITY_REGISTRY.filter((c) => c.kind === "navigation" && c.routePattern).map((c) => c.routePattern as string)
  );

  console.log(`\n🔍 Checking Capability Registry against ${actualRoutes.length} detected dashboard routes...`);

  // Check if any major root route is missing from registry
  for (const route of actualRoutes) {
    // Normalize dynamic params e.g., /dashboard/researcher/submissions/123 -> /dashboard/researcher/submissions/[id]
    const normalized = route.replace(/\/[a-zA-Z0-9_-]+(?=\/|$)/g, (match) => {
      // Keep static segments
      const staticSegments = ["/dashboard", "/researcher", "/submissions", "/earnings", "/org", "/programs", "/triage", "/team", "/ai-red-team", "/code-quality", "/ptaas", "/ctf", "/contests", "/workspaces", "/notifications", "/settings"];
      return staticSegments.includes(match) ? match : "/[id]";
    });

    const isCovered = registeredRoutePatterns.has(route) || registeredRoutePatterns.has(normalized);
    if (!isCovered) {
      console.warn(`⚠️  Warning: Route ${route} (normalized: ${normalized}) is not explicitly mapped in CAPABILITY_REGISTRY.`);
    }
  }

  // Check for duplicate keys
  const keys = new Set<string>();
  for (const cap of CAPABILITY_REGISTRY) {
    if (keys.has(cap.key)) {
      errors.push(`Duplicate capability key detected: ${cap.key}`);
    }
    keys.add(cap.key);

    if (cap.kind !== "navigation" && !cap.toolSchema) {
      errors.push(`Action capability ${cap.key} is missing toolSchema.`);
    }
  }

  if (errors.length === 0) {
    console.log(`✅ Capability Registry verified: ${CAPABILITY_REGISTRY.length} capabilities loaded with 0 errors.\n`);
    return { valid: true, errors: [] };
  } else {
    console.error(`❌ Capability Registry verification failed with ${errors.length} errors:`);
    errors.forEach((e) => console.error(`  - ${e}`));
    return { valid: false, errors };
  }
}

if (require.main === module) {
  const result = verifyCapabilityRegistry();
  if (!result.valid) {
    process.exit(1);
  }
}
