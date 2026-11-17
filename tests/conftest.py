import pytest
from django.contrib.auth import get_user_model


@pytest.fixture
def user(db):
    """A saved user that owns the objects created in tests."""
    return get_user_model().objects.create_user(username="ada")
