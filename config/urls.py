"""Root URL configuration."""

from django.contrib import admin
from django.urls import include, path

from apps.core.views import HomeView

urlpatterns = [
    path("", HomeView.as_view(), name="home"),
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.experiments.urls")),
]
