from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Router

from core.models import BusinessProfile, Client, GeocodeStatus
from core.schemas import ClientIn, ClientOut, ProfileIn, ProfileOut
from core.services import geocode

router = Router(tags=["clients"])


@router.get("/clients", response=list[ClientOut], operation_id="listClients")
def list_clients(request, active: bool | None = None, search: str | None = None):
    qs = Client.objects.filter(user=request.auth)
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
    client.delete()
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
