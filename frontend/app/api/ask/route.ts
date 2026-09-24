
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let question: unknown;

  try {
    const body = await request.json();
    question = body.question;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }

  if (
    typeof question !== "string" ||
    !question.trim() ||
    question.length > 1000
  ) {
    return NextResponse.json(
      { error: "Enter a question of up to 1,000 characters." },
      { status: 400 }
    );
  }

  const backendUrl = process.env.PAYROLL_AGENT_API_URL;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "Payroll backend URL is not configured." },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `${backendUrl.replace(/\/$/, "")}/ask`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
        }),
        signal: AbortSignal.timeout(60000),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Payroll backend error:",
        response.status
      );

      return NextResponse.json(
        { error: "The payroll backend could not process the question." },
        { status: 502 }
      );
    }

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Payroll API connection failed:", error);

    return NextResponse.json(
      { error: "Unable to connect to the payroll backend." },
      { status: 502 }
    );
  }
}