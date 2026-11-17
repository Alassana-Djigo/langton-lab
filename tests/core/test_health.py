from django.urls import reverse


def test_health_endpoint_reports_ok(client):
    url = reverse("core:health")
    response = client.get(url)

    assert url == "/api/health/"
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
