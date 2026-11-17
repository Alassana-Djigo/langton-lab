"""Local development settings."""

import os

from config.settings.base import *  # noqa: F403

DEBUG = True
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "insecure-dev-key-never-use-in-production")
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]
