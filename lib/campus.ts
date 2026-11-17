import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto"
import { adminAuth, adminDb } from "./firebase-admin"

export const ADMIN_ID = "724026149003"

export function authEmailForCampusId(campusId: string) {
  const safe = String(campusId || "").trim().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9._+-]/g, "-")
  return `roll-${safe}@dtechcampusfix.app`
}

export type Profile = {
  roll: string
  name: string
  email?: string
  authEmail?: string
  uid?: string
  role?: string
  status?: string
}

export async function findProfile(rawId: string): Promise<Profile | null> {
  const id = String(rawId || "").trim()
  if (!id) return null
  const db = adminDb()
  if (id.includes("@")) {
    const snap = await db.collection("profiles").where("email", "==", id.toLowerCase()).limit(1).get()
    return snap.empty ? null : ({ ...snap.docs[0].data(), roll: snap.docs[0].id } as Profile)
  }
  const roll = id.toUpperCase().replace(/\s+/g, "")
  if (!/^[A-Z0-9]+$/.test(roll)) return null
  const doc = await db.collection("profiles").doc(roll).get()
  return doc.exists ? ({ ...doc.data(), roll: doc.id } as Profile) : null
}

export async function uidForProfile(p: Profile) {
  if (p.uid) return p.uid
  const user = await adminAuth().getUserByEmail(p.authEmail || authEmailForCampusId(p.roll))
  return user.uid
}

export async function requireAdmin(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) throw new HttpError(401, "Please log in again.")
  const decoded = await adminAuth().verifyIdToken(token).catch(() => null)
  if (!decoded || decoded.email !== authEmailForCampusId(ADMIN_ID)) throw new HttpError(403, "Admin only.")
  return decoded
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function errorResponse(e: unknown) {
  const status = e instanceof HttpError ? e.status : 500
  const message = e instanceof Error ? e.message : "Request failed. Please try again."
  if (status === 500) console.error(e)
  return Response.json({ error: message }, { status })
}

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex")
export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0")
export const newToken = () => randomBytes(32).toString("hex")
export function sameHash(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function maskEmail(email: string) {
  const [user, domain] = email.split("@")
  return `${user.slice(0, 2)}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`
}
