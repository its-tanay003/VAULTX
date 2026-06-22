/**
 * VAULTX Demo Data Seeder
 *
 * Run with:  node scripts/seed-demo-data.mjs
 *
 * REQUIRES (set in .env.local, this script reads them via process.env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (NOT the anon key — this bypasses RLS)
 *   DEMO_ORG_OWNER_EMAIL        (an account YOU already signed up with,
 *                                 role='org', already onboarded — this
 *                                 script seeds programs/submissions under
 *                                 YOUR existing org so you can log in
 *                                 normally during the demo)
 *
 * Why a Node script instead of raw SQL: Postgres requires going through
 * Supabase's Auth API to create valid auth.users rows (instance_id,
 * encrypted_password, confirmation tokens, etc. are version-sensitive
 * and easy to get wrong with a hand-written INSERT). The admin API
 * handles all of that correctly and is just as zero-cost.
 *
 * This script is IDEMPOTENT-ish: re-running it creates a fresh batch of
 * researchers/submissions each time rather than erroring on conflict —
 * intentional, so you can re-seed before each demo rehearsal for variety.
 * If you want a clean slate, manually delete old data first via Supabase
 * dashboard or the RESET_DEMO_DATA.sql script included alongside this one.
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_OWNER_EMAIL = process.env.DEMO_ORG_OWNER_EMAIL;

if (!SUPABASE_URL || !SERVICE_KEY || !ORG_OWNER_EMAIL) {
  console.error(
    "Missing required env vars. Need NEXT_PUBLIC_SUPABASE_URL, " +
    "SUPABASE_SERVICE_ROLE_KEY, and DEMO_ORG_OWNER_EMAIL in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ─── Demo data definitions ────────────────────────────────────────────── */

const RESEARCHERS = [
  { full_name: "Alex Chen",       username: "alexc",    reputation: 1240 },
  { full_name: "Priya Sharma",    username: "priyash",  reputation: 980  },
  { full_name: "Marcus Webb",     username: "mwebb",    reputation: 2150 },
  { full_name: "Sofia Reyes",     username: "sofiar",   reputation: 640  },
  { full_name: "Kenji Tanaka",    username: "kenjit",   reputation: 1780 },
  { full_name: "Olivia Brooks",   username: "obrooks",  reputation: 410  },
  { full_name: "Dmitri Volkov",   username: "dvolkov",  reputation: 3020 },
  { full_name: "Amara Okafor",    username: "amarao",   reputation: 870  },
];

const PROGRAMS = [
  {
    name: "Acme Web Application Security Program",
    type: "bug_bounty", status: "active", is_public: true,
    description: "Our flagship web application handles sensitive customer data. We're looking for vulnerabilities across authentication, authorization, and data handling.",
    rules: "Standard safe harbor applies. No DoS testing. No social engineering of staff. Report within 24h of discovery.",
    scope_in:  ["app.acme.com", "api.acme.com", "*.acme.com/api/v2/*"],
    scope_out: ["staging.acme.com", "internal.acme.com"],
    min_reward: 50, max_reward: 10000, avg_response_hours: 48,
  },
  {
    name: "Acme Mobile App VDP",
    type: "vdp", status: "active", is_public: true,
    description: "Vulnerability disclosure program for our iOS and Android applications. Recognition-based, no monetary rewards.",
    rules: "Responsible disclosure required. 90-day disclosure window. No reverse engineering of DRM components.",
    scope_in:  ["com.acme.app (iOS)", "com.acme.app (Android)"],
    scope_out: ["Third-party SDKs"],
    min_reward: null, max_reward: null, avg_response_hours: 72,
  },
  {
    name: "Acme Internal Tools Bug Bounty",
    type: "bug_bounty", status: "active", is_public: true,
    description: "Internal admin and operations tooling. Higher reward tier given the sensitivity of access these tools provide.",
    rules: "Standard safe harbor. Internal tool access via approved test accounts only.",
    scope_in:  ["admin.acme.com", "ops.acme.com"],
    scope_out: [],
    min_reward: 200, max_reward: 25000, avg_response_hours: 24,
  },
  {
    name: "Acme Public API Security Program",
    type: "bug_bounty", status: "draft", is_public: false,
    description: "Pre-launch program for our upcoming public API. Currently in draft while we finalize scope.",
    rules: "TBD — launching Q3.",
    scope_in:  ["api-public.acme.com"],
    scope_out: [],
    min_reward: 100, max_reward: 15000, avg_response_hours: 48,
  },
];

