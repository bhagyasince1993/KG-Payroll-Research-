
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from scripts.payroll_nlp_agent import answer_question
from scripts.sql_graph_agent import investigate, log_evaluation

app = FastAPI(title="PayrollKG AI Agent API")


class QuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


@app.get("/")
def home():
    return {
        "status": "online",
        "service": "PayrollKG AI Agent",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/ask")
def ask(request: QuestionRequest):
    try:
        return answer_question(request.question)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to process the payroll question.",
        )


@app.get("/investigate/{employee_id}")
def investigate_employee(employee_id: str):
    import re

    employee_id = employee_id.strip().upper()

    if not re.fullmatch(r"EMP-\d{5}", employee_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid employee ID.",
        )

    try:
        result = investigate(employee_id)
        log_evaluation(result)
        return result
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to investigate employee.",
        )