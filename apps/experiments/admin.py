from django.contrib import admin

from apps.experiments.models import Experiment


@admin.register(Experiment)
class ExperimentAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "rule", "width", "height", "steps", "is_public", "created_at")
    list_filter = ("is_public", "rule")
    search_fields = ("name", "owner__username")
    readonly_fields = ("result", "created_at", "updated_at")
