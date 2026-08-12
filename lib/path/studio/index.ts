export type {
  StudioCommands,
  StudioManifest,
  StudioMilestone,
  StudioRuntime,
  StudioStarterFile,
} from "@/lib/path/types";

export { getStudioManifest } from "@/lib/path/studio/get-studio-manifest";
export {
  isSafeStudioPath,
  validateMilestoneChecklistLinkage,
  validateStudioManifest,
} from "@/lib/path/studio/validate";
export type {
  StudioValidationErr,
  StudioValidationOk,
  StudioValidationResult,
} from "@/lib/path/studio/validate";
