import { ADMIN_ID, authEmailForCampusId, errorResponse, HttpError, requireAdmin } from "@/lib/campus"
import { adminAuth } from "@/lib/firebase-admin"

export async function POST(req: Request) {
  try {
    await requireAdmin(req)
    const { roll, authEmail } = await req.json()
    const id = String(roll || "").trim().toUpperCase()
    if (!id || id === ADMIN_ID) throw new HttpError(400, "This account cannot be removed.")
    const emails = [...new Set([authEmailForCampusId(id), authEmail].filter(Boolean) as string[])]
    for (const email of emails) {
      const user = await adminAuth().getUserByEmail(email).catch(() => null)
      if (user) await adminAuth().deleteUser(user.uid)
    }
    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
