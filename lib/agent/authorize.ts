/**
 * VAULT Copilot — Central Authorization Chokepoint
 *
 * Every tool call, navigation action, and agent intent MUST pass through
 * this function. Validates 7-tier RBAC role requirements, organization scope,
 * and input parameter schemas against the capability registry.
 *
 * Note: While this chokepoint prevents unauthorized prompts and action proposals
 * at the application layer, Supabase Row-Level Security (RLS) remains the
 * authoritative database boundary.
 */

import {
  getCapabilityByKey,
  isRoleAtLeast,
  type UserRbacRole,
  type Capability,
} from "./capability-registry";

export interface AuthorizeParams {
  userId: string;
  orgId?: string | null;
  role: UserRbacRole;
  capabilityKey: string;
  params?: Record<string, unknown>;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: "UNKNOWN_CAPABILITY" | "INSUFFICIENT_ROLE" | "MISSING_ORG_SCOPE" | "INVALID_PARAMS";
  message?: string;
  capability?: Capability;
  sanitizedParams?: Record<string, string>;
}

export function authorizeToolCall(input: AuthorizeParams): AuthorizationResult {
  const { role, capabilityKey, orgId, params = {} } = input;

  const cap = getCapabilityByKey(capabilityKey);
  if (!cap) {
    return {
      allowed: false,
      reason: "UNKNOWN_CAPABILITY",
      message: `Action or navigation key "${capabilityKey}" is not registered in the capability registry.`,
    };
  }

  // 1. Check 7-tier Role Hierarchy
  if (!isRoleAtLeast(role, cap.minRole)) {
    return {
      allowed: false,
      reason: "INSUFFICIENT_ROLE",
      message: `Access denied: Role "${role}" does not meet the minimum required role "${cap.minRole}" for ${cap.label}.`,
      capability: cap,
    };
  }

  // 2. Check Organization Scope
  if (cap.requiresOrgScope && !orgId) {
    return {
      allowed: false,
      reason: "MISSING_ORG_SCOPE",
      message: `Action "${cap.label}" requires an active organization context.`,
      capability: cap,
    };
  }

  // 3. Validate Schema Parameters for Tools
  const sanitizedParams: Record<string, string> = {};
  if (cap.toolSchema && cap.toolSchema.properties) {
    const properties = cap.toolSchema.properties as Record<string, { type?: string; enum?: string[] }>;
    const required = (cap.toolSchema.required as string[]) || [];

    for (const reqKey of required) {
      const val = params[reqKey];
      if (val === undefined || val === null || (typeof val === "string" && val.trim().length === 0)) {
        return {
          allowed: false,
          reason: "INVALID_PARAMS",
          message: `Missing required parameter "${reqKey}" for action "${cap.label}".`,
          capability: cap,
        };
      }
    }

    for (const [key, schema] of Object.entries(properties)) {
      const val = params[key];
      if (val !== undefined && val !== null) {
        if (schema.type === "string" && typeof val !== "string") {
          return {
            allowed: false,
            reason: "INVALID_PARAMS",
            message: `Parameter "${key}" must be a string.`,
            capability: cap,
          };
        }

        if (schema.enum && Array.isArray(schema.enum) && !schema.enum.includes(String(val))) {
          return {
            allowed: false,
            reason: "INVALID_PARAMS",
            message: `Parameter "${key}" value is not within allowed choices.`,
            capability: cap,
          };
        }

        sanitizedParams[key] = String(val);
      }
    }
  }

  return {
    allowed: true,
    capability: cap,
    sanitizedParams,
  };
}
