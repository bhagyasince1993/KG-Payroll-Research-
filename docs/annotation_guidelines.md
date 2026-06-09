# annotation_guidelines.md

Responses are evaluated against the ground-truth PayrollKG facts.

A response is considered hallucinated if it:

* Contradicts the ground-truth answer.
* Introduces unsupported employee identifiers.
* Uses incorrect jurisdictions or compliance rules.
* Invents deductions, tax amounts, or pay values.
* References entities absent from the benchmark.

Labels:

* correct
* partially_correct
* hallucinated
* not_answered

