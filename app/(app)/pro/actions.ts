"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  revalidatePath("/pro");
}

const PRICE_BY_PLAN = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  semester: process.env.STRIPE_PRICE_SEMESTER,
} as const;

// Starts a Stripe Checkout session for the signed-in user. Writes nothing to
// profiles — the webhook (service_role) sets stripe_customer_id/is_pro/pro_until
// once Stripe confirms payment.
export async function startCheckout(plan: "monthly" | "semester") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const price = PRICE_BY_PLAN[plan];
  if (!price) throw new Error(`Missing Stripe price env var for plan: ${plan}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    ...(profile?.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : { customer_email: user.email }),
    subscription_data: { metadata: { supabase_id: user.id } },
    metadata: { supabase_id: user.id },
    success_url: `${SITE_URL}/pro?upgraded=1`,
    cancel_url: `${SITE_URL}/pro`,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
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

  redirect(session.url);
}
