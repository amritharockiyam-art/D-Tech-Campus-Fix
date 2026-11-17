import { errorResponse, requireAdmin } from "@/lib/campus"

// Resets are now self-service via email OTP, so there is never anything to approve.
export async function GET(req: Request) {
  try {
    await requireAdmin(req)
    return Response.json({ items: [] })
  } catch (e) {
    return errorResponse(e)
  }
}
