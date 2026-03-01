import type { User } from "@supabase/supabase-js";

/**
 * Derives which auth methods the user has from Supabase app_metadata.providers.
 */
export function getUserAuthMethods(user: User | null | undefined) {
  const providers = user?.app_metadata?.providers ?? [];
  const hasPassword = providers.includes("email");
  const hasGoogle = providers.includes("google");
  return {
    hasPassword,
    hasGoogle,
    isGoogleOnly: hasGoogle && !hasPassword,
    isPasswordOnly: hasPassword && !hasGoogle,
  };
}
