from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.views.generic import TemplateView
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Bus, Route, Passenger, Booking, Payment
from .serializers import (
    BusSerializer,
    RouteSerializer,
    PassengerSerializer,
    BookingSerializer,
    PaymentSerializer
)


class IndexView(TemplateView):
    template_name = 'index.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Bus Ticket Reservation Management System'
        return context


class DashboardStatsView(APIView):
    """
    Returns aggregated metrics and charts data for the dashboard.
    """
    def get(self, request, *args, **kwargs):
        total_buses = Bus.objects.count()
        total_routes = Route.objects.count()
        total_passengers = Passenger.objects.count()
        total_bookings = Booking.objects.count()
        confirmed_tickets = Booking.objects.filter(status='Confirmed').count()
        cancelled_tickets = Booking.objects.filter(status='Cancelled').count()
        pending_tickets = Booking.objects.filter(status='Pending').count()

        total_revenue = Payment.objects.filter(payment_status='Completed').aggregate(
            total=Sum('amount')
        )['total'] or 0.0

        # Recent bookings (up to 8)
        recent_bookings_qs = Booking.objects.select_related('bus', 'route', 'passenger', 'payment')[:8]
        recent_bookings = BookingSerializer(recent_bookings_qs, many=True).data

        # Bookings count by Route for Chart
        route_stats = (
            Route.objects.annotate(
                booking_count=Count('bookings', filter=~Q(bookings__status='Cancelled'))
            )
            .values('source', 'destination', 'booking_count')
            .order_by('-booking_count')[:6]
        )

        # Payment status counts for Chart
        payment_stats = Payment.objects.values('payment_status').annotate(count=Count('id'))

        # Bus fleet type distribution
        bus_type_stats = Bus.objects.values('bus_type').annotate(count=Count('id'))

        return Response({
            'total_buses': total_buses,
            'total_routes': total_routes,
            'total_passengers': total_passengers,
            'total_bookings': total_bookings,
            'confirmed_tickets': confirmed_tickets,
            'cancelled_tickets': cancelled_tickets,
            'pending_tickets': pending_tickets,
            'total_revenue': float(total_revenue),
            'recent_bookings': recent_bookings,
            'route_stats': list(route_stats),
            'payment_stats': list(payment_stats),
            'bus_type_stats': list(bus_type_stats),
        })


class BusViewSet(viewsets.ModelViewSet):
    queryset = Bus.objects.all().order_by('-created_at')
    serializer_class = BusSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['bus_number', 'bus_name', 'bus_type', 'registration_number']
    ordering_fields = ['bus_number', 'bus_name', 'total_seats', 'created_at']


class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all().order_by('source', 'destination')
    serializer_class = RouteSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['source', 'destination', 'estimated_duration']
    ordering_fields = ['source', 'destination', 'distance_km', 'base_fare', 'created_at']


class PassengerViewSet(viewsets.ModelViewSet):
    queryset = Passenger.objects.all().order_by('-created_at')
    serializer_class = PassengerSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone_number', 'email', 'address']
    ordering_fields = ['name', 'created_at']


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related('bus', 'route', 'passenger', 'payment').all().order_by('-created_at')
    serializer_class = BookingSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'ticket_number', 'passenger__name', 'passenger__phone_number',
        'bus__bus_name', 'bus__bus_number', 'route__source', 'route__destination'
    ]
    ordering_fields = ['journey_date', 'seat_number', 'price', 'created_at', 'status']

    def create(self, request, *args, **kwargs):
        # Support auto-creating payment along with booking if payment info supplied
        payment_method = request.data.get('payment_method')
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            booking_id = response.data['id']
            booking = Booking.objects.get(id=booking_id)
            # Create payment record
            Payment.objects.create(
                booking=booking,
                amount=booking.price,
                payment_method=payment_method or 'UPI',
                payment_status='Completed' if booking.status == 'Confirmed' else 'Pending'
            )
            # Refetch updated serialized booking
            updated_data = BookingSerializer(booking).data
            return Response(updated_data, status=status.HTTP_201_CREATED)
        return response

    @action(detail=False, methods=['get'], url_path='occupied-seats')
    def occupied_seats(self, request):
        bus_id = request.query_params.get('bus')
        journey_date = request.query_params.get('journey_date')
        if not bus_id or not journey_date:
            return Response(
                {'error': 'Both "bus" and "journey_date" query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        occupied = list(
            Booking.objects.filter(
                bus_id=bus_id,
                journey_date=journey_date
            ).exclude(status='Cancelled').values_list('seat_number', flat=True)
        )
        return Response({'occupied_seats': occupied})

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_booking(self, request, pk=None):
        booking = self.get_object()
        booking.status = 'Cancelled'
        booking.save()
        if hasattr(booking, 'payment') and booking.payment:
            booking.payment.payment_status = 'Refunded'
            booking.payment.save()
        return Response({
            'message': f'Booking {booking.ticket_number} has been cancelled successfully.',
            'booking': BookingSerializer(booking).data
        })


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('booking', 'booking__passenger', 'booking__route').all().order_by('-paid_at')
    serializer_class = PaymentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'transaction_reference', 'booking__ticket_number',
        'booking__passenger__name', 'payment_method', 'payment_status'
    ]
    ordering_fields = ['paid_at', 'amount', 'payment_status', 'created_at']

