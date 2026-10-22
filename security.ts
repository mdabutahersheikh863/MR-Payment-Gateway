import { timingSafeEqual, randomBytes } from "node:crypto";
export function safeSecretEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function newOrderId() { return `MR-${Date.now()}-${randomBytes(5).toString("hex").toUpperCase()}`; }
export function adminAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_API_KEY ?? "";
  const provided = request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith("mr_admin_session="))?.slice("mr_admin_session=".length) ?? "";
  return expected.length >= 32 && safeSecretEqual(provided, expected);
}
