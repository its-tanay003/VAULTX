import { createClient }  from "@/lib/supabase/server";
import { redirect }       from "next/navigation";
import Link                from "next/link";
import { getUserSettings } from "@/app/actions/settings";
import { ApiKeyTable }    from "@/components/settings/api-key-table";
import { SectionCard }    from "@/components/settings/section-card";
import { Key, BookOpen }  from "lucide-react";

export default async function ApiKeysPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let settings;
  try {
    settings = await getUserSettings();
  } catch {
    settings = { api_keys: [] };
  }

  return (
    <div className="space-y-5 animate-in">
      <SectionCard
        title="API Keys"
        description="Manage personal API keys for programmatic access to VaultX"
      >
        <div className="mb-4 p-3 rounded-lg bg-vault-elevated/50 border border-vault-border">
          <div className="flex items-start gap-2">
            <Key className="w-4 h-4 text-vault-muted mt-0.5 shrink-0" />
            <div className="text-xs text-vault-muted space-y-1">
              <p>Use API keys to authenticate requests from CI/CD pipelines, scripts, or external tools.</p>
              <p>Keys are shown only once on creation — store them securely. Maximum 10 keys per account.</p>
              <p>Include the key in requests as: <code className="font-mono bg-vault-surface px-1 py-0.5 rounded">Authorization: Bearer vx_...</code></p>
              <Link href="/docs/api" className="inline-flex items-center gap-1.5 text-vault-teal hover:underline pt-1">
                <BookOpen className="w-3.5 h-3.5" /> Full API documentation
              </Link>
            </div>
          </div>
        </div>

        <ApiKeyTable initialKeys={(settings as { api_keys: any[] }).api_keys ?? []} />
      </SectionCard>
    </div>
  );
}
