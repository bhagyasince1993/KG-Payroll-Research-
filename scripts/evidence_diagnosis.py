"""Evidence-based synthetic Payroll Assist diagnosis (not real payroll advice).

Run from the repository root; uses demo_data/payroll_assist_triples.tsv.
This deterministic baseline is intentionally separate from the existing agent.
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GRAPH = ROOT / 'demo_data' / 'payroll_assist_triples.tsv'

FOLLOW_UP = {
    'SYMPTOM:MISSING_OVERTIME': ['timesheet approval status', 'approval timestamp', 'payroll cutoff'],
    'SYMPTOM:UNEXPECTED_DEDUCTIONS': ['deduction breakdown', 'benefit election history', 'tax withholding history'],
    'SYMPTOM:WRONG_PAYGROUP': ['approved paygroup', 'effective date', 'assignment audit'],
    'SYMPTOM:DUPLICATE_PAYMENT': ['payment run audit', 'reversal or correction records', 'bank settlement status'],
    'SYMPTOM:MISSING_PAYROLL_RECORD': ['ETL error log', 'report filters', 'load audit'],
}


def _graph_index(graph_path=GRAPH):
    if not Path(graph_path).is_file():
        raise FileNotFoundError(f'Graph not found: {graph_path}')
    edges = {}
    with Path(graph_path).open(encoding='utf-8', newline='') as f:
        for row in csv.reader(f, delimiter='\t'):
            if row == ['subject', 'predicate', 'object']:
                continue
            if len(row) != 3:
                raise ValueError(f'Invalid graph row: {row}')
            s, p, o = row
            edges.setdefault((s, p), []).append(o)
    return edges


def diagnose(symptom_id: str, evidence: dict, graph_path=GRAPH) -> dict:
    """Return a supported synthetic diagnosis or abstain; never infer from symptom alone."""
    if symptom_id not in FOLLOW_UP:
        return {'diagnosis_status': 'UNSUPPORTED_SYMPTOM', 'cause_id': None,
                'resolution_id': None, 'recommended_action': None, 'required_follow_up': []}
    e = evidence or {}
    cause = None
    if symptom_id == 'SYMPTOM:MISSING_OVERTIME':
        if (e.get('timesheet_status') == 'PENDING_APPROVAL'
                and e.get('paid_overtime_hours') == 0
                and 'Only approved overtime' in str(e.get('payroll_policy', ''))):
            cause = 'CAUSE:UNAPPROVED_TIMESHEET'
        elif (e.get('approved_overtime_hours', 0) > 0
              and e.get('paid_overtime_hours') == 0
              and e.get('approval_timestamp') and e.get('payroll_cutoff')
              and e['approval_timestamp'] > e['payroll_cutoff']
              and 'after cutoff' in str(e.get('next_cycle_policy', '')).lower()):
            cause = 'CAUSE:PAYROLL_CUTOFF'
    elif symptom_id == 'SYMPTOM:UNEXPECTED_DEDUCTIONS':
        if (e.get('authorized_benefit_election_change') is True
                and e.get('new_election_effective_before_pay_period') is True
                and isinstance(e.get('prior_benefit_deduction'), (int, float))
                and isinstance(e.get('current_benefit_deduction'), (int, float))
                and e['current_benefit_deduction'] > e['prior_benefit_deduction']):
            cause = 'CAUSE:BENEFITS_CHANGE'
    elif symptom_id == 'SYMPTOM:WRONG_PAYGROUP':
        audit = str(e.get('assignment_audit') or '').lower()
        if (e.get('approved_paygroup') and e.get('assigned_paygroup')
                and e['approved_paygroup'] != e['assigned_paygroup']
                and e.get('effective_date_before_pay_period') is True
                and 'import mapped' in audit
                and e['assigned_paygroup'].lower() in audit
                and e['approved_paygroup'].lower() in audit):
            cause = 'CAUSE:IMPORT_MAPPING_ERROR'
    elif symptom_id == 'SYMPTOM:MISSING_PAYROLL_RECORD':
        if (e.get('source_record_present') is True
                and e.get('destination_record_present') is False
                and e.get('report_filter_excluded_employee') is True
                and e.get('etl_load_status') == 'SUCCESS'):
            cause = 'CAUSE:REPORT_FILTER_EXCLUSION'
    # A duplicated payment alone cannot distinguish a duplicate import from a retry.

    if cause is None:
        return {'diagnosis_status': 'INSUFFICIENT_EVIDENCE', 'cause_id': None,
                'resolution_id': None, 'recommended_action': None,
                'required_follow_up': FOLLOW_UP[symptom_id]}

    edges = _graph_index(graph_path)
    if cause not in edges.get((symptom_id, 'mayIndicate'), []):
        raise ValueError(f'Expected cause {cause} is not linked to {symptom_id} in graph')
    resolutions = edges.get((cause, 'resolvedBy'), [])
    if len(resolutions) != 1:
        raise ValueError(f'Expected exactly one resolution for {cause}')
    resolution = resolutions[0]
    actions = edges.get((resolution, 'recommendedAction'), [])
    if not actions or not actions[0].strip():
        raise ValueError(f'Missing recommended action for {resolution}')
    return {'diagnosis_status': 'SUPPORTED_BY_CASE_EVIDENCE', 'cause_id': cause,
            'resolution_id': resolution, 'recommended_action': actions[0],
            'required_follow_up': [],
            'note': 'Supported only by supplied synthetic case evidence; verify real source records.'}
