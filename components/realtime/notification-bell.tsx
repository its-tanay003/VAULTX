"use client";

import { useEffect, useState, useRef } from "react";
import { createClient }                from "@/lib/supabase/client";
import Link                            from "next/link";
import { Bell, Clock, CheckCircle2, Trophy, AlertTriangle, X } from "lucide-react";
import { formatRelativeTime }          from "@/lib/utils";
import { markNotificationsRead }       from "@/app/actions/notifications";

interface Notification {
  id:         string;
  type:       string;
  title:      string;
  body:       string;
  link:       string | null;
  is_read:    boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  submission_received:    <Bell         className="w-3.5 h-3.5 text-sky-400"     />,
  submission_accepted:    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  submission_rejected:    <X            className="w-3.5 h-3.5 text-red-400"     />,
  submission_duplicate:   <X            className="w-3.5 h-3.5 text-zinc-500"    />,
  submission_needs_info:  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />,
  reward_approved:        <Trophy       className="w-3.5 h-3.5 text-vault-teal"  />,
  reward_paid:            <Trophy       className="w-3.5 h-3.5 text-emerald-400" />,
};

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open,          setOpen]          = useState(false);
  const [loading,       setLoading]       = useState(true);
  const ref                               = useRef<HTMLDivElement>(null);
  const supabase                          = createClient();

  const unread = notifications.filter((n) => !n.is_read).length;

  // Initial load
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications(data ?? []);
      setLoading(false);
    }
    load();
  }, [userId]);

  // Realtime new notifications
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleOpen() {
    setOpen(!open);
    if (!open && unread > 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      markNotificationsRead(userId).catch(console.error);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative text-vault-muted hover:text-vault-text transition-colors p-1"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-vault-teal text-vault-bg text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 vault-card shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-vault-border">
            <h3 className="text-sm font-medium">Notifications</h3>
            <Link
              href="/dashboard/notifications"
              className="text-xs text-vault-teal hover:text-vault-teal/80 transition-colors"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-vault-border/50">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="skeleton w-7 h-7 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-full" />
                      <div className="skeleton h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Bell className="w-6 h-6 text-vault-muted mb-2 opacity-50" />
                <p className="text-sm text-vault-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClose={() => setOpen(false)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification: n,
  onClose,
}: {
  notification: Notification;
  onClose:      () => void;
}) {
  const icon = TYPE_ICONS[n.type] ?? <Clock className="w-3.5 h-3.5 text-vault-muted" />;
  const inner = (
    <div className={`flex gap-3 px-4 py-3 hover:bg-vault-elevated/50 transition-colors ${!n.is_read ? "bg-vault-teal/5" : ""}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        !n.is_read ? "bg-vault-teal/10 border border-vault-teal/20" : "bg-vault-elevated border border-vault-border"
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{n.title}</p>
        <p className="text-xs text-vault-muted mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
        <p className="text-[10px] text-vault-muted mt-1">{formatRelativeTime(n.created_at)}</p>
      </div>
      {!n.is_read && (
        <div className="w-1.5 h-1.5 rounded-full bg-vault-teal shrink-0 mt-2" />
      )}
    </div>
  );

  if (n.link) {
    return (
      <Link href={n.link} onClick={onClose} className="block">
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}
