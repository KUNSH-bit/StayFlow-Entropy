import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../config/env.js";

export const SESSION_COOKIE = "stayflow_session";

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await deriveKey(password, salt);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex || !/^[a-f0-9]{32}$/i.test(saltHex) || !/^[a-f0-9]{128}$/i.test(hashHex)) {
    return false;
  }
  const actual = await deriveKey(password, Buffer.from(saltHex, "hex"));
  const expected = Buffer.from(hashHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const entry of header.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0) continue;
    if (entry.slice(0, separator).trim() === name) {
      try { return decodeURIComponent(entry.slice(separator + 1).trim()); } catch { return undefined; }
    }
  }
  return undefined;
}

export function setSessionCookie(response: Response, token: string, expiresAt: Date): void {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (env.NODE_ENV === "production") parts.push("Secure");
  response.append("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(response: Response): void {
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0", "Expires=Thu, 01 Jan 1970 00:00:00 GMT"];
  if (env.NODE_ENV === "production") parts.push("Secure");
  response.append("Set-Cookie", parts.join("; "));
}

export function constantTimeTokenMatch(expected: string, provided: string): boolean {
  const expectedHash = createHash("sha256").update(expected).digest();
  const providedHash = createHash("sha256").update(provided).digest();
  return timingSafeEqual(expectedHash, providedHash);
}
