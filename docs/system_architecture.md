# SIH26027 System Architecture & Mathematical Foundations

## 1. System Vision: Human-in-the-Loop Advisory Support

The **AI-Assisted Block Planning Decision-Support System (SIH26027)** is engineered as an enterprise-grade, safety-critical decision-support tool for Indian Railways Section Controllers.

> [!IMPORTANT]
> **Core Framing**: The system does **not** unilaterally alter operational schedules or autonomously close track sections. Instead, it detects multi-departmental collisions across 100+ kilometers of corridor in milliseconds, prioritizes urgent maintenance based on composite infrastructure risk scores, bundles cross-departmental demands, levels heavy machinery, and formulates an optimal conflict-free timetable proposal using Google OR-Tools CP-SAT constraint programming. The human Section Controller retains statutory sign-off by reviewing and clicking **Approve & Grant** (minting an official `PN-XXXX`), **Confirm Reschedule**, or **Reject**.

---

## 2. Comprehensive System Architecture Diagram

```mermaid
graph TD
    subgraph Layer 1: Data Sources & Physical Telemetry
        TMS[TMS: Track Management System<br/>TGI, USFD, Rail Fractures, PSRs]
        SMMS[SMMS: Signal Maintenance<br/>Point Machines, Axle Counters, Failures]
        TDMS[TDMS: Traction Distribution<br/>OHE Masts, Contact Wire Wear]
        COA[COA: Control Office Application<br/>Master Timetables & Freight Forecasts]
    end

    subgraph Layer 2: Relational Persistence Layer
        DB[(SQLite / Enterprise DB<br/>data/block_planning.db)]
        BDMS[BDMS: Block Demands<br/>Emergency, Integrated, Shadow]
        AUDIT[Decision Audit Trail<br/>Actor, Action, Justification, PN-XXXX]
    end

    subgraph Layer 3: Prioritization & Explainable AI
        RULE[Rule-Based Criticality Engine<br/>Severity, Traffic GMT, TGI, PSR, Age]
        RF[Random Forest Regressor<br/>Non-linear Telemetry & Safety Ceiling]
        LOCAL_XAI[Local XAI Waterfall Engine<br/>Exact Feature Attributions per Block]
    end

    subgraph Layer 4: Mathematical Optimization Engines
        CPSAT[Google OR-Tools CP-SAT Solver<br/>Headway Buffers & Multi-Dept Bundling]
        PARETO[Bi-Objective Pareto Optimizer<br/>D'Ariano et al. Trade-off Curve]
        DECOMPOSER[Distributed Sub-Area Decomposer<br/>Lippes TU Delft Parallel Solvers]
        LEVELER[Resource & Crew Leveler<br/>Budai-Balke / Pour et al. NoOverlap]
    end

    subgraph Layer 5: Simulation & Cyber-Physical Feedback
        SIM[Stochastic Traffic Simulator<br/>Primary Delays & Headway Cascades]
        FEEDBACK[Dynamic Asset Health Feedback<br/>TGI 48.2 -> 98.5 | RUL +131.7 Days]
    end

    subgraph Layer 6: Section Controller Advisory Cockpit
        UI[Streamlit Advisory Cockpit: http://localhost:8501<br/>5 Analysis Tabs + Action Center]
        CONTROLLER[Section Controller SC_01<br/>Human-in-the-Loop Authority]
    end

    TMS --> DB
    SMMS --> DB
    TDMS --> DB
    COA --> DB
    DB --> BDMS
    BDMS --> RULE
    RULE --> RF
    RF --> LOCAL_XAI
    RF --> CPSAT
    COA --> CPSAT
    CPSAT --> PARETO
    CPSAT --> DECOMPOSER
    CPSAT --> LEVELER
    CPSAT --> SIM
    PARETO --> UI
    DECOMPOSER --> UI
    LEVELER --> UI
    LOCAL_XAI --> UI
    SIM --> UI
    UI --> CONTROLLER
    CONTROLLER -->|Approve & Grant PN-XXXX| FEEDBACK
    CONTROLLER -->|Confirm Reschedule| AUDIT
    CONTROLLER -->|Reject Block| AUDIT
    FEEDBACK --> DB
    AUDIT --> DB
```

---

## 3. Mathematical Optimization Formulations

