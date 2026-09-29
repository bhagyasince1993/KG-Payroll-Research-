# Knowledge Graph — Product Requirements Document (PRD)

**Product:** PayrollKG / Payroll Intelligence Platform  
**Status:** Working Portfolio Prototype  
**Last Updated:** September 2026

---

## 1. Product Overview

PayrollKG is a payroll intelligence platform that combines structured payroll data, a Knowledge Graph, natural-language querying, and evidence-based diagnosis.

The platform helps payroll and customer-support teams investigate employee payroll questions without manually searching across disconnected payroll records, employee information, organizational relationships, policies, and troubleshooting documentation.

The solution has two primary experiences:

1. **Payroll Intelligence AI Agent** — answers payroll questions using SQL evidence and Knowledge Graph context.
2. **Evidence-Based Payroll Diagnosis** — identifies payroll root causes only when case-specific evidence supports the diagnosis.

### Live Payroll Intelligence AI Agent

**[Launch Payroll Intelligence AI Agent](https://kg-payroll-research.vercel.app/ai-agent)**

---

## 2. Problem Statement

Payroll investigations often require support teams to manually correlate information across multiple systems, including:

- Employee information
- Payroll transactions
- Overtime
- Gross and net pay
- Paygroups
- Organizational relationships
- Timesheet approvals
- Payroll cutoffs
- Benefits changes
- Tax withholding
- Import and load history
- Troubleshooting documentation

SQL can retrieve records, but it does not naturally represent the relationships between employees, payroll events, symptoms, causes, and resolutions.

Generative AI can simplify the user experience, but an AI-generated answer without supporting evidence creates a risk of unsupported payroll conclusions.

PayrollKG addresses this through:

**Natural Language → SQL Data → Knowledge Graph → Evidence → Diagnosis**

---

## 3. Product Vision

Create an intelligent payroll investigation layer where a support specialist can ask a payroll question and receive:

- A direct answer
- Supporting payroll evidence
- Relevant Knowledge Graph relationships
- A root cause when evidence supports it
- A recommended resolution
- A request for additional evidence when the cause cannot be established

The system should prefer **abstaining over guessing**.

---

## 4. Target Users

### Payroll Support Specialist
Investigates employee payroll questions and needs fast access to supporting evidence.

### Payroll Operations Analyst
Investigates payroll events, paygroups, deductions, anomalies, and employee information.

### Implementation / Data Conversion Consultant
Investigates payroll mapping, import, migration, and data-quality problems.

### Product and Engineering Teams
Analyze recurring payroll symptoms, causes, resolutions, and investigation patterns.

---

## 5. Primary Use Cases

### Payroll Q&A

Example questions:

- How many overtime hours did EMP-00001 work?
- What is the total gross pay for EMP-00001?
- What is the employee's net pay?
- Are there payroll anomalies?
- What department does the employee belong to?
- What role does the employee have?

### Payroll Troubleshooting

Supported prototype symptoms include:

- Missing overtime
- Unexpected deductions
- Wrong paygroup
- Duplicate payment
- Missing payroll record

### Evidence-Based Diagnosis

Example:

**Problem:** Approved overtime is missing.

Evidence:

- Approved overtime: 8 hours
- Approval timestamp: September 4
- Payroll cutoff: September 3
- Paid overtime: 0 hours
- Policy states overtime approved after cutoff moves to the next payroll cycle

The system can support:

**Cause:** Payroll Cutoff

**Recommended Action:** Compare the approval timestamp with the payroll cutoff and next-cycle policy.

---

## 6. Why Knowledge Graph?

Payroll information is highly relational.

An employee can be connected to:

- Department
- Role
- Paygroup
- Payroll events
- Organizational information

Example:

Employee  
→ worksIn → Department  
→ hasRole → Job Role  
→ assignedTo → Paygroup  
→ hasPayrollEvent → Payroll Event

Troubleshooting introduces another relationship model:

Symptom  
→ mayIndicate → Cause  
→ resolvedBy → Resolution  
→ recommendedAction → Action

The Knowledge Graph makes these relationships explicit and retrievable.

---

## 7. Knowledge Graph Model

The prototype contains two knowledge domains.

### Employee / Payroll Knowledge Graph

Core entities:

- Employee
- Department
- Job Role
- Paygroup
- Payroll Event
- Payroll attributes

Example relationships:

EMPLOYEE → worksIn → DEPARTMENT

EMPLOYEE → hasRole → ROLE

EMPLOYEE → assignedTo → PAYGROUP

EMPLOYEE → hasPayrollEvent → PAYROLL_EVENT

### Payroll Troubleshooting Knowledge Graph

Core entities:

- Symptom
- Cause
- Resolution
- Recommended Action

Primary relationships:

SYMPTOM → mayIndicate → CAUSE

CAUSE → resolvedBy → RESOLUTION

RESOLUTION → recommendedAction → ACTION

The current troubleshooting graph contains:

- **5 symptoms**
- **12 potential causes**
- **12 resolutions**
- **53 graph triples**

---

## 8. Troubleshooting Knowledge Graph

### Missing Overtime

Potential causes:

- Unapproved Timesheet
- Payroll Cutoff

### Unexpected Deductions

Potential causes:

- Benefits Change
- Tax Withholding Change

### Wrong Paygroup

Potential causes:

- Stale Employee Mapping
- Transfer Not Synchronized
- Import Mapping Error

### Duplicate Payment

Potential causes:

- Duplicate Import
- Retry Without Idempotency

### Missing Payroll Record

Potential causes:

- Failed Import
- Identity Mismatch
- Report Filter Exclusion

A Knowledge Graph relationship represents a **possible diagnostic path**.

It does not automatically prove that a particular cause occurred for an employee.

---

## 9. Payroll Intelligence AI Agent

The Payroll Intelligence AI Agent provides a natural-language interface over payroll data and Knowledge Graph relationships.

Current supported intents include:

- OVERTIME
- GROSS_PAY
- NET_PAY
- ANOMALIES
- EMPLOYEE_PROFILE
- TROUBLESHOOTING

The prototype combines:

- Natural-language intent handling
- DuckDB / SQL
- Structured payroll evidence
- Knowledge Graph retrieval
- Deterministic response logic

The current implementation should not be represented as a trained payroll LLM. It is a grounded prototype using structured intent handling and retrieval.

### Live Agent

**[Open Payroll Intelligence AI Agent](https://kg-payroll-research.vercel.app/ai-agent)**

---

## 10. Example Payroll Investigation

Question:

**How many overtime hours did EMP-00001 work?**

Prototype result:

**Charlotte White recorded 115.0 total overtime hours across 12 payroll events.**

Supporting evidence can include:

- Employee ID
- Employee information
- Payroll event count
- Overtime hours
- Gross pay
- Net pay
- Knowledge Graph relationships

This allows the support specialist to inspect the information behind the answer.

---

## 11. Evidence-Based Diagnosis

One of the core product requirements is separating:

**Possible Cause**

from:

**Cause Supported by Case Evidence**

The Knowledge Graph retrieves candidate causes.

The evidence-diagnosis layer evaluates case-specific evidence before confirming a cause.

### Supported Diagnosis

When supplied evidence establishes the diagnostic condition, the system returns:

**SUPPORTED_BY_CASE_EVIDENCE**

### Insufficient Evidence

When the evidence cannot distinguish between possible causes, the system returns:

**INSUFFICIENT_EVIDENCE**

Instead of guessing, the application identifies the additional evidence required.

Example:

- Timesheet approval status
- Approval timestamp
- Payroll cutoff

This creates an explicit abstention mechanism.

---

## 12. Example Evidence Diagnosis

### Request

Symptom:

**MISSING_OVERTIME**

Evidence:

- Approved overtime hours: 8
- Approval timestamp: September 4
- Payroll cutoff: September 3
- Paid overtime hours: 0
- Next-cycle policy available

### Result

**Diagnosis Status:** SUPPORTED_BY_CASE_EVIDENCE

**Supported Cause:** Payroll Cutoff

**Resolution:** Payroll Cutoff

**Recommended Action:** Compare approval timestamp with payroll cutoff and next-cycle policy.

The result is supported only by the supplied case evidence and should still be verified against authoritative payroll source records in a real production environment.

---

## 13. Product Architecture

High-level architecture:

User  
↓  
Payroll Intelligence AI Agent  
↓  
Natural-Language Intent Detection  
↓  
SQL / DuckDB Retrieval  
↓  
Knowledge Graph Retrieval  
↓  
Evidence Validation  
↓  
Answer or Diagnosis  
↓  
Customer Support UI

The diagnosis workflow follows:

Payroll Symptom  
↓  
Troubleshooting Knowledge Graph  
↓  
Candidate Causes  
↓  
Case Evidence  
↓  
Evidence Diagnosis Engine  
↓  
Supported Cause OR Insufficient Evidence  
↓  
Recommended Action / Follow-Up Evidence

---

## 14. Production Architecture

The deployed prototype uses:

**Vercel UI**  
↓  
**Next.js API Routes**  
↓  
**Render FastAPI Backend**  
↓  
**DuckDB Payroll Data + Knowledge Graph + Diagnosis Engine**  
↓  
**Grounded Response**

### Frontend

- Next.js
- TypeScript
- Vercel

### Backend

- Python
- FastAPI
- Render

### Data

- Synthetic payroll CSV datasets
- DuckDB
- SQLite for local evaluation history

### Knowledge Layer

- Triple-based Knowledge Graph
- Employee/payroll relationships
- Troubleshooting symptom/cause/resolution relationships

### Evaluation

- JSON golden datasets
- Deterministic evaluation runners
- JSON / JSONL results

---

## 15. Customer Support Experience

The live Payroll Intelligence application contains two primary workflows.

### Ask Payroll AI

The support user enters a natural-language payroll question.

The application displays:

- Agent response
- Detected intent
- Tools used
- Employee information
- SQL evidence
- Knowledge Graph relationships
- Limitations

### Evidence-Based Payroll Diagnosis

The support user selects a payroll symptom and provides evidence.

The application returns either:

**Cause Supported by Case Evidence**

or:

**More Evidence Required**

If evidence is insufficient, the system intentionally abstains and identifies the required follow-up information.

---

## 16. API

The backend provides a diagnosis endpoint:

**POST /diagnose**

The endpoint accepts:

- Symptom ID
- Evidence object

It returns:

- Diagnosis status
- Cause ID
- Resolution ID
- Recommended action
- Required follow-up evidence
- Diagnostic note

The deployed API is consumed by the customer-facing application rather than requiring support users to interact directly with backend APIs.

---

## 17. Evaluation Strategy

Evaluation is a core product requirement.

### Payroll Q&A Golden Cases

Current golden cases test:

- Overtime
- Gross pay
- Net pay
- Payroll anomalies
- Department
- Job role

### Troubleshooting Graph Evaluation

The graph evaluation validates expected symptom, cause, and resolution relationships.

Current structural regression result:

**15 / 15 tests passed**

### Evidence Diagnosis Evaluation

The diagnostic dataset contains **10 synthetic scenarios** covering:

- Missing overtime
- Unexpected deductions
- Wrong paygroup
- Duplicate payment
- Missing payroll record

Current deterministic regression result:

**10 / 10 synthetic diagnostic cases passed**

The dataset includes:

- 5 evidence-supported diagnosis cases
- 5 insufficient-evidence cases

These are regression results against defined synthetic fixtures.

They should **not** be interpreted as production diagnostic accuracy or model generalization accuracy.

---

## 18. Trust and Safety Principles

Payroll is a high-impact domain.

The product follows these principles:

### Evidence Before Diagnosis

A graph relationship alone does not establish root cause.

### Abstain Instead of Guessing

When evidence is insufficient, the application requests additional evidence.

### Expose Supporting Evidence

Users can inspect payroll data and Knowledge Graph relationships behind responses.

### Synthetic Public Data

The public prototype uses synthetic payroll data.

Real payroll information would require production controls including:

- Authentication
- Authorization
- Encryption
- Data governance
- Audit logging
- Privacy controls
- Appropriate retention policies

---

## 19. Success Metrics

Future production measurement should include:

### Investigation Efficiency

- Average investigation time
- Number of systems required per investigation
- Time to identify missing evidence
- Investigation completion rate

### Answer Quality

- Grounded answer rate
- Evidence retrieval accuracy
- Unsupported-answer rate
- Correct abstention rate

### Diagnostic Quality

- Cause precision
- Cause recall
- Resolution accuracy
- Insufficient-evidence detection accuracy

### Adoption

- Weekly active support users
- Questions per support specialist
- Repeat usage
- Investigation completion rate

---

## 20. Current Limitations

The current product is a portfolio prototype.

Current limitations include:

- Synthetic payroll data
- Limited symptom coverage
- Deterministic diagnosis rules
- Limited natural-language intent set
- No production identity/access management
- SQLite evaluation history is not a production persistence architecture
- Diagnostic evaluations use defined synthetic fixtures
- No claim of production payroll diagnostic accuracy

---

## 21. Product Roadmap

### Phase 1 — Payroll Data Foundation

Create structured employee and payroll-event datasets.

### Phase 2 — Payroll Knowledge Graph

Model employee, organizational, payroll, and relationship data.

### Phase 3 — SQL + Knowledge Graph Agent

Enable natural-language payroll questions grounded in structured evidence.

### Phase 4 — Payroll Troubleshooting Knowledge Graph

Model symptoms, causes, resolutions, and recommended actions.

### Phase 5 — AI Evaluation Framework

Create golden datasets and deterministic regression evaluation.

### Phase 6 — Evidence-Based Diagnosis

Validate case-specific evidence and introduce explicit abstention.

### Phase 7 — Diagnosis API

Expose evidence-based diagnosis through FastAPI.

### Phase 8 — Customer Support Experience

Integrate diagnosis with the Payroll Intelligence AI Agent and deploy the complete workflow.

### Future Roadmap

- Expand payroll symptom coverage
- Add additional payroll policies
- Add source-document retrieval / RAG
- Add human-review workflows
- Add confidence calibration
- Add feedback capture
- Add continuous evaluation monitoring
- Add production-grade authentication and authorization
- Add detailed audit trails
- Evaluate graph-database implementation such as Neo4j

---

## 22. Product Principles

1. **Ground payroll answers in evidence.**
2. **Use Knowledge Graph relationships for context, not unsupported conclusions.**
3. **Separate candidate causes from evidence-supported diagnoses.**
4. **Abstain when evidence is insufficient.**
5. **Make AI behavior measurable through evaluation.**
6. **Keep the user able to inspect the evidence behind the answer.**

---

## 23. Live Product

### Payroll Intelligence AI Agent

**[Launch Live Payroll Intelligence AI Agent](https://kg-payroll-research.vercel.app/ai-agent)**

The deployed application demonstrates:

**Payroll Data → SQL → Knowledge Graph → AI Agent → Evidence Diagnosis → Customer Support Experience**

---

## 24. Repository Deliverables

The repository contains:

- Synthetic payroll datasets
- Employee/payroll Knowledge Graph
- Payroll troubleshooting Knowledge Graph
- SQL + Knowledge Graph agent
- Natural-language payroll interface
- Evidence-based diagnosis engine
- FastAPI backend
- Next.js customer-support UI
- Golden evaluation datasets
- Diagnostic evaluation fixtures
- Evaluation results
- Product documentation

This project demonstrates product and technical design across:

- Knowledge Graphs
- Enterprise AI
- Payroll intelligence
- Grounded AI agents
- Evidence-based diagnosis
- AI evaluation
- Customer-support automation
- Human-verifiable AI systems