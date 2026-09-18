import type { OpenToTag, PortfolioSection, StudyMode } from "@/types/portfolio";

export const OPEN_TO_LABELS: Record<OpenToTag, string> = {
  collaborate: "Open to collaborate",
  study: "Study together",
  feedback: "Feedback",
};

export const STUDY_MODE_LABELS: Record<StudyMode, string> = {
  on_campus: "On campus",
  online: "Online",
  hybrid: "Hybrid",
  bootcamp: "Bootcamp",
  self_taught: "Self-taught",
};

export const SECTION_LABELS: Record<PortfolioSection, string> = {
  intro: "Introduction",
  projects: "Projects",
  activity: "Activity",
  experience: "Experience",
  education: "Education",
  posts: "Posts",
};
