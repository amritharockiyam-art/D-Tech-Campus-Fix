import { errorResponse, findProfile, HttpError, sameHash, sha256, uidForProfile } from "@/lib/campus"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function POST(req: Request) {
  try {
    const { id, token, password } = await req.json()
    if (typeof password !== "string" || password.trim().length < 6) throw new HttpError(400, "Password must be at least 6 characters.")
    const p = await findProfile(String(id || ""))
    if (!p) throw new HttpError(404, "Account not found.")

    const ref = adminDb().collection("passwordResets").doc(p.roll)
    const d = (await ref.get()).data()
    if (!d?.tokenHash || Date.now() > d.tokenExpiresAt || !sameHash(d.tokenHash, sha256(String(token || "")))) {
      throw new HttpError(400, "Your verification expired. Request a new OTP.")
    }

    await adminAuth().updateUser(await uidForProfile(p), { password: password.trim() })
    await ref.delete()
    return Response.json({ message: "Password changed. You can now log in with your new password." })
  } catch (e) {
    return errorResponse(e)
  }
}
