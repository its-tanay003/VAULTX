"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient }   from "@/lib/supabase/client";
import { updateProfile }  from "@/app/actions/profile";
import { useRouter }      from "next/navigation";
import { toast }          from "sonner";
import Link                from "next/link";
import { ChevronLeft, Loader2, Save, Github, Twitter, Globe } from "lucide-react";

export default function ProfileSettingsPage() {
  const router   = useRouter();
  const supabase = createClient();
  const [pending, start] = useTransition();
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio,      setBio]      = useState("");
  const [website,  setWebsite]  = useState("");
  const [twitter,  setTwitter]  = useState("");
  const [github,   setGithub]   = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setFullName(data.full_name ?? "");
        setUsername(data.username ?? "");
        setBio(data.bio ?? "");
        setWebsite(data.website ?? "");
        setTwitter(data.twitter ?? "");
        setGithub(data.github ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleSave() {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("full_name", fullName);
        fd.set("username",  username);
        fd.set("bio",       bio);
        fd.set("website",   website);
        fd.set("twitter",   twitter);
        fd.set("github",    github);
        await updateProfile(fd);
        toast.success("Profile updated");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to update profile");
      }
    });
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-4 animate-in">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="text-vault-muted hover:text-vault-text transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Profile</h1>
          <p className="text-sm text-vault-muted">Public information visible on your profile</p>
        </div>
      </div>

      <div className="vault-card p-6 space-y-4">
        <Field label="Full name">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="vault-input" placeholder="Jane Smith" />
        </Field>

        <Field label="Username" hint="Shown on leaderboards and public profile">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-vault-muted">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              className="vault-input pl-7"
              placeholder="janesmith"
            />
          </div>
        </Field>

        <Field label="Bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="vault-input resize-none"
            placeholder="Security researcher focused on web application vulnerabilities..."
          />
        </Field>

        <Field label="Website">
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" />
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className="vault-input pl-8" placeholder="https://yoursite.com" />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="GitHub">
            <div className="relative">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" />
              <input value={github} onChange={(e) => setGithub(e.target.value)} className="vault-input pl-8" placeholder="username" />
            </div>
          </Field>
          <Field label="Twitter">
            <div className="relative">
              <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" />
              <input value={twitter} onChange={(e) => setTwitter(e.target.value)} className="vault-input pl-8" placeholder="username" />
            </div>
          </Field>
        </div>

        <div className="pt-3 border-t border-vault-border">
          <button
            onClick={handleSave}
            disabled={pending}
            className="btn-teal w-full flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {pending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save profile</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
        {hint && <span className="font-normal text-vault-muted ml-1.5 text-xs">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
