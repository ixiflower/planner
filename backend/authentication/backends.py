from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from typing import Optional, Tuple

class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        try:
            if '@' in str(username):
                user = UserModel.objects.get(email=username)
            else:
                user = UserModel.objects.get(username=username)
        except UserModel.DoesNotExist:
            return None

        if user.check_password(password):
            return user
        return None

class TokenHeaderAuthentication(BaseAuthentication):
    """Simple token auth reading 'Authorization: Token <key>' using tickets.models.Token.
    This enables DRF generic views (e.g., structure app) to authenticate like other endpoints.
    """
    def authenticate(self, request) -> Optional[Tuple[object, None]]:
        auth_header = request.META.get('HTTP_AUTHORIZATION', '') or ''
        if not auth_header.startswith('Token '):
            return None
        key = auth_header.split(' ', 1)[1].strip()
        if not key:
            return None
        try:
            from tickets.models import Token  # local import to avoid circulars
            tok = Token.objects.get(key=key)
            return (tok.user, None)
        except Exception:
            return None
