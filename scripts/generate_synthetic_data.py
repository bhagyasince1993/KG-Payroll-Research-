
import csv
import random
from datetime import date, timedelta
from pathlib import Path

# Reproducible, entirely fictional payroll data.
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
    "Emma", "James", "Isabella", "Ethan", "Amelia",
    "Lucas", "Charlotte", "Benjamin", "Harper",
    "Elijah", "Evelyn", "Henry", "Abigail",
    "Alexander", "Emily", "Michael", "Ella",
    "Sebastian", "Grace", "Jack", "Chloe",
    "David", "Zoe", "Samuel", "Nora",
    "Aiden", "Leah", "Joseph", "Hannah",
    "Mateo", "Lily", "Owen", "Victoria",
    "Isaac", "Layla",
]

LAST_NAMES = [
    "Hill", "Patel", "Smith", "Chen", "Garcia",
    "Williams", "Brown", "Johnson", "Kumar", "Lee",
    "Martinez", "Davis", "Wilson", "Thomas", "Clark",
    "Anderson", "Taylor", "Moore", "Jackson", "Martin",
    "Thompson", "White", "Harris", "Lewis", "Walker",
    "Hall", "Allen", "Young", "King", "Wright",
    "Scott", "Green", "Baker", "Adams", "Nelson",
    "Carter", "Mitchell", "Perez", "Roberts", "Turner",
    "Phillips", "Campbell", "Parker", "Evans", "Edwards",
    "Collins", "Stewart", "Sanchez", "Morris", "Rogers",
]

ROLES = [
    "Software_Engineer",
    "Analyst",
    "HR_Specialist",
    "Payroll_Administrator",
    "Product_Manager",
    "Sales_Representative",
    "Operations_Manager",
]

DEPARTMENTS = [
    "Engineering", "HR", "Finance", "Sales", "Operations"
]

JURISDICTIONS = [
    "CA", "NY", "NJ", "TX", "FL", "WA", "IL", "MA"
]

employees = []
events = []
identities = []
identity_truth = []
anomaly_truth = []
hris_crosswalk = []


def write_csv(filename, fields, rows):
    path = OUTPUT / filename

    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Created {path.name}: {len(rows):,} records")


def random_date(start, end):
    days = (end - start).days
    return start + timedelta(days=random.randint(0, days))


def month_start(month):
    return date(2025, month, 1)


def next_month(month):
    if month == 12:
        return date(2026, 1, 1)

    return date(2025, month + 1, 1)


def source_name(first, last, source, employee_number):
    """Introduce realistic variations in source-system names."""

    if source == "HRIS":
        return f"{first} {last}"

    if source == "PAYROLL":
        if employee_number % 7 == 0:
            return f"{first[0]}. {last}"

        if employee_number % 19 == 0:
            return f"{first.upper()} {last.upper()}"

    if source == "BENEFITS":
        if employee_number % 11 == 0:
            return f"{first} {last[0]}."

        if employee_number % 23 == 0:
            return f"{first.lower()} {last.lower()}"

    return f"{first} {last}"


# Source IDs are independently shuffled.
# Matching the numeric portions of IDs cannot reveal identity.
source_ids = {}

for source in ["HRIS", "PAYROLL", "BENEFITS"]:
    numbers = list(range(100_001, 100_001 + EMPLOYEE_COUNT))
    random.shuffle(numbers)
    source_ids[source] = numbers


