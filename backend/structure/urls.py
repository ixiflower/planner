from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'services', views.ServiceViewSet, basename='service')
router.register(r'groups', views.GroupViewSet, basename='group')

urlpatterns = [
    path('', include(router.urls)),
    path('boards/', views.BoardListCreateView.as_view(), name='board-list-create'),
    path('boards/exists/', views.BoardExistsView.as_view(), name='board-exists'),
    path('boards/join/', views.JoinBoardView.as_view(), name='board-join'),
    path('boards/<uuid:pk>/', views.BoardDetailView.as_view(), name='board-detail'),
]
