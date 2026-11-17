from django.contrib.auth import get_user_model


def test_project_uses_the_custom_user_model():
    assert get_user_model()._meta.label == "accounts.User"


def test_users_are_created_with_a_hashed_password(db):
    raw = "a-long-test-passphrase"
    user = get_user_model().objects.create_user("ada", "ada@example.com", raw)

    assert user.check_password(raw)
    assert user.password != raw
