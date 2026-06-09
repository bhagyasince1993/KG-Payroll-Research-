# architecture.md

PayrollKG Architecture

Employee → Role
Employee → TaxJurisdiction
Employee → Deduction

PayEvent → PayRule
PayEvent → ComplianceRule
PayEvent → AuditEvent

Core Capabilities:

1. Compliance Reasoning
2. Payroll Fraud Detection
3. KG-Grounded Payroll Question Answering

Technology Stack:

* Neo4j
* Apache Jena Fuseki
* PyKEEN
* GPT-4o
* PayrollBench
* PayrollQA
