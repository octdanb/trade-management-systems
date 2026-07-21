from django.shortcuts import get_object_or_404
from ninja import File, Form, Router
from ninja.files import UploadedFile

from core.models import Equipment, EquipmentPhoto, ServiceRecord
from core.schemas import (
    EquipmentIn,
    EquipmentOut,
    EquipmentPhotoOut,
    ServiceRecordIn,
    ServiceRecordOut,
)

router = Router(tags=["equipment"])


def _owned(request, equipment_id: int) -> Equipment:
    return get_object_or_404(Equipment, id=equipment_id, user=request.auth)


@router.get("/equipment", response=list[EquipmentOut], operation_id="listEquipment")
def list_equipment(request, status: Equipment.Status | None = None):
    qs = Equipment.objects.filter(user=request.auth).prefetch_related("photos", "service_records")
    if status is not None:
        qs = qs.filter(status=status)
    return qs


@router.post("/equipment", response={201: EquipmentOut}, operation_id="createEquipment")
def create_equipment(request, payload: EquipmentIn):
    equipment = Equipment.objects.create(user=request.auth, **payload.dict())
    return 201, equipment


@router.get("/equipment/{equipment_id}", response=EquipmentOut, operation_id="getEquipment")
def get_equipment(request, equipment_id: int):
    return _owned(request, equipment_id)


@router.put("/equipment/{equipment_id}", response=EquipmentOut, operation_id="updateEquipment")
def update_equipment(request, equipment_id: int, payload: EquipmentIn):
    equipment = _owned(request, equipment_id)
    for field, value in payload.dict().items():
        setattr(equipment, field, value)
    equipment.save()
    return equipment


@router.delete("/equipment/{equipment_id}", response={204: None}, operation_id="deleteEquipment")
def delete_equipment(request, equipment_id: int):
    _owned(request, equipment_id).delete()
    return 204, None


@router.post(
    "/equipment/{equipment_id}/photos",
    response={201: EquipmentPhotoOut},
    operation_id="uploadEquipmentPhoto",
)
def upload_equipment_photo(
    request,
    equipment_id: int,
    file: UploadedFile = File(...),
    caption: Form[str] = "",
):
    equipment = _owned(request, equipment_id)
    photo = EquipmentPhoto.objects.create(equipment=equipment, image=file, caption=caption)
    return 201, photo


@router.delete(
    "/equipment/{equipment_id}/photos/{photo_id}",
    response={204: None},
    operation_id="deleteEquipmentPhoto",
)
def delete_equipment_photo(request, equipment_id: int, photo_id: int):
    equipment = _owned(request, equipment_id)
    photo = get_object_or_404(EquipmentPhoto, id=photo_id, equipment=equipment)
    photo.image.delete(save=False)
    photo.delete()
    return 204, None


@router.post(
    "/equipment/{equipment_id}/service",
    response={201: ServiceRecordOut},
    operation_id="logService",
)
def log_service(request, equipment_id: int, payload: ServiceRecordIn):
    """Record a completed service; advances the equipment's service clock."""
    equipment = _owned(request, equipment_id)
    record = ServiceRecord.objects.create(equipment=equipment, **payload.dict())
    if equipment.last_serviced_on is None or payload.serviced_on > equipment.last_serviced_on:
        equipment.last_serviced_on = payload.serviced_on
        equipment.save(update_fields=["last_serviced_on"])
    return 201, record


@router.delete(
    "/equipment/{equipment_id}/service/{record_id}",
    response={204: None},
    operation_id="deleteServiceRecord",
)
def delete_service_record(request, equipment_id: int, record_id: int):
    equipment = _owned(request, equipment_id)
    record = get_object_or_404(ServiceRecord, id=record_id, equipment=equipment)
    record.delete()
    # Roll the service clock back to the latest remaining record (or None).
    latest = equipment.service_records.first()
    equipment.last_serviced_on = latest.serviced_on if latest else None
    equipment.save(update_fields=["last_serviced_on"])
    return 204, None
