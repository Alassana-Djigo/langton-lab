import pytest
from django.urls import reverse

from apps.accounts.throttles import AuthRateThrottle

pytestmark = pytest.mark.django_db

STRONG = "a-strong-passphrase-123"


def post_json(client, url, data):
    return client.post(url, data, format="json")


def test_register_creates_a_user_and_starts_a_session(api_client):
    credentials = {"username": "grace", "password": STRONG}
    response = post_json(api_client, reverse("accounts:register"), credentials)

    assert response.status_code == 201
    assert response.json()["username"] == "grace"
    assert "password" not in response.json()
    assert api_client.get(reverse("accounts:me")).json()["username"] == "grace"


def test_register_rejects_weak_passwords(api_client):
    credentials = {"username": "grace", "password": "123"}
    response = post_json(api_client, reverse("accounts:register"), credentials)

    assert response.status_code == 400
    assert "password" in response.json()


def test_register_rejects_duplicate_usernames(api_client, user):
    credentials = {"username": user.username, "password": STRONG}
    response = post_json(api_client, reverse("accounts:register"), credentials)

    assert response.status_code == 400
    assert "username" in response.json()


def test_login_then_logout(api_client, django_user_model):
    django_user_model.objects.create_user("grace", password=STRONG)
    credentials = {"username": "grace", "password": STRONG}

    login = post_json(api_client, reverse("accounts:login"), credentials)
    assert login.status_code == 200
    assert api_client.get(reverse("accounts:me")).status_code == 200

    assert api_client.post(reverse("accounts:logout")).status_code == 204
    assert api_client.get(reverse("accounts:me")).status_code == 403


def test_login_with_wrong_credentials_fails(api_client, django_user_model):
    django_user_model.objects.create_user("grace", password=STRONG)
    credentials = {"username": "grace", "password": "wrong"}
    response = post_json(api_client, reverse("accounts:login"), credentials)

    assert response.status_code == 400


def test_me_requires_authentication(api_client):
    assert api_client.get(reverse("accounts:me")).status_code == 403


def test_login_attempts_are_rate_limited(api_client, monkeypatch):
    monkeypatch.setitem(AuthRateThrottle.THROTTLE_RATES, "auth", "2/min")
    url = reverse("accounts:login")
    attempt = {"username": "nobody", "password": "wrong"}

    codes = [post_json(api_client, url, attempt).status_code for _ in range(3)]

    assert codes == [400, 400, 429]
