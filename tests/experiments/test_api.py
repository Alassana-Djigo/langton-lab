import pytest
from django.urls import reverse

from apps.experiments.models import Experiment
from apps.experiments.throttles import RunRateThrottle

pytestmark = pytest.mark.django_db


def list_url():
    return reverse("experiments:experiment-list")


def detail_url(experiment):
    return reverse("experiments:experiment-detail", args=[experiment.pk])


def run_url(experiment):
    return reverse("experiments:experiment-run", args=[experiment.pk])


def test_anonymous_users_cannot_list_experiments(api_client):
    assert api_client.get(list_url()).status_code == 403


def test_create_sets_the_owner_and_applies_defaults(auth_client, user):
    response = auth_client.post(list_url(), {"name": "My ant"}, format="json")

    assert response.status_code == 201
    body = response.json()
    assert (body["name"], body["rule"], body["result"]) == ("My ant", "RL", None)
    assert Experiment.objects.get(pk=body["id"]).owner == user


def test_users_only_see_their_own_experiments(auth_client, user, django_user_model):
    other = django_user_model.objects.create_user("grace")
    Experiment.objects.create(owner=user, name="Mine")
    Experiment.objects.create(owner=other, name="Theirs")

    response = auth_client.get(list_url())

    assert [item["name"] for item in response.json()["results"]] == ["Mine"]


def test_users_cannot_touch_other_peoples_experiments(auth_client, django_user_model):
    other = django_user_model.objects.create_user("grace")
    theirs = Experiment.objects.create(owner=other, name="Theirs")

    assert auth_client.get(detail_url(theirs)).status_code == 404
    assert auth_client.delete(detail_url(theirs)).status_code == 404
    assert auth_client.post(run_url(theirs)).status_code == 404


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"rule": "XYZ"}, "rule"),
        ({"width": 0}, "width"),
        ({"steps": 10**9}, "steps"),
        ({"ants": [{"x": 1}]}, "ants"),
    ],
)
def test_invalid_payloads_are_rejected(auth_client, payload, field):
    response = auth_client.post(list_url(), {"name": "Bad", **payload}, format="json")

    assert response.status_code == 400
    assert field in response.json()


def test_ants_must_start_inside_the_grid(auth_client):
    payload = {"name": "Lost", "width": 10, "height": 10, "ants": [{"x": 10, "y": 0}]}
    response = auth_client.post(list_url(), payload, format="json")

    assert response.status_code == 400
    assert "outside the grid" in str(response.json())


def test_partial_update_is_checked_against_the_stored_grid(auth_client, user):
    experiment = Experiment.objects.create(owner=user, name="Small", width=10, height=10)
    payload = {"ants": [{"x": 50, "y": 50}]}

    response = auth_client.patch(detail_url(experiment), payload, format="json")

    assert response.status_code == 400


def test_clients_cannot_write_the_result(auth_client, user):
    experiment = Experiment.objects.create(owner=user, name="Mine")
    payload = {"result": {"fake": True}}

    response = auth_client.patch(detail_url(experiment), payload, format="json")

    assert response.status_code == 200
    experiment.refresh_from_db()
    assert experiment.result is None


def test_run_stores_and_returns_the_result(auth_client, user):
    experiment = Experiment.objects.create(owner=user, name="Square", width=11, height=11, steps=4)

    response = auth_client.post(run_url(experiment))

    assert response.status_code == 200
    assert response.json()["result"]["color_counts"] == [117, 4]
    experiment.refresh_from_db()
    assert experiment.result["painted_cells"] == 4


def test_run_is_rate_limited(auth_client, user, monkeypatch):
    monkeypatch.setitem(RunRateThrottle.THROTTLE_RATES, "run", "2/min")
    experiment = Experiment.objects.create(owner=user, name="Busy", steps=1)

    codes = [auth_client.post(run_url(experiment)).status_code for _ in range(3)]

    assert codes == [200, 200, 429]
