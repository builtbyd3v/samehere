export type ProjectDifficulty = "beginner" | "intermediate" | "advanced";

export type PathProject = {
  slug: string;
  title: string;
  difficulty: ProjectDifficulty;
  time_hours: [number, number];
  languages: string[];
  stack: string[];
  domain: string;
  what_you_build: string[];
  what_it_teaches: string[];
  how_it_works: { step: number; title: string; detail: string }[];
  build_checklist: { id: string; title: string; optional?: boolean }[];
  take_it_further?: string[];
  interview_roi: string;
  fits_stages: string[];
  target_role_tags: string[];
};

export type SkillPriority = "essential" | "recommended" | "optional";

export type SkillTrack = {
  id: string;
  title: string;
  stages: {
    id: string;
    title: string;
    description: string;
    skills: {
      id: string;
      name: string;
      priority: SkillPriority;
      why_it_matters: string;
      refs?: { title: string; url: string }[];
    }[];
    build_project_slug?: string;
    apply_checkpoint?: boolean;
  }[];
};

export type InterviewQuestionType = "coding" | "system_design" | "behavioral" | "role_fit";

export type InterviewQuestion = {
  id: string;
  type: InterviewQuestionType;
  difficulty: ProjectDifficulty;
  prompt: string;
  approach: string;
  evaluating: string;
};

export type CompanyInterviewBank = {
  company_slug: string;
  company_name: string;
  process_summary: string;
  questions: InterviewQuestion[];
};
