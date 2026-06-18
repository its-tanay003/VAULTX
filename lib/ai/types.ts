import type { SeverityLevel } from "@/lib/supabase/types";

/* ─── Stage results ───────────────────────────────────────────────────────── */

export interface Stage1Result {
  isDuplicate: boolean;
  duplicateId: string | null;
  method:      "sha256_hash";
}

export interface Stage2Result {
  isDuplicate:  boolean;
  duplicateId:  string | null;
  similarity:   number;           // 0–1
  method:       "pg_trgm_fuzzy";
}

export interface Stage3Result {
  isDuplicate:       boolean;
  duplicateId:       string | null;
  similarity:        number;      // 0–1
  reasoning:         string;
  method:            "claude_semantic";
  tokensUsed:        number;
}

export interface DuplicateResult {
  isDuplicate:  boolean;
  duplicateId:  string | null;
  stage:        1 | 2 | 3 | null;
  confidence:   number;
  reasoning:    string;
}

/* ─── Severity result ─────────────────────────────────────────────────────── */

export interface SeverityResult {
  severity:   SeverityLevel;
  confidence: number;             // 0–1
  reasoning:  string;
  cvssHints:  string[];
  tokensUsed: number;
}

/* ─── Full validation result ──────────────────────────────────────────────── */

export interface ValidationResult {
  submissionId:   string;
  duplicate:      DuplicateResult;
  severity:       SeverityResult;
  analysisText:   string;
  processingMs:   number;
  error:          string | null;
}

/* ─── Claude API response shape ───────────────────────────────────────────── */

export interface ClaudeMessage {
  id:      string;
  type:    "message";
  role:    "assistant";
  content: Array<{ type: "text"; text: string }>;
  usage:   { input_tokens: number; output_tokens: number };
}
