from datetime import date, timedelta
from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Bus, Route, Passenger, Booking, Payment


class BusTicketReservationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create sample Bus
        self.bus = Bus.objects.create(
            bus_number='BUS-TEST-1',
            bus_name='Superliner Express',
            bus_type='AC Sleeper',
            total_seats=36,
            registration_number='DL-01-TEST-1111'
        )

        # Create sample Route
        self.route = Route.objects.create(
            source='New York',
            destination='Boston',
            distance_km=350.00,
            estimated_duration='4 Hours 30 Mins',
            base_fare=120.00
        )

        # Create sample Passenger
        self.passenger = Passenger.objects.create(
            name='John Doe',
            phone_number='+1 555-0199',
            email='john.doe@example.com',
            address='123 Broadway, NY'
        )

    def test_bus_creation_and_attributes(self):
        """Test Bus model creation and str representation"""
        self.assertEqual(str(self.bus), 'BUS-TEST-1 - Superliner Express (AC Sleeper)')
        self.assertEqual(self.bus.total_seats, 36)

    def test_route_creation_and_attributes(self):
        """Test Route model creation and str representation"""
        self.assertIn('New York to Boston', str(self.route))
        self.assertEqual(float(self.route.base_fare), 120.00)

    def test_passenger_creation(self):
        """Test Passenger model creation"""
        self.assertEqual(str(self.passenger), 'John Doe (+1 555-0199)')

    def test_booking_creation_and_ticket_generation(self):
        """Test Booking model generates unique ticket number automatically"""
        tomorrow = date.today() + timedelta(days=1)
        booking = Booking.objects.create(
            bus=self.bus,
            route=self.route,
            passenger=self.passenger,
            journey_date=tomorrow,
            seat_number=5,
            price=120.00,
            status='Confirmed'
        )
        self.assertTrue(booking.ticket_number.startswith('TKT-'))
        self.assertEqual(booking.seat_number, 5)

    def test_prevent_duplicate_seat_booking_on_same_bus_and_date(self):
        """Ensure duplicate booking on same seat, bus and journey date raises ValidationError"""
        tomorrow = date.today() + timedelta(days=1)
        # First booking succeeds
        Booking.objects.create(
            bus=self.bus,
            route=self.route,
            passenger=self.passenger,
            journey_date=tomorrow,
            seat_number=12,
            price=120.00,
            status='Confirmed'
        )

        # Second passenger attempts to book the same seat on same bus & date
        passenger2 = Passenger.objects.create(
            name='Jane Smith',
            phone_number='+1 555-0200',
            email='jane@example.com'
        )

        with self.assertRaises(ValidationError):
            duplicate_booking = Booking(
                bus=self.bus,
                route=self.route,
                passenger=passenger2,
                journey_date=tomorrow,
                seat_number=12,
                price=120.00,
                status='Confirmed'
            )
            duplicate_booking.clean()

    def test_seat_number_out_of_bounds(self):
        """Ensure booking seat number cannot exceed bus total seats"""
        tomorrow = date.today() + timedelta(days=1)
        with self.assertRaises(ValidationError):
            invalid_seat_booking = Booking(
                bus=self.bus,
                route=self.route,
                passenger=self.passenger,
                journey_date=tomorrow,
                seat_number=999,  # bus only has 36 seats
                price=120.00,
                status='Confirmed'
            )
            invalid_seat_booking.clean()

    def test_cancelled_booking_releases_seat(self):
        """Ensure cancelled booking allows the seat to be booked again"""
        tomorrow = date.today() + timedelta(days=1)
        booking1 = Booking.objects.create(
            bus=self.bus,
            route=self.route,
            passenger=self.passenger,
            journey_date=tomorrow,
            seat_number=15,
            price=120.00,
            status='Cancelled'  # Cancelled
        )

        passenger2 = Passenger.objects.create(
            name='Alice Wonderland',
            phone_number='+1 555-0300',
            email='alice@example.com'
        )

        # Seat 15 is free now because booking1 is Cancelled
        booking2 = Booking.objects.create(
            bus=self.bus,
            route=self.route,
            passenger=passenger2,
            journey_date=tomorrow,
            seat_number=15,
            price=120.00,
            status='Confirmed'
        )
        self.assertEqual(booking2.seat_number, 15)

    def test_payment_creation_and_reference(self):
        """Test Payment creation auto-generates transaction reference"""
        tomorrow = date.today() + timedelta(days=1)
        booking = Booking.objects.create(
            bus=self.bus,
            route=self.route,
            passenger=self.passenger,
            journey_date=tomorrow,
            seat_number=7,
            price=120.00,
            status='Confirmed'
        )
        payment = Payment.objects.create(
            booking=booking,
            amount=120.00,
            payment_method='Credit Card',
            payment_status='Completed'
        )
        self.assertTrue(payment.transaction_reference.startswith('TXN-'))
        self.assertEqual(payment.payment_status, 'Completed')

    def test_api_occupied_seats_endpoint(self):
        """Test the occupied-seats API returns occupied seat numbers"""
        tomorrow = date.today() + timedelta(days=2)
        Booking.objects.create(
            bus=self.bus,
            route=self.route,
            passenger=self.passenger,
            journey_date=tomorrow,
            seat_number=3,
            price=120.00,
            status='Confirmed'
        )
        Booking.objects.create(
            bus=self.bus,
            route=self.route,
            passenger=self.passenger,
            journey_date=tomorrow,
            seat_number=8,
            price=120.00,
            status='Confirmed'
        )

        response = self.client.get(f'/api/bookings/occupied-seats/?bus={self.bus.id}&journey_date={tomorrow.isoformat()}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(3, response.data['occupied_seats'])
        self.assertIn(8, response.data['occupied_seats'])

    def test_api_dashboard_stats(self):
        """Test the dashboard stats API endpoint returns correct aggregations"""
        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_buses', response.data)
        self.assertIn('total_routes', response.data)
        self.assertIn('total_passengers', response.data)
        self.assertIn('total_revenue', response.data)
