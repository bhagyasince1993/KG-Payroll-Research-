
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function investigateEmployee(employeeId: string) {
  const normalizedId = employeeId.trim().toUpperCase();

  if (!/^EMP-\d{5}$/.test(normalizedId)) {
    return NextResponse.json(
      {
        error: "Enter a valid employee ID, such as EMP-00001.",
      },
      { status: 400 }
    );
  }

  const backend = process.env.PAYROLL_AGENT_API_URL;

  if (!backend) {
    return NextResponse.json(
      { error: "Payroll backend is not configured." },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `${backend.replace(/\/+$/, "")}/investigate/${normalizedId}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Unable to run the payroll investigation.",
        },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      ...result,
      mode: "live_sql_graph_investigation",
    });
  } catch (error) {
    console.error("Investigation request failed:", error);

    return NextResponse.json(
      {
        error: "Unable to connect to the payroll backend.",
      },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  const employeeId =
    request.nextUrl.searchParams.get("employee_id") ||
    "EMP-00001";

  return investigateEmployee(employeeId);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return investigateEmployee(body.employee_id || "");
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }
}