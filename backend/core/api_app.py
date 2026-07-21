"""
Mobile app distribution: version lookup + build upload.

- GET /api/app/latest is public: the webapp's download button and the
  mobile app's update check both use it.
- POST /api/app/builds is for CI (the mobile-build workflow): guarded by a
  shared secret header, disabled entirely when APP_BUILD_UPLOAD_TOKEN is
  unset. Manual uploads work through the Django admin too.
"""

import secrets

from django.conf import settings
from ninja import File, Form, Router
from ninja.errors import HttpError
from ninja.files import UploadedFile

from core.models import AppBuild
from core.schemas import AppBuildOut

router = Router(tags=["app"])


@router.get("/app/latest", response=AppBuildOut, auth=None, operation_id="getLatestAppBuild")
def get_latest_app_build(request, platform: AppBuild.Platform = AppBuild.Platform.ANDROID):
    build = AppBuild.objects.filter(platform=platform).first()
    if build is None:
        raise HttpError(404, "No build available yet.")
    return build


@router.post("/app/builds", response={201: AppBuildOut}, auth=None, operation_id="uploadAppBuild")
def upload_app_build(
    request,
    version: Form[str],
    version_code: Form[int],
    file: UploadedFile = File(...),
    platform: Form[AppBuild.Platform] = AppBuild.Platform.ANDROID,
    notes: Form[str] = "",
):
    expected = settings.APP_BUILD_UPLOAD_TOKEN
    provided = request.headers.get("X-Upload-Token", "")
    if not expected or not secrets.compare_digest(provided, expected):
        raise HttpError(403, "Build uploads are not enabled or the token is wrong.")
    if AppBuild.objects.filter(platform=platform, version_code=version_code).exists():
        raise HttpError(409, f"A {platform} build with version_code {version_code} exists.")
    build = AppBuild.objects.create(
        platform=platform,
        version=version,
        version_code=version_code,
        file=file,
        notes=notes,
    )
    return 201, build
