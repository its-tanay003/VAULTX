"use client";

import { Monitor, Smartphone, Globe, Trash2 } from "lucide-react";
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
import type { ActiveSession } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

interface SessionListProps {
  sessions: ActiveSession[];
  onRevoke: (sessionId: string) => void;
}

function getDeviceIcon(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return Smartphone;
  }
  if (ua.includes("bot") || ua.includes("curl") || ua.includes("postman")) {
    return Globe;
  }
  return Monitor;
}

function parseDevice(userAgent: string): string {
  if (/iphone/i.test(userAgent))   return "iPhone";
  if (/ipad/i.test(userAgent))     return "iPad";
  if (/android/i.test(userAgent))  return "Android";
  if (/windows/i.test(userAgent))  return "Windows";
  if (/macintosh/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent))    return "Linux";
  return "Unknown device";
}

function parseBrowser(userAgent: string): string {
  if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent))  return "Chrome";
  if (/firefox/i.test(userAgent))   return "Firefox";
  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return "Safari";
  if (/edge/i.test(userAgent))      return "Edge";
  return "Browser";
}

export function SessionList({ sessions, onRevoke }: SessionListProps) {
  if (sessions.length === 0) {
    return <p className="text-sm text-vault-muted">No active sessions found.</p>;
  }

  return (
    <div className="divide-y divide-vault-border/50">
      {sessions.map((session) => {
        const DeviceIcon = getDeviceIcon(session.user_agent);
        const device  = parseDevice(session.user_agent);
        const browser = parseBrowser(session.user_agent);

        return (
          <div
            key={session.id}
            className={cn(
              "flex items-center gap-3 py-3 first:pt-0 last:pb-0",
              session.is_current && "opacity-100"
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0",
              session.is_current
                ? "bg-vault-teal/10 border-vault-teal/30 text-vault-teal"
                : "bg-vault-elevated border-vault-border text-vault-muted"
            )}>
              <DeviceIcon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {device} · {browser}
                </p>
                {session.is_current && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-vault-teal/10 text-vault-teal border border-vault-teal/20">
                    Current
                  </span>
                )}
              </div>
              <p className="text-xs text-vault-muted">
                {session.ip} · Last active {timeAgo(session.last_seen)}
              </p>
            </div>

            {!session.is_current && (
              <button
                onClick={() => onRevoke(session.id)}
                className="p-1.5 rounded hover:bg-red-500/10 text-vault-muted hover:text-red-400 transition-colors"
                title="Revoke session"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
