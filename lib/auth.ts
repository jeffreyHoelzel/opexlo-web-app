import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export async function redirectIfAuthenticated() {
  if (!hasEnvVars) {
    return;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/app/today");
  }
}

export async function requireUserClaims() {
  if (!hasEnvVars) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  return data.claims;
}
