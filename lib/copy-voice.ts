/**
 * Shared empty / error copy for feed, search, DM, and profile.
 * Calm, peer-to-peer, one next step. Prefer Stuck / Learning / Building
 * when talking about posts. Titles have no trailing period.
 */

export const ERROR = {
  title: "Something went wrong",
  description: "Give it another try.",
  tryAgain: "Try again",
} as const;

export const CTA = {
  findPeople: "Find people",
  seeLatest: "See Latest",
  browseLatest: "Browse Latest",
  clearSearch: "Clear search",
  backToSearch: "Back to search",
  editProfile: "Edit profile",
  openFeed: "Open feed",
  tryAgain: ERROR.tryAgain,
} as const;

export const feed = {
  latestEmpty: {
    title: "Nothing here yet",
    description: "Be the first to share what you’re building, learning, or stuck on.",
  },
  followingThin: {
    title: "Follow people to shape this feed",
    description:
      "Until you follow a few students, Latest is the best place to find Stuck, Learning, and Building posts.",
  },
  followingQuiet: {
    title: "Quiet for now",
    description:
      "People you follow haven’t posted yet. Check Latest for Stuck posts from the wider network.",
  },
} as const;

export const search = {
  idle: {
    title: "Search people, projects, and posts",
    description:
      "Try a name, username, school, or project. When the network is thin, Latest still surfaces people posting Stuck.",
  },
  noPeople: {
    title: "No people found",
    description: (q: string) =>
      `Nothing matched “${q}”. Try another name, username, or project — or browse Latest while the network is thin.`,
  },
  noMorePeople: {
    title: "No more people for this query",
  },
  noPosts: {
    title: "No posts found",
    description: (q: string) =>
      `Nothing matched “${q}”. Try another phrase, or browse Latest for Stuck posts.`,
  },
  noMorePosts: {
    title: "No more posts for this query",
  },
} as const;

export const messages = {
  inboxEmpty: {
    title: "No conversations yet",
    description: "Start one from a profile, or find someone to message.",
  },
  inboxLoadFailed: {
    title: "Couldn’t load messages",
    description: ERROR.description,
  },
  threadEmpty: {
    title: "No messages yet",
    description: "Say hello to start the conversation.",
  },
  finderEmpty: {
    title: "No people found",
  },
  previewFallback: "Say hello",
} as const;

export const profile = {
  postsUnavailable: {
    title: "Posts unavailable",
    description: (username: string) => `You and @${username} cannot see each other’s posts.`,
  },
  postsPrivate: {
    title: "This account is private",
    description: (username: string) => `Follow @${username} to see their posts.`,
  },
  postsEmptyOwner: {
    title: "No posts yet",
    description: "Share something Stuck, Learning, or Building to fill this section.",
  },
  postsEmptyViewer: {
    title: "No posts yet",
    description: (username: string) => `@${username} hasn’t posted yet.`,
  },
  listPrivate: {
    title: "This account is private",
    description: "Follow them to see this list.",
  },
  noFollowers: {
    title: "No followers yet",
  },
  noFollowing: {
    title: "Not following anyone yet",
  },
} as const;
