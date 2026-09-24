
import argparse
import csv
import json
import re
import threading
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

# Initialized once per Python process.
_DB = None
_GRAPH_INDEX = None

_INIT_LOCK = threading.Lock()
_DB_LOCK = threading.Lock()
_LOG_LOCK = threading.Lock()


def connect_sql():
    """
    Load payroll CSV files into DuckDB once.
    Subsequent requests reuse the same in-memory database.
    """
    global _DB

    if _DB is not None:
        return _DB

    with _INIT_LOCK:
        if _DB is not None:
            return _DB

        con = duckdb.connect(":memory:")

        employees_path = (
            DATA / "employees.csv"
        ).as_posix()

        events_path = (
            DATA / "pay_events.csv"
        ).as_posix()

        try:
            con.execute(
                """
                CREATE TABLE employees AS
                SELECT *
                FROM read_csv_auto(?)
                """,
                [employees_path],
            )

            con.execute(
                """
                CREATE TABLE pay_events AS
                SELECT *
                FROM read_csv_auto(?)
                """,
                [events_path],
            )

            con.execute(
                """
                CREATE INDEX employee_id_idx
                ON employees(emp_id)
                """
            )

            con.execute(
                """
                CREATE INDEX payroll_employee_idx
                ON pay_events(emp_id)
                """
            )

        except Exception:
            con.close()
            raise

        _DB = con
        return _DB


def load_graph():
    """
    Build an employee-to-relationships index once.
    Avoid scanning the complete graph on each request.
    """
    global _GRAPH_INDEX

    if _GRAPH_INDEX is not None:
        return _GRAPH_INDEX

    with _INIT_LOCK:
        if _GRAPH_INDEX is not None:
            return _GRAPH_INDEX

        graph = defaultdict(list)
        employee_nodes = defaultdict(set)

        with GRAPH_FILE.open(
            encoding="utf-8",
            newline="",
        ) as file:
            reader = csv.reader(
                file,
                delimiter="\t",
            )

            for row in reader:
                if len(row) < 3:
                    continue

                subject, predicate, obj = row[:3]

                if (
                    subject.lower() == "subject"
                    and predicate.lower() == "predicate"
                ):
                    continue

                graph[subject].append(
                    {
                        "predicate": predicate,
                        "object": obj,
                    }
                )

                # Index employee IDs found in subjects
                # and relationship objects.
                for value in (subject, obj):
                    for employee_id in re.findall(
                        r"EMP-\d+",
                        value,
                    ):
                        employee_nodes[employee_id].add(
                            subject
                        )

# Build the employee graph index.
        graph_index = {}

        for employee_id, subjects in employee_nodes.items():
            graph_index[employee_id] = list(subjects)

        _GRAPH_INDEX = (
            graph,
            graph_index,
        )

        return _GRAPH_INDEX


def find_graph_relationships(
    graph_data,
    employee_id,
    limit=30,
):
    """Return direct relationships for one employee."""
    graph, graph_index = graph_data

    matching_nodes = graph_index.get(
        employee_id,
        [],
    )

    relationships = []
    seen = set()

    for subject in matching_nodes:
        for edge in graph[subject]:
            key = (
                subject,
                edge["predicate"],
                edge["object"],
            )

            if key in seen:
                continue

            seen.add(key)

            relationships.append(
                {
                    "subject": subject,
                    **edge,
                }
            )

            if len(relationships) >= limit:
                return relationships

    return relationships


def _rows_to_dicts(cursor):
    columns = [
        item[0]
        for item in cursor.description
    ]

    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]


def query_employee(con, employee_id):
    cursor = con.execute(
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

    return _rows_to_dicts(cursor)


def query_payroll(con, employee_id):
    cursor = con.execute(
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

    return _rows_to_dicts(cursor)


def query_summary(con, employee_id):
    cursor = con.execute(
        """
        SELECT
            COUNT(*) AS event_count,
            ROUND(
                SUM(hours_overtime), 2
            ) AS total_overtime_hours,
            ROUND(
                SUM(gross_pay), 2
            ) AS total_gross_pay,
            ROUND(
                SUM(net_pay), 2
            ) AS total_net_pay,
            SUM(
                CASE
                    WHEN is_anomaly = TRUE
                    THEN 1
                    ELSE 0
                END
            ) AS flagged_events
        FROM pay_events
        WHERE emp_id = ?
        """,
        [employee_id],
    )

    columns = [
        item[0]
        for item in cursor.description
    ]

    return dict(
        zip(
            columns,
            cursor.fetchone(),
        )
    )


def json_safe(value):
    if isinstance(value, dict):
        return {
            key: json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            json_safe(item)
            for item in value
        ]

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return value


def investigate(employee_id):
    """
    Reuse initialized SQL tables and graph index.
    Lock the shared DuckDB connection during queries.
    """
    con = connect_sql()
    graph_data = load_graph()

    with _DB_LOCK:
        employee = query_employee(
            con,
            employee_id,
        )

        payroll_events = query_payroll(
            con,
            employee_id,
        )

        summary = query_summary(
            con,
            employee_id,
        )

    relationships = find_graph_relationships(
        graph_data,
        employee_id,
    )

    if not employee:
        status = "EMPLOYEE_NOT_FOUND"

        explanation = (
            f"No employee record was found "
            f"for {employee_id}. "
            "Check the employee ID "
            "before investigating."
        )

    else:
        status = "COMPLETED"

        explanation = (
            f"Retrieved "
            f"{summary['event_count']} "
            f"payroll events for "
            f"{employee_id}. "
            f"Total overtime: "
            f"{summary['total_overtime_hours'] or 0} "
            f"hours. "
            f"Flagged payroll events: "
            f"{summary['flagged_events'] or 0}."
        )

    result = {
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "status": status,
        "employee_id": employee_id,
        "employee": (
            employee[0]
            if employee
            else None
        ),
        "payroll_summary": summary,
        "payroll_events": payroll_events,
        "graph_relationships": relationships,
        "explanation": explanation,
        "limitations": [
            (
                "An anomaly flag is not proof "
                "of a payroll error."
            ),
            (
                "Graph results show direct "
                "matching relationships only."
            ),
            (
                "This version uses predefined "
                "SQL, not LLM-generated SQL."
            ),
        ],
    }

    return json_safe(result)


def log_evaluation(result):
    """Record deterministic evaluation evidence."""
    summary = result["payroll_summary"]

    evaluation = {
        "timestamp": result["timestamp"],
        "employee_id": result["employee_id"],
        "status": result["status"],
        "sql_evidence_found": bool(
            result["employee"]
        ),
        "graph_evidence_found": bool(
            result["graph_relationships"]
        ),
        "payroll_event_count": (
            summary["event_count"]
        ),
        "requires_human_review": bool(
            summary["flagged_events"]
        ),
        "evaluation_type": (
            "DETERMINISTIC_EVIDENCE_CHECK"
        ),
    }

    with _LOG_LOCK:
        EVAL_LOG.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        with EVAL_LOG.open(
            "a",
            encoding="utf-8",
        ) as file:
            file.write(
                json.dumps(evaluation)
                + "\n"
            )


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Payroll SQL + Knowledge Graph "
            "investigation agent"
        )
    )

    parser.add_argument(
        "--employee",
        required=True,
        help=(
            "Employee ID, "
            "for example EMP-00001"
        ),
    )

    args = parser.parse_args()

    result = investigate(
        args.employee
    )

    log_evaluation(result)

    print(
        json.dumps(
            result,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()