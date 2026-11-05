from rest_framework import serializers
from .models import Bus, Route, Passenger, Booking, Payment


class BusSerializer(serializers.ModelSerializer):
    active_bookings_count = serializers.SerializerMethodField()

    class Meta:
        model = Bus
        fields = [
            'id', 'bus_number', 'bus_name', 'bus_type',
            'total_seats', 'registration_number', 'active_bookings_count',
            'created_at', 'updated_at'
        ]

    def get_active_bookings_count(self, obj):
        return obj.bookings.exclude(status='Cancelled').count()


class RouteSerializer(serializers.ModelSerializer):
    route_name = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = [
            'id', 'source', 'destination', 'distance_km',
            'estimated_duration', 'base_fare', 'route_name',
            'created_at', 'updated_at'
        ]

    def get_route_name(self, obj):
        return f"{obj.source} ➔ {obj.destination}"


class PassengerSerializer(serializers.ModelSerializer):
    bookings_count = serializers.SerializerMethodField()

    class Meta:
        model = Passenger
        fields = [
            'id', 'name', 'phone_number', 'email', 'address',
            'bookings_count', 'created_at', 'updated_at'
        ]

    def get_bookings_count(self, obj):
        return obj.bookings.count()


class PaymentDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'payment_method', 'payment_status',
            'transaction_reference', 'paid_at', 'created_at', 'updated_at'
        ]


class BookingSerializer(serializers.ModelSerializer):
    bus_details = BusSerializer(source='bus', read_only=True)
    route_details = RouteSerializer(source='route', read_only=True)
    passenger_details = PassengerSerializer(source='passenger', read_only=True)
    payment = PaymentDetailSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'ticket_number', 'bus', 'route', 'passenger',
            'journey_date', 'seat_number', 'price', 'status',
            'bus_details', 'route_details', 'passenger_details', 'payment',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['ticket_number', 'created_at', 'updated_at']

    def validate(self, data):
        bus = data.get('bus') or (self.instance.bus if self.instance else None)
        journey_date = data.get('journey_date') or (self.instance.journey_date if self.instance else None)
        seat_number = data.get('seat_number') or (self.instance.seat_number if self.instance else None)
        status = data.get('status', self.instance.status if self.instance else 'Confirmed')

        if bus and seat_number:
            if seat_number < 1 or seat_number > bus.total_seats:
                raise serializers.ValidationError({
                    'seat_number': f"Seat number {seat_number} is invalid. {bus.bus_name} has {bus.total_seats} total seats (1 to {bus.total_seats})."
                })

        if status != 'Cancelled' and bus and journey_date and seat_number:
            query = Booking.objects.filter(
                bus=bus,
                journey_date=journey_date,
                seat_number=seat_number
            ).exclude(status='Cancelled')
            if self.instance:
                query = query.exclude(pk=self.instance.pk)
            if query.exists():
                raise serializers.ValidationError({
                    'seat_number': f"Seat {seat_number} on {bus.bus_name} is already booked for {journey_date}."
                })

        return data


class PaymentSerializer(serializers.ModelSerializer):
    booking_ticket = serializers.CharField(source='booking.ticket_number', read_only=True)
    passenger_name = serializers.CharField(source='booking.passenger.name', read_only=True)
    route_summary = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'booking', 'booking_ticket', 'passenger_name', 'route_summary',
            'amount', 'payment_method', 'payment_status',
            'transaction_reference', 'paid_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['transaction_reference', 'paid_at', 'created_at', 'updated_at']

    def get_route_summary(self, obj):
        if obj.booking and obj.booking.route:
            return f"{obj.booking.route.source} ➔ {obj.booking.route.destination}"
        return ""

