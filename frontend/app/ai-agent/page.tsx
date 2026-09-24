
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

export default function AIAgentPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGraph, setShowGraph] = useState(false);

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
            PAYROLLKG · SQL + KNOWLEDGE GRAPH
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
            Payroll Intelligence AI Agent
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-400">
            Ask payroll questions in natural language and explore
            evidence retrieved from payroll records and employee
            relationships.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl md:p-8">
          <h2 className="text-xl font-semibold">
            Ask Payroll AI
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Enter an employee ID in your question. This version
            supports overtime, gross pay, net pay, anomaly flags,
            department and role.
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
              onChange={(event) =>
                setQuestion(event.target.value)
              }
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
                  <div>
                    <p className="text-sm text-slate-400">
                      Employee
                    </p>
                    <p className="mt-1 font-semibold">
                      {employee.name || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">
                      Employee ID
                    </p>
                    <p className="mt-1 font-semibold">
                      {employee.emp_id || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">
                      Department
                    </p>
                    <p className="mt-1 font-semibold">
                      {employee.department || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">
                      Role
                    </p>
                    <p className="mt-1 font-semibold">
                      {employee.role
                        ? employee.role.replaceAll("_", " ")
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400">
                      Jurisdiction
                    </p>
                    <p className="mt-1 font-semibold">
                      {employee.jurisdiction || "N/A"}
                    </p>
                  </div>
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
                    value={
                      summary.total_overtime_hours ?? "N/A"
                    }
                  />

                  <Metric
                    label="Total Gross Pay"
                    value={formatMoney(
                      summary.total_gross_pay
                    )}
                  />

                  <Metric
                    label="Total Net Pay"
                    value={formatMoney(
                      summary.total_net_pay
                    )}
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
                      {relationships.length} retrieved
                      relationships
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowGraph(!showGraph)
                    }
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
                          <th className="py-3 pr-5">
                            Subject
                          </th>
                          <th className="py-3 pr-5">
                            Relationship
                          </th>
                          <th className="py-3">
                            Object
                          </th>
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
                        <li key={index}>
                          {limitation}
                        </li>
                      )
                    )}
                  </ul>
                </section>
              )}
          </div>
        )}

        <footer className="mt-12 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          PayrollKG Portfolio Project · Synthetic Payroll
          Data · Rule-Based NLP + Read-Only SQL +
          Knowledge Graph
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
      <p className="text-sm text-slate-400">
        {label}
      </p>

      <p className="mt-3 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}