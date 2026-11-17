import { errorResponse, findProfile, HttpError, newToken, sameHash, sha256 } from "@/lib/campus"
import { adminDb } from "@/lib/firebase-admin"

const MAX_ATTEMPTS = 5
const TOKEN_TTL_MS = 10 * 60 * 1000

export async function POST(req: Request) {
  try {
    const { id, otp } = await req.json()
    if (!/^\d{6}$/.test(String(otp || ""))) throw new HttpError(400, "Enter the 6-digit OTP.")
    const p = await findProfile(String(id || ""))
    if (!p) throw new HttpError(404, "Account not found.")

    const ref = adminDb().collection("passwordResets").doc(p.roll)
    const doc = await ref.get()
    const d = doc.data()
    if (!d?.otpHash || Date.now() > d.expiresAt) throw new HttpError(400, "OTP expired. Request a new OTP.")
    if (d.attempts >= MAX_ATTEMPTS) throw new HttpError(429, "Too many wrong attempts. Request a new OTP.")

    if (!sameHash(d.otpHash, sha256(`${p.roll}:${otp}`))) {
      await ref.update({ attempts: d.attempts + 1 })
      throw new HttpError(400, `Wrong OTP. ${MAX_ATTEMPTS - d.attempts - 1} attempts left.`)
    }

    const token = newToken()
    await ref.set({ tokenHash: sha256(token), tokenExpiresAt: Date.now() + TOKEN_TTL_MS, sentAt: d.sentAt })
    return Response.json({ token })
  } catch (e) {
    return errorResponse(e)
  }
}
