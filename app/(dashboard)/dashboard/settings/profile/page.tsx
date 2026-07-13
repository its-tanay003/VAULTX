import { useEffect, useState, useTransition } from "react";
import { createClient }   from "@/lib/supabase/client";
import { updateProfile, updateProfilePreferences }  from "@/app/actions/profile";
import { useRouter }      from "next/navigation";
import { toast }          from "sonner";
import { Loader2, Save, Globe, Camera } from "lucide-react";
import { SectionCard, FieldRow, SettingsToggle } from "@/components/settings/section-card";
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

  // Preference states
  const [themePreference, setThemePreference] = useState<"light" | "dark" | "system">("system");
  const [language, setLanguage] = useState("en");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [responseStyle, setResponseStyle] = useState<"concise" | "detailed">("concise");

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

        setThemePreference(data.theme_preference || "system");
        setLanguage(data.language || "en");
        setReducedMotion(data.reduced_motion || false);
        setHighContrast(data.high_contrast || false);
        setResponseStyle(data.vault_response_style || "concise");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handlePreferenceChange(key: string, value: any) {
    try {
      if (key === "theme_preference") setThemePreference(value);
      if (key === "language") setLanguage(value);
      if (key === "reduced_motion") setReducedMotion(value);
      if (key === "high_contrast") setHighContrast(value);
      if (key === "vault_response_style") setResponseStyle(value);

      await updateProfilePreferences({ [key]: value });
      toast.success("Preferences updated");

      // For theme preference, force reload or tell user it requires a refresh
      if (key === "theme_preference" || key === "reduced_motion" || key === "high_contrast") {
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update preference");
    }
  }

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
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.44 22 12.017 22 6.484 17.522 2 12 2z"/>
                </svg>
                <input value={github} onChange={(e) => setGithub(e.target.value)} className="vault-input pl-8 w-full" placeholder="username" />
              </div>
            </Field>
            <Field label="Twitter / X">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vault-muted" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <input value={twitter} onChange={(e) => setTwitter(e.target.value)} className="vault-input pl-8 w-full" placeholder="username" />
              </div>
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* Preferences */}
      <SectionCard title="Preferences & Accessibility" description="Customize your interface theme, language, and accessibility options">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-vault-muted">Interface Theme</label>
              <select
                value={themePreference}
                onChange={(e) => handlePreferenceChange("theme_preference", e.target.value)}
                className="vault-select w-full"
              >
                <option value="system">System Default</option>
                <option value="dark">Dark Theme</option>
                <option value="light">Light Theme</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-vault-muted">Language</label>
              <select
                value={language}
                onChange={(e) => handlePreferenceChange("language", e.target.value)}
                className="vault-select w-full"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>

          <FieldRow label="Reduced motion" description="Disable animations and transition effects throughout the platform">
            <SettingsToggle checked={reducedMotion} onChange={(val) => handlePreferenceChange("reduced_motion", val)} />
          </FieldRow>

          <FieldRow label="High contrast" description="Increase color contrast of borders and texts for better readability">
            <SettingsToggle checked={highContrast} onChange={(val) => handlePreferenceChange("high_contrast", val)} />
          </FieldRow>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-vault-muted">VAULT AI Response Style</label>
            <select
              value={responseStyle}
              onChange={(e) => handlePreferenceChange("vault_response_style", e.target.value)}
              className="vault-select w-full"
            >
              <option value="concise">Concise & Direct (Brief answers)</option>
              <option value="detailed">Detailed & Analytical (Full context/explanations)</option>
            </select>
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
