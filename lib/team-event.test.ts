import { describe, it, expect } from "vitest";
import {
  TEAM_EVENT_NAME_MAX,
  formatTeamEventDate,
  formatTeamEventLine,
  isLookingForTeamFeed,
  lookingForTeamFeedPath,
  parseTeamEventDate,
  parseTeamEventFields,
  parseTeamEventMode,
  teamEventError,
} from "./team-event";

describe("parseTeamEventMode", () => {
  it("accepts remote and in-person aliases", () => {
    expect(parseTeamEventMode("remote")).toBe("remote");
    expect(parseTeamEventMode("In person")).toBe("in_person");
    expect(parseTeamEventMode("in-person")).toBe("in_person");
    expect(parseTeamEventMode("in_person")).toBe("in_person");
  });

  it("rejects junk", () => {
    expect(parseTeamEventMode("hybrid")).toBeNull();
    expect(parseTeamEventMode("")).toBeNull();
  });
});

describe("parseTeamEventDate", () => {
  it("accepts a real calendar day", () => {
    expect(parseTeamEventDate("2026-10-04")).toBe("2026-10-04");
  });

  it("rejects impossible days and out-of-range years", () => {
    expect(parseTeamEventDate("2026-02-31")).toBeNull();
    expect(parseTeamEventDate("2019-10-04")).toBeNull();
    expect(parseTeamEventDate("Oct 4")).toBeNull();
  });
});

describe("teamEventError", () => {
  it("allows empty optional fields on a Looking for team post", () => {
    expect(teamEventError({ label: "looking_for_team", name: "", date: "", mode: "" })).toBeNull();
  });

  it("allows the HackMIT done-when example", () => {
    expect(
      teamEventError({
        label: "looking_for_team",
        name: "HackMIT",
        date: "2026-10-04",
        mode: "remote",
      }),
    ).toBeNull();
  });

  it("caps the event name", () => {
    expect(
      teamEventError({
        label: "looking_for_team",
        name: "x".repeat(TEAM_EVENT_NAME_MAX + 1),
        date: "",
        mode: "",
      }),
    ).toBe(`Event name is capped at ${TEAM_EVENT_NAME_MAX} characters.`);
  });

  it("ignores leftover event fields on other labels", () => {
    expect(
      teamEventError({
        label: "stuck",
        name: "HackMIT",
        date: "2026-10-04",
        mode: "remote",
      }),
    ).toBeNull();
  });
});

describe("parseTeamEventFields", () => {
  it("keeps event fields only on Looking for team", () => {
    expect(
      parseTeamEventFields({
        label: "looking_for_team",
        name: " HackMIT ",
        date: "2026-10-04",
        mode: "remote",
      }),
    ).toEqual({
      team_event_name: "HackMIT",
      team_event_date: "2026-10-04",
      team_event_mode: "remote",
    });
    expect(
      parseTeamEventFields({
        label: "building",
        name: "HackMIT",
        date: "2026-10-04",
        mode: "remote",
      }),
    ).toEqual({
      team_event_name: null,
      team_event_date: null,
      team_event_mode: null,
    });
  });
});

describe("formatTeamEventLine", () => {
  it("renders HackMIT · Oct 4 · Remote", () => {
    expect(
      formatTeamEventLine({
        team_event_name: "HackMIT",
        team_event_date: "2026-10-04",
        team_event_mode: "remote",
      }),
    ).toBe("HackMIT · Oct 4 · Remote");
  });

  it("skips missing pieces", () => {
    expect(formatTeamEventLine({ team_event_name: "HackMIT" })).toBe("HackMIT");
    expect(formatTeamEventDate("2026-10-04")).toBe("Oct 4");
    expect(formatTeamEventLine({})).toBeNull();
  });
});

describe("lookingForTeamFeedPath", () => {
  it("is the network-wide filter", () => {
    expect(lookingForTeamFeedPath()).toBe("/feed?label=looking_for_team");
    expect(isLookingForTeamFeed({ label: "looking_for_team", tab: "following" })).toBe(true);
    expect(isLookingForTeamFeed({ label: "stuck" })).toBe(false);
  });
});
