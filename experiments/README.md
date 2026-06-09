Experiments were conducted using synthetic PayrollBench data inspired by enterprise payroll scenarios. All results should be interpreted as proof-of-concept findings rather than production performance.

Experiment 1: Compliance Reasoning
Objective
Evaluate whether PayrollKG correctly identifies applicable payroll rules and resolves jurisdictional conflicts.
Dataset
* 50,000 employees
* 140 jurisdiction rule sets
* 21,000 PayEvents (test set)
Metric
* Compliance Accuracy
Results
Metric	Value
Compliance Accuracy	91.2%
SQL Baseline Accuracy	78.4%
Average Query Latency	38 ms
SQL Query Latency	2,840 ms
Experiment 2: Payroll Fraud Detection
Objective
Identify anomalous payroll events using graph embeddings.
Injected Anomalies
Type	Count
Ghost Employees	280
Duplicate Payments	340
Rate Violations	380
Rule Override Violations	200
Embedding Model
* RotatE (PyKEEN 1.10.1)
Results
Metric	Value
Precision	0.91
Recall	0.87
F1 Score	0.89
Baselines
Model	F1
RotatE	0.89
ComplEx	0.84
TransE	0.81
Isolation Forest	0.71
Experiment 3: KG-Grounded Payroll QA
Objective
Evaluate whether knowledge graph grounding reduces LLM hallucinations.
Benchmark
PayrollQA-600
Category	Count
Individual Pay Inquiry	200
Population Query	150
Compliance Audit	150
System Metadata	100
Results
System	Hallucination Rate	Factual Accuracy
GPT-only	34.1%	65.9%
RAG-only	18.7%	81.3%
PayrollKG	8.3%	91.7%
Observation
PayrollKG reduced hallucinations by approximately 38% compared with retrieval-only approaches.

Experiment 4: Ablation Study
Objective
Measure the contribution of individual PayrollKG components.
Results
Configuration	Compliance Accuracy
Full PayrollKG	91.2%
Without Temporal Validity	74.1%
Without Override Rules	79.3%
Configuration	Anomaly F1
Full PayrollKG	0.89
Without KGE	0.54
Configuration	Hallucination Rate
Full PayrollKG	8.3%
Without KG Grounding	18.7%
Reproducibility
* Synthetic benchmark used: PayrollBench
* QA benchmark: PayrollQA
* Embedding framework: PyKEEN 1.10.1
* Graph stores: Neo4j Community Edition and Apache Jena Fuseki
* Random seed: 42
* Train/Validation/Test split: 70% / 15% / 15%

Limitations
* All experiments were conducted on synthetic data.
* No proprietary payroll data was used.
* Results demonstrate feasibility and comparative advantage rather than production performance.
* Real-world deployment would require validation using enterprise payroll datasets.


