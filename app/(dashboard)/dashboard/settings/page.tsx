import { redirect } from "next/navigation";

// Redirect /dashboard/settings → /dashboard/settings/profile
export default function SettingsIndexPage() {
  redirect("/dashboard/settings/profile");
}
