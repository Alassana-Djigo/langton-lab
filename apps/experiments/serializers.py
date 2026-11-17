"""API representation of experiments."""

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.experiments.models import Experiment


class ExperimentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experiment
        fields = (
            "id",
            "name",
            "description",
            "width",
            "height",
            "rule",
            "ants",
            "steps",
            "is_public",
            "result",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "result", "created_at", "updated_at")

    def validate(self, attrs: dict) -> dict:
        """Cross-field validation: reuse the model's own check that ants fit the grid."""
        current = self.instance or Experiment()
        candidate = Experiment(
            width=attrs.get("width", current.width),
            height=attrs.get("height", current.height),
            ants=attrs.get("ants", current.ants),
        )
        try:
            candidate.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return attrs
