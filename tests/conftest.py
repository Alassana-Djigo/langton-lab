import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def clear_cache():
    """Throttle counters live in the cache: start every test from a clean slate."""
    cache.clear()


@pytest.fixture
def user(db):
    """A saved user that owns the objects created in tests."""
    return get_user_model().objects.create_user(username="ada")


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(api_client, user):
    """An API client already authenticated as ``user``."""
    api_client.force_authenticate(user)
    return api_client
