/**
 * Loading states for all modules built in Weeks 10-14.
 * These routes were never given loading.tsx files, causing blank
 * white flashes on navigation. Each one is a drop-in file.
 *
 * HOW TO USE: copy each block into the corresponding loading.tsx
 * path alongside that route's page.tsx.
 */

import {
  SkeletonPageHeader, SkeletonList, SkeletonStatGrid,
  SkeletonCard, SkeletonDetail,
} from "@/components/skeletons/skeleton-primitives";

/* ─── WEEK 10: PTaaS ──────────────────────────────────────────────────────── */

// app/(dashboard)/dashboard/ptaas/loading.tsx
export function PTaaSLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <SkeletonList count={3} />
    </div>
  );
}

// app/(dashboard)/dashboard/ptaas/[id]/loading.tsx
export function PTaaSDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={5} />
          <SkeletonCard lines={4} />
        </div>
        <div className="space-y-4">
          <SkeletonCard lines={2} />
        </div>
      </div>
    </div>
  );
}

/* ─── WEEK 11: AI Red Team ────────────────────────────────────────────────── */

// app/(dashboard)/dashboard/ai-red-team/loading.tsx
export function AIRedTeamLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="vault-card p-4">
        <div className="skeleton h-3.5 w-full mb-2" />
        <div className="skeleton h-3.5 w-3/4" />
      </div>
      <SkeletonList count={3} />
    </div>
  );
}

// app/(dashboard)/dashboard/ai-red-team/[id]/loading.tsx
export function AIRedTeamDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="vault-card p-5">
        <div className="skeleton h-3 w-28 mb-3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 mb-3">
            <div className="skeleton w-5 h-5 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
      <SkeletonList count={3} />
    </div>
  );
}

/* ─── WEEK 12: Code Quality (updated detail) ─────────────────────────────── */
// Already had loading.tsx — no change needed.

/* ─── WEEK 13: CTF ────────────────────────────────────────────────────────── */

// app/(dashboard)/dashboard/ctf/loading.tsx
export function CTFLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <SkeletonList count={4} />
    </div>
  );
}

// app/(dashboard)/dashboard/ctf/[id]/loading.tsx
export function CTFManageLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <SkeletonStatGrid count={3} />
      <SkeletonCard lines={6} />
    </div>
  );
}

// app/(dashboard)/dashboard/ctf/[id]/play/loading.tsx
export function CTFPlayLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="vault-card p-4 flex items-center gap-3">
              <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-1/2" />
                <div className="skeleton h-3 w-1/3" />
              </div>
              <div className="skeleton h-8 w-12" />
            </div>
          ))}
        </div>
        <div className="vault-card p-4">
          <div className="skeleton h-4 w-28 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2 mb-2">
              <div className="skeleton w-5 h-4" />
              <div className="skeleton w-6 h-6 rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-2.5 w-16" />
              </div>
              <div className="skeleton h-3.5 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── WEEK 14: Audit Contests ─────────────────────────────────────────────── */

// app/(dashboard)/dashboard/contests/loading.tsx
export function ContestsLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <SkeletonList count={4} />
    </div>
  );
}

// app/(dashboard)/dashboard/contests/[id]/loading.tsx
export function ContestDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <SkeletonStatGrid count={5} />
      <SkeletonCard lines={6} />
    </div>
  );
}

// app/(dashboard)/dashboard/contests/[id]/judge/loading.tsx
export function ContestJudgeLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SkeletonPageHeader />
      <div className="vault-card p-4">
        <div className="skeleton h-4 w-48 mb-2" />
        <div className="skeleton h-3.5 w-72" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="vault-card p-5 space-y-3">
          <div className="flex gap-3">
            <div className="skeleton h-5 w-14 rounded" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/4" />
            </div>
          </div>
          <div className="skeleton h-16 w-full" />
          <div className="flex gap-2">
            <div className="skeleton flex-1 h-9 rounded-lg" />
            <div className="skeleton flex-1 h-9 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
