from django.contrib import admin
from .models import Bus, Route, Passenger, Booking, Payment


@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ('bus_number', 'bus_name', 'bus_type', 'total_seats', 'registration_number', 'created_at')
    search_fields = ('bus_number', 'bus_name', 'registration_number')
    list_filter = ('bus_type',)


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('source', 'destination', 'distance_km', 'estimated_duration', 'base_fare')
    search_fields = ('source', 'destination')


@admin.register(Passenger)
class PassengerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone_number', 'email', 'created_at')
    search_fields = ('name', 'phone_number', 'email')


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('ticket_number', 'bus', 'route', 'passenger', 'journey_date', 'seat_number', 'price', 'status')
    list_filter = ('status', 'journey_date', 'bus')
    search_fields = ('ticket_number', 'passenger__name', 'bus__bus_name')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('transaction_reference', 'booking', 'amount', 'payment_method', 'payment_status', 'paid_at')
    list_filter = ('payment_status', 'payment_method')
    search_fields = ('transaction_reference', 'booking__ticket_number')

