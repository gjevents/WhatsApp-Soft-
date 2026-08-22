from django.contrib import admin
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static


FRONTEND_URL = "http://127.0.0.1:5173/"


def root_view(request):
    return HttpResponseRedirect(FRONTEND_URL)


def favicon_view(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("", root_view, name="root"),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("favicon.ico", favicon_view, name="favicon"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