const SEVERITIES = ["critical", "high", "medium", "low", "info"];

const VULN_TEMPLATES = {
  critical: [
    "Unauthenticated remote code execution via deserialization in {loc}",
    "SQL injection in {loc} allows full database exfiltration",
    "Authentication bypass via JWT signature confusion in {loc}",
    "Server-side request forgery leading to internal network access in {loc}",
  ],
  high: [
    "IDOR in {loc} exposes all user PII",
    "Privilege escalation via role parameter tampering in {loc}",
    "Stored XSS in {loc} allows session hijacking",
    "SSRF in {loc} allows internal metadata service access",
  ],
  medium: [
    "CSRF on {loc} allows unauthorized state changes",
    "Reflected XSS in {loc} search parameter",
    "Insecure direct object reference in {loc}",
    "Missing rate limiting on {loc} enables brute force",
  ],
  low: [
    "Username enumeration via timing attack on {loc}",
    "Verbose error messages in {loc} leak stack traces",
    "Missing security headers on {loc}",
    "Self-XSS in {loc} with limited exploitability",
  ],
  info: [
    "Outdated library version disclosed in {loc} response headers",
    "Directory listing enabled on {loc}",
    "Missing SPF record affecting {loc} domain",
    "Verbose server banner on {loc}",
  ],
};

const LOCATIONS = [
  "/api/v2/users", "/api/v2/auth/login", "/api/v2/admin/settings",
  "the password reset flow", "the file upload endpoint", "/api/v2/billing",
  "the GraphQL endpoint", "the OAuth callback handler", "/api/v2/export",
  "the WebSocket connection handler",
];

const STATUS_WEIGHTS = [
  ["new",        8],
  ["triaging",   6],
  ["needs_info", 3],
  ["accepted",   16],
  ["rejected",   8],
  ["duplicate",  6],
  ["resolved",   3],
];

function weightedStatus() {
  const total = STATUS_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [status, weight] of STATUS_WEIGHTS) {
    if (r < weight) return status;
    r -= weight;
  }
  return "new";
}

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function rewardForSeverity(sev) {
  const ranges = { critical: [2000, 10000], high: [500, 2500], medium: [150, 600], low: [50, 200], info: [25, 75] };
  const [min, max] = ranges[sev];
  return Math.round((min + Math.random() * (max - min)) / 10) * 10;
}

/* ─── Main seeding logic ──────────────────────────────────────────────── */

