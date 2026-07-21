from datetime import date, timedelta

from django.shortcuts import get_object_or_404
from ninja import File, Form, Router
from ninja.errors import HttpError
from ninja.files import UploadedFile

from core.models import AppointmentSeries, Client, Job, JobPhoto
from core.schemas import (
    JobIn,
    JobOut,
    JobPhotoOut,
    JobUpdateIn,
    SeriesEndIn,
    SeriesIn,
    SeriesOut,
    SeriesUpdateIn,
)
from core.services import occurrences

router = Router(tags=["schedule"])


# --- Series ------------------------------------------------------------------


@router.get("/series", response=list[SeriesOut], operation_id="listSeries")
def list_series(request, client_id: int | None = None):
    qs = AppointmentSeries.objects.filter(user=request.auth).select_related("client")
    if client_id is not None:
        qs = qs.filter(client_id=client_id)
    return qs


@router.post("/series", response={201: SeriesOut}, operation_id="createSeries")
def create_series(request, payload: SeriesIn):
    client = get_object_or_404(Client, id=payload.client_id, user=request.auth)
    series = AppointmentSeries.objects.create(
        user=request.auth,
        client=client,
        frequency=payload.frequency,
        start_date=payload.start_date,
        default_time=payload.default_time,
        duration_minutes=payload.duration_minutes,
        end_date=payload.end_date,
    )
    occurrences.materialize(series, date.today() + timedelta(days=occurrences.DEFAULT_HORIZON_DAYS))
    return 201, series


@router.put("/series/{series_id}", response=SeriesOut, operation_id="updateSeries")
def update_series(request, series_id: int, payload: SeriesUpdateIn, apply_from: date | None = None):
    series = get_object_or_404(AppointmentSeries, id=series_id, user=request.auth)
    occurrences.apply_series_edit(series, payload.dict(), apply_from or date.today())
    return series


@router.post("/series/{series_id}/end", response=SeriesOut, operation_id="endSeries")
def end_series(request, series_id: int, payload: SeriesEndIn):
    series = get_object_or_404(AppointmentSeries, id=series_id, user=request.auth)
    occurrences.end_series(series, payload.end_date)
    return series


@router.delete("/series/{series_id}", response={204: None}, operation_id="deleteSeries")
def delete_series(request, series_id: int):
    """Delete a series and all of its occurrences (including history)."""
    series = get_object_or_404(AppointmentSeries, id=series_id, user=request.auth)
    series.delete()
    return 204, None


# --- Jobs --------------------------------------------------------------------


@router.get("/jobs", response=list[JobOut], operation_id="listJobs")
def list_jobs(
    request,
    start: date,
    end: date,
    client_id: int | None = None,
    status: Job.Status | None = None,
    kind: Job.Kind | None = None,
):
    occurrences.ensure_range(request.auth, end)
    qs = (
        Job.objects.filter(user=request.auth, scheduled_date__gte=start, scheduled_date__lte=end)
        .select_related("client")
        .prefetch_related("photos")
    )
    if client_id is not None:
        qs = qs.filter(client_id=client_id)
    if status is not None:
        qs = qs.filter(status=status)
    if kind is not None:
        qs = qs.filter(kind=kind)
    return qs


@router.post("/jobs", response={201: JobOut}, operation_id="createJob")
def create_job(request, payload: JobIn):
    client = get_object_or_404(Client, id=payload.client_id, user=request.auth)
    job = Job.objects.create(
        user=request.auth,
        client=client,
        scheduled_date=payload.scheduled_date,
        scheduled_time=payload.scheduled_time,
        duration_minutes=payload.duration_minutes,
        kind=payload.kind,
        price=payload.price if payload.price is not None else client.rate,
        notes=payload.notes,
    )
    return 201, job


@router.patch("/jobs/{job_id}", response=JobOut, operation_id="updateJob")
def update_job(request, job_id: int, payload: JobUpdateIn):
    job = get_object_or_404(Job.objects.select_related("client"), id=job_id, user=request.auth)
    data = payload.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(job, field, value)
    if data:
        job.modified = True
        job.save()
    return job


@router.delete("/jobs/{job_id}", response={204: None}, operation_id="deleteJob")
def delete_job(request, job_id: int):
    job = get_object_or_404(Job, id=job_id, user=request.auth)
    if job.series_id is not None:
        raise HttpError(400, "Series occurrences can't be deleted — cancel them instead.")
    for photo in job.photos.all():
        photo.image.delete(save=False)
    job.delete()
    return 204, None


@router.post(
    "/jobs/{job_id}/photos",
    response={201: JobPhotoOut},
    operation_id="uploadJobPhoto",
)
def upload_job_photo(
    request,
    job_id: int,
    file: UploadedFile = File(...),
    caption: Form[str] = "",
):
    job = get_object_or_404(Job, id=job_id, user=request.auth)
    photo = JobPhoto.objects.create(job=job, image=file, caption=caption)
    return 201, photo


@router.delete(
    "/jobs/{job_id}/photos/{photo_id}",
    response={204: None},
    operation_id="deleteJobPhoto",
)
def delete_job_photo(request, job_id: int, photo_id: int):
    job = get_object_or_404(Job, id=job_id, user=request.auth)
    photo = get_object_or_404(JobPhoto, id=photo_id, job=job)
    photo.image.delete(save=False)
    photo.delete()
    return 204, None
