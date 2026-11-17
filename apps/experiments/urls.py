from rest_framework.routers import SimpleRouter

from apps.experiments.views import ExperimentViewSet

app_name = "experiments"

router = SimpleRouter()
router.register("experiments", ExperimentViewSet, basename="experiment")

urlpatterns = router.urls
