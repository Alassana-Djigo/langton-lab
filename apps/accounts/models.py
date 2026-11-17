from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """The project's user model.

    It adds nothing yet. Having it from the first migration is what makes it cheap
    to add fields later (avatar, preferences...) without a painful database change.
    """
