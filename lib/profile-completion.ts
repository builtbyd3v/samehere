export type ProfileForCompletion = {
  display_name: string | null;
  avatar_url: string | null;
  school: string;
  year: string | null;
  major: string | null;
  bio: string | null;
  goals: string | null;
  skills: string[] | null;
};

export type ProfileGap =
  | "avatar"
  | "display_name"
  | "school"
  | "year"
  | "major"
  | "bio"
  | "goals"
  | "skills";

const GAP_ORDER: ProfileGap[] = [
  "avatar",
  "display_name",
  "school",
  "year",
  "major",
  "bio",
  "goals",
  "skills",
];

export function getProfileGaps(profile: ProfileForCompletion): ProfileGap[] {
  const gaps: ProfileGap[] = [];
  if (!profile.avatar_url) gaps.push("avatar");
  if (!profile.display_name?.trim()) gaps.push("display_name");
  if (!profile.school?.trim()) gaps.push("school");
  if (!profile.year) gaps.push("year");
  if (!profile.major?.trim()) gaps.push("major");
  if (!profile.bio?.trim() || profile.bio.trim().length < 20) gaps.push("bio");
  if (!profile.goals?.trim() || profile.goals.trim().length < 10) gaps.push("goals");
  if (!profile.skills?.length) gaps.push("skills");
  return GAP_ORDER.filter((g) => gaps.includes(g));
}

export function gapLabel(gap: ProfileGap): string {
  const labels: Record<ProfileGap, string> = {
    avatar: "Profile photo",
    display_name: "Display name",
    school: "School",
    year: "Year",
    major: "Major",
    bio: "Bio (20+ characters)",
    goals: "Goals",
    skills: "Skills",
  };
  return labels[gap];
}

/** Form field id to focus when user acts on a nudge. Avatar has no text field. */
export function gapFieldId(gap: ProfileGap): string | null {
  if (gap === "avatar") return null;
  return gap;
}

const FALLBACK_BY_GAP: Record<ProfileGap, string> = {
  avatar: "Add a profile photo — it makes you recognizable when peers see your posts.",
  display_name: "Add your display name so classmates recognize you beyond @username.",
  school: "Confirm your school so campus peers can find you in search.",
  year: "Set your year — it helps surface students at the same stage.",
  major: "Add your major so others in your program can discover you.",
  bio: "Write a short bio about what you're building or learning — it's the first thing people read.",
  goals: "Share what you're working toward this semester so others know how to connect.",
  skills: "List a few skills — overlap drives better follow suggestions.",
};

export function fallbackProfileNudge(gaps: ProfileGap[]): string {
  if (gaps.length === 0) {
    return "Your profile looks solid. Keep posting so peers see you in the feed.";
  }
  return FALLBACK_BY_GAP[gaps[0]];
}
