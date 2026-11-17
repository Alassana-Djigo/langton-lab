import pytest
from django.contrib.staticfiles import finders
from django.urls import reverse

pytestmark = pytest.mark.django_db


def test_home_page_renders_the_simulator(client):
    response = client.get(reverse("home"))
    html = response.content.decode()

    assert response.status_code == 200
    assert "Langton Lab" in html
    assert 'id="board"' in html
    assert "csrftoken" in response.cookies


@pytest.mark.parametrize(
    "path",
    ["css/app.css", "js/app.js", "js/engine.js", "js/palettes.js", "js/renderer.js"],
)
def test_frontend_assets_are_found_by_staticfiles(path):
    assert finders.find(path) is not None
