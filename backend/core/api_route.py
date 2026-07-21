from datetime import date, time

from django.db import transaction
from ninja import Router

from core.models import BusinessProfile, Job
from core.schemas import RouteOptimizeIn, RoutePlanOut, RouteReorderIn
from core.services import routing

router = Router(tags=["route"])


def _day_jobs(user, day: date):
    return (
        Job.objects.filter(user=user, scheduled_date=day)
        .exclude(status=Job.Status.CANCELLED)
        .select_related("client")
    )


def _home(user):
    profile = BusinessProfile.objects.filter(user=user).first()
    if profile and profile.home_lat is not None and profile.home_lng is not None:
        return profile.home_lat, profile.home_lng
    return None


def _plan(user, day: date, total_duration_s=None, leg_by_job=None, used_fallback=False):
    jobs = list(_day_jobs(user, day))
    routed = [j for j in jobs if j.client.lat is not None and j.client.lng is not None]
    unrouted = [j for j in jobs if j.client.lat is None or j.client.lng is None]
    routed.sort(
        key=lambda j: (j.route_order is None, j.route_order or 0, j.scheduled_time or time.min)
    )
    for job in routed:
        job.leg_duration_s = (leg_by_job or {}).get(job.id)
    home = _home(user)
    return {
        "date": day,
        "home": {"lat": home[0], "lng": home[1]} if home else None,
        "stops": routed,
        "unrouted": unrouted,
        "total_duration_s": total_duration_s,
        "used_fallback_matrix": used_fallback,
    }


@router.get("/route", response=RoutePlanOut, operation_id="getRoutePlan")
def get_route_plan(request, date: date):
    return _plan(request.auth, date)


@router.post("/route/optimize", response=RoutePlanOut, operation_id="optimizeRoute")
def optimize_route(request, payload: RouteOptimizeIn):
    user = request.auth
    day = payload.date
    jobs = [
        j for j in _day_jobs(user, day) if j.client.lat is not None and j.client.lng is not None
    ]
    if not jobs:
        return _plan(user, day)

    home = _home(user)
    coords: list[routing.Coord] = []
    if home:
        coords.append(home)
    offset = len(coords)  # index of the first job in the matrix
    coords.extend((j.client.lat, j.client.lng) for j in jobs)

    durations, used_fallback = routing.duration_matrix(coords)
    order = routing.optimize_order(durations, start=0)
    if home:
        # Drop the home base from the path; keep job ordering.
        order = [i for i in order if i >= offset]

    legs = routing.path_leg_durations(durations, ([0] if home else []) + order)
    ordered_jobs = [jobs[i - offset] for i in order]

    leg_by_job: dict[int, float] = {}
    if home:
        # legs[k] is the drive INTO ordered_jobs[k] (starting from home).
        for job, leg in zip(ordered_jobs, legs):
            leg_by_job[job.id] = leg
    else:
        # No home base: first stop has no inbound leg.
        for job, leg in zip(ordered_jobs[1:], legs):
            leg_by_job[job.id] = leg

    with transaction.atomic():
        for position, job in enumerate(ordered_jobs):
            Job.objects.filter(id=job.id).update(route_order=position)

    return _plan(
        user,
        day,
        total_duration_s=sum(legs) if legs else None,
        leg_by_job=leg_by_job,
        used_fallback=used_fallback,
    )


@router.post("/route/reorder", response=RoutePlanOut, operation_id="reorderRoute")
def reorder_route(request, payload: RouteReorderIn):
    user = request.auth
    day_job_ids = set(_day_jobs(user, payload.date).values_list("id", flat=True))
    with transaction.atomic():
        position = 0
        for job_id in payload.job_ids:
            if job_id in day_job_ids:
                Job.objects.filter(id=job_id, user=user).update(route_order=position)
                position += 1
    return _plan(user, payload.date)
