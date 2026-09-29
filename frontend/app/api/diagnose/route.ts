import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let symptomId: unknown;
  let evidence: unknown;

  try {
    const body = await request.json();
    symptomId = body.symptom_id;
    evidence = body.evidence;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }

  if (
    typeof symptomId !== "string" ||
    !symptomId.trim() ||
    typeof evidence !== "object" ||
    evidence === null ||
    Array.isArray(evidence)
  ) {
    return NextResponse.json(
      { error: "A symptom_id and evidence object are required." },
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
      `${backendUrl.replace(/\/$/, "")}/diagnose`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symptom_id: symptomId.trim(),
          evidence,
        }),
        signal: AbortSignal.timeout(60000),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Payroll diagnosis backend error:",
        response.status
      );

      return NextResponse.json(
        {
          error:
            "The payroll backend could not process the diagnosis.",
        },
        { status: 502 }
      );
    }

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Payroll diagnosis API connection failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to connect to the payroll diagnosis backend.",
      },
      { status: 502 }
    );
  }
}