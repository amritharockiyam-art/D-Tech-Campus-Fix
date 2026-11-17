import nodemailer from "nodemailer"

export async function sendOtpEmail(to: string, name: string, otp: string) {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) throw new Error("Email is not configured on the server (SMTP_USER, SMTP_PASS).")
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user, pass },
  })
  await transport.sendMail({
    from: `"D-Tech Campus Fix" <${user}>`,
    to,
    subject: `Your password reset OTP: ${otp}`,
    text: `Hi ${name},\n\nYour D-Tech Campus Fix password reset OTP is ${otp}.\nIt expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px"><p>Hi ${escapeHtml(name)},</p><p>Your D-Tech Campus Fix password reset OTP is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p></div>`,
  })
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}
