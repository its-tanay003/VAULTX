"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient }   from "@/lib/supabase/client";
import { updateProfile }  from "@/app/actions/profile";
import { useRouter }      from "next/navigation";
import { toast }          from "sonner";
import { Loader2, Save, Github, Twitter, Globe, Camera } from "lucide-react";
import { SectionCard } from "@/components/settings/section-card";
import type { Metadata } from "next";

export default function ProfileSettingsPage() {
  const router   = useRouter();
  const supabase = createClient();
  const [pending, start] = useTransition();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio,      setBio]      = useState("");
  const [website,  setWebsite]  = useState("");
  const [twitter,  setTwitter]  = useState("");
  const [github,   setGithub]   = useState("");
  const [email,    setEmail]    = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setFullName(data.full_name ?? "");
        setUsername(data.username ?? "");
        setBio(data.bio ?? "");
        setWebsite(data.website ?? "");
        setTwitter(data.twitter ?? "");
        setGithub(data.github ?? "");
        setAvatarUrl(data.avatar_url ?? null);
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleSave() {
    start(async () => {
      try {
        let newAvatarUrl = avatarUrl;

        // Upload avatar if changed
        if (avatarFile && userId) {
          const ext  = avatarFile.name.split(".").pop();
          const path = `${userId}/avatar.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("avatars")
            .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
          if (uploadErr) throw new Error(uploadErr.message);

          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          newAvatarUrl = urlData.publicUrl;
        }

        const fd = new FormData();
        fd.set("full_name",  fullName);
        fd.set("username",   username);
        fd.set("bio",        bio);
        fd.set("website",    website);
        fd.set("twitter",    twitter);
        fd.set("github",     github);
        if (newAvatarUrl) fd.set("avatar_url", newAvatarUrl);
        await updateProfile(fd);
        toast.success("Profile updated");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to update profile");
      }
    });
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-in">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    );
  }

  const initials = (fullName || email || "U")[0].toUpperCase();

  return (
    <div className="space-y-5 animate-in">
      {/* Avatar */}
      <SectionCard title="Profile Photo" description="Shown on your public profile and leaderboard">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-vault-teal/20 border-2 border-vault-teal/30 flex items-center justify-center text-vault-teal text-xl font-semibold overflow-hidden">
              {(avatarPreview || avatarUrl)
                ? <img src={avatarPreview ?? avatarUrl ?? ""} alt="Avatar" className="w-full h-full object-cover" />
                : initials}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-vault-teal border-2 border-vault-surface flex items-center justify-center cursor-pointer hover:bg-vault-teal/80 transition-colors"
            >
              <Camera className="w-3 h-3 text-white" />
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium">{fullName || "No name set"}</p>
            <p className="text-xs text-vault-muted">{email}</p>
            {avatarFile && (
              <p className="text-xs text-vault-teal mt-1">{avatarFile.name} ready to upload</p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Identity */}
      <SectionCard title="Public Identity" description="Visible on your profile page and leaderboard">
        <div className="space-y-4">
          <Field label="Full name">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="vault-input w-full" placeholder="Jane Smith" />
          </Field>

          <Field label="Username" hint="Leaderboard handle — letters, numbers, _ and - only">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-vault-muted">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                className="vault-input pl-7 w-full"
                placeholder="janesmith"
              />
            </div>
          </Field>

          <Field label="Bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="vault-input resize-none w-full"
              placeholder="Security researcher focused on web application vulnerabilities…"
            />
          </Field>
        </div>
      </SectionCard>

      {/* Links */}
      <SectionCard title="Social Links" description="Add links shown on your public profile">
        <div className="space-y-4">
          <Field label="Website">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" />
              <input value={website} onChange={(e) => setWebsite(e.target.value)} className="vault-input pl-8 w-full" placeholder="https://yoursite.com" />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="GitHub">
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" />
                <input value={github} onChange={(e) => setGithub(e.target.value)} className="vault-input pl-8 w-full" placeholder="username" />
              </div>
            </Field>
            <Field label="Twitter / X">
              <div className="relative">
                <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" />
                <input value={twitter} onChange={(e) => setTwitter(e.target.value)} className="vault-input pl-8 w-full" placeholder="username" />
              </div>
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={pending}
          className="btn-teal flex items-center gap-2 disabled:opacity-40"
        >
          {pending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><Save className="w-4 h-4" /> Save changes</>}
        </button>
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
