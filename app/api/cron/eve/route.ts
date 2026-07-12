import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { generateText } from "@/lib/ai";
import { EVE_PROMPT_SYSTEM, EVE_WELCOME_SYSTEM, untrusted } from "@/lib/ai-prompts";
import { TEXT_LIMITS } from "@/lib/utils/validation";

// SECURITY / INTEGRITY (see plans/028-eve-findings.md):
// - Eve acts ONLY through its own RLS-bound session (anon key + password sign-in).
//   Never the service-role key, never lib/supabase/admin.ts.
// - Eve must NEVER insert comments, reactions, or follows — those paths award
//   real contribution points to real users for AI-originated engagement.
//   Allowed writes: club-channel messages, club_announcements, moderation RPCs.

export const maxDuration = 60;

const MAX_CLUBS = 20;
const MAX_WELCOME_NAMES = 5;
// Daily cron + 1h slack. Reruns can double-welcome the same join window — fine
// at current scale (no eve_state table yet).
const WELCOME_LOOKBACK_MS = 25 * 60 * 60 * 1000;
const PROMPT_COOLDOWN_MS = 72 * 60 * 60 * 1000;

type ClubRow = { id: string; name: string; purpose: string };
type OfficerMembership = {
  club_id: string;
  clubs: ClubRow | ClubRow[] | null;
};
type RecentMember = {
  user_id: string;
  profiles: { username: string } | { username: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function createEveClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  // Isolated session client for this cron invocation only — no cookie store,
  // so Eve's JWT never bleeds into other requests on the process.
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function postChannelMessage(
  supabase: ReturnType<typeof createEveClient>,
  conversationId: string,
  senderId: string,
  content: string,
) {
  const text = content.trim().slice(0, TEXT_LIMITS.message);
  if (!text) return;
  // Same insert shape as components/clubs/ClubChat.tsx handleSend.
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: text,
  });
  if (error) {
    console.error("eve: message insert failed", conversationId, error.message);
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = process.env.EVE_BOT_EMAIL;
  const password = process.env.EVE_BOT_PASSWORD;
  if (!email || !password) {
    // Not set up yet — quiet skip so the cron does not alarm before maintainer setup.
    return NextResponse.json({ skipped: true });
  }

  const supabase = createEveClient();
  let signedIn = false;
  let welcomes = 0;
  let prompts = 0;
  let clubsProcessed = 0;

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError || !authData.user) {
      console.error("eve: sign-in failed", authError?.message ?? "no user");
      return NextResponse.json({ error: "Eve sign-in failed" }, { status: 500 });
    }
    signedIn = true;
    const eveId = authData.user.id;

    const { data: memberships, error: membershipError } = await supabase
      .from("club_members")
      .select("club_id, clubs(id, name, purpose)")
      .eq("user_id", eveId)
      .eq("status", "accepted")
      .in("role", ["officer", "owner"])
      .limit(MAX_CLUBS)
      .returns<OfficerMembership[]>();

    if (membershipError) {
      console.error("eve: load memberships failed", membershipError.message);
      return NextResponse.json({ error: "Could not load Eve clubs" }, { status: 500 });
    }

    const clubs = (memberships ?? [])
      .map((row) => one(row.clubs))
      .filter((club): club is ClubRow => !!club);

    const welcomeSince = new Date(Date.now() - WELCOME_LOOKBACK_MS).toISOString();
    const promptSince = new Date(Date.now() - PROMPT_COOLDOWN_MS).toISOString();

    for (const club of clubs) {
      try {
        const { data: channel, error: channelError } = await supabase
          .from("club_channels")
          .select("conversation_id")
          .eq("club_id", club.id)
          .eq("is_general", true)
          .maybeSingle();

        if (channelError || !channel?.conversation_id) {
          console.error("eve: no general channel", club.id, channelError?.message);
          continue;
        }
        const conversationId = channel.conversation_id;

        // --- Welcome recent joiners (accepted in last 25h) ---
        const { data: recentMembers, error: recentError } = await supabase
          .from("club_members")
          .select("user_id, profiles!club_members_user_id_fkey(username)")
          .eq("club_id", club.id)
          .eq("status", "accepted")
          .neq("user_id", eveId)
          .gte("joined_at", welcomeSince)
          .order("joined_at", { ascending: false })
          .limit(MAX_WELCOME_NAMES)
          .returns<RecentMember[]>();

        if (recentError) {
          console.error("eve: recent members failed", club.id, recentError.message);
        } else {
          const handles = (recentMembers ?? [])
            .map((m) => one(m.profiles)?.username)
            .filter((u): u is string => !!u);
          if (handles.length > 0) {
            const welcomePrompt = [
              `Club name: ${untrusted(club.name)}.`,
              `Club topic: ${untrusted(club.purpose)}.`,
              `New member handles: ${handles.map((h) => untrusted(h)).join(", ")}.`,
              "Write the welcome message.",
            ].join(" ");
            const welcomeText = await generateText(EVE_WELCOME_SYSTEM, welcomePrompt, {
              temperature: 0.7,
              maxTokens: 120,
            });
            if (welcomeText) {
              await postChannelMessage(supabase, conversationId, eveId, welcomeText);
              welcomes += 1;
            }
          }
        }

        // --- Discussion prompt if Eve has been quiet for 72h ---
        const { data: recentEveMessages, error: eveMsgError } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", conversationId)
          .eq("sender_id", eveId)
          .order("created_at", { ascending: false })
          .limit(3);

        if (eveMsgError) {
          console.error("eve: recent eve messages failed", club.id, eveMsgError.message);
        } else {
          const lastEveAt = recentEveMessages?.[0]?.created_at;
          const quietEnough = !lastEveAt || lastEveAt < promptSince;
          if (quietEnough) {
            const recentPrompts = (recentEveMessages ?? [])
              .map((m) => m.content)
              .filter(Boolean)
              .map((c) => untrusted(c.slice(0, 200)));
            const promptUser = [
              `Club name: ${untrusted(club.name)}.`,
              `Club description: ${untrusted(club.purpose)}.`,
              recentPrompts.length
                ? `Recent prompts to avoid repeating: ${recentPrompts.join(" | ")}.`
                : "No recent prompts.",
              "Write one discussion prompt.",
            ].join(" ");
            const promptText = await generateText(EVE_PROMPT_SYSTEM, promptUser, {
              temperature: 0.9,
              maxTokens: 60,
            });
            if (promptText) {
              await postChannelMessage(supabase, conversationId, eveId, promptText);
              prompts += 1;
            }
          }
        }

        clubsProcessed += 1;
      } catch (err) {
        // One club's failure must not block the rest of the run.
        console.error("eve: club run failed", club.id, err instanceof Error ? err.message : err);
      }
    }

    return NextResponse.json({
      clubs: clubsProcessed,
      welcomes,
      prompts,
    });
  } finally {
    if (signedIn) {
      await supabase.auth.signOut();
    }
  }
}
