"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPostHogServerClient } from "@/lib/posthog-server";
import { isPro } from "@/lib/pro";
import { stripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";

// ponytail: live price ids inline, env override for test mode. Same call the
// old hardcoded payment links made — price ids are not secrets.
//
// monthly is a recurring subscription: Stripe drives expiry via
// customer.subscription.deleted. semester is a ONE-TIME charge, so no
// subscription exists and nothing revokes Pro on its own — the webhook stamps
// pro_until and a nightly pg_cron job flips is_pro off once it lapses.
const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY ?? "price_1Tq3OeIKoFZaqPVsqyJtUpFU",
  semester: process.env.STRIPE_PRICE_SEMESTER ?? "price_1Tr8OTIKoFZaqPVsVIo2Z35s",
} as const;

const MODES = { monthly: "subscription", semester: "payment" } as const;

type Plan = keyof typeof PRICES;

const isPlan = (v: FormDataEntryValue | null): v is Plan =>
  v === "monthly" || v === "semester";

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

// Creates a Stripe Checkout Session for the signed-in user.
//
// The subscriber identity (client_reference_id + metadata.supabase_id) is bound
// here, from the server session. It is never carried in a URL the browser can
// edit, so a checkout can only ever be attributed to the account that started it.
// The webhook re-checks that both markers agree before granting Pro.
export async function startCheckout(formData: FormData) {
  const plan = formData.get("plan");
  if (!isPlan(plan)) redirect("/pro");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro, stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");
  if (isPro(profile)) redirect("/pro");

  const session = await stripe.checkout.sessions.create({
    mode: MODES[plan],
    line_items: [{ price: PRICES[plan], quantity: 1 }],
    client_reference_id: user.id,
    metadata: { supabase_id: user.id, plan },
    // Subscriptions only: mirrored onto the subscription so later subscription.*
    // events can be attributed even before the checkout row lands. Stripe
    // rejects subscription_data on a one-time payment session.
    ...(plan === "monthly"
      ? { subscription_data: { metadata: { supabase_id: user.id } } }
      : {}),
    ...(profile.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : { customer_email: user.email }),
    success_url: `${SITE_URL}/pro?upgraded=1`,
    cancel_url: `${SITE_URL}/pro`,
  });

  const posthog = getPostHogServerClient();
  posthog?.capture({
    distinctId: user.id,
    event: "stripe_checkout_started",
    properties: { billing_provider: "stripe", plan },
  });

  if (!session.url) redirect("/pro");
  redirect(session.url);
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
