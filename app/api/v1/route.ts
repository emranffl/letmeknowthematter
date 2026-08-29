import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import allowedDomains from "./allowed-domains.json"

export const POST = async (req: NextRequest) => {
  const origin = req.headers.get("origin") || req.headers.get("referer")
  if (!origin) return new NextResponse("Origin not found", { status: 400 })
  if (!allowedDomains.includes(origin)) return new NextResponse("Forbidden", { status: 403 })

  const { email, html, message, name, subject, toEmail } = await req.json()
  if (!email || (!html && !message) || !name || !subject || !toEmail) {
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
    text: html ? undefined : message,
    html:
      html ||
      `
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
        // Echo the caller's own origin, which has already been checked against
        // allowedDomains above. Hardcoding one origin here meant every other
        // entry in that list passed preflight and then failed on the POST.
        // A list is also not valid in this header — it takes exactly one origin.
        "Access-Control-Allow-Origin": origin,
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
export const OPTIONS = (req: NextRequest) => {
  const origin = req.headers.get("origin") ?? ""

  // `Access-Control-Allow-Origin` accepts one origin or `*`, never a list.
  // Joining the array with commas produced a value no browser accepts, so
  // preflight silently failed for every caller including the allowed one.
  if (!allowedDomains.includes(origin)) {
    return new NextResponse(null, { status: 403 })
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
      "Content-Type": "application/json",
    },
  })
}
