import type { Tables } from "@/types/database.types";

// ponytail: flag+gate only, Stripe v1.1.
export const isPro = (profile: Pick<Tables<"profiles">, "is_pro">) => profile.is_pro === true;
