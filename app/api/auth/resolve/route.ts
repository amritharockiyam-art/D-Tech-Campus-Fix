import { errorResponse, findProfile, HttpError } from "@/lib/campus"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Enter a valid email address.")
    const p = await findProfile(email)
    if (!p) throw new HttpError(404, "No account is registered with this email ID.")
    return Response.json({ roll: p.roll })
  } catch (e) {
    return errorResponse(e)
  }
}
