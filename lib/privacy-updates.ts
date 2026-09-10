export function privacyUpdatesFromForm(formData: FormData) {
  const hvRaw = String(formData.get("heatmap_visibility") ?? "").trim();
  return {
    is_private: formData.get("is_private") === "on",
    hide_school: formData.get("hide_school") === "on",
    heatmap_visibility: hvRaw === "followers" ? "followers" : "public",
    email_digest_opt_out: formData.get("daily_digest_email") !== "on",
  };
}
