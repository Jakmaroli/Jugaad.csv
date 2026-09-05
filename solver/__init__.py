"""
Micro-Engine: Optimization & Corridor Schedulers (SIH26027).
Houses Google OR-Tools CP-SAT bundling algorithms, Pareto frontier optimizers,
distributed spatial decomposition, resource leveling, and baseline evaluators.
"""

from solver.block_solver import (
    build_and_solve_block_schedule,
    run_solver_pipeline,
    load_solver_inputs,
    persist_solver_results_to_database,
    print_solver_report,
    time_to_minutes,
    minutes_to_iso,
    minutes_to_hhmm,
)
from solver.pareto_solver import (
    solve_pareto_point,
    generate_pareto_frontier,
)
from solver.baseline import (
    run_fifo_baseline,
    compare_baseline_vs_cpsat,
    naive_fifo_schedule,
)
from solver.distributed_decomposer import (
    benchmark_centralized_vs_decomposed,
    run_distributed_decomposition,
    SUB_AREAS,
)
from solver.resource_leveling import (
    solve_with_resource_leveling,
    get_resource_allocation_timeline,
    DIVISION_RESOURCES,
)

__all__ = [
    "build_and_solve_block_schedule",
    "run_solver_pipeline",
    "load_solver_inputs",
    "persist_solver_results_to_database",
    "print_solver_report",
    "time_to_minutes",
    "minutes_to_iso",
    "minutes_to_hhmm",
    "solve_pareto_point",
    "generate_pareto_frontier",
    "run_fifo_baseline",
    "compare_baseline_vs_cpsat",
    "naive_fifo_schedule",
    "benchmark_centralized_vs_decomposed",
    "run_distributed_decomposition",
    "SUB_AREAS",
    "solve_with_resource_leveling",
    "get_resource_allocation_timeline",
    "DIVISION_RESOURCES",
]
