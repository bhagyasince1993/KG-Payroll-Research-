
import csv
import random
from datetime import date, timedelta
from pathlib import Path

# Reproducible synthetic data. No real employee information.
random.seed(42)

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "data" / "expanded"
OUTPUT.mkdir(parents=True, exist_ok=True)

EMPLOYEE_COUNT = 10_000
MONTHS = 12

FIRST_NAMES = [
    "Allison", "Megan", "Kevin", "Jordan", "Taylor",
    "Morgan", "Priya", "Arjun", "Sofia", "Daniel",
    "Olivia", "Noah", "Ava", "Liam", "Maya",
]
LAST_NAMES = [
    "Hill", "Patel", "Smith", "Chen", "Garcia",
    "Williams", "Brown", "Johnson", "Kumar", "Lee",
    "Martinez", "Davis", "Wilson", "Thomas", "Clark",
]
ROLES = [
    "Software_Engineer", "Analyst", "HR_Specialist",
    "Payroll_Administrator", "Product_Manager",
    "Sales_Representative", "Operations_Manager",
]
DEPARTMENTS = ["Engineering", "HR", "Finance", "Sales", "Operations"]
JURISDICTIONS = ["CA", "NY", "NJ", "TX", "FL", "WA", "IL", "MA"]

employees = []
events = []
identities = []
identity_truth = []
anomaly_truth = []

def write_csv(filename, fields, rows):
    path = OUTPUT / filename
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Created {path.name}: {len(rows):,} records")

def month_start(month):
    return date(2025, month, 1)

def next_month(month):
    if month == 12:
        return date(2026, 1, 1)
    return date(2025, month + 1, 1)

for number in range(1, EMPLOYEE_COUNT + 1):
    emp_id = f"EMP-{number:05d}"
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    name = f"{first} {last}"
    jurisdiction = random.choice(JURISDICTIONS)
    department = random.choice(DEPARTMENTS)
    role = random.choice(ROLES)
    salary = random.randint(3_500, 14_000)
    overtime_eligible = role in [
        "Analyst", "HR_Specialist", "Sales_Representative"
    ]

    # Seed a small number of fictional ghost employees.
    is_ghost = number % 197 == 0

    employee = {
        "emp_id": emp_id,
        "name": name,
        "hire_date": "2022-01-01",
        "employment_type": "full_time",
        "country": "USA",
        "jurisdiction": jurisdiction,
        "role": role,
        "base_monthly_pay": salary,
        "flsa_status": "nonexempt" if overtime_eligible else "exempt",
        "ot_eligible": overtime_eligible,
        "department": department,
        "is_ghost": is_ghost,
    }
    employees.append(employee)

    # Three simulated source-system records per employee.
    for source in ["HRIS", "PAYROLL", "BENEFITS"]:
        source_id = f"{source}-{number:05d}"

        # Introduce name variations to test identity matching.
        source_name = name
        if source == "PAYROLL" and number % 7 == 0:
            source_name = f"{first[0]}. {last}"
        elif source == "BENEFITS" and number % 11 == 0:
            source_name = f"{first} {last[0]}."

        identities.append({
            "source_system": source,
            "source_employee_id": source_id,
            "name": source_name,
            "hire_date": employee["hire_date"],
            "jurisdiction": jurisdiction,
            "department": department,
        })

        # Store correct matches separately for evaluation.
        identity_truth.append({
            "source_system": source,
            "source_employee_id": source_id,
            "golden_emp_id": emp_id,
        })

    # One monthly payroll event per employee.
    for month in range(1, MONTHS + 1):
        event_id = f"PE-{emp_id}-{month:02d}"
        start = month_start(month)
        end = next_month(month) - timedelta(days=1)

        regular_hours = round(random.uniform(145, 175), 1)
        overtime_hours = (
            round(random.uniform(0, 22), 1)
            if overtime_eligible else 0.0
        )

        gross = float(salary)
        if overtime_eligible:
            hourly_rate = salary * 12 / 2080
            gross += overtime_hours * hourly_rate * 1.5

        anomaly_type = "none"

        # Seed clearly labeled synthetic anomaly scenarios.
        if number % 101 == 0 and month == 6:
            gross *= 2
            anomaly_type = "unusual_pay_increase"
        elif number % 197 == 0 and month == 9:
            anomaly_type = "ghost_employee"
        elif number % 137 == 0 and month == 10:
            gross += 5_000
            anomaly_type = "unusual_adjustment"

        gross = round(gross, 2)
        deductions = round(gross * random.uniform(0.15, 0.30), 2)
        net = round(gross - deductions, 2)

        events.append({
            "event_id": event_id,
            "emp_id": emp_id,
            "period_start": start.isoformat(),
            "period_end": end.isoformat(),
            "hours_regular": regular_hours,
            "hours_overtime": overtime_hours,
            "gross_pay": gross,
            "deductions": deductions,
            "net_pay": net,
            "jurisdiction": jurisdiction,
            "is_anomaly": anomaly_type != "none",
            "anomaly_type": anomaly_type,
        })

        if anomaly_type != "none":
            anomaly_truth.append({
                "event_id": event_id,
                "emp_id": emp_id,
                "anomaly_type": anomaly_type,
            })

write_csv("employees.csv", list(employees[0]), employees)
write_csv("pay_events.csv", list(events[0]), events)
write_csv("source_identities.csv", list(identities[0]), identities)

# Evaluation-only files: never expose these to the AI agent.
write_csv(
    "identity_ground_truth.csv",
    list(identity_truth[0]),
    identity_truth,
)
write_csv(
    "anomaly_ground_truth.csv",
    ["event_id", "emp_id", "anomaly_type"],
    anomaly_truth,
)

print("\nSynthetic dataset generated successfully.")
print("Original project CSV files were not modified.")