
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/* TYPES */

type Employee = {
  emp_id: string;
  name: string;
  hire_date: string;
  employment_type: string;
  country: string;
  jurisdiction: string;
  role: string;
  base_monthly_pay: string;
  flsa_status: string;
  ot_eligible: string;
  department: string;
};

type Triple = {
  subject: string;
  relationship: string;
  object: string;
};

type Identity = {
  source_system: string;
  source_employee_id: string;
  golden_emp_id: string;
  name: string;
  cluster_size: string;
  match_method: string;
};

type Review = {
  source_system: string;
  source_employee_id: string;
  name: string;
  best_match_score: string;
  reason: string;
  source_birth_date?: string;
  source_hire_date?: string;
  source_jurisdiction?: string;
  source_department?: string;
  source_shared_hr_reference?: string;
  candidate_golden_emp_id?: string;
  candidate_source_system?: string;
  candidate_source_employee_id?: string;
  candidate_name?: string;
  candidate_birth_date?: string;
  candidate_hire_date?: string;
  candidate_jurisdiction?: string;
  candidate_department?: string;
  candidate_shared_hr_reference?: string;
  second_best_match_score?: string;
};

type ReviewDecision = {
  case_id: string;
  source_system: string;
  source_employee_id: string;
  candidate_golden_emp_id: string;
  decision: "APPROVE" | "REJECT";
  reviewer: string;
  reason: string;
  timestamp: string;
};

type Finding = {
  type: string;
  severity: string;
  period: string;
  baseline_gross_pay: number;
  actual_gross_pay: number;
  change_percent: number;
  explanation: string;
};

type Investigation = {
  golden_id: string;
  employee: {
    emp_id: string;
    name: string;
    department: string;
  };
  payroll_events_reviewed: number;
  findings_count: number;
  findings: Finding[];
  summary: string;
  disclaimer: string;
};

/* STYLES */

const menu = [
  "Overview",
  "Employee 360",
  "Identity Resolution",
  "Knowledge Graph",
  "Payroll Anomalies",
  "Compliance",
  "Payroll QA",
  "AI Agent",
  "Evaluations",
];

const panel =
  "rounded-xl border border-slate-800 bg-slate-900 p-6";

const inputStyle =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500";

const primaryButton =
  "rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-blue-500";

