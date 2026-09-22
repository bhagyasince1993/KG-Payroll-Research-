
import csv
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "expanded"
OUTPUT = DATA / "identity_results"
OUTPUT.mkdir(parents=True, exist_ok=True)


def read_csv(filename):
    with (DATA / filename).open(
        newline="", encoding="utf-8"
    ) as file:
        return list(csv.DictReader(file))


def write_csv(filename, fields, rows):
    path = OUTPUT / filename

    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Created {filename}: {len(rows):,} records")


def normalize_name(name):
    return re.sub(
        r"[^a-z ]", "", name.lower()
    ).strip()


def name_score(left, right):
    a = normalize_name(left).split()
    b = normalize_name(right).split()

    if len(a) < 2 or len(b) < 2:
        return 0.0

    if a == b:
        return 1.0

    first_match = (
        a[0] == b[0]
        or (len(a[0]) == 1 and a[0] == b[0][:1])
        or (len(b[0]) == 1 and b[0] == a[0][:1])
    )

    last_match = (
        a[-1] == b[-1]
        or (len(a[-1]) == 1 and a[-1] == b[-1][:1])
        or (len(b[-1]) == 1 and b[-1] == a[-1][:1])
    )

    if first_match and last_match:
        return 0.85

    return 0.0


def attribute_score(left, right):
    """A heuristic matching score, not a probability."""

    # A conflicting known birth date is a hard rejection.
    if (
        left["birth_date"]
        and right["birth_date"]
        and left["birth_date"] != right["birth_date"]
    ):
        return 0.0

    score = 0.0

    if (
        left["birth_date"]
        and left["birth_date"] == right["birth_date"]
    ):
        score += 0.30

    score += 0.40 * name_score(
        left["name"], right["name"]
    )

    if (
        left["hire_date"]
        and left["hire_date"] == right["hire_date"]
    ):
        score += 0.15

    if (
        left["jurisdiction"]
        and left["jurisdiction"] == right["jurisdiction"]
    ):
        score += 0.075

    if (
        left["department"]
        and left["department"] == right["department"]
    ):
        score += 0.075

    return round(score, 3)