for number in range(1, EMPLOYEE_COUNT + 1):

    emp_id = f"EMP-{number:05d}"

    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    name = f"{first} {last}"

    hire_date = random_date(
        date(2018, 1, 1),
        date(2024, 12, 31)
    )

    birth_date = random_date(
        date(1965, 1, 1),
        date(2003, 12, 31)
    )

    jurisdiction = random.choice(JURISDICTIONS)
    department = random.choice(DEPARTMENTS)
    role = random.choice(ROLES)
    salary = random.randint(3_500, 14_000)

    overtime_eligible = role in [
        "Analyst",
        "HR_Specialist",
        "Sales_Representative",
    ]

    is_ghost = number % 197 == 0

    employee = {
        "emp_id": emp_id,
        "name": name,
        "hire_date": hire_date.isoformat(),
        "employment_type": "full_time",
        "country": "USA",
        "jurisdiction": jurisdiction,
        "role": role,
        "base_monthly_pay": salary,
        "flsa_status": (
            "nonexempt" if overtime_eligible else "exempt"
        ),
        "ot_eligible": overtime_eligible,
        "department": department,
        "is_ghost": is_ghost,
        "birth_date": birth_date.isoformat(),
    }

    employees.append(employee)

    # Approximately 70% of employees have a shared HR reference.
    has_shared_reference = random.random() < 0.70

    shared_reference = (
        f"HRREF-{number:06d}"
        if has_shared_reference
        else ""
    )

    for source in ["HRIS", "PAYROLL", "BENEFITS"]:

        source_id = (
            f"{source}-{source_ids[source][number - 1]}"
        )

        record_name = source_name(
            first, last, source, number
        )

        record_hire_date = hire_date.isoformat()
        record_jurisdiction = jurisdiction
        record_department = department

        # Deliberately introduce incomplete source records.
        if source == "BENEFITS" and number % 29 == 0:
            record_department = ""

        if source == "PAYROLL" and number % 31 == 0:
            record_jurisdiction = ""

        if source == "BENEFITS" and number % 37 == 0:
            record_hire_date = ""

        record_reference = shared_reference

        if source == "BENEFITS" and number % 13 == 0:
            record_reference = ""

        identities.append({
            "source_system": source,
            "source_employee_id": source_id,
            "name": record_name,
            "hire_date": record_hire_date,
            "birth_date": birth_date.isoformat(),
            "jurisdiction": record_jurisdiction,
            "department": record_department,
            "shared_hr_reference": record_reference,
        })

        # Evaluation-only mapping.
        identity_truth.append({
            "source_system": source,
            "source_employee_id": source_id,
            "golden_emp_id": emp_id,
        })

        # Authorized operational crosswalk for HRIS records only.
        # The AI agent must not receive the evaluation-only mapping.
        if source == "HRIS":
            hris_crosswalk.append({
                "emp_id": emp_id,
                "source_system": source,
                "source_employee_id": source_id,
            })

    # Generate 12 monthly payroll events per employee.
    for month in range(1, MONTHS + 1):

        event_id = f"PE-{emp_id}-{month:02d}"

        start = month_start(month)
        end = next_month(month) - timedelta(days=1)

        regular_hours = round(
            random.uniform(145, 175), 1
        )

        overtime_hours = (
            round(random.uniform(0, 22), 1)
            if overtime_eligible
            else 0.0
        )

        gross = float(salary)

        if overtime_eligible:
            hourly_rate = salary * 12 / 2080
            gross += overtime_hours * hourly_rate * 1.5

        anomaly_type = "none"

        if number % 101 == 0 and month == 6:
            gross *= 2
            anomaly_type = "unusual_pay_increase"

        elif number % 197 == 0 and month == 9:
            anomaly_type = "ghost_employee"

        elif number % 137 == 0 and month == 10:
            gross += 5_000
            anomaly_type = "unusual_adjustment"

        gross = round(gross, 2)

        deductions = round(
            gross * random.uniform(0.15, 0.30), 2
        )

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


# Write operational datasets.
write_csv(
    "employees.csv",
    list(employees[0]),
    employees,
)

write_csv(
    "pay_events.csv",
    list(events[0]),
    events,
)

write_csv(
    "source_identities.csv",
    list(identities[0]),
    identities,
)

write_csv(
    "hris_crosswalk.csv",
    [
        "emp_id",
        "source_system",
        "source_employee_id",
    ],
    hris_crosswalk,
)

# Write evaluation-only datasets.
write_csv(
    "identity_ground_truth.csv",
    list(identity_truth[0]),
    identity_truth,
)

write_csv(
    "anomaly_ground_truth.csv",
    [
        "event_id",
        "emp_id",
        "anomaly_type",
    ],
    anomaly_truth,
)

print("\nExpanded synthetic dataset generated.")
print("Original root-level CSV files were not modified.")