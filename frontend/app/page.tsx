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
  is_ghost: string;
};

type Triple = {
  subject: string;
  relationship: string;
  object: string;
};

const menuItems = [
  "Overview",
  "Employee 360",
  "Knowledge Graph",
  "Payroll Anomalies",
  "Compliance",
  "Payroll QA",
  "AI Agent",
  "Evaluations",
];

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [triples, setTriples] = useState<Triple[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      const employeeText = await fetch("/data/employees.csv").then((r) =>
        r.text()
      );

      const tripleText = await fetch("/data/payrollkg_triples.tsv").then((r) =>
        r.text()
      );

      setEmployees(parseEmployees(employeeText));
      setTriples(parseTriples(tripleText));
    }

    loadData();
  }, []);

  const selectedEmployee = employees.find(
    (employee) => employee.emp_id === selectedId
  );

  const filteredEmployees = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return employees;

    return employees.filter((employee) =>
      [
        employee.emp_id,
        employee.name,
        employee.role,
        employee.department,
        employee.jurisdiction,
      ]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [employees, search]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed left-0 top-0 z-20 h-screen w-64 border-r border-slate-800 bg-slate-950 p-5">
        <div className="mb-8">
          <div className="text-xl font-bold">Payroll Intelligence</div>
          <div className="mt-1 text-xs text-slate-500">
            Knowledge Graph Platform
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item}
              onClick={() => setActive(item)}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
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
          <div className="text-xs text-slate-500">Data source</div>
          <div className="mt-1 text-sm text-emerald-400">
            ● PayrollKG connected
          </div>
        </div>
      </aside>

      <main className="ml-64 min-h-screen p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-sm text-blue-400">PayrollKG</div>
            <h1 className="mt-1 text-3xl font-semibold">{active}</h1>
          </div>

          <div className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-400">
            Synthetic Payroll Environment
          </div>
        </header>

        {active === "Overview" && (
          <Overview
            employeeCount={employees.length}
            relationshipCount={triples.length}
            onNavigate={setActive}
          />
        )}

        {active === "Employee 360" && (
          <Employee360
            employees={filteredEmployees}
            totalEmployees={employees.length}
            search={search}
            setSearch={setSearch}
            selectedEmployee={selectedEmployee}
            setSelectedId={setSelectedId}
            triples={triples}
          />
        )}

        {active === "Knowledge Graph" && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-xl font-semibold">
              Knowledge Graph Explorer
            </h2>

            <p className="mt-2 text-slate-400">
              Select an employee in Employee 360 to inspect connected payroll
              entities and relationships.
            </p>

            <button
              onClick={() => setActive("Employee 360")}
              className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
            >
              Open Employee 360
            </button>
          </div>
        )}

        {!["Overview", "Employee 360", "Knowledge Graph"].includes(active) && (
          <ComingSoon title={active} />
        )}
      </main>
    </div>
  );
}

