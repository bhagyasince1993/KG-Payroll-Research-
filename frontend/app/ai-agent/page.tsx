"use client";

import { useState, type FormEvent } from "react";

type Relationship = {
  subject: string;
  predicate: string;
  object: string;
};

type AgentResponse = {
  status: string;
  question?: string;
  employee_id?: string;
  intent?: string;
  answer?: string;
  tools_used?: string[];
  error?: string;
  evidence?: {
    employee?: {
      emp_id?: string;
      name?: string;
      department?: string;
      jurisdiction?: string;
      role?: string;
    };
    payroll_summary?: {
      event_count?: number;
      total_overtime_hours?: number;
      total_gross_pay?: number;
      total_net_pay?: number;
      flagged_events?: number;
    };
    graph_relationships?: Relationship[];
  };
  limitations?: string[];
};

type DiagnosisResponse = {
  diagnosis_status?: string;
  cause_id?: string | null;
  resolution_id?: string | null;
  recommended_action?: string | null;
  required_follow_up?: string[];
  note?: string;
  error?: string;
};

const symptoms = [
  {
    id: "SYMPTOM:MISSING_OVERTIME",
    label: "Missing Overtime",
  },
  {
    id: "SYMPTOM:UNEXPECTED_DEDUCTIONS",
    label: "Unexpected Deductions",
  },
  {
    id: "SYMPTOM:WRONG_PAYGROUP",
    label: "Wrong Paygroup",
  },
  {
    id: "SYMPTOM:DUPLICATE_PAYMENT",
    label: "Duplicate Payment",
  },
  {
    id: "SYMPTOM:MISSING_PAYROLL_RECORD",
    label: "Missing Payroll Record",
  },
];

const sampleEvidence = `{
  "approved_overtime_hours": 8,
  "approval_timestamp": "2026-09-04T16:00:00",
  "payroll_cutoff": "2026-09-03T17:00:00",
  "paid_overtime_hours": 0,
  "next_cycle_policy": "Approved overtime after cutoff is paid in the next cycle"
}`;

