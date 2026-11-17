"""Settings used by the test suite: development settings with a faster password hasher."""

from config.settings.dev import *  # noqa: F403

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
