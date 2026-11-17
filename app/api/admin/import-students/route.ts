import { FieldValue } from "firebase-admin/firestore"
import { authEmailForCampusId, errorResponse, requireAdmin } from "@/lib/campus"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import students from "@/lib/first-year-students.json"

export const maxDuration = 300

const MENTOR: Record<string, string> = {
  "Information Technology": "Dr. K. Muralidharan",
  "Food Technology": "Dr. S. Kumaresan",
  "Artificial Intelligence and Machine Learning": "Dr. M. Athiththachozhan",
  "Cyber Security": "Dr. T. Saranya",
  "Bio Medical Engineering": "Dr. R. Srija",
  "Electrical and Communication Engineering": "Dr. R. Srija",
  "Computer Science and Engineering": "Mr. R. Gunasekaran",
  "Robotics and Automation": "Mrs. N. Saraswathi",
  "Artificial Intelligence and Data Science": "Dr. P. Sathish",
}

// Temporary password: lowercase name without spaces + "@" + mobile number.
const tempPassword = (name: string, phone: string) => `${name.toLowerCase().replace(/\s+/g, "")}@${phone}`

type Student = (typeof students)[number]

async function importOne(s: Student) {
  const db = adminDb()
  const existing = await db.collection("profiles").where("email", "==", s.email).limit(1).get()
  if (!existing.empty) return "skipped" as const

  const authEmail = authEmailForCampusId(s.roll)
  const password = tempPassword(s.name, s.phone)
  let uid: string
  try {
    uid = (await adminAuth().createUser({ email: authEmail, password, displayName: s.name })).uid
  } catch (e) {
    if ((e as { code?: string }).code !== "auth/email-already-exists") throw e
    uid = (await adminAuth().getUserByEmail(authEmail)).uid
    await adminAuth().updateUser(uid, { password })
  }

  const base = { name: s.name, roll: s.roll, role: "Student", dept: s.dept, year: "I Year", mentor: MENTOR[s.dept] || "", photoURL: "", uid }
  const batch = db.batch()
  batch.set(db.collection("profiles").doc(s.roll), {
    ...base, email: s.email, authEmail, phone: s.phone, host: "", status: "approved",
    tempPassword: true, importedFrom: "first-year-list", createdAt: FieldValue.serverTimestamp(),
  })
  batch.set(db.collection("publicProfiles").doc(s.roll), base)
  batch.set(db.collection("roster").doc(s.email), { name: s.name, dept: s.dept, email: s.email, phone: s.phone, batch: "2026-2030" })
  await batch.commit()
  return "created" as const
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req)
    const { offset = 0, limit = 40 } = await req.json().catch(() => ({}))
    const chunk = students.slice(offset, offset + Math.min(limit, 60))
    const result = { created: 0, skipped: 0, failed: [] as string[] }

    for (let i = 0; i < chunk.length; i += 8) {
      const outcomes = await Promise.allSettled(chunk.slice(i, i + 8).map(importOne))
      outcomes.forEach((o, j) => {
        if (o.status === "fulfilled") result[o.value]++
        else result.failed.push(`${chunk[i + j].name} (${chunk[i + j].email}): ${(o.reason as Error).message}`)
      })
    }

    if (offset === 0) {
      await adminDb().collection("site").doc("roster").set({
        students: students.map((s) => ({ name: s.name, dept: s.dept, email: s.email, phone: s.phone, batch: "2026-2030" })),
      })
    }

    const next = offset + chunk.length
    return Response.json({ ...result, next, total: students.length, done: next >= students.length })
  } catch (e) {
    return errorResponse(e)
  }
}