export default function AIAgentPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGraph, setShowGraph] = useState(false);

  const [symptomId, setSymptomId] = useState(
    "SYMPTOM:MISSING_OVERTIME"
  );
  const [evidenceText, setEvidenceText] = useState(sampleEvidence);
  const [diagnosis, setDiagnosis] =
    useState<DiagnosisResponse | null>(null);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState("");

  async function askAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = question.trim();

    if (!text || loading) return;

    setLoading(true);
    setError("");
    setResult(null);
    setShowGraph(false);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: text,
        }),
      });

      const data: AgentResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "The AI Agent could not process your question."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  async function runDiagnosis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (diagnosisLoading) return;

    setDiagnosisLoading(true);
    setDiagnosisError("");
    setDiagnosis(null);

    try {
      let evidence: Record<string, unknown>;

      try {
        evidence = JSON.parse(evidenceText);
      } catch {
        throw new Error(
          "Evidence must be valid JSON. Try the sample evidence."
        );
      }

      if (
        typeof evidence !== "object" ||
        evidence === null ||
        Array.isArray(evidence)
      ) {
        throw new Error("Evidence must be a JSON object.");
      }

      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symptom_id: symptomId,
          evidence,
        }),
      });

      const data: DiagnosisResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "The diagnosis could not be completed."
        );
      }

      setDiagnosis(data);
    } catch (err) {
      setDiagnosisError(
        err instanceof Error
          ? err.message
          : "An unexpected diagnosis error occurred."
      );
    } finally {
      setDiagnosisLoading(false);
    }
  }

  const employee = result?.evidence?.employee;
  const summary = result?.evidence?.payroll_summary;
  const relationships =
    result?.evidence?.graph_relationships ?? [];

  function formatMoney(value: number | undefined) {
    if (value === undefined || value === null) {
      return "N/A";
    }

    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }

  function cleanId(value: string | null | undefined) {
    if (!value) return "Not confirmed";

    return value
      .replace("CAUSE:", "")
      .replace("RESOLUTION:", "")
      .replaceAll("_", " ");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <a
            href="/"
            className="text-sm font-medium text-sky-400 hover:text-sky-300"
          >
            ← Back to PayrollKG Dashboard
          </a>

          <div className="mt-10 inline-flex rounded-full border border-sky-800 bg-sky-950 px-4 py-2 text-xs font-semibold text-sky-300">
            PAYROLLKG · SQL + KNOWLEDGE GRAPH + EVIDENCE DIAGNOSIS
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
            Payroll Intelligence AI Agent
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-400">
            Ask payroll questions, retrieve payroll evidence, explore
            Knowledge Graph relationships, and diagnose payroll issues
            using case-specific evidence.
          </p>
        </header>

        {/* ASK PAYROLL AI */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl md:p-8">
          <h2 className="text-xl font-semibold">Ask Payroll AI</h2>

          <p className="mt-2 text-sm text-slate-400">
            Enter an employee ID in your question. This version supports
            overtime, gross pay, net pay, anomaly flags, department and
            role.
          </p>

          <form onSubmit={askAgent} className="mt-6">
            <label
              htmlFor="payroll-question"
              className="mb-3 block text-sm font-medium text-slate-300"
            >
              Your question
            </label>

            <textarea
              id="payroll-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="How many overtime hours did EMP-00001 work?"
              maxLength={1000}
              rows={4}
              className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 text-white outline-none placeholder:text-slate-500 focus:border-sky-500"
            />

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() =>
                  setQuestion(
                    "How many overtime hours did EMP-00001 work?"
                  )
                }
                className="text-sm font-medium text-sky-400 hover:text-sky-300"
              >
                Try an example question
              </button>

              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="rounded-xl bg-sky-500 px-7 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Investigating..." : "Ask AI"}
              </button>
            </div>
          </form>
        </section>

        {error && (
          <section
            role="alert"
            className="mt-6 rounded-xl border border-red-800 bg-red-950 p-5 text-red-200"
          >
            {error}
          </section>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold tracking-wider text-sky-400">
                  AGENT RESPONSE
                </span>

                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {result.status}
                </span>
              </div>

              <p className="mt-5 text-xl font-medium leading-relaxed">
                {result.answer || "No answer was returned."}
              </p>

              {result.intent && (
                <p className="mt-5 text-sm text-slate-400">
                  Recognized intent:{" "}
                  <span className="font-semibold text-slate-200">
                    {result.intent}
                  </span>
                </p>
              )}

              {result.tools_used &&
                result.tools_used.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {result.tools_used.map((tool) => (
                      <span
                        key={tool}
                        className="rounded-full border border-sky-900 bg-sky-950 px-3 py-1 text-xs text-sky-300"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
            </section>

            {employee && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-xl font-semibold">
                  Employee Information
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Info
                    label="Employee"
                    value={employee.name || "N/A"}
                  />
                  <Info
                    label="Employee ID"
                    value={employee.emp_id || "N/A"}
                  />
                  <Info
                    label="Department"
                    value={employee.department || "N/A"}
                  />
                  <Info
                    label="Role"
                    value={
                      employee.role
                        ? employee.role.replaceAll("_", " ")
                        : "N/A"
                    }
                  />
                  <Info
                    label="Jurisdiction"
                    value={employee.jurisdiction || "N/A"}
                  />
                </div>
              </section>
            )}

            {summary && (
              <section>
                <h2 className="mb-5 text-xl font-semibold">
                  SQL Payroll Evidence
                </h2>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Metric
                    label="Payroll Events"
                    value={summary.event_count ?? "N/A"}
                  />

                  <Metric
                    label="Overtime Hours"
                    value={summary.total_overtime_hours ?? "N/A"}
                  />

                  <Metric
                    label="Total Gross Pay"
                    value={formatMoney(summary.total_gross_pay)}
                  />

                  <Metric
                    label="Total Net Pay"
                    value={formatMoney(summary.total_net_pay)}
                  />

                  <Metric
                    label="Flagged Events"
                    value={summary.flagged_events ?? "N/A"}
                  />
                </div>
              </section>
            )}

            {relationships.length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Knowledge Graph Evidence
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      {relationships.length} retrieved relationships
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGraph(!showGraph)}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
                  >
                    {showGraph
                      ? "Hide Relationships"
                      : "Show Relationships"}
                  </button>
                </div>

                {showGraph && (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="py-3 pr-5">Subject</th>
                          <th className="py-3 pr-5">
                            Relationship
                          </th>
                          <th className="py-3">Object</th>
                        </tr>
                      </thead>

                      <tbody>
                        {relationships.map(
                          (relationship, index) => (
                            <tr
                              key={`${relationship.subject}-${relationship.predicate}-${index}`}
                              className="border-b border-slate-800"
                            >
                              <td className="py-3 pr-5">
                                {relationship.subject}
                              </td>

                              <td className="py-3 pr-5 text-sky-300">
                                {relationship.predicate}
                              </td>

                              <td className="py-3">
                                {relationship.object}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {result.limitations &&
              result.limitations.length > 0 && (
                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <h2 className="text-lg font-semibold">
                    Investigation Limitations
                  </h2>

                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-400">
                    {result.limitations.map(
                      (limitation, index) => (
                        <li key={index}>{limitation}</li>
                      )
                    )}
                  </ul>
                </section>
              )}
          </div>
        )}

        {/* EVIDENCE-BASED DIAGNOSIS */}
        <section className="mt-10 rounded-2xl border border-emerald-900 bg-slate-900 p-6 shadow-xl md:p-8">
          <div className="inline-flex rounded-full border border-emerald-900 bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-300">
            PAYROLL ASSIST
          </div>

          <h2 className="mt-4 text-2xl font-semibold">
            Evidence-Based Payroll Diagnosis
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            Select a payroll symptom and provide case-specific evidence.
            The diagnostic engine checks that evidence against the
            troubleshooting Knowledge Graph. If the evidence cannot
            establish a cause, the agent abstains and requests the
            missing information.
          </p>

          <form onSubmit={runDiagnosis} className="mt-7">
            <label
              htmlFor="symptom"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Payroll symptom
            </label>

            <select
              id="symptom"
              value={symptomId}
              onChange={(event) => {
                setSymptomId(event.target.value);
                setDiagnosis(null);
                setDiagnosisError("");
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-white outline-none focus:border-emerald-500"
            >
              {symptoms.map((symptom) => (
                <option key={symptom.id} value={symptom.id}>
                  {symptom.label}
                </option>
              ))}
            </select>

            <div className="mt-6 flex items-center justify-between gap-4">
              <label
                htmlFor="diagnosis-evidence"
                className="block text-sm font-medium text-slate-300"
              >
                Case evidence (JSON)
              </label>

              <button
                type="button"
                onClick={() => {
                  setSymptomId("SYMPTOM:MISSING_OVERTIME");
                  setEvidenceText(sampleEvidence);
                  setDiagnosis(null);
                  setDiagnosisError("");
                }}
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
              >
                Load sample evidence
              </button>
            </div>

            <textarea
              id="diagnosis-evidence"
              value={evidenceText}
              onChange={(event) =>
                setEvidenceText(event.target.value)
              }
              rows={11}
              spellCheck={false}
              className="mt-3 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none focus:border-emerald-500"
            />

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={
                  diagnosisLoading || !evidenceText.trim()
                }
                className="rounded-xl bg-emerald-500 px-7 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {diagnosisLoading
                  ? "Diagnosing..."
                  : "Run Diagnosis"}
              </button>
            </div>
          </form>
        </section>

        {diagnosisError && (
          <section
            role="alert"
            className="mt-6 rounded-xl border border-red-800 bg-red-950 p-5 text-red-200"
          >
            {diagnosisError}
          </section>
        )}

        {diagnosis && (
          <section className="mt-6 rounded-2xl border border-emerald-900 bg-slate-900 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-wider text-emerald-400">
                  DIAGNOSTIC RESULT
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  {diagnosis.diagnosis_status ===
                  "SUPPORTED_BY_CASE_EVIDENCE"
                    ? "Cause supported by case evidence"
                    : "More evidence required"}
                </h2>
              </div>

              <span className="rounded-full border border-emerald-900 bg-emerald-950 px-4 py-2 text-xs font-semibold text-emerald-300">
                {diagnosis.diagnosis_status?.replaceAll(
                  "_",
                  " "
                ) || "UNKNOWN"}
              </span>
            </div>

            {diagnosis.diagnosis_status ===
            "SUPPORTED_BY_CASE_EVIDENCE" ? (
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <DiagnosisCard
                  label="Supported Cause"
                  value={cleanId(diagnosis.cause_id)}
                />

                <DiagnosisCard
                  label="Resolution"
                  value={cleanId(diagnosis.resolution_id)}
                />

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 md:col-span-2">
                  <p className="text-sm text-slate-400">
                    Recommended Action
                  </p>

                  <p className="mt-3 font-medium leading-relaxed text-slate-100">
                    {diagnosis.recommended_action ||
                      "No action returned."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-7 rounded-xl border border-amber-900 bg-amber-950/30 p-5">
                <h3 className="font-semibold text-amber-300">
                  Diagnosis intentionally abstained
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  The supplied evidence does not establish one
                  supported root cause. Collect the following evidence
                  before confirming a diagnosis.
                </p>

                {diagnosis.required_follow_up &&
                  diagnosis.required_follow_up.length > 0 && (
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-300">
                      {diagnosis.required_follow_up.map(
                        (item, index) => (
                          <li key={index}>{item}</li>
                        )
                      )}
                    </ul>
                  )}
              </div>
            )}

            {diagnosis.note && (
              <p className="mt-6 border-t border-slate-800 pt-5 text-xs leading-relaxed text-slate-500">
                {diagnosis.note}
              </p>
            )}
          </section>
        )}

        <footer className="mt-12 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          PayrollKG Portfolio Project · Synthetic Payroll Data ·
          Rule-Based NLP + Read-Only SQL + Knowledge Graph +
          Evidence-Based Diagnosis
        </footer>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function DiagnosisCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-lg font-semibold capitalize text-emerald-300">
        {value.toLowerCase()}
      </p>
    </div>
  );
}