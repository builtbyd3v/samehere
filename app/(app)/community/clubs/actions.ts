"use server";

import { FEATURE_UNAVAILABLE, unavailableState } from "@/lib/retired";

export type ClubActionState = { error?: string; ok?: boolean; slug?: string; channelId?: string };
export type ClubUpdate = { name?: string; purpose?: string; tags?: string[]; is_open?: boolean };

export async function createClub(
  _prev: ClubActionState,
  _formData: FormData,
): Promise<ClubActionState> {
  return unavailableState();
}
export async function joinClub(_clubId: string): Promise<ClubActionState & { status?: string }> {
  return unavailableState();
}
export async function leaveClub(_clubId: string): Promise<ClubActionState> {
  return unavailableState();
}
export async function approveMember(_clubId: string, _userId: string): Promise<ClubActionState> {
  return unavailableState();
}
export async function rejectMember(_clubId: string, _userId: string): Promise<ClubActionState> {
  return unavailableState();
}
export async function setMemberRole(
  _clubId: string,
  _userId: string,
  _role: string,
  _title: string | null,
): Promise<ClubActionState> {
  return unavailableState();
}
export async function postAnnouncement(_clubId: string, _body: string): Promise<ClubActionState> {
  return unavailableState();
}
export async function deleteAnnouncement(_announcementId: string, _clubId: string): Promise<ClubActionState> {
  return unavailableState();
}
export async function deleteClub(_clubId: string): Promise<ClubActionState> {
  return unavailableState();
}
export async function updateClub(_clubId: string, _patch: ClubUpdate): Promise<ClubActionState> {
  return unavailableState();
}
export async function createChannel(
  _clubId: string,
  _name: string,
  _minRole: string,
): Promise<ClubActionState> {
  return unavailableState();
}
export async function deleteChannel(_channelId: string): Promise<ClubActionState> {
  return unavailableState();
}
export async function updateClubAvatar(_clubId: string, _avatarUrl: string): Promise<ClubActionState> {
  return unavailableState();
}
export async function kickMember(_clubId: string, _userId: string): Promise<ClubActionState> {
  return unavailableState();
}
export async function banMember(_clubId: string, _userId: string): Promise<ClubActionState> {
  return unavailableState();
}
export async function unbanMember(_clubId: string, _userId: string): Promise<ClubActionState> {
  return unavailableState();
}

export const CLUBS_UNAVAILABLE = FEATURE_UNAVAILABLE;
