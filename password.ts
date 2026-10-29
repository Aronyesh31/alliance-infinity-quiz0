import { hash, verify } from "@node-rs/argon2";
import { randomToken } from "../security/tokens";
import { MAX_ADMIN_PASSWORD, MIN_ADMIN_PASSWORD } from "../config";

// OWASP-recommended Argon2id parameters (19 MiB memory, 2 iterations, 1 lane).
const ARGON_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string): Promise<string> {
  // algorithm 2 = Argon2id
  return hash(password, { ...ARGON_OPTIONS, algorithm: 2 });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;
/** Spends the same time as a real check so unknown usernames can't be detected by timing. */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomToken(16));
  await verifyPassword(await dummyHash, password);
}

export function passwordProblem(password: string, username?: string): string | null {
  if (password.length < MIN_ADMIN_PASSWORD) return `Use at least ${MIN_ADMIN_PASSWORD} characters.`;
  if (password.length > MAX_ADMIN_PASSWORD) return `Use at most ${MAX_ADMIN_PASSWORD} characters.`;
  if (username && password.toLowerCase().includes(username.toLowerCase())) return "The password must not contain the username.";
  if (new Set(password).size < 6) return "The password is too repetitive.";
  return null;
}
