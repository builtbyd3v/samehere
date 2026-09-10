import type { ReactNode } from "react";

/** Keyword results only. AI people search is retired. */
export default function PeopleSearch({ keyword }: { keyword: ReactNode; isPro?: boolean; initialQuery?: string; initialSmart?: boolean }) {
  return <div>{keyword}</div>;
}