/* MAIN APPLICATION */

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [triples, setTriples] = useState<Triple[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [employeeResponse, graphResponse] =
          await Promise.all([
            fetch("/data/employees.csv"),
            fetch("/data/payrollkg_triples.tsv"),
          ]);

        if (!employeeResponse.ok || !graphResponse.ok) {
          throw new Error(
            "Could not load the website's payroll data."
          );
        }

        setEmployees(
          parseCsv(await employeeResponse.text()) as Employee[]
        );

        setTriples(
          parseTriples(await graphResponse.text())
        );
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load data."
        );
      }
    }

    void load();
  }, []);

  const filteredEmployees = useMemo(() => {
    const term = search.toLowerCase().trim();

    return employees.filter((employee) =>
      [
        employee.emp_id,
        employee.name,
        employee.department,
        employee.role,
        employee.jurisdiction,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [employees, search]);

  const selectedEmployee = employees.find(
    (employee) => employee.emp_id === selectedId
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed left-0 top-0 z-20 h-screen w-64 border-r border-slate-800 bg-slate-950 p-5">
        <div className="mb-8">
          <h1 className="text-xl font-bold">
            Payroll Intelligence
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Knowledge Graph Platform
          </p>
        </div>

        <nav className="space-y-1">
          {menu.map((item) => (
            <button
              key={item}
              onClick={() => setActive(item)}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm ${
                active === item
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-5 right-5 rounded-lg border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs text-slate-500">
            Environment
          </p>
          <p className="mt-1 text-sm text-emerald-400">
            ● Synthetic PayrollKG
          </p>
        </div>
      </aside>

      <main className="ml-64 min-h-screen p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-400">
              PayrollKG
            </p>
            <h2 className="mt-1 text-3xl font-semibold">
              {active}
            </h2>
          </div>

          <span className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-400">
            Synthetic Payroll Environment
          </span>
        </header>

        {loadError && (
          <p className="mb-6 text-red-400">
            {loadError}
          </p>
        )}

        {active === "Overview" && (
          <Overview
            employeeCount={employees.length}
            graphCount={triples.length}
            navigate={setActive}
          />
        )}

        {active === "Employee 360" && (
          <div className="space-y-6">
            <section className={panel}>
              <h3 className="text-xl font-semibold">
                Employee Directory
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                {employees.length.toLocaleString()} employees
                in the current website dataset
              </p>

              <input
                className={`${inputStyle} mt-5`}
                placeholder="Search employee name, ID, role..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <div className="mt-5 max-h-[420px] overflow-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400">
                    <tr>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Jurisdiction</th>
                      <th className="p-3">Monthly Pay</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr
                        key={employee.emp_id}
                        className="border-t border-slate-800"
                      >
                        <td className="p-3">
                          <p className="font-medium">
                            {employee.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {employee.emp_id}
                          </p>
                        </td>

                        <td className="p-3">
                          {pretty(employee.role)}
                        </td>
                        <td className="p-3">
                          {employee.department}
                        </td>
                        <td className="p-3">
                          {employee.jurisdiction}
                        </td>
                        <td className="p-3">
                          {money(
                            Number(employee.base_monthly_pay)
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            className={secondaryButton}
                            onClick={() =>
                              setSelectedId(employee.emp_id)
                            }
                          >
                            View 360
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedEmployee && (
              <>
                <section className={panel}>
                  <p className="text-sm text-blue-400">
                    {selectedEmployee.emp_id}
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold">
                    {selectedEmployee.name}
                  </h3>
                  <p className="mt-1 text-slate-400">
                    {pretty(selectedEmployee.role)}
                  </p>

                  <div className="mt-6 grid grid-cols-4 gap-4">
                    <Detail
                      label="Department"
                      value={selectedEmployee.department}
                    />
                    <Detail
                      label="Country"
                      value={selectedEmployee.country}
                    />
                    <Detail
                      label="Jurisdiction"
                      value={selectedEmployee.jurisdiction}
                    />
                    <Detail
                      label="Hire Date"
                      value={selectedEmployee.hire_date}
                    />
                    <Detail
                      label="Monthly Pay"
                      value={money(
                        Number(
                          selectedEmployee.base_monthly_pay
                        )
                      )}
                    />
                    <Detail
                      label="Employment"
                      value={pretty(
                        selectedEmployee.employment_type
                      )}
                    />
                    <Detail
                      label="FLSA Status"
                      value={pretty(
                        selectedEmployee.flsa_status
                      )}
                    />
                    <Detail
                      label="OT Eligible"
                      value={selectedEmployee.ot_eligible}
                    />
                  </div>
                </section>

                <EmployeeGraph
                  employee={selectedEmployee}
                  triples={triples}
                />
              </>
            )}
          </div>
        )}

        {active === "Identity Resolution" && (
          <IdentityResolution />
        )}

        {active === "Knowledge Graph" && (
          <section className={panel}>
            <h3 className="text-xl font-semibold">
              Knowledge Graph Explorer
            </h3>
            <p className="mt-2 text-slate-400">
              Select an employee in Employee 360 to
              explore their connected relationships.
            </p>
            <button
              className={`${primaryButton} mt-5`}
              onClick={() => setActive("Employee 360")}
            >
              Open Employee 360
            </button>
          </section>
        )}

        {active === "AI Agent" && <AIAgent />}

        {![
          "Overview",
          "Employee 360",
          "Identity Resolution",
          "Knowledge Graph",
          "AI Agent",
        ].includes(active) && (
          <section className={panel}>
            <h3 className="text-xl font-semibold">
              {active}
            </h3>
            <p className="mt-2 text-slate-400">
              This module is planned for a future phase.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

/* OVERVIEW */

function Overview({
  employeeCount,
  graphCount,
  navigate,
}: {
  employeeCount: number;
  graphCount: number;
  navigate: (page: string) => void;
}) {
  const modules = [
    {
      name: "Employee 360",
      description:
        "Search employees and explore their payroll profiles.",
      status: "Live",
    },
    {
      name: "Identity Resolution",
      description:
        "Explore golden identities, source records and human review cases.",
      status: "CSV Workbench",
    },
    {
      name: "Knowledge Graph",
      description:
        "Visualize employee relationships and payroll entities.",
      status: "Live",
    },
    {
      name: "Payroll Anomalies",
      description: "Identify unusual payroll activity.",
      status: "Planned",
    },
    {
      name: "Compliance",
      description:
        "Explore payroll compliance requirements.",
      status: "Planned",
    },
    {
      name: "Payroll QA",
      description: "Ask questions about payroll data.",
      status: "Planned",
    },
    {
      name: "AI Agent",
      description:
        "View the saved payroll investigation report.",
      status: "Sample",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-4">
        <Metric
          label="Website Employees"
          value={employeeCount.toLocaleString()}
        />
        <Metric
          label="Graph Relationships"
          value={graphCount.toLocaleString()}
        />
        <Metric
          label="Platform Modules"
          value="7"
        />
      </div>

      <section>
        <h3 className="text-xl font-semibold">
          Payroll Intelligence Platform
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Employee intelligence, identity resolution,
          knowledge graphs and payroll investigations.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-4">
          {modules.map((module) => (
            <button
              key={module.name}
              onClick={() => navigate(module.name)}
              className={`${panel} text-left hover:border-blue-500`}
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold">
                  {module.name}
                </h4>
                <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                  {module.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {module.description}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* IDENTITY RESOLUTION */

function IdentityResolution() {
  const [identities, setIdentities] =
    useState<Identity[]>([]);
  const [reviews, setReviews] =
    useState<Review[]>([]);
  const [decisions, setDecisions] =
    useState<ReviewDecision[]>([]);
  const [decisionsLoaded, setDecisionsLoaded] =
    useState(false);

  const [query, setQuery] = useState("");
  const [selectedGoldenId, setSelectedGoldenId] =
    useState("");
  const [selectedReview, setSelectedReview] =
    useState<Review | null>(null);

  const [reviewer, setReviewer] = useState("");
  const [decisionReason, setDecisionReason] =
    useState("");
  const [savingDecision, setSavingDecision] =
    useState(false);
  const [loadingDecisions, setLoadingDecisions] =
    useState(false);
  const [error, setError] = useState("");
  const [decisionMessage, setDecisionMessage] =
    useState("");

  async function refreshDecisions() {
    setLoadingDecisions(true);

    try {
      const response = await fetch(
        "/api/identity-review",
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          "Could not load saved review decisions."
        );
      }

      const data = await response.json();

      if (!Array.isArray(data.decisions)) {
        throw new Error(
          "The review API returned invalid data."
        );
      }

      setDecisions(data.decisions as ReviewDecision[]);
      setDecisionsLoaded(true);
      setError("");
      return true;
    } catch (err) {
      setDecisionsLoaded(false);
      setError(
        err instanceof Error
          ? err.message
          : "Could not load saved decisions."
      );
      return false;
    } finally {
      setLoadingDecisions(false);
    }
  }

  useEffect(() => {
    async function loadInitialDecisions() {
      try {
        const response = await fetch(
          "/api/identity-review",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(
            "Could not load saved review decisions."
          );
        }

        const data = await response.json();

        if (!Array.isArray(data.decisions)) {
          throw new Error(
            "The review API returned invalid data."
          );
        }

        setDecisions(data.decisions as ReviewDecision[]);
        setDecisionsLoaded(true);
      } catch (err) {
        setDecisionsLoaded(false);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load saved decisions."
        );
      }
    }

    void loadInitialDecisions();
  }, []);

  const completedCaseIds = useMemo(
    () => new Set(
      decisions.map((item) => item.case_id)
    ),
    [decisions]
  );

  const pendingReviews = useMemo(
    () => reviews.filter(
      (review) =>
        !completedCaseIds.has(
          `${review.source_system}:${review.source_employee_id}`
        )
    ),
    [reviews, completedCaseIds]
  );

  const goldenCount = useMemo(
    () => new Set(
      identities.map((row) => row.golden_emp_id)
    ).size,
    [identities]
  );

  const filteredIdentities = useMemo(() => {
    const term = query.toLowerCase().trim();

    return identities.filter((row) =>
      [
        row.golden_emp_id,
        row.name,
        row.source_system,
        row.source_employee_id,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [identities, query]);

  const linkedRecords = identities.filter(
    (row) => row.golden_emp_id === selectedGoldenId
  );

  async function loadIdentities(file: File) {
    try {
      const rows = parseCsv(await file.text());
      const required = [
        "source_system",
        "source_employee_id",
        "golden_emp_id",
        "name",
      ];

      if (
        rows.length === 0 ||
        !required.every((field) => field in rows[0])
      ) {
        throw new Error(
          "Please select resolved_identities.csv."
        );
      }

      setIdentities(rows as Identity[]);
      setSelectedGoldenId("");
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not read identities."
      );
    }
  }

  async function loadReviews(file: File) {
    try {
      const rows = parseCsv(await file.text());
      const required = [
        "source_system",
        "source_employee_id",
        "name",
        "best_match_score",
      ];

      if (
        rows.length === 0 ||
        !required.every((field) => field in rows[0])
      ) {
        throw new Error(
          "Please select review_queue.csv."
        );
      }

      const refreshed = await refreshDecisions();

      if (!refreshed) {
        throw new Error(
          "Review CSV loaded, but saved decisions could not be checked. Retry when the API is available."
        );
      }

      setReviews(rows as Review[]);
      setSelectedReview(null);
      setDecisionMessage("");
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not read review queue."
      );
    }
  }

  function selectReview(review: Review) {
    setSelectedReview(review);
    setDecisionReason("");
    setDecisionMessage("");
    setError("");
  }

  async function submitDecision(
    decision: "APPROVE" | "REJECT"
  ) {
    if (!selectedReview || savingDecision) {
      return;
    }

    if (!decisionsLoaded) {
      setError(
        "Saved decisions must load before reviewing cases."
      );
      return;
    }

    if (!reviewer.trim()) {
      setError("Enter your reviewer name.");
      return;
    }

    if (!decisionReason.trim()) {
      setError("Enter a reason for your decision.");
      return;
    }

    if (
      decision === "APPROVE" &&
      !selectedReview.candidate_golden_emp_id?.trim()
    ) {
      setError(
        "This case has no proposed golden identity to approve."
      );
      return;
    }

    const caseId =
      `${selectedReview.source_system}:` +
      selectedReview.source_employee_id;

    if (completedCaseIds.has(caseId)) {
      setError(
        "This case has already been reviewed."
      );
      return;
    }

    setSavingDecision(true);
    setError("");
    setDecisionMessage("");

    try {
      const response = await fetch(
        "/api/identity-review",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_system:
              selectedReview.source_system,
            source_employee_id:
              selectedReview.source_employee_id,
            candidate_golden_emp_id:
              selectedReview.candidate_golden_emp_id || "",
            decision,
            reviewer: reviewer.trim(),
            reason: decisionReason.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          await refreshDecisions();
          setSelectedReview(null);
        }

        throw new Error(
          result.error ||
            `Could not save decision (${response.status}).`
        );
      }

      if (!result.success || !result.record) {
        throw new Error(
          "The server did not confirm the saved decision."
        );
      }

      const refreshed = await refreshDecisions();

      if (!refreshed) {
        setSelectedReview(null);
        setDecisionReason("");
        setDecisionMessage(
          "Decision saved, but the queue could not refresh. Retry loading the saved decisions."
        );
        return;
      }

      setSelectedReview(null);
      setDecisionReason("");
      setDecisionMessage(
        `${decision === "APPROVE" ? "Approval" : "Rejection"} ` +
          `recorded for ${caseId}. No golden identity was changed.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save review decision."
      );
    } finally {
      setSavingDecision(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className={panel}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">
              Identity Resolution Workbench
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Explore golden employee identities,
              source-system matches and uncertain cases.
            </p>
          </div>

          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
            Synthetic data
          </span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <Metric
            label="Golden Identities"
            value={goldenCount.toLocaleString()}
          />
          <Metric
            label="Resolved Source Records"
            value={identities.length.toLocaleString()}
          />
          <Metric
            label="Pending Human Review"
            value={
              decisionsLoaded
                ? pendingReviews.length.toLocaleString()
                : "—"
            }
          />
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Upload your CSV files to populate the workbench.
          Previously saved decisions are excluded from
          the pending queue.
        </p>

        {!decisionsLoaded && (
          <div className="mt-4 rounded-lg border border-amber-700 bg-amber-950/20 p-4">
            <p className="text-sm text-amber-300">
              Review decisions are unavailable.
              Approve and Reject are disabled until
              the backend responds.
            </p>
            <button
              className={`${secondaryButton} mt-3`}
              disabled={loadingDecisions}
              onClick={() => void refreshDecisions()}
            >
              {loadingDecisions
                ? "Retrying..."
                : "Retry Connection"}
            </button>
          </div>
        )}
      </section>

      <section className={panel}>
        <h3 className="text-lg font-semibold">
          Load Identity Resolution Results
        </h3>

        <p className="mt-2 text-sm text-slate-400">
          Select the CSV files generated by your Python
          identity resolution engine.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-5">
          <label className="rounded-lg border border-dashed border-slate-700 p-5">
            <span className="block font-medium">
              1. Resolved Identities
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              resolved_identities.csv
            </span>

            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-4 block w-full text-xs"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadIdentities(file);
              }}
            />

            {identities.length > 0 && (
              <p className="mt-3 text-sm text-emerald-400">
                {identities.length.toLocaleString()} records loaded
              </p>
            )}
          </label>

          <label className="rounded-lg border border-dashed border-slate-700 p-5">
            <span className="block font-medium">
              2. Human Review Queue
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              review_queue.csv
            </span>

            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-4 block w-full text-xs"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadReviews(file);
              }}
            />

            {reviews.length > 0 && (
              <p className="mt-3 text-sm text-emerald-400">
                {reviews.length.toLocaleString()} records loaded
              </p>
            )}
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-800 bg-red-950/20 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {decisionMessage && (
          <p className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-sm text-emerald-300">
            {decisionMessage}
          </p>
        )}
      </section>

      <section className={panel}>
        <h3 className="text-lg font-semibold">
          Golden Identity Explorer
        </h3>

        <input
          className={`${inputStyle} mt-4`}
          placeholder="Search GOLD-00069, employee name or source ID..."
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
        />

        {identities.length === 0 ? (
          <p className="mt-5 text-sm text-slate-400">
            Upload resolved_identities.csv to search
            your identity results.
          </p>
        ) : (
          <>
            <p className="mt-3 text-xs text-slate-500">
              {filteredIdentities.length.toLocaleString()} matching
              source records. Showing the first 100.
            </p>

            <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-3">Golden ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Source ID</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredIdentities
                    .slice(0, 100)
                    .map((row, index) => (
                      <tr
                        key={`${row.source_system}-${row.source_employee_id}-${index}`}
                        className="border-t border-slate-800"
                      >
                        <td className="p-3 text-blue-400">
                          {row.golden_emp_id}
                        </td>
                        <td className="p-3">
                          {row.name}
                        </td>
                        <td className="p-3">
                          {row.source_system}
                        </td>
                        <td className="p-3">
                          {row.source_employee_id}
                        </td>
                        <td className="p-3">
                          <button
                            className={secondaryButton}
                            onClick={() =>
                              setSelectedGoldenId(
                                row.golden_emp_id
                              )
                            }
                          >
                            View Matches
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {selectedGoldenId && (
        <section className={panel}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">
                {selectedGoldenId}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {linkedRecords.length} linked source records
              </p>
            </div>

            <button
              className={secondaryButton}
              onClick={() => setSelectedGoldenId("")}
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4">
            {linkedRecords.map((row, index) => (
              <div
                key={`${row.source_employee_id}-${index}`}
                className="rounded-lg border border-slate-700 bg-slate-950 p-4"
              >
                <p className="text-sm font-semibold text-blue-400">
                  {row.source_system}
                </p>
                <p className="mt-2 font-medium">
                  {row.name}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {row.source_employee_id}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Match method:{" "}
                  {pretty(row.match_method || "Unknown")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={panel}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">
              Human Review Queue
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Source identities requiring a human decision.
              Completed cases are excluded using the
              saved audit history.
            </p>
          </div>

          {reviews.length > 0 && decisionsLoaded && (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-400">
              {pendingReviews.length} pending
            </span>
          )}
        </div>

        {!decisionsLoaded ? (
          <p className="mt-5 text-sm text-amber-400">
            Connect to the review backend to load pending cases.
          </p>
        ) : reviews.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            Upload review_queue.csv to view pending cases.
          </p>
        ) : pendingReviews.length === 0 ? (
          <p className="mt-5 text-sm text-emerald-400">
            All uploaded review cases have recorded decisions.
          </p>
        ) : (
          <div className="mt-5 max-h-[480px] overflow-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-950 text-slate-400">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Source ID</th>
                  <th className="p-3">Best Score</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {pendingReviews.map((row, index) => {
                  const isSelected =
                    selectedReview?.source_system ===
                      row.source_system &&
                    selectedReview?.source_employee_id ===
                      row.source_employee_id;

                  return (
                    <tr
                      key={`${row.source_system}-${row.source_employee_id}-${index}`}
                      className={`border-t border-slate-800 ${
                        isSelected
                          ? "bg-blue-950/40"
                          : ""
                      }`}
                    >
                      <td className="p-3 font-medium">
                        {row.name}
                      </td>
                      <td className="p-3">
                        {row.source_system}
                      </td>
                      <td className="p-3">
                        {row.source_employee_id}
                      </td>
                      <td className="p-3 font-semibold text-amber-400">
                        {formatScore(
                          row.best_match_score
                        )}
                      </td>
                      <td className="p-3">
                        {pretty(
                          row.reason || "Review required"
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          className={
                            isSelected
                              ? "rounded-lg bg-blue-600 px-3 py-2 text-xs text-white"
                              : "rounded-lg border border-blue-500 px-3 py-2 text-xs text-blue-400 hover:bg-blue-600 hover:text-white"
                          }
                          onClick={() => selectReview(row)}
                        >
                          {isSelected
                            ? "Selected"
                            : "View Case"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Human decisions are saved locally through
          the review API. They do not directly change
          golden identity clusters.
        </p>
      </section>

      {selectedReview && (
        <section
          id="identity-review-case"
          className={`${panel} border-blue-600`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-400">
                Selected Human Review Case
              </p>
              <h3 className="mt-2 text-2xl font-semibold">
                {selectedReview.name}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Inspect the incoming identity and its
                proposed matching golden identity.
              </p>
            </div>

            <button
              className={secondaryButton}
              onClick={() => setSelectedReview(null)}
            >
              Close
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-amber-700/40 bg-amber-950/20 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-300">
                  Best Match Score
                </p>
                <p className="mt-1 text-3xl font-semibold text-amber-400">
                  {formatScore(
                    selectedReview.best_match_score
                  )}
                </p>
              </div>

              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-400">
                Manual Review Required
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-300">
              {pretty(
                selectedReview.reason ||
                  "Ambiguous attribute match"
              )}
            </p>
          </div>

          <IdentityComparison review={selectedReview} />

          <div className="mt-6 border-t border-slate-800 pt-6">
            <h4 className="text-lg font-semibold">
              Review Actions
            </h4>

            <p className="mt-2 text-sm text-slate-400">
              Record your decision and justification.
              Approval records a human decision only;
              it does not automatically merge identities.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="reviewer-name"
                  className="mb-2 block text-sm font-medium"
                >
                  Reviewer name
                </label>
                <input
                  id="reviewer-name"
                  className={inputStyle}
                  placeholder="Enter your name"
                  value={reviewer}
                  disabled={savingDecision}
                  onChange={(event) =>
                    setReviewer(event.target.value)
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="decision-reason"
                  className="mb-2 block text-sm font-medium"
                >
                  Decision reason
                </label>
                <textarea
                  id="decision-reason"
                  className={inputStyle}
                  rows={3}
                  placeholder="Explain the evidence for your decision"
                  value={decisionReason}
                  disabled={savingDecision}
                  onChange={(event) =>
                    setDecisionReason(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={
                  savingDecision ||
                  !decisionsLoaded ||
                  !reviewer.trim() ||
                  !decisionReason.trim() ||
                  !selectedReview.candidate_golden_emp_id?.trim()
                }
                onClick={() =>
                  void submitDecision("APPROVE")
                }
              >
                {savingDecision
                  ? "Saving..."
                  : "Approve Merge"}
              </button>

              <button
                className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={
                  savingDecision ||
                  !decisionsLoaded ||
                  !reviewer.trim() ||
                  !decisionReason.trim()
                }
                onClick={() =>
                  void submitDecision("REJECT")
                }
              >
                {savingDecision
                  ? "Saving..."
                  : "Reject Merge"}
              </button>

              <span className="rounded-lg border border-amber-700 px-5 py-2.5 text-sm text-amber-400">
                Pending Investigation
              </span>
            </div>

            {!selectedReview.candidate_golden_emp_id && (
              <p className="mt-3 text-xs text-amber-400">
                This case has no proposed golden identity.
                Approval is unavailable, but rejection
                can still be recorded.
              </p>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-400">
                {error}
              </p>
            )}
          </div>
        </section>
      )}

      <section className={panel}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">
              Human Review Audit History
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Decisions recorded by the local review API.
            </p>
          </div>

          <button
            className={secondaryButton}
            disabled={loadingDecisions}
            onClick={() => void refreshDecisions()}
          >
            {loadingDecisions
              ? "Refreshing..."
              : "Refresh History"}
          </button>
        </div>

        {decisions.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            No saved review decisions yet.
          </p>
        ) : (
          <div className="mt-5 max-h-80 overflow-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-950 text-slate-400">
                <tr>
                  <th className="p-3">Case ID</th>
                  <th className="p-3">Candidate</th>
                  <th className="p-3">Decision</th>
                  <th className="p-3">Reviewer</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>

              <tbody>
                {[...decisions].reverse().map(
                  (decision, index) => (
                    <tr
                      key={`${decision.case_id}-${index}`}
                      className="border-t border-slate-800"
                    >
                      <td className="p-3">
                        {decision.case_id}
                      </td>
                      <td className="p-3">
                        {decision.candidate_golden_emp_id ||
                          "None"}
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            decision.decision === "APPROVE"
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          {decision.decision}
                        </span>
                      </td>
                      <td className="p-3">
                        {decision.reviewer}
                      </td>
                      <td className="p-3">
                        {decision.reason}
                      </td>
                      <td className="p-3 text-slate-400">
                        {new Date(
                          decision.timestamp
                        ).toLocaleString()}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Local development only. A production deployment
          requires a persistent database, authentication,
          and concurrency-safe decision handling.
        </p>
      </section>
    </div>
  );
}

/* SIDE-BY-SIDE IDENTITY COMPARISON */

type ComparisonStatus =
  | "match"
  | "different"
  | "missing";

function comparisonStatus(
  left: string,
  right: string
): ComparisonStatus {
  if (!left.trim() || !right.trim()) {
    return "missing";
  }

  return left.trim().toLowerCase() ===
    right.trim().toLowerCase()
    ? "match"
    : "different";
}

function IdentityComparison({
  review,
}: {
  review: Review;
}) {
  const hasCandidate = Boolean(
    review.candidate_golden_emp_id?.trim()
  );

  const fields = [
    {
      label: "Employee name",
      source: review.name,
      candidate: review.candidate_name,
    },
    {
      label: "Birth date",
      source: review.source_birth_date,
      candidate: review.candidate_birth_date,
    },
    {
      label: "Hire date",
      source: review.source_hire_date,
      candidate: review.candidate_hire_date,
    },
    {
      label: "Jurisdiction",
      source: review.source_jurisdiction,
      candidate: review.candidate_jurisdiction,
    },
    {
      label: "Department",
      source: review.source_department,
      candidate: review.candidate_department,
    },
    {
      label: "Shared HR reference",
      source: review.source_shared_hr_reference,
      candidate:
        review.candidate_shared_hr_reference,
    },
  ];

  const colors: Record<
    ComparisonStatus,
    string
  > = {
    match:
      "border-emerald-700/50 bg-emerald-950/20 text-emerald-300",
    different:
      "border-red-700/50 bg-red-950/20 text-red-300",
    missing:
      "border-amber-700/50 bg-amber-950/20 text-amber-300",
  };

  const labels: Record<
    ComparisonStatus,
    string
  > = {
    match: "Matching",
    different: "Different",
    missing: "Missing data",
  };

  const counts = {
    match: 0,
    different: 0,
    missing: 0,
  };

  for (const field of fields) {
    counts[
      comparisonStatus(
        field.source || "",
        field.candidate || ""
      )
    ]++;
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-lg font-semibold">
          Source vs. Proposed Golden Identity
        </h4>

        {hasCandidate && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-950 px-3 py-1 text-emerald-300">
              {counts.match} matching
            </span>
            <span className="rounded-full bg-red-950 px-3 py-1 text-red-300">
              {counts.different} different
            </span>
            <span className="rounded-full bg-amber-950 px-3 py-1 text-amber-300">
              {counts.missing} missing
            </span>
          </div>
        )}
      </div>

      {!hasCandidate ? (
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-5">
          <p className="font-medium text-amber-300">
            No proposed candidate available
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {review.reason ||
              "This case needs manual investigation."}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Detail
              label="Incoming employee"
              value={review.name}
            />
            <Detail
              label="Source ID"
              value={`${review.source_system} · ${review.source_employee_id}`}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-blue-700/50 bg-blue-950/20 p-5">
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-300">
                Incoming source record
              </span>
              <h5 className="mt-2 text-xl font-semibold">
                {review.name}
              </h5>
              <p className="mt-1 break-all text-sm text-slate-400">
                {review.source_system} ·{" "}
                {review.source_employee_id}
              </p>
            </div>

            <div className="rounded-xl border border-violet-700/50 bg-violet-950/20 p-5">
              <span className="text-xs font-semibold uppercase tracking-wide text-violet-300">
                Proposed matching identity
              </span>
              <h5 className="mt-2 text-xl font-semibold">
                {review.candidate_name ||
                  "Name unavailable"}
              </h5>
              <p className="mt-1 text-sm font-medium text-violet-300">
                {review.candidate_golden_emp_id}
              </p>
              <p className="mt-1 break-all text-sm text-slate-400">
                {review.candidate_source_system ||
                  "Unknown source"}{" "}
                ·{" "}
                {review.candidate_source_employee_id ||
                  "Unknown ID"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="p-4">Attribute</th>
                  <th className="p-4">Incoming record</th>
                  <th className="p-4">Proposed match</th>
                  <th className="p-4">Evidence</th>
                </tr>
              </thead>

              <tbody>
                {fields.map((field) => {
                  const status =
                    comparisonStatus(
                      field.source || "",
                      field.candidate || ""
                    );

                  return (
                    <tr
                      key={field.label}
                      className="border-t border-slate-800"
                    >
                      <th className="p-4 font-medium text-slate-300">
                        {field.label}
                      </th>

                      <td className="p-4">
                        {field.source || (
                          <span className="text-amber-400">
                            Not provided
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {field.candidate || (
                          <span className="text-amber-400">
                            Not provided
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-block rounded-md border px-2 py-1 text-xs ${colors[status]}`}
                        >
                          {labels[status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Detail
              label="Best heuristic match score"
              value={
                review.best_match_score ||
                "Not available"
              }
            />
            <Detail
              label="Second-best heuristic score"
              value={
                review.second_best_match_score ||
                "Not available"
              }
            />
          </div>

          <p className="text-xs leading-5 text-slate-400">
            Scores are heuristic matching values,
            not probabilities. Missing fields are
            not treated as conflicts. This is a
            proposed match only; no merge has
            been performed.
          </p>
        </>
      )}
    </div>
  );
}

/* AI AGENT — SAVED SAMPLE REPORT */

function AIAgent() {
  const [report, setReport] =
    useState<Investigation | null>(null);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  async function investigate() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/investigate",
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          `Investigation API returned ${response.status}`
        );
      }

      const data =
        (await response.json()) as Investigation;

      setReport(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the report."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className={panel}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">
              Payroll Investigation
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Retrieve the saved investigation
              report through your Next.js API.
            </p>
          </div>

          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
            Sample Report
          </span>
        </div>

        <div className="mt-6 rounded-lg border border-slate-700 bg-slate-950 p-4">
          <p className="font-semibold">
            Layla Parker
          </p>
          <p className="mt-1 text-sm text-slate-400">
            GOLD-00069 · EMP-00101
          </p>
        </div>

        <button
          className={`${primaryButton} mt-5`}
          disabled={loading}
          onClick={() => void investigate()}
        >
          {loading
            ? "Loading..."
            : "View Investigation Report"}
        </button>

        {error && (
          <p className="mt-4 text-red-400">
            {error}
          </p>
        )}
      </section>

      {report && (
        <section className={panel}>
          <h3 className="text-2xl font-semibold">
            {report.employee.name}
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            {report.golden_id} ·{" "}
            {report.employee.department}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <Detail
              label="Payroll Events Reviewed"
              value={String(
                report.payroll_events_reviewed
              )}
            />
            <Detail
              label="Potential Exceptions"
              value={String(
                report.findings_count
              )}
            />
          </div>

          {report.findings.map(
            (finding, index) => (
              <div
                key={index}
                className="mt-6 rounded-xl border border-amber-700/50 bg-amber-950/20 p-5"
              >
                <p className="font-semibold text-amber-400">
                  {pretty(finding.type)} ·{" "}
                  {pretty(finding.severity)} severity
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Period: {finding.period}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-4">
                  <Detail
                    label="Historical Baseline"
                    value={money(
                      finding.baseline_gross_pay
                    )}
                  />
                  <Detail
                    label="Actual Gross Pay"
                    value={money(
                      finding.actual_gross_pay
                    )}
                  />
                  <Detail
                    label="Change"
                    value={`${finding.change_percent}%`}
                  />
                </div>

                <p className="mt-5 text-sm text-slate-300">
                  {finding.explanation}
                </p>
              </div>
            )
          )}

          <p className="mt-5 text-sm">
            {report.summary}
          </p>

          <p className="mt-3 text-xs text-slate-500">
            {report.disclaimer}
          </p>
        </section>
      )}
    </div>
  );
}

/* EMPLOYEE KNOWLEDGE GRAPH */

function EmployeeGraph({
  employee,
  triples,
}: {
  employee: Employee;
  triples: Triple[];
}) {
  const relationships = triples.filter(
    (row) => row.subject === employee.emp_id
  );

  const nodes: Node[] = [
    {
      id: employee.emp_id,
      position: { x: 360, y: 220 },
      data: {
        label: `${employee.name}\n${employee.emp_id}`,
      },
      style: {
        background: "#2563eb",
        color: "white",
        border: "1px solid #60a5fa",
        borderRadius: 12,
        padding: 14,
        width: 180,
        textAlign: "center",
      },
    },
  ];

  const edges: Edge[] = [];

  relationships.forEach((row, index) => {
    const angle =
      (index /
        Math.max(relationships.length, 1)) *
      Math.PI *
      2;

    const id = `node-${index}`;

    nodes.push({
      id,
      position: {
        x: 360 + Math.cos(angle) * 260,
        y: 220 + Math.sin(angle) * 260,
      },
      data: {
        label: pretty(row.object),
      },
      style: {
        background: "#0f172a",
        color: "#e2e8f0",
        border: "1px solid #475569",
        borderRadius: 10,
        padding: 12,
        width: 160,
        textAlign: "center",
      },
    });

    edges.push({
      id: `edge-${index}`,
      source: employee.emp_id,
      target: id,
      label: row.relationship,
      style: {
        stroke: "#64748b",
      },
      labelStyle: {
        fill: "#94a3b8",
        fontSize: 11,
      },
    });
  });

  return (
    <section className={panel}>
      <h3 className="text-xl font-semibold">
        Employee Knowledge Graph
      </h3>

      <p className="mt-2 text-sm text-slate-400">
        {relationships.length} relationships
        connected to {employee.emp_id}
      </p>

      <div className="mt-5 h-[620px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.25 }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </section>
  );
}

/* REUSABLE COMPONENTS */

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={panel}>
      <p className="text-sm text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-950 p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">
        {value || "Not available"}
      </p>
    </div>
  );
}

/* FORMATTING */

function money(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function pretty(value: string): string {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatScore(value: string): string {
  if (!value?.trim()) {
    return "N/A";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  if (number >= 0 && number <= 1) {
    return `${(number * 100).toFixed(1)}%`;
  }

  return `${number.toFixed(1)}%`;
}

/* CSV PARSER */

function parseCsv(
  text: string
): Record<string, string>[] {
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];

    if (char === '"') {
      if (
        quoted &&
        cleanText[i + 1] === '"'
      ) {
        current += '""';
        i++;
      } else {
        quoted = !quoted;
        current += char;
      }
    } else if (
      (char === "\n" || char === "\r") &&
      !quoted
    ) {
      if (current.trim()) {
        lines.push(current);
      }

      current = "";

      if (
        char === "\r" &&
        cleanText[i + 1] === "\n"
      ) {
        i++;
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    lines.push(current);
  }

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map(
    (header) => header.trim()
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function parseCsvLine(
  line: string
): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (
        quoted &&
        line[i + 1] === '"'
      ) {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (
      char === "," &&
      !quoted
    ) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

/* GRAPH TSV PARSER */

function parseTriples(
  text: string
): Triple[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const [
        subject,
        relationship,
        object,
      ] = line.split("\t");

      return {
        subject: subject?.trim() ?? "",
        relationship:
          relationship?.trim() ?? "",
        object: object?.trim() ?? "",
      };
    })
    .filter(
      (row) =>
        row.subject &&
        row.relationship &&
        row.object
    );
}