export type ProfileForCompletion = {
  display_name: string | null;
  avatar_url: string | null;
  school: string;
  year: string | null;
  major: string | null;
  bio: string | null;
  goals: string | null;
};

export type ProfileGap =
  | "avatar"
  | "display_name"
  | "school"
  | "major"
  | "bio"
  | "goals";

const GAP_ORDER: ProfileGap[] = [
  "avatar",
  "display_name",
  "school",
  "major",
  "bio",
  "goals",
];

export function getProfileGaps(profile: ProfileForCompletion): ProfileGap[] {
  const gaps: ProfileGap[] = [];
  if (!profile.avatar_url) gaps.push("avatar");
  if (!profile.display_name?.trim()) gaps.push("display_name");
  if (!profile.school?.trim()) gaps.push("school");
  if (!profile.major?.trim()) gaps.push("major");
  if (!profile.bio?.trim() || profile.bio.trim().length < 20) gaps.push("bio");
  if (!profile.goals?.trim() || profile.goals.trim().length < 10) gaps.push("goals");
  return GAP_ORDER.filter((g) => gaps.includes(g));
}

export function gapLabel(gap: ProfileGap): string {
  const labels: Record<ProfileGap, string> = {
    avatar: "Profile photo",
    display_name: "Display name",
    school: "School",
    major: "Major",
    bio: "Bio (20+ characters)",
    goals: "Target role",
  };
  return labels[gap];
}

/** Form field id to focus when user acts on a nudge. Avatar has no text field. */
export function gapFieldId(gap: ProfileGap): string | null {
  if (gap === "avatar") return null;
  return gap;
}

const FALLBACK_BY_GAP: Record<ProfileGap, string> = {
  avatar: "Add a photo. Recruiters recognize you faster with one.",
  display_name: "Add the name you want on applications.",
  school: "Add your school so education shows on your dossier.",
  major: "Add your major or field of study.",
  bio: "Write a short bio. It sits under your name.",
  goals: "Add the role you are applying for. Recruiters see it first.",
};

export function fallbackProfileNudge(gaps: ProfileGap[]): string {
  if (gaps.length === 0) {
    return "The basics are in. Add a project or role next so there is proof to show.";
  }
  return FALLBACK_BY_GAP[gaps[0]];
}