def main():
    identities = read_csv("source_identities.csv")
    truth = read_csv("identity_ground_truth.csv")

    required = {
        "source_system",
        "source_employee_id",
        "name",
        "birth_date",
        "hire_date",
        "jurisdiction",
        "department",
        "shared_hr_reference",
    }

    if not identities or not required.issubset(identities[0]):
        raise ValueError(
            "Source identity schema is missing required fields. "
            "Regenerate the expanded dataset first."
        )

    clusters = {}
    reference_index = {}
    birth_date_index = defaultdict(set)
    review_queue = []
    next_id = 0

    def review_case(record, reason, best_score="", candidate_id="",
                    candidate_record=None, second_score=""):
        """Export actual candidate evidence; never consult ground truth."""
        candidate_record = candidate_record or {}
        return {
            "source_system": record["source_system"],
            "source_employee_id": record["source_employee_id"],
            "name": record["name"],
            "best_match_score": best_score,
            "reason": reason,
            "source_birth_date": record["birth_date"],
            "source_hire_date": record["hire_date"],
            "source_jurisdiction": record["jurisdiction"],
            "source_department": record["department"],
            "source_shared_hr_reference": record["shared_hr_reference"],
            "candidate_golden_emp_id": candidate_id,
            "candidate_source_system": candidate_record.get("source_system", ""),
            "candidate_source_employee_id": candidate_record.get("source_employee_id", ""),
            "candidate_name": candidate_record.get("name", ""),
            "candidate_birth_date": candidate_record.get("birth_date", ""),
            "candidate_hire_date": candidate_record.get("hire_date", ""),
            "candidate_jurisdiction": candidate_record.get("jurisdiction", ""),
            "candidate_department": candidate_record.get("department", ""),
            "candidate_shared_hr_reference": candidate_record.get("shared_hr_reference", ""),
            "second_best_match_score": second_score,
        }

    def create_cluster(record):
        nonlocal next_id

        next_id += 1
        cluster_id = f"GOLD-{next_id:05d}"
        clusters[cluster_id] = {
            "records": [record],
            "reference": record["shared_hr_reference"],
        }

        if record["birth_date"]:
            birth_date_index[record["birth_date"]].add(
                cluster_id
            )

        return cluster_id

    def add_to_cluster(cluster_id, record):
        clusters[cluster_id]["records"].append(record)

        if record["birth_date"]:
            birth_date_index[record["birth_date"]].add(
                cluster_id
            )

    # Phase 1: deterministic matching using shared references.
    # Only compare references when both records have one.
    records_with_reference = [
        row for row in identities
        if row["shared_hr_reference"]
    ]

    records_without_reference = [
        row for row in identities
        if not row["shared_hr_reference"]
    ]

    for record in records_with_reference:
        reference = record["shared_hr_reference"]

        if reference in reference_index:
            cluster_id = reference_index[reference]
            existing = clusters[cluster_id]["records"]

            # Even a shared reference must pass a basic
            # conflicting-birth-date safety check.
            conflict = any(
                previous["birth_date"]
                and record["birth_date"]
                and previous["birth_date"]
                    != record["birth_date"]
                for previous in existing
            )

            if conflict:
                conflicting_member = next(
                    previous for previous in existing
                    if previous["birth_date"] and record["birth_date"]
                    and previous["birth_date"] != record["birth_date"]
                )
                review_queue.append(review_case(
                    record, "Shared reference has conflicting birth dates",
                    candidate_id=cluster_id,
                    candidate_record=conflicting_member,
                ))
                continue

            add_to_cluster(cluster_id, record)

        else:
            cluster_id = create_cluster(record)
            reference_index[reference] = cluster_id

    # Phase 2: attribute matching for records that
    # do not have a shared HR reference.
    for record in records_without_reference:

        if not record["birth_date"]:
            review_queue.append(review_case(
                record, "Missing birth date and shared reference"
            ))
            continue

        candidate_ids = birth_date_index[
            record["birth_date"]
        ]

        candidates = []

        for cluster_id in candidate_ids:
            members = clusters[cluster_id]["records"]

            # Do not merge two records from the same source.
            if any(
                member["source_system"]
                == record["source_system"]
                for member in members
            ):
                continue

            # Retain the actual member that supplied the highest score.
            score, representative = max(
                ((attribute_score(record, member), member)
                 for member in members),
                key=lambda item: item[0],
            )

            if score > 0:
                candidates.append((score, cluster_id, representative))

        candidates.sort(reverse=True)

        best_score = (
            candidates[0][0] if candidates else 0.0
        )

        second_score = (
            candidates[1][0]
            if len(candidates) > 1
            else 0.0
        )

        # Require a strong, unambiguous attribute match.
        if (
            candidates
            and best_score >= 0.90
            and best_score - second_score >= 0.08
        ):
            add_to_cluster(candidates[0][1], record)

        elif candidates and best_score >= 0.65:
            review_queue.append(review_case(
                record, "Ambiguous attribute match",
                best_score=best_score,
                candidate_id=candidates[0][1],
                candidate_record=candidates[0][2],
                second_score=second_score,
            ))

        else:
            # A provisional cluster can later receive
            # matching records from other sources.
            create_cluster(record)

    assignments = []

    for cluster_id, cluster in clusters.items():
        for record in cluster["records"]:
            assignments.append({
                "source_system": record["source_system"],
                "source_employee_id":
                    record["source_employee_id"],
                "golden_emp_id": cluster_id,
                "name": record["name"],
                "cluster_size": len(cluster["records"]),
                "match_method": (
                    "shared_reference"
                    if cluster["reference"]
                    else "attributes_or_provisional"
                ),
            })

    write_csv(
        "resolved_identities.csv",
        [
            "source_system",
            "source_employee_id",
            "golden_emp_id",
            "name",
            "cluster_size",
            "match_method",
        ],
        assignments,
    )

    write_csv(
        "review_queue.csv",
        [
            "source_system",
            "source_employee_id",
            "name",
            "best_match_score",
            "reason",
            "source_birth_date",
            "source_hire_date",
            "source_jurisdiction",
            "source_department",
            "source_shared_hr_reference",
            "candidate_golden_emp_id",
            "candidate_source_system",
            "candidate_source_employee_id",
            "candidate_name",
            "candidate_birth_date",
            "candidate_hire_date",
            "candidate_jurisdiction",
            "candidate_department",
            "candidate_shared_hr_reference",
            "second_best_match_score",
        ],
        review_queue,
    )

    # Evaluate against the separate ground-truth file.
    # Ground truth was not used during matching.
    truth_map = {
        (
            row["source_system"],
            row["source_employee_id"],
        ): row["golden_emp_id"]
        for row in truth
    }

    predicted_map = {
        (
            row["source_system"],
            row["source_employee_id"],
        ): row["golden_emp_id"]
        for row in assignments
    }

    def make_pairs(mapping):
        groups = defaultdict(list)

        for record_key, golden_id in mapping.items():
            groups[golden_id].append(record_key)

        pairs = set()

        for members in groups.values():
            for i in range(len(members)):
                for j in range(i + 1, len(members)):
                    pairs.add(
                        frozenset(
                            (members[i], members[j])
                        )
                    )

        return pairs

    expected = make_pairs(truth_map)
    predicted = make_pairs(predicted_map)

    correct = len(expected & predicted)

    precision = (
        correct / len(predicted)
        if predicted else 0.0
    )

    recall = (
        correct / len(expected)
        if expected else 0.0
    )

    f1 = (
        2 * precision * recall / (precision + recall)
        if precision + recall else 0.0
    )

    print("\nIDENTITY RESOLUTION RESULTS")
    print(f"Source records: {len(identities):,}")
    print(f"Resolved records: {len(assignments):,}")
    print(f"Golden clusters: {len(clusters):,}")
    print(f"Review queue: {len(review_queue):,}")
    print(f"Pairwise precision: {precision:.2%}")
    print(f"Pairwise recall: {recall:.2%}")
    print(f"Pairwise F1: {f1:.2%}")


if __name__ == "__main__":
    main()