
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "expanded"
RESULTS = DATA / "identity_results"

GRAPH = DATA / "payrollkg_expanded_triples.tsv"
OUTPUT = DATA / "payrollkg_connected_triples.tsv"


def read_csv(path):
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def main():
    crosswalk = read_csv(DATA / "hris_crosswalk.csv")
    resolved = read_csv(RESULTS / "resolved_identities.csv")
    review = read_csv(RESULTS / "review_queue.csv")

    resolved_map = {
        (row["source_system"], row["source_employee_id"]):
        row["golden_emp_id"]
        for row in resolved
    }

    review_keys = {
        (row["source_system"], row["source_employee_id"])
        for row in review
    }

    triples = set()

    # Load the existing expanded graph.
    with GRAPH.open(encoding="utf-8", newline="") as file:
        reader = csv.reader(file, delimiter="\t")

        for row in reader:
            if len(row) == 3:
                triples.add(tuple(row))

    connected = 0
    pending = 0
    missing = 0

    for row in crosswalk:
        emp_id = row["emp_id"]

        key = (
            row["source_system"],
            row["source_employee_id"],
        )

        if key in review_keys:
            pending += 1
            continue

        golden_id = resolved_map.get(key)

        if not golden_id:
            missing += 1
            continue

        # Link the resolved golden employee to the original
        # employee record, which already has payroll events.
        triples.add((
            golden_id,
            "hasEmployeeRecord",
            emp_id,
        ))

        connected += 1

    with OUTPUT.open(
        "w", encoding="utf-8", newline=""
    ) as file:
        writer = csv.writer(file, delimiter="\t")
        writer.writerows(sorted(triples))

    print("\nGOLDEN EMPLOYEE GRAPH CONNECTION")
    print(f"HRIS crosswalk records: {len(crosswalk):,}")
    print(f"Connected employee records: {connected:,}")
    print(f"Pending HRIS review: {pending:,}")
    print(f"Missing HRIS resolutions: {missing:,}")
    print(f"Total graph triples: {len(triples):,}")
    print(f"\nSaved to: {OUTPUT}")
    print("Original graph files were not modified.")


if __name__ == "__main__":
    main()