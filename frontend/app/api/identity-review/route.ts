
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

type ReviewDecision = {
  case_id: string;
  source_system: string;
  source_employee_id: string;
  candidate_golden_emp_id: string;
  decision: "APPROVE" | "REJECT";
  reviewer: string;
  reason: string;
  timestamp: string;
};

const dataDirectory = path.join(
  process.cwd(),
  "data",
  "identity_review"
);

const auditFile = path.join(
  dataDirectory,
  "decisions.jsonl"
);

async function readDecisions(): Promise<ReviewDecision[]> {
  try {
    const content = await fs.readFile(auditFile, "utf8");

    return content
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ReviewDecision);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

export async function GET() {
  try {
    const decisions = await readDecisions();

    return NextResponse.json({
      decisions,
      total: decisions.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to read review decisions." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      source_system,
      source_employee_id,
      candidate_golden_emp_id,
      decision,
      reviewer,
      reason,
    } = body;

    if (
      typeof source_system !== "string" ||
      !source_system.trim() ||
      typeof source_employee_id !== "string" ||
      !source_employee_id.trim() ||
      typeof reviewer !== "string" ||
      !reviewer.trim() ||
      typeof reason !== "string" ||
      !reason.trim() ||
      !["APPROVE", "REJECT"].includes(decision)
    ) {
      return NextResponse.json(
        { error: "Invalid or incomplete review decision." },
        { status: 400 }
      );
    }

    if (
      decision === "APPROVE" &&
      (typeof candidate_golden_emp_id !== "string" ||
        !candidate_golden_emp_id.trim())
    ) {
      return NextResponse.json(
        { error: "An approval requires a candidate golden ID." },
        { status: 400 }
      );
    }

    const caseId = `${source_system}:${source_employee_id}`;

    const existing = await readDecisions();

    if (existing.some((item) => item.case_id === caseId)) {
      return NextResponse.json(
        { error: "This review case already has a decision." },
        { status: 409 }
      );
    }

    const record: ReviewDecision = {
      case_id: caseId,
      source_system: source_system.trim(),
      source_employee_id: source_employee_id.trim(),
      candidate_golden_emp_id:
        typeof candidate_golden_emp_id === "string"
          ? candidate_golden_emp_id.trim()
          : "",
      decision,
      reviewer: reviewer.trim(),
      reason: reason.trim(),
      timestamp: new Date().toISOString(),
    };

    await fs.mkdir(dataDirectory, { recursive: true });

    await fs.appendFile(
      auditFile,
      JSON.stringify(record) + "\n",
      "utf8"
    );

    return NextResponse.json(
      { success: true, record },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to save review decision." },
      { status: 500 }
    );
  }
}