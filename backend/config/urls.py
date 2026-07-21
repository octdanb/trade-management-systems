from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from config.api import api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api.urls),
    # Headless JSON auth API used by the SPA: /_allauth/browser/v1/...
    path("_allauth/", include("allauth.headless.urls")),
    # Still required in headless mode: hosts the social provider callback
    # routes (e.g. /accounts/google/login/callback/).
    path("accounts/", include("allauth.urls")),
]

if settings.DEBUG:
    # Uploaded equipment photos; in production put these behind a real file
    # store / CDN instead.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
