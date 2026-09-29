"""PayrollKG API: Ask, Investigate, evidence-based Diagnose, and evaluation feed.

SQLite evaluation history is local. On Render, set PAYROLL_EVAL_DB to a
persistent disk location (or migrate to managed Postgres) for durability.
Do not expose this demo API or its evaluation feed with real payroll data
without authentication, authorization, and appropriate data protection.
"""

import csv
import json
import os
import re
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from scripts.evidence_diagnosis import diagnose
from scripts.payroll_nlp_agent import answer_question
from scripts.sql_graph_agent import investigate, log_evaluation

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.getenv("PAYROLL_EVAL_DB", str(ROOT / "results" / "evaluations.sqlite3")))
_WRITE_LOCK = Lock()
app = FastAPI(title="PayrollKG AI Agent API")


class QuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class DiagnosisRequest(BaseModel):
    symptom_id: str = Field(min_length=1, max_length=100)
    evidence: dict[str, Any] = Field(default_factory=dict)


def _connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(DB_PATH), timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("""
        CREATE TABLE IF NOT EXISTS evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            question TEXT,
            employee_id TEXT,
            status TEXT NOT NULL,
            verdict TEXT NOT NULL,
            latency_ms REAL NOT NULL,
            checks_json TEXT NOT NULL,
            reasons_json TEXT NOT NULL,
            evidence_json TEXT NOT NULL
        )
    """)
    return connection


