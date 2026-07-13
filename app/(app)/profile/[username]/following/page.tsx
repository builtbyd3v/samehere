import FollowList from "@/components/profile/FollowList";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <FollowList username={username} kind="following" />;
}
