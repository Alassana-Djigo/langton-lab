import pytest
from django.core.management import call_command


@pytest.mark.django_db
def test_django_system_check_passes():
    # The JSONField check asks SQLite whether it supports JSON, which needs a connection.
    call_command("check")
