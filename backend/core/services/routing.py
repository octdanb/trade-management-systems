"""
Daily route ordering: OSRM driving-time matrix (with haversine fallback) and
a nearest-neighbor + 2-opt heuristic for an open path (no return home).
"""

import logging
import math

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

TIMEOUT_S = 8.0
FALLBACK_SPEED_KMH = 40.0

Coord = tuple[float, float]  # (lat, lng)


def haversine_s(a: Coord, b: Coord) -> float:
    """Straight-line travel time in seconds at FALLBACK_SPEED_KMH."""
    r = 6371.0
    lat1, lng1, lat2, lng2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    )
    km = 2 * r * math.asin(math.sqrt(h))
    return km / FALLBACK_SPEED_KMH * 3600


def haversine_matrix(coords: list[Coord]) -> list[list[float]]:
    return [
        [0.0 if i == j else haversine_s(a, b) for j, b in enumerate(coords)]
        for i, a in enumerate(coords)
    ]


def duration_matrix(coords: list[Coord]) -> tuple[list[list[float]], bool]:
    """
    Driving-time matrix in seconds between all coords.
    Returns (matrix, used_fallback).
    """
    if len(coords) < 2:
        return [[0.0] * len(coords) for _ in coords], False
    path = ";".join(f"{lng},{lat}" for lat, lng in coords)
    try:
        response = httpx.get(
            f"{settings.OSRM_URL}/table/v1/driving/{path}",
            params={"annotations": "duration"},
            timeout=TIMEOUT_S,
        )
        response.raise_for_status()
        data = response.json()
        durations = data.get("durations")
        if data.get("code") != "Ok" or not durations:
            raise ValueError(f"OSRM response not usable: {data.get('code')}")
        # OSRM returns null for unreachable pairs; patch with haversine.
        for i, row in enumerate(durations):
            for j, value in enumerate(row):
                if value is None:
                    durations[i][j] = haversine_s(coords[i], coords[j])
        return durations, False
    except Exception:
        logger.warning("OSRM table request failed; using haversine fallback", exc_info=True)
        return haversine_matrix(coords), True


def optimize_order(durations: list[list[float]], start: int = 0) -> list[int]:
    """
    Order all indices as an open path from `start` (start included in result),
    using nearest-neighbor construction + 2-opt improvement.
    """
    n = len(durations)
    if n <= 1:
        return list(range(n))

    # Nearest neighbor
    unvisited = set(range(n)) - {start}
    order = [start]
    while unvisited:
        last = order[-1]
        nearest = min(unvisited, key=lambda j: durations[last][j])
        order.append(nearest)
        unvisited.remove(nearest)

    # 2-opt for an open path: reversing order[i:j+1] only changes the edges
    # (i-1 -> i) and (j -> j+1); the trailing edge doesn't exist for j == n-1.
    improved = True
    while improved:
        improved = False
        for i in range(1, n - 1):
            for j in range(i + 1, n):
                before = durations[order[i - 1]][order[i]]
                after = durations[order[i - 1]][order[j]]
                if j + 1 < n:
                    before += durations[order[j]][order[j + 1]]
                    after += durations[order[i]][order[j + 1]]
                if after < before - 1e-9:
                    order[i : j + 1] = reversed(order[i : j + 1])
                    improved = True
    return order


def path_leg_durations(durations: list[list[float]], order: list[int]) -> list[float]:
    """Duration of each leg along the ordered path (len == len(order) - 1)."""
    return [durations[a][b] for a, b in zip(order, order[1:])]
