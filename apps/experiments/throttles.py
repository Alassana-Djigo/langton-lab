"""Throttles that protect the expensive endpoints."""

from rest_framework.throttling import UserRateThrottle


class RunRateThrottle(UserRateThrottle):
    """Limits how often a user can ask the server to run a simulation."""

    scope = "run"
