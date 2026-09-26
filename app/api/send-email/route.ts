
import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Resend API key is missing" },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: "GharBazaar <onboarding@resend.dev>",
      to: ["hasim.radiant@gmail.com"],
      subject: "GharBazaar - Test Email",
      html: `
        <h1>Welcome to GharBazaar!</h1>
        <p>Your Resend email integration is working.</p>
      `,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      emailId: data?.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}

