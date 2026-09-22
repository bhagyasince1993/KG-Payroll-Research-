
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "completed",
    mode: "sample_report",
    golden_id: "GOLD-00069",
    employee: {
      emp_id: "EMP-00101",
      name: "Layla Parker",
      department: "Sales",
    },
    payroll_events_reviewed: 12,
    findings_count: 1,
    findings: [
      {
        type: "unusual_pay_increase",
        severity: "high",
        period: "2025-06",
        baseline_gross_pay: 12565,
        actual_gross_pay: 25130,
        change_percent: 100,
        explanation:
          "June gross pay doubled compared with the employee's previous monthly pay.",
      },
    ],
    summary:
      "Reviewed 12 payroll events and identified 1 potential exception.",
    disclaimer:
      "This is a saved sample report, not a live investigation.",
  });
}