### A. CP-SAT Multi-Departmental Bundling Solver
- **Horizon**: Discrete minutes from midnight $\mathcal{T} = [0, 1440]$ for operational date `2026-09-08`.
- **Interval Representation**: Each block $b \in \mathcal{B}$ is an interval variable $[s_b, e_b]$ with duration $d_b = e_b - s_b$.
- **Safety Headway Constraint**: For every train passage $t \in \mathcal{T}_{\text{trains}}$ occupying segment $k$, and block $b$ on segment $k$:
  $$(e_b \le \text{arr}_t - \Delta_{\text{buffer}}) \quad \lor \quad (s_b \ge \text{dep}_t + \Delta_{\text{buffer}})$$
  where $\Delta_{\text{buffer}} = 10$ minutes.
- **Multi-Department Bundling**: For co-located blocks on bottleneck Segment 35:
  $$\text{Span}_{\min} = \min_{b} s_b, \quad \text{Span}_{\max} = \max_{b} e_b, \quad \text{Span}_{\text{dur}} = \text{Span}_{\max} - \text{Span}_{\min}$$
- **Objective Function**:
  $$\max \sum_{b} \omega_b \cdot \text{sched}_b - 2 \cdot \text{Span}_{\text{dur}} - 0.5 \cdot \sum_b |s_b - s_{b,\text{req}}|$$

### B. Bi-Objective Pareto Frontier (*D'Ariano et al.*)
Solves the competing trade-off between the Traffic Dispatcher (train punctuality) and the Infrastructure Manager (possession efficiency):
$$\min \quad \lambda \cdot \sum_{t} \max(0, \text{act\_arr}_t - \text{sched\_arr}_t) + (1-\lambda) \cdot \left(\sum_k \text{Downtime}_k + \frac{1}{2}\sum_b \text{Shift}_b\right)$$
Across $\lambda \in [1.0, 0.75, 0.50, 0.25, 0.0]$, identifying the balanced **Knee Point** ($\lambda=0.50$, 0m delay, 120m bundled downtime).

### C. Resource & Crew Leveling (*Budai-Balke / Pour et al.*)
For finite heavy equipment (Tie Tamping Machine UNIMAT, OHE Tower Wagon, Ballast Cleaning Machine) and specialized certified gangs:
$$\text{NoOverlap}(\{I_{b} \mid \text{Resource}(b) = R\})$$
Guarantees zero equipment double-booking across different corridor segments. Opportunity-based grouping (GA OPP) allows routine inspections to catch a ride on major civil closures without added track possession.

### D. Geographical Distributed Decomposition (*Lippes' TU Delft Thesis*)
Partitions the 100km corridor into 3 sub-areas:
- **Sub-Area East**: Km 0.0 to 35.0 (Boundary timing point `TP_35_CROSSOVER`)
- **Sub-Area Central**: Km 35.0 to 70.0 (Boundary timing point `TP_70_INTERLOCK`)
- **Sub-Area West**: Km 70.0 to 100.0
Workers solve sub-problems in parallel in **31.5 ms**, while the Master Coordinator Harmonizer resolves boundary timing handoffs.

---

## 4. Cyber-Physical Asset Health & RUL Degradation Modeling

When the Section Controller grants a block with authority `PN-XXXX`, a stateful callback executes:
1. **Track Geometry Index ($TGI$)**: Degraded reading ($48.2$) is restored to optimal condition ($98.5$).
2. **Permanent Speed Restriction (PSR)**: Speed limit ($30\text{ km/h}$) is removed, restoring sectional line speed ($130\text{ km/h}$).
3. **Defect Status**: Transitions from `Open` to `Rectified` in TMS, SMMS, and TDMS.
4. **Remaining Useful Life (RUL)**: Computed via Weibull degradation:
   $$RUL = \text{base\_days} \cdot \left(\frac{TGI - 40}{100 - 40}\right)^{1.75} \cdot \left(\frac{40}{\text{Yearly GMT}}\right)$$
   - Before maintenance: **4.4 days** (Critical breakdown imminent).
   - Post-maintenance: **136.1 days** (**+131.7 days gained**).
5. **Dynamic Priority Queue Update**: Priority weight drops from **95.0 to 5.0**, sliding the resolved defect out of the critical backlog.

---

## 5. Regulatory Audit Logging

Every interaction with proposed blocks is logged to `decision_audit` with:
- **Audit ID**: Unique monotonic identifier (e.g., `AUDIT_GRANT_BLK_ENG_CONFL_1042`).
- **Block ID**: Target maintenance demand.
- **Action**: `Approve`, `Reschedule`, `Reject`, or `Submit`.
- **Actor**: Specific railway operator ID (e.g., `Section Controller SC_01`).
- **Timestamp**: Precise ISO-8601 execution timestamp aligned with operational horizon.
- **Reason**: Formal domain justification referencing the generated **Private Number (`PN-XXXX`)** and zero train conflicts verified via simulation.
