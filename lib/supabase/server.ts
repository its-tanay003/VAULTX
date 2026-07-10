import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export function createClient(): SupabaseClient<Database, "public", any> {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
      cookies: {
        async getAll() { 
          const store = await cookies();
          return store.getAll(); 
        },
        async setAll(cookiesToSet: any[]) {
          try {
            const store = await cookies();
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          } catch {
            // Server Component — can't set cookies here, middleware handles refresh
          }
        },
      },
    }
  ) as any;
}

