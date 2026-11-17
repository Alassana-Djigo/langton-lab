import pytest

from apps.experiments.models import Experiment
from apps.experiments.services import run_experiment

pytestmark = pytest.mark.django_db


def test_run_experiment_stores_the_statistics(user):
    experiment = Experiment.objects.create(
        owner=user, name="First square", width=11, height=11, steps=4
    )

    result = run_experiment(experiment)
    experiment.refresh_from_db()

    assert experiment.result == result
    assert result["steps"] == 4
    assert result["ants"] == 1
    assert result["color_counts"] == [117, 4]
    assert result["painted_cells"] == 4
    assert result["bounding_box"] == {
        "min_x": 5,
        "min_y": 5,
        "max_x": 6,
        "max_y": 6,
        "width": 2,
        "height": 2,
    }
    assert result["highway"] is None


def test_run_experiment_reports_the_highway(user):
    experiment = Experiment.objects.create(
        owner=user, name="Highway", width=200, height=200, steps=11_000
    )

    result = run_experiment(experiment)

    assert result["steps"] == 11_000
    assert result["highway"]["period"] == 104
    assert result["highway"]["detected_at"] <= 11_000


def test_run_experiment_counts_every_color_of_the_rule(user):
    experiment = Experiment.objects.create(
        owner=user, name="Three colors", rule="RLR", width=5, height=5, steps=10
    )

    result = run_experiment(experiment)

    assert len(result["color_counts"]) == 3
    assert sum(result["color_counts"]) == 25


def test_run_experiment_with_no_steps_reports_an_empty_grid(user):
    experiment = Experiment.objects.create(owner=user, name="Nothing", width=5, height=5, steps=0)

    result = run_experiment(experiment)

    assert result["steps"] == 0
    assert result["color_counts"] == [25, 0]
    assert result["bounding_box"] is None
    assert result["highway"] is None
