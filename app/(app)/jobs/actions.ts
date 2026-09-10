"use server";

import { unavailableState } from "@/lib/retired";

/** Stub DTOs — leftover jobs UI still typechecks. Actions reject. */
export type JobListingCard = {
  id: string;
  title: string;
  org: string;
  url: string;
};
export type JobFitResult = { id: string; reason: string; listing: JobListingCard };
export type RankJobsState = {
  results?: JobFitResult[];
  overCap?: boolean;
  empty?: boolean;
  error?: string;
};
export type PitchResult = { text: string } | { error: true } | { locked: true };
export type CheckFitResult = { reason: string } | { overCap: true } | { none: true } | { error: true };

export async function rankJobs(): Promise<RankJobsState> {
  return unavailableState();
}

export async function tailorPitch(_listingId: string): Promise<PitchResult> {
  return { error: true };
}

export async function toggleJobSave(_listingId: string, _save: boolean): Promise<{ error?: true }> {
  return { error: true };
}

export async function checkFit(_listingId: string): Promise<CheckFitResult> {
  return { error: true };
}
