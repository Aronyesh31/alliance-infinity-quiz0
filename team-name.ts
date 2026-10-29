import { TEAM_NAME_MAX, TEAM_NAME_MIN } from "../config";

export type TeamNameResult =
  | { ok: true; name: string; key: string }
  | { ok: false; error: string };

// Invisible / formatting characters that could make two names look identical.
const INVISIBLE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;
// Letters (any script), digits, combining marks, spaces and a little punctuation.
const ALLOWED = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .,'&!?#+\-_()]*$/u;

/**
 * Cleans a team name and derives its uniqueness key.
 * "  Team   Alpha " → name "Team Alpha", key "teamalpha".
 * The key ignores case, spacing and punctuation so "A-Team" and "a team"
 * cannot both register.
 */
export function normalizeTeamName(input: unknown): TeamNameResult {
  if (typeof input !== "string") return { ok: false, error: "Enter a team name." };
  const name = input.normalize("NFKC").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
  const length = [...name].length;

  if (length === 0) return { ok: false, error: "Enter a team name." };
  if (length < TEAM_NAME_MIN) return { ok: false, error: `Team names need at least ${TEAM_NAME_MIN} characters.` };
  if (length > TEAM_NAME_MAX) return { ok: false, error: `Team names can be at most ${TEAM_NAME_MAX} characters.` };
  if (!ALLOWED.test(name)) {
    return {
      ok: false,
      error: "Use letters, numbers, spaces and simple punctuation (. , ' & ! ? # + - _ ( )). Start with a letter or number.",
    };
  }

  const key = name.toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]/gu, "");
  if ([...key].length < TEAM_NAME_MIN) {
    return { ok: false, error: `Team names need at least ${TEAM_NAME_MIN} letters or numbers.` };
  }
  return { ok: true, name, key };
}
