
import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import duckdb


ROOT = Path(__file__).resolve().parents[1]
DATA = (
    ROOT / "demo_data"
    if (ROOT / "demo_data" / "employees.csv").exists()
    else ROOT / "data" / "expanded"
)
GRAPH_FILE = DATA / "payrollkg_connected_triples.tsv"
EVAL_LOG = ROOT / "results" / "agent_eval_logs.jsonl"



def connect_sql():
    """Create an in-memory SQL connection to the payroll CSVs."""
    con = duckdb.connect(":memory:")

    employees_path = (DATA / "employees.csv").as_posix()
    events_path = (DATA / "pay_events.csv").as_posix()

    con.execute(
        f"CREATE VIEW employees AS "
        f"SELECT * FROM read_csv_auto('{employees_path}')"
    )

    con.execute(
        f"CREATE VIEW pay_events AS "
        f"SELECT * FROM read_csv_auto('{events_path}')"
    )

    return con


def load_graph():
    """Index the existing subject-predicate-object graph."""
    graph = defaultdict(list)

    with GRAPH_FILE.open(encoding="utf-8", newline="") as f:
        reader = csv.reader(f, delimiter="\t")

        for row in reader:
            if len(row) >= 3:
                subject, predicate, obj = row[:3]

                if subject.lower() == "subject" and predicate.lower() == "predicate":
                    continue

                graph[subject].append({
                    "predicate": predicate,
                    "object": obj,
                })

    return graph


def find_graph_relationships(graph, employee_id, limit=30):
    """Find graph nodes referring to this employee and their direct links."""
    matching_nodes = []

    for subject, edges in graph.items():
        if employee_id in subject or any(
            employee_id in edge["object"] for edge in edges
        ):
            matching_nodes.append(subject)

    relationships = []
    seen = set()

    for subject in matching_nodes:
        for edge in graph[subject]:
            key = (subject, edge["predicate"], edge["object"])

            if key not in seen:
                relationships.append({
                    "subject": subject,
                    **edge,
                })
                seen.add(key)

            if len(relationships) >= limit:
                return relationships

    return relationships


def query_employee(con, employee_id):
    """Retrieve employee information using parameterized SQL."""
    rows = con.execute(
        """
        SELECT
            emp_id,
            name,
            department,
            jurisdiction,
            role,
            base_monthly_pay,
            ot_eligible
        FROM employees
        WHERE emp_id = ?
        """,
        [employee_id],
    )

    columns = [item[0] for item in rows.description]
    return [dict(zip(columns, row)) for row in rows.fetchall()]


def query_payroll(con, employee_id):
    """Retrieve payroll events, newest first."""
    rows = con.execute(
        """
        SELECT
            event_id,
            period_start,
            period_end,
            hours_regular,
            hours_overtime,
            gross_pay,
            deductions,
            net_pay,
            jurisdiction,
            is_anomaly,
            anomaly_type
        FROM pay_events
        WHERE emp_id = ?
        ORDER BY period_start DESC
        LIMIT 24
        """,
        [employee_id],
    )

    columns = [item[0] for item in rows.description]
    return [dict(zip(columns, row)) for row in rows.fetchall()]


def query_summary(con, employee_id):
    """Calculate payroll totals without allowing generated SQL."""
    rows = con.execute(
        """
        SELECT
            COUNT(*) AS event_count,
            ROUND(SUM(hours_overtime), 2) AS total_overtime_hours,
            ROUND(SUM(gross_pay), 2) AS total_gross_pay,
            ROUND(SUM(net_pay), 2) AS total_net_pay,
            SUM(
                CASE
                    WHEN is_anomaly = TRUE THEN 1
                    ELSE 0
                END
            ) AS flagged_events
        FROM pay_events
        WHERE emp_id = ?
        """,
        [employee_id],
    )

    columns = [item[0] for item in rows.description]
    return dict(zip(columns, rows.fetchone()))


def json_safe(value):
    """Convert dates and other values into JSON-compatible values."""
    if isinstance(value, dict):
        return {key: json_safe(item) for key, item in value.items()}

    if isinstance(value, list):
        return [json_safe(item) for item in value]

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return value


def investigate(employee_id):
    """Combine SQL evidence with direct Knowledge Graph relationships."""
    con = connect_sql()

    try:
        employee = query_employee(con, employee_id)
        payroll_events = query_payroll(con, employee_id)
        summary = query_summary(con, employee_id)
    finally:
        con.close()

    graph = load_graph()
    relationships = find_graph_relationships(graph, employee_id)

    if not employee:
        status = "EMPLOYEE_NOT_FOUND"
        explanation = (
            f"No employee record was found for {employee_id}. "
            "Check the employee ID before investigating."
        )
    else:
        status = "COMPLETED"
        explanation = (
            f"Retrieved {summary['event_count']} payroll events "
            f"for {employee_id}. Total overtime: "
            f"{summary['total_overtime_hours'] or 0} hours. "
            f"Flagged payroll events: "
            f"{summary['flagged_events'] or 0}."
        )

    result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "employee_id": employee_id,
        "employee": employee[0] if employee else None,
        "payroll_summary": summary,
        "payroll_events": payroll_events,
        "graph_relationships": relationships,
        "explanation": explanation,
        "limitations": [
            "An anomaly flag is not proof of a payroll error.",
            "Graph results show direct matching relationships only.",
            "This version uses predefined SQL, not LLM-generated SQL.",
        ],
    }

    return json_safe(result)


def log_evaluation(result):
    """Record evidence availability for later agent evaluation."""
    summary = result["payroll_summary"]

    evaluation = {
        "timestamp": result["timestamp"],
        "employee_id": result["employee_id"],
        "status": result["status"],
        "sql_evidence_found": bool(result["employee"]),
        "graph_evidence_found": bool(result["graph_relationships"]),
        "payroll_event_count": summary["event_count"],
        "requires_human_review": bool(
            summary["flagged_events"]
        ),
        "evaluation_type": "DETERMINISTIC_EVIDENCE_CHECK",
    }

    EVAL_LOG.parent.mkdir(parents=True, exist_ok=True)

    with EVAL_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(evaluation) + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Payroll SQL + Knowledge Graph investigation agent"
    )

    parser.add_argument(
        "--employee",
        required=True,
        help="Employee ID, for example EMP-00001",
    )

    args = parser.parse_args()

    result = investigate(args.employee)
    log_evaluation(result)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()