def _save(record):
    with _WRITE_LOCK:
        with _connection() as connection:
            connection.execute("""
                INSERT INTO evaluations (
                    timestamp, action, question, employee_id, status,
                    verdict, latency_ms, checks_json, reasons_json, evidence_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record["timestamp"], record["action"], record.get("question"),
                record.get("employee_id"), record["status"], record["verdict"],
                record["latency_ms"], json.dumps(record["checks"]),
                json.dumps(record["reasons"]), json.dumps(record["evidence"]),
            ))


def _ask_evaluation(result, elapsed_ms):
    """Dashboard consistency check; not independent golden accuracy."""
    status = result.get("status", "UNKNOWN")
    evidence = result.get("evidence") or {}
    employee = evidence.get("employee") or {}
    summary = evidence.get("payroll_summary") or {}
    answer = result.get("answer") or ""
    intent = result.get("intent")
    checks = {}
    reasons = []
    if status == "COMPLETED":
        checks = {
            "employee_id_matches": result.get("employee_id") == employee.get("emp_id"),
            "employee_name_in_answer": bool(employee.get("name")) and employee["name"] in answer,
            "sql_evidence_present": bool(employee) and bool(summary),
            "graph_evidence_present": bool(evidence.get("graph_relationships")),
            "intent_supported": intent in {
                "OVERTIME", "GROSS_PAY", "NET_PAY", "ANOMALIES", "EMPLOYEE_PROFILE",
                "TROUBLESHOOTING",
            },
        }
        expected = {
            "OVERTIME": f"{summary.get('total_overtime_hours')} total overtime hours",
            "GROSS_PAY": f"${(summary.get('total_gross_pay') or 0):,.2f}",
            "NET_PAY": f"${(summary.get('total_net_pay') or 0):,.2f}",
            "ANOMALIES": f"{summary.get('flagged_events')} flagged payroll events",
            "EMPLOYEE_PROFILE": str(employee.get("department", "")),
        }.get(intent)
        # Troubleshooting responses are hypotheses, not a numeric answer.
        checks["answer_matches_evidence"] = (
            bool(answer) and bool(result.get("troubleshooting"))
            if intent == "TROUBLESHOOTING"
            else bool(expected) and expected in answer
        )
        reasons = [key for key, passed in checks.items() if not passed]
        critical = set(reasons) - {"graph_evidence_present"}
        verdict = (
            "FAIL" if critical else
            "NEEDS_REVIEW" if intent == "TROUBLESHOOTING" or reasons
            or (summary.get("flagged_events") or 0) else "PASS"
        )
    else:
        verdict = "NEEDS_REVIEW"
        reasons = [status]
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": "ASK", "question": result.get("question"),
        "employee_id": result.get("employee_id"), "status": status,
        "verdict": verdict, "latency_ms": elapsed_ms,
        "checks": checks, "reasons": reasons,
        "evidence": {
            "payroll_summary": summary or None,
            "graph_relationship_count": len(evidence.get("graph_relationships") or []),
        },
    }


@app.get("/")
def home():
    return {"status": "online", "service": "PayrollKG AI Agent"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/ask")
def ask(request: QuestionRequest):
    started = time.perf_counter()
    try:
        result = answer_question(request.question)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to process the payroll question.") from exc
    record = _ask_evaluation(result, round((time.perf_counter() - started) * 1000, 2))
    try:
        _save(record)
    except (OSError, sqlite3.Error) as exc:
        print(f"Dashboard evaluation storage failed: {exc}")
    return result


@app.post("/diagnose")
def diagnose_case(request: DiagnosisRequest):
    """Run evidence-based diagnosis. Does not accept golden expected labels."""
    started = time.perf_counter()
    try:
        result = diagnose(request.symptom_id, request.evidence)
    except (KeyError, ValueError, TypeError) as exc:
        # Unknown symptoms and malformed case inputs are client errors.
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except (OSError, csv.Error) as exc:
        raise HTTPException(status_code=503, detail="Diagnostic graph unavailable.") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to diagnose payroll symptom.") from exc

    status = result.get("diagnosis_status")
    supported = status == "SUPPORTED_BY_CASE_EVIDENCE"
    insufficient = status == "INSUFFICIENT_EVIDENCE"
    checks = {
        "recognized_diagnosis_status": supported or insufficient,
        "supported_has_cause_and_resolution": (
            bool(result.get("cause_id")) and bool(result.get("resolution_id"))
            and bool(result.get("recommended_action")) if supported else True
        ),
        "abstention_has_no_cause_or_resolution": (
            result.get("cause_id") is None and result.get("resolution_id") is None
            if insufficient else True
        ),
        "abstention_requests_follow_up": (
            bool(result.get("required_follow_up")) if insufficient else True
        ),
    }
    reasons = [name for name, passed in checks.items() if not passed]
    # Passing these checks establishes only response structure, not correctness.
    verdict = "FAIL" if reasons else "NEEDS_REVIEW"
    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
    try:
        _save({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "DIAGNOSE", "question": None, "employee_id": None,
            "status": status or "UNKNOWN", "verdict": verdict,
            "latency_ms": elapsed_ms, "checks": checks, "reasons": reasons,
            # Store diagnostic identifiers only; avoid raw case evidence in dashboard.
            "evidence": {
                "symptom_id": request.symptom_id,
                "cause_id": result.get("cause_id"),
                "resolution_id": result.get("resolution_id"),
                "supplied_evidence_keys": sorted(request.evidence.keys()),
            },
        })
    except (OSError, sqlite3.Error) as exc:
        print(f"Diagnosis evaluation storage failed: {exc}")
    return result


@app.get("/investigate/{employee_id}")
def investigate_employee(employee_id: str):
    employee_id = employee_id.strip().upper()
    if not re.fullmatch(r"EMP-\d{5}", employee_id):
        raise HTTPException(status_code=400, detail="Invalid employee ID.")
    started = time.perf_counter()
    try:
        result = investigate(employee_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to investigate employee.") from exc
    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
    try:
        evaluation = log_evaluation(result, latency_ms=elapsed_ms)
        _save({
            "timestamp": evaluation["timestamp"], "action": "INVESTIGATE",
            "question": None, "employee_id": employee_id,
            "status": result["status"], "verdict": evaluation["verdict"],
            "latency_ms": elapsed_ms, "checks": evaluation["checks"],
            "reasons": evaluation.get("failed_checks", []) + evaluation.get("skipped_checks", []),
            "evidence": {
                "payroll_summary": result.get("payroll_summary"),
                "graph_relationship_count": len(result.get("graph_relationships") or []),
            },
        })
    except (OSError, sqlite3.Error, KeyError, TypeError) as exc:
        print(f"Investigation evaluation storage failed: {exc}")
    return result


@app.get("/evaluations")
def list_evaluations(limit: int = Query(default=100, ge=1, le=500)):
    """Dashboard feed; protect before using real payroll data."""
    try:
        with _connection() as connection:
            rows = connection.execute(
                "SELECT * FROM evaluations ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
    except (OSError, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail="Unable to load evaluations.") from exc
    items = []
    for row in rows:
        item = dict(row)
        item["checks"] = json.loads(item.pop("checks_json"))
        item["reasons"] = json.loads(item.pop("reasons_json"))
        item["evidence"] = json.loads(item.pop("evidence_json"))
        items.append(item)
    return {
        "total_returned": len(items), "evaluations": items,
        "note": "Response consistency checks; not independent golden accuracy.",
    }
