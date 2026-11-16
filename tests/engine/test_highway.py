import pytest

from engine.highway import HighwayDetector, find_highway
from engine.rules import LANGTON, Rule
from engine.simulation import Simulation


def test_classic_ant_highway_is_detected():
    sim = Simulation(200, 200, LANGTON)
    highway = find_highway(sim, max_steps=15_000)

    assert highway is not None
    assert highway.period == 104
    assert tuple(abs(d) for d in highway.displacement) == (2, 2)
    assert 10_000 <= highway.detected_at <= 11_000
    assert sim.steps == highway.detected_at


def test_no_highway_during_the_chaotic_phase():
    assert find_highway(Simulation(200, 200, LANGTON), max_steps=3_000) is None


def test_straight_walker_is_a_period_one_highway():
    sim = Simulation(50, 50, Rule.parse("NN"))
    highway = find_highway(sim, max_steps=1_000)

    assert highway is not None
    assert (highway.period, highway.displacement, highway.detected_at) == (1, (0, -1), 300)


def test_closed_loops_are_not_highways():
    sim = Simulation(50, 50, Rule.parse("RR"))
    assert find_highway(sim, max_steps=2_000) is None


def test_find_highway_accepts_a_custom_detector():
    sim = Simulation(50, 50, Rule.parse("NN"))
    highway = find_highway(sim, max_steps=1_000, detector=HighwayDetector(min_steps=100))

    assert highway is not None
    assert highway.detected_at == 100


def test_detector_keeps_reporting_its_first_detection():
    sim = Simulation(50, 50, Rule.parse("NN"))
    detector = HighwayDetector()
    first = None
    for _ in range(400):
        sim.step()
        latest = detector.observe(sim)
        first = first or latest

    assert first is not None
    assert latest == first
    assert first.detected_at == 300


@pytest.mark.parametrize(
    "settings",
    [{"max_period": 0}, {"repeats": 1}, {"min_steps": 0}, {"ant_index": -1}],
)
def test_invalid_detector_settings_are_rejected(settings):
    with pytest.raises(ValueError, match="detector"):
        HighwayDetector(**settings)
