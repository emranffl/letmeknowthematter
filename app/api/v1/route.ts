import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import allowedDomains from "./allowed-domains.json"

export const POST = async (req: NextRequest) => {
  const origin = req.headers.get("origin") || req.headers.get("referer")
  if (!origin) return new NextResponse("Origin not found", { status: 400 })
  if (!allowedDomains.includes(origin)) return new NextResponse("Forbidden", { status: 403 })

  const { name, email, subject, message, toEmail } = await req.json()
  if (!name || !email || !subject || !message || !toEmail) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  })

  const mailOptions = {
    from: email,
    to: toEmail || process.env.GMAIL_USER,
    subject: `${subject} from ${name}`,
    text: message,
    html: `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong><br/>${message}</p>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)

    return new NextResponse(JSON.stringify({ message: "Email sent successfully" }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://emranffl.github.io",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}

// CORS preflight handler
export const OPTIONS = () =>
  new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": `${allowedDomains.join(",")}`,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
      "Content-Type": "application/json",
    },
  })
