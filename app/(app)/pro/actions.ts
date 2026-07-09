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

// L7: the /pro page hides the checkout/portal buttons when billing is off, but the
// Server Actions are POST endpoints reachable without the page. Re-check the flag
// here so a crafted POST can't spin up a real Stripe session while billing is
// nominally disabled. Same env value both layers read; now the name is honest.
const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";

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
  if (!BILLING_ENABLED) redirect("/pro");

  const plan = formData.get("plan");
  if (!isPlan(plan)) redirect("/pro");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro, pro_until, stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");
  if (isPro(profile)) redirect("/pro");

  const session = await stripe.checkout.sessions.create({
    mode: MODES[plan],
    line_items: [{ price: PRICES[plan], quantity: 1 }],
    // The retired Payment Links had this on; Checkout Sessions default it off.
    // Without it there is no "Add promotion code" field at all.
    allow_promotion_codes: true,
    // Restored from the retired Payment Links, which had all three on. Checkout
    // Sessions default them off, so they were dropped by accident in ae9365e.
    automatic_tax: { enabled: true },
    phone_number_collection: { enabled: true },
    name_collection: { individual: { enabled: true } },
    client_reference_id: user.id,
    metadata: { supabase_id: user.id, plan },
    // Subscriptions only. Two things here:
    //  - subscription_data mirrors supabase_id so later subscription.* events
    //    are attributable even before the checkout row lands. Stripe rejects
    //    subscription_data on a one-time payment session.
    //  - payment_method_collection: "if_required" skips card entry entirely when
    //    a promotion code takes the total to $0. Stripe only accepts it in
    //    subscription mode; a payment-mode session with a $0 total already
    //    collects nothing, so both plans get the behavior.
    ...(plan === "monthly"
      ? {
          subscription_data: { metadata: { supabase_id: user.id } },
          payment_method_collection: "if_required" as const,
        }
      : {}),
    // automatic_tax needs an address on the customer. When we pass an existing
    // customer, Stripe requires explicit permission to write the one collected
    // at checkout back onto it, or the session errors.
    ...(profile.stripe_customer_id
      ? {
          customer: profile.stripe_customer_id,
          customer_update: { address: "auto" as const, name: "auto" as const },
        }
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
  if (!BILLING_ENABLED) redirect("/pro");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, pro_source")
    .eq("id", user.id)
    .single();

  // A one-time semester buyer may still carry a customer id from an earlier
  // subscription. The portal would open on past receipts with nothing to manage,
  // so only an actual subscriber gets in — the page hides the button, this is the
  // server-side half of the same rule.
  if (!profile?.stripe_customer_id || profile.pro_source !== "subscription") redirect("/pro");

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
