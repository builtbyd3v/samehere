import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPostHogServerClient } from "@/lib/posthog-server";

// Stripe webhook — unauthenticated by design (Stripe calls this, not a user
// session), signature-verified below. proxy.ts allowlists this exact path.
// service_role (admin client) is the only writer of is_pro/pro_until/stripe_customer_id.

// Length of a "semester" of Pro granted by the one-time purchase. Must stay in
// step with the copy on /pro and the semester price's term_months metadata.
const SEMESTER_MONTHS = 6;

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  if (!item) return null;
  return new Date(item.current_period_end * 1000).toISOString();
}

async function applySubscriptionState(
  customerId: string,
  eventCreated: number,
  winsTie: boolean,
  fields: { is_pro: boolean; pro_until: string | null }
) {
  const admin = createAdminClient();
  const eventTs = new Date(eventCreated * 1000).toISOString();
  // `stripe_customer_id` is uniquely indexed, so this matches at most one row.
  // Zero rows is normal: subscription.* can arrive before checkout.session.completed
  // has stamped the customer id onto the profile.
  //
  // pro_source guard: a user who cancelled a subscription and later bought the
  // one-time semester still carries that customer id. A late or replayed event
  // from the dead subscription would otherwise overwrite the term they paid for.
  //
  // Ordering guard (M1): stamp event.created as a high-water mark and apply only
  // when this event is not older than the last one applied to the row. Stripe does
  // not guarantee delivery order, so a stale updated(active) after a deleted must
  // NOT re-grant Pro. Single atomic UPDATE — WHERE guard and stamp together, no race.
  //
  // ONE-SECOND-GRANULARITY TRAP: event.created is UNIX SECONDS. On a cancellation
  // Stripe emits subscription.updated AND subscription.deleted in the SAME second,
  // so their timestamps are identical and cannot self-order. Tie-break by semantics:
  // at equal timestamp, DELETED (revoke) must beat UPDATED (grant). So deleted uses
  // `lte` (applies at equal ts) and grants use `lt` (won't overwrite a same-second
  // deleted). DO NOT unify these two operators — that drops the revocation, and a
  // pro_source='subscription' row is deliberately skipped by expire_lapsed_pro, so
  // dropped = Pro forever (this is exactly the H3 shape M1 exists to prevent).
  const op = winsTie ? "lte" : "lt";
  await admin
    .from("profiles")
    .update({ ...fields, last_subscription_event_at: eventTs })
    .eq("stripe_customer_id", customerId)
    .eq("pro_source", "subscription")
    .or(`last_subscription_event_at.is.null,last_subscription_event_at.${op}."${eventTs}"`);
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Idempotency (M1): claim the event id before any state change. A conflict means
  // this exact event was already processed — return 200 (NOT 4xx, or Stripe retries
  // it forever). The insert commits in its own statement, so if a handler below
  // THROWS after this point the retry will hit the dedupe row and no-op — the event
  // is effectively dropped. That is acceptable: Stripe alerts on failed (non-2xx)
  // deliveries and any event is replayable from the dashboard, the post-dedupe work
  // is one or two DB writes, and the alternative (claim the id only after success)
  // reopens the concurrent double-processing race this table exists to close.
  const dedupe = createAdminClient();
  const { error: dedupeErr } = await dedupe
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (dedupeErr) {
    // 23505 = unique_violation = already processed. Anything else is a real DB
    // failure and SHOULD 500 so Stripe retries.
    if (dedupeErr.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: dedupeErr.message }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const supabaseId = session.client_reference_id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!supabaseId) break;

        // Only sessions created by `startCheckout` carry BOTH markers, set from
        // the server session. A hosted Payment Link can only ever set
        // client_reference_id (a URL query param the buyer controls), never
        // metadata — so a mismatch means the id was not bound by us. Refuse it
        // rather than grant Pro on a browser-supplied account id.
        if (session.metadata?.supabase_id !== supabaseId) {
          return NextResponse.json({ error: "Unverified session subject" }, { status: 400 });
        }

        // Ignore anything not settled. "no_payment_required" is a SUCCESS state:
        // a 100%-off promotion code brings the total to zero, so Stripe collects
        // nothing and never reports "paid". Treating it as unpaid would silently
        // withhold Pro from a valid free checkout. Unsettled async payment
        // methods land on checkout.session.async_payment_succeeded, which we
        // don't handle, so they correctly grant nothing here.
        if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
          break;
        }

        const admin = createAdminClient();

        // One-time semester purchase: no subscription exists, so Stripe will
        // never tell us it lapsed. Stamp a fixed term and record pro_source, which
        // is what expire_lapsed_pro() (nightly pg_cron) sweeps on and what hides
        // the billing-portal button. Do NOT infer either from stripe_customer_id:
        // a user who once subscribed keeps that id forever, so a later one-time
        // purchase would look like a subscription and never expire.
        if (session.mode === "payment") {
          // Anchor the term to the session's own creation time, not to now().
          // Stripe redelivers events on retry, and `new Date()` would push
          // pro_until further out on every redelivery — silently gifting term.
          // Derived from the event, so replays are idempotent.
          const proUntil = new Date(session.created * 1000);
          proUntil.setMonth(proUntil.getMonth() + SEMESTER_MONTHS);
          await admin
            .from("profiles")
            .update({ is_pro: true, pro_until: proUntil.toISOString(), pro_source: "one_time" })
            .eq("id", supabaseId);

          const posthog = getPostHogServerClient();
          posthog?.capture({
            distinctId: supabaseId,
            event: "stripe_checkout_completed",
            properties: { billing_provider: "stripe", plan: "semester", has_subscription: false },
          });
          break;
        }

        if (!customerId) break;

        let proUntil: string | null = null;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          proUntil = subscriptionPeriodEnd(subscription);
        }

        // Stamp the subscription high-water mark too (see applySubscriptionState).
        // A fresh checkout is the latest subscription state by definition, so a
        // delayed deleted from a PRIOR subscription (older event.created) can't
        // regress this re-subscribed row. Applied unconditionally by id — checkout
        // is a paid grant that must always land; replay-safety comes from the
        // stripe_events dedupe table above, not from this guard.
        await admin
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            is_pro: true,
            pro_until: proUntil,
            pro_source: "subscription",
            last_subscription_event_at: new Date(event.created * 1000).toISOString(),
          })
          .eq("id", supabaseId);

        const posthog = getPostHogServerClient();
        posthog?.capture({
          distinctId: supabaseId,
          event: "stripe_checkout_completed",
          properties: {
            billing_provider: "stripe",
            has_subscription: Boolean(subscriptionId),
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const active =
          subscription.status === "active" || subscription.status === "trialing";
        await applySubscriptionState(customerId, event.created, false, {
          is_pro: active,
          pro_until: subscriptionPeriodEnd(subscription),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        await applySubscriptionState(customerId, event.created, true, {
          is_pro: false,
          pro_until: subscriptionPeriodEnd(subscription),
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
