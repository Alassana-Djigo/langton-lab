"""Stricter limits for the endpoints that attackers like to hammer."""

from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Limits anonymous attempts to register or log in (brute-force protection)."""

    scope = "auth"
