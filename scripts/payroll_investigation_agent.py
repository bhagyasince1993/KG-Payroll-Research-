
import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "expanded"

GRAPH_FILE = DATA / "payrollkg_connected_triples.tsv"
EVENTS_FILE = DATA / "pay_events.csv"
EMPLOYEES_FILE = DATA / "employees.csv"


def read_csv(path):
    with path.open(
        "r", newline="", encoding="utf-8"
    ) as file:
        return list(csv.DictReader(file))


def load_employee_graph():
    """
    Retrieve verified GOLD -> EMP relationships
    from the connected knowledge graph.
    """
    golden_to_employee = {}

    with GRAPH_FILE.open(
        "r", newline="", encoding="utf-8"
    ) as file:
        reader = csv.reader(file, delimiter="\t")

        for row in reader:
            if len(row) != 3:
                continue

            subject, predicate, obj = row

            if predicate == "hasEmployeeRecord":
                if (
                    subject in golden_to_employee
                    and golden_to_employee[subject] != obj
                ):
                    raise ValueError(
                        f"Conflicting employee mapping: {subject}"
                    )

                golden_to_employee[subject] = obj

    return golden_to_employee


def load_payroll_data():
    """
    Load operational payroll data only.

    IMPORTANT:
    Do not read is_anomaly or anomaly_type.
    Do not load anomaly_ground_truth.csv.
    """
    employees = {
        row["emp_id"]: {
            "emp_id": row["emp_id"],
            "name": row["name"],
            "department": row["department"],
            "jurisdiction": row["jurisdiction"],
            "role": row["role"],
            "base_monthly_pay": float(
                row["base_monthly_pay"]
            ),
            "ot_eligible": (
                row["ot_eligible"].lower() == "true"
            ),
        }
        for row in read_csv(EMPLOYEES_FILE)
    }

    events_by_employee = defaultdict(list)

    for row in read_csv(EVENTS_FILE):
        events_by_employee[row["emp_id"]].append({
            "event_id": row["event_id"],
            "period_start": row["period_start"],
            "period_end": row["period_end"],
            "gross_pay": float(row["gross_pay"]),
            "net_pay": float(row["net_pay"]),
            "hours_regular": float(
                row["hours_regular"]
            ),
            "hours_overtime": float(
                row["hours_overtime"]
            ),
            "jurisdiction": row["jurisdiction"],
        })

    for events in events_by_employee.values():
        events.sort(key=lambda event: event["period_start"])

    return employees, events_by_employee


def investigate(golden_id, graph, employees, events_by_employee):
    emp_id = graph.get(golden_id)

    if not emp_id:
        return {
            "status": "not_found",
            "golden_id": golden_id,
            "message": "No verified employee mapping found.",
        }

    employee = employees.get(emp_id)

    if not employee:
        return {
            "status": "not_found",
            "golden_id": golden_id,
            "message": "Employee record not found.",
        }

    events = events_by_employee.get(emp_id, [])

    if not events:
        return {
            "status": "no_payroll_data",
            "golden_id": golden_id,
            "emp_id": emp_id,
            "message": "No payroll events found.",
        }

    findings = []

    # Compare each month with the employee's prior
    # monthly gross-pay history.
    for index, event in enumerate(events):
        if index < 3:
            continue

        prior_events = events[:index]

        baseline = median(
            previous["gross_pay"]
            for previous in prior_events
        )

        if baseline <= 0:
            continue

        change_percent = (
            (event["gross_pay"] - baseline)
            / baseline
        ) * 100

        if change_percent >= 50:
            findings.append({
                "type": "unusual_pay_increase",
                "severity": (
                    "high"
                    if change_percent >= 100
                    else "medium"
                ),
                "event_id": event["event_id"],
                "period": event["period_start"][:7],
                "baseline_gross_pay": round(
                    baseline, 2
                ),
                "actual_gross_pay": event["gross_pay"],
                "change_percent": round(
                    change_percent, 2
                ),
                "explanation": (
                    "Gross pay increased at least 50% "
                    "relative to the employee's prior "
                    "monthly median."
                ),
            })

        if change_percent <= -50:
            findings.append({
                "type": "unusual_pay_decrease",
                "severity": "medium",
                "event_id": event["event_id"],
                "period": event["period_start"][:7],
                "baseline_gross_pay": round(
                    baseline, 2
                ),
                "actual_gross_pay": event["gross_pay"],
                "change_percent": round(
                    change_percent, 2
                ),
                "explanation": (
                    "Gross pay decreased at least 50% "
                    "relative to the employee's prior "
                    "monthly median."
                ),
            })

    # Validate overtime eligibility.
    if not employee["ot_eligible"]:
        for event in events:
            if event["hours_overtime"] > 0:
                findings.append({
                    "type": "overtime_eligibility_exception",
                    "severity": "high",
                    "event_id": event["event_id"],
                    "period": event["period_start"][:7],
                    "hours_overtime": event["hours_overtime"],
                    "explanation": (
                        "Overtime hours were recorded for "
                        "an employee marked ineligible "
                        "under the synthetic payroll rules."
                    ),
                })

    return {
        "status": "completed",
        "golden_id": golden_id,
        "employee": employee,
        "payroll_events_reviewed": len(events),
        "findings_count": len(findings),
        "findings": findings,
        "summary": (
            f"Reviewed {len(events)} payroll events "
            f"and identified {len(findings)} "
            "potential exceptions."
        ),
        "disclaimer": (
            "These are rule-based investigation flags, "
            "not confirmed payroll errors."
        ),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Payroll knowledge graph investigation agent"
    )

    parser.add_argument(
        "--golden-id",
        default="GOLD-00001",
        help="Golden employee ID to investigate",
    )

    parser.add_argument(
        "--output",
        help="Optional path for the JSON investigation report",
    )

    args = parser.parse_args()

    graph = load_employee_graph()
    employees, events_by_employee = load_payroll_data()

    result = investigate(
        args.golden_id,
        graph,
        employees,
        events_by_employee,
    )

    report = json.dumps(result, indent=2)

    print(report)

    if args.output:
        path = Path(args.output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(report, encoding="utf-8")
        print(f"\nReport saved to: {path}")


if __name__ == "__main__":
    main()