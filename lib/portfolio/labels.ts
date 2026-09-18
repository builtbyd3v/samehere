import type { OpenToTag, PortfolioSection } from "@/types/portfolio";

export const OPEN_TO_LABELS: Record<OpenToTag, string> = {
  collaborate: "Open to collaborate",
  study: "Study together",
  feedback: "Feedback",
};

export const SECTION_LABELS: Record<PortfolioSection, string> = {
  intro: "Introduction",
  projects: "Projects",
  activity: "Activity",
  experience: "Experience",
  education: "Education",
  posts: "Posts",
};
