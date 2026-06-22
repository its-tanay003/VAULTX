import { createClient }   from "@/lib/supabase/server";
import { redirect }        from "next/navigation";
import {
  Bell, CheckCheck, Trash2, Clock,
  CheckCircle2, Trophy, AlertTriangle, X,
} from "lucide-react";
import Link                from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { markNotificationsRead } from "@/app/actions/notifications";
import type { Metadata }  from "next";

export const metadata: Metadata = { title: "Notifications" };

const TYPE_STYLES: Record<string, { icon: React.ReactNode; dot: string }> = {
  submission_received:   { icon: <Bell          className="w-4 h-4 text-sky-400"     />, dot: "bg-sky-400"     },
  submission_accepted:   { icon: <CheckCircle2  className="w-4 h-4 text-emerald-400" />, dot: "bg-emerald-400" },
  submission_rejected:   { icon: <X             className="w-4 h-4 text-red-400"     />, dot: "bg-red-400"     },
  submission_duplicate:  { icon: <X             className="w-4 h-4 text-zinc-500"    />, dot: "bg-zinc-500"    },
  submission_needs_info: { icon: <AlertTriangle className="w-4 h-4 text-yellow-400"  />, dot: "bg-yellow-400"  },
  submission_resolved:   { icon: <CheckCircle2  className="w-4 h-4 text-teal-400"    />, dot: "bg-teal-400"    },
  reward_approved:       { icon: <Trophy        className="w-4 h-4 text-vault-teal"  />, dot: "bg-vault-teal"  },
  reward_paid:           { icon: <Trophy        className="w-4 h-4 text-emerald-400" />, dot: "bg-emerald-400" },
};

export default async function NotificationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items   = notifications ?? [];
  const unread  = items.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <p className="text-sm text-vault-muted mt-0.5">
            {unread > 0
              ? <><span className="text-vault-teal font-medium">{unread} unread</span> · {items.length} total</>
              : `${items.length} notification${items.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {unread > 0 && (
          <form action={async () => {
            "use server";
            await markNotificationsRead(user.id);
          }}>
            <button
              type="submit"
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          </form>
        )}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="vault-card flex flex-col items-center justify-center py-20 text-center">
          <Bell className="w-8 h-8 text-vault-muted mb-3 opacity-50" />
          <p className="font-medium mb-1">No notifications</p>
          <p className="text-sm text-vault-muted">
            We'll notify you when something needs your attention
          </p>
        </div>
      ) : (
        <div className="vault-card divide-y divide-vault-border">
          {items.map((n) => {
            const style = TYPE_STYLES[n.type] ?? {
              icon: <Clock className="w-4 h-4 text-vault-muted" />,
              dot:  "bg-zinc-500",
            };

            const inner = (
              <div className={`flex items-start gap-4 p-4 hover:bg-vault-elevated/50 transition-colors group ${
                !n.is_read ? "bg-vault-teal/[0.03]" : ""
              }`}>
                {/* Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                  !n.is_read
                    ? "bg-vault-teal/10 border-vault-teal/20"
                    : "bg-vault-elevated border-vault-border"
                }`}>
                  {style.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium leading-snug ${
                      !n.is_read ? "text-vault-text" : "text-vault-subtle"
                    }`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.is_read && (
                        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      )}
                      <span className="text-[11px] text-vault-muted whitespace-nowrap">
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-vault-muted mt-0.5 leading-relaxed">{n.body}</p>
                </div>
              </div>
            );

            return n.link ? (
              <Link key={n.id} href={n.link} className="block">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}

      {/* Preferences link */}
      <p className="text-center text-xs text-vault-muted">
        <Link href="/dashboard/settings/notifications" className="text-vault-teal hover:underline">
          Manage notification preferences
        </Link>
      </p>
    </div>
  );
}
