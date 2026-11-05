from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    IndexView,
    DashboardStatsView,
    BusViewSet,
    RouteViewSet,
    PassengerViewSet,
    BookingViewSet,
    PaymentViewSet
)

router = DefaultRouter()
router.register(r'buses', BusViewSet, basename='bus')
router.register(r'routes', RouteViewSet, basename='route')
router.register(r'passengers', PassengerViewSet, basename='passenger')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', IndexView.as_view(), name='index'),
    path('api/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('api/', include(router.urls)),
]

