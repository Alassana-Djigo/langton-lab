"""Production settings. Everything sensitive comes from environment variables.

A missing DJANGO_SECRET_KEY or DJANGO_ALLOWED_HOSTS stops the application at
start-up on purpose: failing loudly is safer than running with insecure defaults.
"""

import environ

from config.settings.base import *  # noqa: F403

env = environ.Env()

DEBUG = False
SECRET_KEY = env("DJANGO_SECRET_KEY")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS", default=[])
