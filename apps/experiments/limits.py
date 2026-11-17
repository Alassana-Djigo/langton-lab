"""Hard limits that protect the server (and the free hosting quota) from heavy requests.

These values are provisional: they will be tuned with real benchmarks before deployment.
"""

MAX_GRID_SIDE = 500
MAX_STEPS = 50_000
MAX_ANTS = 32
