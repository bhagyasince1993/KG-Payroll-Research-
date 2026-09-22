
import csv
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "expanded"
RESULTS = DATA / "identity_results"
OUTPUT = DATA / "payrollkg_expanded_triples.tsv"


def read_csv(path):
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def main():
    employees = read_csv(DATA / "employees.csv")
    pay_events = read_csv(DATA / "pay_events.csv")
    identities = read_csv(DATA / "source_identities.csv")
    resolved = read_csv(RESULTS / "resolved_identities.csv")
    review = read_csv(RESULTS / "review_queue.csv")

    # Map each source identity to its resolved golden ID.
    resolved_map = {
        (
            row["source_system"],
            row["source_employee_id"]
        ): row["golden_emp_id"]
        for row in resolved
    }

    # Keep unresolved records separate.
    review_keys = {
        (
            row["source_system"],
            row["source_employee_id"]
        )
        for row in review
    }

    triples = set()

    def add(subject, predicate, obj):
        if subject and predicate and obj:
            triples.add((str(subject), predicate, str(obj)))

    # Employee attributes from the expanded employee dataset.
    # These are source employee nodes, not yet golden identities.
    for employee in employees:
        emp_id = employee["emp_id"]

        add(emp_id, "hasName", employee["name"])
        add(emp_id, "hasRole", employee["role"])
        add(emp_id, "worksIn", employee["jurisdiction"])
        add(emp_id, "belongsTo", employee["department"])
        add(
            emp_id,
            "hasEmploymentType",
            employee["employment_type"]
        )

    # Connect each source identity to its golden employee.
    for identity in identities:
        key = (
            identity["source_system"],
            identity["source_employee_id"]
        )

        source_node = (
            f"{identity['source_system']}:"
            f"{identity['source_employee_id']}"
        )

        add(
            source_node,
            "fromSystem",
            identity["source_system"]
        )

        add(
            source_node,
            "sourceEmployeeName",
            identity["name"]
        )

        if key in resolved_map:
            add(
                source_node,
                "resolvesTo",
                resolved_map[key]
            )

        elif key in review_keys:
            add(
                source_node,
                "resolutionStatus",
                "PENDING_REVIEW"
            )

        else:
            add(
                source_node,
                "resolutionStatus",
                "UNASSIGNED"
            )

    # Payroll events remain connected to their original employee IDs.
    # We will only connect them to golden IDs after establishing a
    # verified employee-to-golden mapping.
    for event in pay_events:
        event_id = event["event_id"]

        add(
            event["emp_id"],
            "hasPayEvent",
            event_id
        )

        add(
            event_id,
            "periodStart",
            event["period_start"]
        )

        add(
            event_id,
            "periodEnd",
            event["period_end"]
        )

        add(
            event_id,
            "grossPay",
            event["gross_pay"]
        )

        add(
            event_id,
            "netPay",
            event["net_pay"]
        )

        add(
            event_id,
            "payJurisdiction",
            event["jurisdiction"]
        )

    # Do not add is_anomaly or anomaly_type.
    # Those are evaluation labels, not operational evidence.

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT.open(
        "w", newline="", encoding="utf-8"
    ) as file:
        writer = csv.writer(file, delimiter="\t")

        for triple in sorted(triples):
            writer.writerow(triple)

    counts = Counter(
        predicate for _, predicate, _ in triples
    )

    print("\nEXPANDED KNOWLEDGE GRAPH")
    print(f"Employees: {len(employees):,}")
    print(f"Pay events: {len(pay_events):,}")
    print(f"Source identities: {len(identities):,}")
    print(f"Resolved identities: {len(resolved):,}")
    print(f"Pending review: {len(review):,}")
    print(f"Total triples: {len(triples):,}")

    print("\nRelationship counts:")
    for predicate, count in sorted(counts.items()):
        print(f"  {predicate}: {count:,}")

    print(f"\nSaved to: {OUTPUT}")
    print("Original graph was not modified.")


if __name__ == "__main__":
    main()