function Overview({
  employeeCount,
  relationshipCount,
  onNavigate,
}: {
  employeeCount: number;
  relationshipCount: number;
  onNavigate: (page: string) => void;
}) {
  const cards = [
    {
      title: "Employee 360",
      description:
        "Search employees and explore payroll identity, employment and graph relationships.",
      status: "Live",
    },
    {
      title: "Knowledge Graph",
      description:
        "Explore connected payroll entities, relationships and supporting evidence.",
      status: "Live",
    },
    {
      title: "Payroll Anomalies",
      description:
        "Detect unusual payroll behavior and investigate exceptions.",
      status: "Next",
    },
    {
      title: "Compliance",
      description:
        "Connect payroll facts with jurisdiction and compliance rules.",
      status: "Planned",
    },
    {
      title: "Payroll QA",
      description:
        "Answer payroll questions using graph-grounded information.",
      status: "Planned",
    },
    {
      title: "AI Agent",
      description:
        "Investigate payroll issues using tools and graph evidence.",
      status: "Planned",
    },
  ];

  return (
    <>
      <section className="grid grid-cols-3 gap-4">
        <Metric
          label="Employees"
          value={employeeCount.toLocaleString()}
        />

        <Metric
          label="Graph Relationships"
          value={relationshipCount.toLocaleString()}
        />

        <Metric label="Platform Modules" value="6" />
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">
          Payroll Intelligence Platform
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          A connected payroll knowledge layer supporting multiple payroll
          intelligence use cases.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-4">
          {cards.map((card) => (
            <button
              key={card.title}
              onClick={() => onNavigate(card.title)}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-blue-500"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{card.title}</h3>

                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    card.status === "Live"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {card.status}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {card.description}
              </p>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function Employee360({
  employees,
  totalEmployees,
  search,
  setSearch,
  selectedEmployee,
  setSelectedId,
  triples,
}: {
  employees: Employee[];
  totalEmployees: number;
  search: string;
  setSearch: (value: string) => void;
  selectedEmployee?: Employee;
  setSelectedId: (value: string) => void;
  triples: Triple[];
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold">
              Employee Directory
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {totalEmployees.toLocaleString()} employees available
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ID, name, role, department..."
            className="w-96 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>

        <div className="mt-5 max-h-[420px] overflow-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-950 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Jurisdiction</th>
                <th className="px-4 py-3">Monthly Pay</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>

            <tbody>
              {employees.map((employee) => (
                <tr
                  key={employee.emp_id}
                  className="border-t border-slate-800 hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {employee.name}
                    </div>

                    <div className="text-xs text-slate-500">
                      {employee.emp_id}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {pretty(employee.role)}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {employee.department}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    {employee.jurisdiction}
                  </td>

                  <td className="px-4 py-3 text-slate-300">
                    $
                    {Number(
                      employee.base_monthly_pay
                    ).toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        setSelectedId(employee.emp_id)
                      }
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs hover:border-blue-500 hover:text-blue-400"
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
          <EmployeeProfile employee={selectedEmployee} />

          <GraphView
            employee={selectedEmployee}
            triples={triples}
          />
        </>
      )}
    </div>
  );
}

function EmployeeProfile({
  employee,
}: {
  employee: Employee;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-blue-400">
            {employee.emp_id}
          </div>

          <h2 className="mt-1 text-2xl font-semibold">
            {employee.name}
          </h2>

          <p className="mt-1 text-slate-400">
            {pretty(employee.role)}
          </p>
        </div>

        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400">
          {pretty(employee.employment_type)}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <Detail
          label="Department"
          value={employee.department}
        />

        <Detail
          label="Country"
          value={employee.country}
        />

        <Detail
          label="Jurisdiction"
          value={employee.jurisdiction}
        />

        <Detail
          label="Hire Date"
          value={employee.hire_date}
        />

        <Detail
          label="Base Monthly Pay"
          value={`$${Number(
            employee.base_monthly_pay
          ).toLocaleString()}`}
        />

        <Detail
          label="FLSA Status"
          value={pretty(employee.flsa_status)}
        />

        <Detail
          label="OT Eligible"
          value={employee.ot_eligible}
        />

        <Detail
          label="Ghost Flag"
          value={employee.is_ghost}
        />
      </div>
    </section>
  );
}

function GraphView({
  employee,
  triples,
}: {
  employee: Employee;
  triples: Triple[];
}) {
  const relationships = triples.filter(
    (triple) => triple.subject === employee.emp_id
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
        width: 180,
        padding: 14,
        borderRadius: 12,
        textAlign: "center",
      },
    },
  ];

  const edges: Edge[] = [];
  const radius = 260;

  relationships.forEach((relationship, index) => {
    const angle =
      (index / Math.max(relationships.length, 1)) *
      Math.PI *
      2;

    const id =
      `${relationship.relationship}-${relationship.object}-${index}`;

    nodes.push({
      id,
      position: {
        x: 360 + Math.cos(angle) * radius,
        y: 220 + Math.sin(angle) * radius,
      },
      data: {
        label: pretty(relationship.object),
      },
      style: {
        background: "#0f172a",
        color: "#e2e8f0",
        border: "1px solid #475569",
        width: 160,
        padding: 12,
        borderRadius: 10,
        textAlign: "center",
      },
    });

    edges.push({
      id: `edge-${index}`,
      source: employee.emp_id,
      target: id,
      label: relationship.relationship,
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
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">
        Employee Knowledge Graph
      </h2>

      <p className="mt-1 text-sm text-slate-400">
        Graph relationships connected to {employee.emp_id}
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

      <div className="mt-4 text-xs text-slate-500">
        {relationships.length} graph relationships found.
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-sm text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-3xl font-semibold">
        {value}
      </div>
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
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium">
        {value}
      </div>
    </div>
  );
}

function ComingSoon({
  title,
}: {
  title: string;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-8">
      <h2 className="text-2xl font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-slate-400">
        This capability will be added after the core
        Employee 360 and Knowledge Graph experience.
      </p>

      <div className="mt-8 rounded-xl border border-dashed border-slate-700 bg-slate-950 p-16 text-center text-slate-500">
        {title} workspace
      </div>
    </section>
  );
}

function parseEmployees(text: string): Employee[] {
  const lines = text.trim().split(/\r?\n/);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    return record as Employee;
  });
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseTriples(text: string): Triple[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const [subject, relationship, object] =
        line.split("\t");

      return {
        subject: subject?.trim() ?? "",
        relationship: relationship?.trim() ?? "",
        object: object?.trim() ?? "",
      };
    })
    .filter(
      (triple) =>
        triple.subject &&
        triple.relationship &&
        triple.object
    );
}

function pretty(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}