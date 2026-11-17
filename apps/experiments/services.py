"""Run an experiment with the engine and store a compact summary of the result."""

from apps.experiments.models import Experiment
from engine.highway import Highway, find_highway
from engine.stats import BoundingBox, compute_stats


def run_experiment(experiment: Experiment) -> dict:
    """Simulate ``experiment.steps`` steps and save the summary in ``experiment.result``.

    Highway detection watches the first ant only. The summary is plain JSON-friendly
    data, so it can be stored as it is and compared across experiments.
    """
    simulation = experiment.build_simulation()
    highway = find_highway(simulation, experiment.steps)
    # The detector stops the run early when it finds a highway: finish the remaining steps.
    simulation.run(experiment.steps - simulation.steps)
    stats = compute_stats(simulation)

    result = {
        "steps": stats.steps,
        "ants": stats.n_ants,
        "color_counts": list(stats.color_counts),
        "painted_cells": stats.painted_cells,
        "bounding_box": _box_summary(stats.bounding_box),
        "highway": _highway_summary(highway),
    }
    experiment.result = result
    experiment.save(update_fields=["result", "updated_at"])
    return result


def _box_summary(box: BoundingBox | None) -> dict | None:
    if box is None:
        return None
    return {
        "min_x": box.min_x,
        "min_y": box.min_y,
        "max_x": box.max_x,
        "max_y": box.max_y,
        "width": box.width,
        "height": box.height,
    }


def _highway_summary(highway: Highway | None) -> dict | None:
    if highway is None:
        return None
    return {
        "period": highway.period,
        "displacement": list(highway.displacement),
        "detected_at": highway.detected_at,
    }
