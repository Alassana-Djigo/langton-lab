from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import TemplateView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


@method_decorator(ensure_csrf_cookie, name="dispatch")
class HomeView(TemplateView):
    """The simulator page. It also sets the CSRF cookie that the API calls will need."""

    template_name = "index.html"


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request: Request) -> Response:
    """Liveness probe, used by monitoring and by deployment checks."""
    return Response({"status": "ok"})