async function main() {
  console.log("🌱 VAULTX Demo Data Seeder\n");

  // 1. Find the org owner (must already exist — see header comment)
  const { data: ownerProfile, error: ownerErr } = await supabase
    .from("profiles")
    .select("id, org_id, role")
    .eq("email", ORG_OWNER_EMAIL)
    .single();

  if (ownerErr || !ownerProfile) {
    console.error(`❌ Could not find profile for ${ORG_OWNER_EMAIL}. Sign up and complete onboarding as an Org first.`);
    process.exit(1);
  }
  if (ownerProfile.role !== "org" || !ownerProfile.org_id) {
    console.error(`❌ ${ORG_OWNER_EMAIL} is not an onboarded org owner. Complete org onboarding first.`);
    process.exit(1);
  }

  const orgId = ownerProfile.org_id;
  const ownerId = ownerProfile.id;
  console.log(`✓ Found org owner: ${ORG_OWNER_EMAIL} (org_id: ${orgId})\n`);

  // 2. Create synthetic researcher accounts
  console.log("Creating researcher accounts...");
  const researcherIds = [];
  for (const r of RESEARCHERS) {
    const email = `demo.${r.username}.${Date.now()}@vaultx-demo.test`;
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: r.full_name },
    });
    if (error) { console.error(`  ✗ Failed to create ${r.full_name}: ${error.message}`); continue; }

    const userId = created.user.id;
    await supabase
      .from("profiles")
      .update({
        role: "researcher",
        username: r.username,
        reputation: r.reputation,
        is_onboarded: true,
        bio: `Security researcher specializing in web application vulnerabilities.`,
      })
      .eq("id", userId);

    researcherIds.push({ id: userId, ...r });
    console.log(`  ✓ ${r.full_name} (@${r.username})`);
  }
  console.log("");

  // 3. Create/upsert programs
  console.log("Creating programs...");
  const programIds = [];
  for (const p of PROGRAMS) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data: program, error } = await supabase
      .from("programs")
      .upsert(
        { org_id: orgId, slug, ...p },
        { onConflict: "org_id,slug" }
      )
      .select("id, type, min_reward, max_reward")
      .single();
    if (error) { console.error(`  ✗ Failed to create program ${p.name}: ${error.message}`); continue; }
    programIds.push(program);
    console.log(`  ✓ ${p.name}`);
  }
  console.log("");

  // 4. Create submissions across programs/researchers
  console.log("Creating submissions...");
  const activeProgramIds = programIds.filter((p) => p.type); // all created
  let submissionCount = 0;
  const acceptedSubmissions = [];

  for (let i = 0; i < 56; i++) {
    const program = randomItem(activeProgramIds);
    const researcher = randomItem(researcherIds);
    const severity = randomItem(SEVERITIES);
    const status = weightedStatus();
    const location = randomItem(LOCATIONS);
    const title = randomItem(VULN_TEMPLATES[severity]).replace("{loc}", location);
    const createdDaysAgo = Math.floor(Math.random() * 60);

    const { data: sub, error } = await supabase
      .from("submissions")
      .insert({
        program_id: program.id,
        researcher_id: researcher.id,
        title,
        description: `During testing, I discovered that ${location} is vulnerable to this issue. Full details and reproduction steps below.`,
        steps_to_reproduce: `1. Navigate to ${location}\n2. Send a crafted request with the payload\n3. Observe the vulnerable behavior\n4. Confirm impact via the proof of concept attached`,
        impact: `This could allow an attacker to compromise ${severity === "critical" || severity === "high" ? "sensitive user data and system integrity" : "limited functionality with reduced risk"}.`,
        severity,
        status,
        ai_severity: Math.random() > 0.15 ? severity : randomItem(SEVERITIES), // mostly agrees with researcher, occasionally differs
        ai_confidence: Math.round((0.55 + Math.random() * 0.43) * 100) / 100,
        ai_analysis: `AI assessment: ${severity} severity based on attack vector analysis and impact scope.`,
        content_hash: randomUUID(),
        attachments: [],
        created_at: daysAgo(createdDaysAgo),
        updated_at: daysAgo(Math.max(0, createdDaysAgo - Math.floor(Math.random() * 5))),
      })
      .select("id, severity, status, researcher_id, program_id")
      .single();

    if (error) { console.error(`  ✗ Submission ${i} failed: ${error.message}`); continue; }
    submissionCount++;
    if (status === "accepted" || status === "resolved") {
      acceptedSubmissions.push({ ...sub, orgId });
    }
  }
  console.log(`  ✓ Created ${submissionCount} submissions\n`);

  // 5. Create rewards for ~70% of accepted submissions
  console.log("Creating rewards...");
  let rewardCount = 0;
  const programTotals = {};

  for (const sub of acceptedSubmissions) {
    if (Math.random() > 0.7) continue; // not every accepted submission has a reward yet — realistic

    const amount = rewardForSeverity(sub.severity);
    const roll = Math.random();
    const status = roll < 0.4 ? "paid" : roll < 0.75 ? "approved" : "pending";

    const { error } = await supabase.from("rewards").insert({
      submission_id: sub.id,
      org_id: sub.orgId,
      researcher_id: sub.researcher_id,
      amount,
      currency: "USD",
      status,
      approved_by: status !== "pending" ? ownerId : null,
      approved_at: status !== "pending" ? daysAgo(Math.floor(Math.random() * 20)) : null,
      paid_at: status === "paid" ? daysAgo(Math.floor(Math.random() * 10)) : null,
      note: status === "paid" ? "Great find — thank you!" : null,
    });

    if (error) { console.error(`  ✗ Reward failed: ${error.message}`); continue; }
    rewardCount++;
    if (status === "paid") {
      programTotals[sub.program_id] = (programTotals[sub.program_id] ?? 0) + amount;
    }
  }
  console.log(`  ✓ Created ${rewardCount} rewards\n`);

  // 6. Update program total_paid (no trigger covers this — see Week 6 notes)
  for (const [programId, total] of Object.entries(programTotals)) {
    await supabase.from("programs").update({ total_paid: total }).eq("id", programId);
  }

  console.log("✅ Demo data seeding complete!\n");
  console.log(`Summary:`);
  console.log(`  Researchers:  ${researcherIds.length}`);
  console.log(`  Programs:     ${programIds.length}`);
  console.log(`  Submissions:  ${submissionCount}`);
  console.log(`  Rewards:      ${rewardCount}`);
  console.log(`\nLog in as ${ORG_OWNER_EMAIL} and your dashboard will be fully populated.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
