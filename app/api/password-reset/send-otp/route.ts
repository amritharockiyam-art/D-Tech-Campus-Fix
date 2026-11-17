import { errorResponse, findProfile, HttpError, maskEmail, newOtp, sha256 } from "@/lib/campus"
import { adminDb } from "@/lib/firebase-admin"
import { sendOtpEmail } from "@/lib/mailer"

const OTP_TTL_MS = 10 * 60 * 1000
const RESEND_GAP_MS = 60 * 1000

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    const p = await findProfile(String(id || ""))
    if (!p || !p.email) throw new HttpError(404, "No account found with this register number or email ID.")

    const ref = adminDb().collection("passwordResets").doc(p.roll)
    const prev = await ref.get()
    const sentAt = prev.exists ? (prev.data()!.sentAt as number) : 0
    if (Date.now() - sentAt < RESEND_GAP_MS) throw new HttpError(429, "Please wait a minute before requesting another OTP.")

    const otp = newOtp()
    await ref.set({ otpHash: sha256(`${p.roll}:${otp}`), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, sentAt: Date.now() })
    await sendOtpEmail(p.email, p.name, otp)

    return Response.json({ message: `OTP sent to ${maskEmail(p.email)}. It expires in 10 minutes.` })
  } catch (e) {
    return errorResponse(e)
  }
}
