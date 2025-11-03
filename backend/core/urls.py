"""
URLs para la aplicación core (API de grafos)
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GraphViewSet, NodeViewSet, EdgeViewSet, 
    DijkstraViewSet, AllPathsViewSet
)

# Crear router para las APIs
router = DefaultRouter()
router.register(r'graphs', GraphViewSet)
router.register(r'nodes', NodeViewSet, basename='node')
router.register(r'edges', EdgeViewSet, basename='edge')
router.register(r'dijkstra', DijkstraViewSet, basename='dijkstra')
router.register(r'all-paths', AllPathsViewSet, basename='all-paths')

urlpatterns = [
    path('api/', include(router.urls)),
]