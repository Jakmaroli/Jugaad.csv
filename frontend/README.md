# Frontend Module (Streamlit Advisory Dashboard)

This directory is designated for the Streamlit decision-support dashboard (Step 5 of SIH26027).

### Planned Components:
1. **Corridor Timeline (Gantt View)**:
   - Interactive Plotly Gantt chart visualizing scheduled trains and maintenance block allocations.
2. **Before / After Metrics Panel**:
   - Comparative display showing manual baseline (e.g., 4-hour conflict resolution delay) vs. AI CP-SAT solver latency (< 3 seconds) and auto-resolved conflicts.
3. **Approve / Override Human-in-the-Loop Controller**:
   - Section Controller action panel allowing one-click sanctioning (`bdms_blocks.status = 'Granted'`) and manual rescheduling, with audit trail persistence in `decision_audit`.
