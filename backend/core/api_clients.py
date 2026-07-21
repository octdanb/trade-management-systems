from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import File, Form, Router
from ninja.files import UploadedFile

from core.models import BusinessProfile, Client, ClientNote, ClientPhoto, GeocodeStatus
from core.schemas import (
    ClientIn,
    ClientNoteIn,
    ClientNoteOut,
    ClientOut,
    ClientPhotoOut,
    ProfileIn,
    ProfileOut,
)
from core.services import geocode

router = Router(tags=["clients"])


@router.get("/clients", response=list[ClientOut], operation_id="listClients")
def list_clients(request, active: bool | None = None, search: str | None = None):
    qs = Client.objects.filter(user=request.auth).prefetch_related("note_entries", "photos")
    if active is not None:
        qs = qs.filter(is_active=active)
    if search:
        qs = qs.filter(
            Q(name__icontains=search) | Q(address__icontains=search) | Q(phone__icontains=search)
        )
    return qs


@router.post("/clients", response={201: ClientOut}, operation_id="createClient")
def create_client(request, payload: ClientIn):
    client = Client.objects.create(user=request.auth, **payload.dict())
    if client.address:
        geocode.geocode_client(client)
    return 201, client


@router.get("/clients/{client_id}", response=ClientOut, operation_id="getClient")
def get_client(request, client_id: int):
    return get_object_or_404(Client, id=client_id, user=request.auth)


@router.put("/clients/{client_id}", response=ClientOut, operation_id="updateClient")
def update_client(request, client_id: int, payload: ClientIn):
    client = get_object_or_404(Client, id=client_id, user=request.auth)
    data = payload.dict()
    address_changed = data["address"] != client.address
    for field, value in data.items():
        setattr(client, field, value)
    if address_changed:
        client.lat = None
        client.lng = None
        client.geocode_status = GeocodeStatus.PENDING
        client.geocoded_at = None
    client.save()
    if address_changed and client.address:
        geocode.geocode_client(client)
    return client


@router.delete("/clients/{client_id}", response={204: None}, operation_id="deleteClient")
def delete_client(request, client_id: int):
    client = get_object_or_404(Client, id=client_id, user=request.auth)
    # DB cascade won't touch the object store — remove the files explicitly.
    for photo in client.photos.all():
        photo.image.delete(save=False)
    for job in client.jobs.all():
        for photo in job.photos.all():
            photo.image.delete(save=False)
    client.delete()
    return 204, None


@router.post(
    "/clients/{client_id}/notes",
    response={201: ClientNoteOut},
    operation_id="createClientNote",
)
def create_client_note(request, client_id: int, payload: ClientNoteIn):
    client = get_object_or_404(Client, id=client_id, user=request.auth)
    note = ClientNote.objects.create(client=client, body=payload.body)
    return 201, note


@router.delete(
    "/clients/{client_id}/notes/{note_id}",
    response={204: None},
    operation_id="deleteClientNote",
)
def delete_client_note(request, client_id: int, note_id: int):
    client = get_object_or_404(Client, id=client_id, user=request.auth)
    note = get_object_or_404(ClientNote, id=note_id, client=client)
    note.delete()
    return 204, None


@router.post(
    "/clients/{client_id}/photos",
    response={201: ClientPhotoOut},
    operation_id="uploadClientPhoto",
)
def upload_client_photo(
    request,
    client_id: int,
    file: UploadedFile = File(...),
    caption: Form[str] = "",
):
    client = get_object_or_404(Client, id=client_id, user=request.auth)
    photo = ClientPhoto.objects.create(client=client, image=file, caption=caption)
    return 201, photo


@router.delete(
    "/clients/{client_id}/photos/{photo_id}",
    response={204: None},
    operation_id="deleteClientPhoto",
)
def delete_client_photo(request, client_id: int, photo_id: int):
    client = get_object_or_404(Client, id=client_id, user=request.auth)
    photo = get_object_or_404(ClientPhoto, id=photo_id, client=client)
    photo.image.delete(save=False)
    photo.delete()
    return 204, None


@router.post("/clients/{client_id}/geocode", response=ClientOut, operation_id="geocodeClient")
def geocode_client_retry(request, client_id: int):
    client = get_object_or_404(Client, id=client_id, user=request.auth)
    geocode.geocode_client(client)
    return client


@router.get("/profile", response=ProfileOut, operation_id="getProfile")
def get_profile(request):
    profile, _ = BusinessProfile.objects.get_or_create(user=request.auth)
    return profile


@router.put("/profile", response=ProfileOut, operation_id="updateProfile")
def update_profile(request, payload: ProfileIn):
    profile, _ = BusinessProfile.objects.get_or_create(user=request.auth)
    address_changed = payload.home_address != profile.home_address
    profile.business_name = payload.business_name
    profile.home_address = payload.home_address
    if address_changed:
        profile.home_lat = None
        profile.home_lng = None
        profile.geocode_status = GeocodeStatus.PENDING
    profile.save()
    if address_changed and profile.home_address:
        geocode.geocode_profile(profile)
    return profile
