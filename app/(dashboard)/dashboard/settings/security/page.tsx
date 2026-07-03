"use client";

import { useState, useTransition } from "react";
import { toast }           from "sonner";
import { Loader2, Lock, Shield, Monitor, Eye, EyeOff, QrCode } from "lucide-react";
import { changePassword }  from "@/app/actions/settings";
import { SectionCard, FieldRow, SettingsToggle } from "@/components/settings/section-card";
import { SessionList }     from "@/components/settings/session-list";
import type { ActiveSession } from "@/app/actions/settings";

// Demo sessions (in production, fetched from user_settings.active_sessions)
const DEMO_SESSIONS: ActiveSession[] = [
  {
    id: "current",
    device: "Desktop",
    ip: "192.168.1.1",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125",
    last_seen: new Date().toISOString(),
    is_current: true,
  },
];

export default function SecuritySettingsPage() {
  const [pwPending, startPw]     = useTransition();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [currentPw, setCurrentPw]     = useState("");
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");

  const [twoFA, setTwoFA]             = useState(false);
  const [showQR, setShowQR]           = useState(false);
  const [sessions, setSessions]       = useState<ActiveSession[]>(DEMO_SESSIONS);

  function handleChangePassword() {
    startPw(async () => {
      try {
        const fd = new FormData();
        fd.set("new_password",     newPw);
        fd.set("confirm_password", confirmPw);
        await changePassword(fd);
        toast.success("Password updated");
        setNewPw(""); setConfirmPw(""); setCurrentPw("");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Password change failed");
      }
    });
  }

  function handleToggle2FA(enabled: boolean) {
    if (enabled) {
      setShowQR(true);
      setTwoFA(true);
      toast.success("2FA enabled — scan the QR code with your authenticator app");
    } else {
      setTwoFA(false);
      setShowQR(false);
      toast.success("2FA disabled");
    }
  }

  function handleRevokeSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Session revoked");
  }

  const pwStrength = (() => {
    if (newPw.length === 0) return null;
    if (newPw.length < 8)   return { label: "Weak",   color: "bg-red-500" };
    if (newPw.length < 12 || !/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw))
                            return { label: "Fair",   color: "bg-yellow-500" };
    if (/[^a-zA-Z0-9]/.test(newPw))
                            return { label: "Strong", color: "bg-green-500" };
    return { label: "Good", color: "bg-vault-teal" };
  })();

  return (
    <div className="space-y-5 animate-in">
      <SectionCard title="Change Password" description="Use a strong, unique password">
        <form onSubmit={(e) => { e.preventDefault(); if (newPw.length >= 8 && newPw === confirmPw) handleChangePassword(); }} className="space-y-4">
          {/* Hidden username input for password manager accessibility and form compliance */}
          <input type="text" name="username" autoComplete="username" className="hidden" title="Username" readOnly value="current-user" />
          <div>
            <label className="block text-xs font-medium mb-1.5 text-vault-muted">New password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="vault-input w-full pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-muted hover:text-vault-text"
              >
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {pwStrength && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1 bg-vault-elevated rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pwStrength.color}`}
                    style={{ width: pwStrength.label === "Weak" ? "25%" : pwStrength.label === "Fair" ? "50%" : pwStrength.label === "Good" ? "75%" : "100%" }}
                  />
                </div>
                <span className="text-[10px] text-vault-muted">{pwStrength.label}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-vault-muted">Confirm new password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
              className="vault-input w-full"
            />
            {confirmPw && newPw !== confirmPw && (
              <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={pwPending || newPw.length < 8 || newPw !== confirmPw}
            className="btn-teal flex items-center gap-2 disabled:opacity-40"
          >
            {pwPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
              : <><Lock className="w-4 h-4" /> Update password</>}
          </button>
        </form>
      </SectionCard>

      {/* 2FA */}
      <SectionCard title="Two-Factor Authentication" description="Add an extra layer of security to your account">
        <div className="space-y-4">
          <FieldRow
            label="Authenticator app (TOTP)"
            description="Use Google Authenticator, Authy, or 1Password"
          >
            <SettingsToggle checked={twoFA} onChange={handleToggle2FA} />
          </FieldRow>

          {showQR && (
            <div className="ml-0 p-4 rounded-lg bg-vault-elevated border border-vault-border space-y-3">
              <p className="text-xs text-vault-muted flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" />
                Scan this QR code with your authenticator app
              </p>
              {/* QR placeholder — in production, use `qrcode` library with the TOTP secret */}
              <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center mx-auto">
                <div className="text-center text-xs text-gray-500">
                  <QrCode className="w-16 h-16 mx-auto text-gray-800" />
                  <p className="mt-1">TOTP QR Code</p>
                </div>
              </div>
              <p className="text-xs text-vault-muted text-center">
                Manual key: <code className="font-mono bg-vault-surface px-1.5 py-0.5 rounded">JBSWY3DPEHPK3PXP</code>
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Sessions */}
      <SectionCard title="Active Sessions" description="Devices currently signed in to your account">
        <SessionList sessions={sessions} onRevoke={handleRevokeSession} />
        {sessions.filter((s) => !s.is_current).length > 0 && (
          <button
            onClick={() => setSessions(sessions.filter((s) => s.is_current))}
            className="mt-4 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Revoke all other sessions
          </button>
        )}
      </SectionCard>
    </div>
  );
}
