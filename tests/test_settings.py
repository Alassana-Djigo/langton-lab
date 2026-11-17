import importlib
import sys

import pytest
from django.core.exceptions import ImproperlyConfigured


def load_prod_settings():
    sys.modules.pop("config.settings.prod", None)
    return importlib.import_module("config.settings.prod")


def test_prod_settings_require_a_secret_key(monkeypatch):
    monkeypatch.delenv("DJANGO_SECRET_KEY", raising=False)
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", "example.com")
    with pytest.raises(ImproperlyConfigured):
        load_prod_settings()


def test_prod_settings_are_safe_by_default(monkeypatch):
    monkeypatch.setenv("DJANGO_SECRET_KEY", "x" * 50)
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", "example.com,www.example.com")
    prod = load_prod_settings()

    assert prod.DEBUG is False
    assert prod.ALLOWED_HOSTS == ["example.com", "www.example.com"]
