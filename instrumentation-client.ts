// Activation funnel (event names, in order):
// landing_view -> signup_started -> signup_submitted -> email_confirmed ->
// profile_updated -> follow_created -> post_created/activated -> message_sent
import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (key) {
  posthog.init(key, {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2025-05-24",
    capture_pageview: "history_change",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
