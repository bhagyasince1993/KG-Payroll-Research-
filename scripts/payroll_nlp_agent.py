
import argparse
import json
import re

from scripts.sql_graph_agent import investigate


def answer_question(question: str) -> dict:
    """Interpret supported payroll questions using verified data."""

    match = re.search(r"\bEMP-\d{5}\b", question.upper())

    if not match:
        return {
            "status": "NEEDS_CLARIFICATION",
            "answer": (
                "Please include an employee ID, such as EMP-00001. "
                "Employee-name lookup will be added next."
            ),
        }

    employee_id = match.group()
    report = investigate(employee_id)

    if report["status"] != "COMPLETED":
        return {
            "status": report["status"],
            "answer": f"No employee record found for {employee_id}.",
        }

    summary = report["payroll_summary"]
    employee = report["employee"]
    q = question.lower()

    if "overtime" in q:
        answer = (
            f"{employee['name']} recorded "
            f"{summary['total_overtime_hours']} total overtime hours "
            f"across {summary['event_count']} payroll events."
        )
        intent = "OVERTIME"

    elif "gross" in q:
        answer = (
            f"{employee['name']}'s total recorded gross pay is "
            f"${summary['total_gross_pay']:,.2f}."
        )
        intent = "GROSS_PAY"

    elif "net" in q or "take-home" in q:
        answer = (
            f"{employee['name']}'s total recorded net pay is "
            f"${summary['total_net_pay']:,.2f}."
        )
        intent = "NET_PAY"

    elif "anomal" in q or "flag" in q:
        answer = (
            f"{employee['name']} has "
            f"{summary['flagged_events']} flagged payroll events. "
            "A flag alone does not establish a payroll error."
        )
        intent = "ANOMALIES"

    elif "department" in q or "role" in q:
        answer = (
            f"{employee['name']} works in {employee['department']} "
            f"as a {employee['role'].replace('_', ' ')}."
        )
        intent = "EMPLOYEE_PROFILE"

    else:
        return {
            "status": "NEEDS_CLARIFICATION",
            "employee_id": employee_id,
            "answer": (
                "I can currently answer questions about total overtime, "
                "gross pay, net pay, anomaly flags, department and role. "
                "Period comparisons and root-cause analysis are not yet supported."
            ),
        }

    return {
        "status": "COMPLETED",
        "question": question,
        "employee_id": employee_id,
        "intent": intent,
        "tools_used": ["DUCKDB_SQL", "KNOWLEDGE_GRAPH_RETRIEVAL"],
        "answer": answer,
        "evidence": {
            "employee": employee,
            "payroll_summary": summary,
            "graph_relationships": report["graph_relationships"],
        },
        "limitations": report["limitations"],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--question", required=True)
    args = parser.parse_args()

    print(json.dumps(answer_question(args.question), indent=2))