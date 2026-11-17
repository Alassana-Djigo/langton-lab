from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.experiments.models import Experiment
from apps.experiments.serializers import ExperimentSerializer
from apps.experiments.services import run_experiment
from apps.experiments.throttles import RunRateThrottle


class ExperimentViewSet(viewsets.ModelViewSet):
    """CRUD for the current user's experiments, plus an action that runs one."""

    serializer_class = ExperimentSerializer

    def get_queryset(self):
        # Filtering by owner means other people's experiments simply do not exist (404).
        return Experiment.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["post"], throttle_classes=[RunRateThrottle])
    def run(self, request: Request, pk: int | None = None) -> Response:
        """Run the simulation on the server and store the summary of the result."""
        experiment = self.get_object()
        run_experiment(experiment)
        return Response(self.get_serializer(experiment).data)
