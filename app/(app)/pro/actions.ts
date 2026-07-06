"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { stripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";

// Sets the signed-in user's wants_pro flag. Session client under RLS — no
// service_role, no billing (v1.1 wires Stripe on top of this flag).
export async function joinProWaitlist() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ wants_pro: true }).eq("id", user.id);

  const posthog = getPostHogServerClient();
  posthog?.capture({
    distinctId: user.id,
    event: "pro_waitlist_joined",
    properties: {
      source: "pro_page",
    },
  });

  revalidatePath("/pro");
}

// Opens the Stripe Customer Portal for the signed-in user's existing subscription.
export async function openBillingPortal() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) redirect("/pro");

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${SITE_URL}/pro`,
  });

  const posthog = getPostHogServerClient();
  posthog?.capture({
    distinctId: user.id,
    event: "billing_portal_opened",
    properties: {
      billing_provider: "stripe",
    },
  });

  redirect(session.url);
}
