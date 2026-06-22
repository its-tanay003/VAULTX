/* ════════════════════════════════════════════════════════════════════════
   MICRO-PATCH — components/layout/mobile-sidebar.tsx
   ════════════════════════════════════════════════════════════════════════

   For consistency with the desktop Sidebar update this week, change the
   STUB_MODULES array and its render block in mobile-sidebar.tsx (from
   Week 7) as follows:

   1. Replace the STUB_MODULES constant:

      const STUB_MODULES = [
        { href: "/dashboard/ptaas",       icon: Shield, label: "PTaaS" },
        { href: "/dashboard/ai-red-team", icon: Zap,    label: "AI Red Team" },
      ];

   2. Replace the render block that currently maps STUB_MODULES as plain
      <div>s with real <Link>s that also close the drawer on tap:

      {STUB_MODULES.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            isActive(href)
              ? "text-vault-teal bg-vault-teal-faint border border-vault-border"
              : "text-vault-muted hover:text-vault-text hover:bg-vault-elevated"
          )}
        >
          <Icon className="w-4.5 h-4.5 shrink-0" /> {label}
        </Link>
      ))}

   That's the only change needed — same reasoning as the desktop sidebar:
   stub pages should be one tap away, not dead-end placeholders.
*/
