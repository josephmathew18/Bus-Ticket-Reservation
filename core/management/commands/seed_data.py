import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Bus, Route, Passenger, Booking, Payment


class Command(BaseCommand):
    help = 'Seeds database with initial sample buses, routes, passengers, bookings, and payments'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Checking database for initial data...'))

        if Bus.objects.exists():
            self.stdout.write(self.style.SUCCESS('Database already has data. Skipping seeding.'))
            return

        self.stdout.write('Seeding Buses...')
        buses_data = [
            {'bus_number': 'BUS-101', 'bus_name': 'Royal Maharaja Express', 'bus_type': 'AC Sleeper', 'total_seats': 36, 'registration_number': 'MH-01-AB-1001'},
            {'bus_number': 'BUS-102', 'bus_name': 'Scania Superfast Intercity', 'bus_type': 'Luxury Volvo', 'total_seats': 44, 'registration_number': 'DL-03-CD-2002'},
            {'bus_number': 'BUS-103', 'bus_name': 'Green Line Comfort Cruiser', 'bus_type': 'AC Seater', 'total_seats': 40, 'registration_number': 'KA-05-EF-3003'},
            {'bus_number': 'BUS-104', 'bus_name': 'Sahara Night Rider', 'bus_type': 'Non-AC Sleeper', 'total_seats': 32, 'registration_number': 'RJ-14-GH-4004'},
            {'bus_number': 'BUS-105', 'bus_name': 'Coastal Breeze Express', 'bus_type': 'Non-AC Seater', 'total_seats': 48, 'registration_number': 'GA-07-IJ-5005'},
            {'bus_number': 'BUS-106', 'bus_name': 'Deccan Horizon Multi-Axle', 'bus_type': 'Luxury Volvo', 'total_seats': 42, 'registration_number': 'TS-09-KL-6006'},
        ]
        bus_objs = [Bus.objects.create(**data) for data in buses_data]

        self.stdout.write('Seeding Routes...')
        routes_data = [
            {'source': 'Mumbai', 'destination': 'Pune', 'distance_km': 148.50, 'estimated_duration': '3 Hours 15 Mins', 'base_fare': 450.00},
            {'source': 'Bangalore', 'destination': 'Chennai', 'distance_km': 346.00, 'estimated_duration': '6 Hours 30 Mins', 'base_fare': 850.00},
            {'source': 'Delhi', 'destination': 'Jaipur', 'distance_km': 281.00, 'estimated_duration': '5 Hours 00 Mins', 'base_fare': 650.00},
            {'source': 'Hyderabad', 'destination': 'Vijayawada', 'distance_km': 275.00, 'estimated_duration': '5 Hours 15 Mins', 'base_fare': 600.00},
            {'source': 'Ahmedabad', 'destination': 'Surat', 'distance_km': 265.00, 'estimated_duration': '4 Hours 45 Mins', 'base_fare': 550.00},
            {'source': 'Goa', 'destination': 'Mumbai', 'distance_km': 585.00, 'estimated_duration': '11 Hours 30 Mins', 'base_fare': 1250.00},
        ]
        route_objs = [Route.objects.create(**data) for data in routes_data]

        self.stdout.write('Seeding Passengers...')
        passengers_data = [
            {'name': 'Rajesh Sharma', 'phone_number': '+91 9820011223', 'email': 'rajesh.sharma@example.com', 'address': '102 Skyline Apts, Andheri West, Mumbai'},
            {'name': 'Priya Nair', 'phone_number': '+91 9741122334', 'email': 'priya.nair@example.com', 'address': '45 Indiranagar 100ft Road, Bangalore'},
            {'name': 'Amitabh Verma', 'phone_number': '+91 9910033445', 'email': 'amitabh.v@example.com', 'address': '12 Connaught Place, New Delhi'},
            {'name': 'Sneha Kulkarni', 'phone_number': '+91 9422044556', 'email': 'sneha.k@example.com', 'address': '88 Shivaji Nagar, Pune'},
            {'name': 'Vikram Reddy', 'phone_number': '+91 9848055667', 'email': 'vikram.reddy@example.com', 'address': '201 Jubilee Hills, Hyderabad'},
            {'name': 'Ananya Das', 'phone_number': '+91 9830066778', 'email': 'ananya.das@example.com', 'address': '15 Salt Lake City, Sector V, Kolkata'},
            {'name': 'Rohan Patel', 'phone_number': '+91 9898077889', 'email': 'rohan.patel@example.com', 'address': '7 Navrangpura, Ahmedabad'},
            {'name': 'Pooja Hegde', 'phone_number': '+91 9743088990', 'email': 'pooja.hegde@example.com', 'address': '54 Mangalore Bypass, Udupi'},
        ]
        passenger_objs = [Passenger.objects.create(**data) for data in passengers_data]

        self.stdout.write('Seeding Bookings & Payments...')
        today = timezone.now().date()
        methods = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash']
        statuses = ['Confirmed', 'Confirmed', 'Confirmed', 'Pending', 'Cancelled']

        for i, passenger in enumerate(passenger_objs):
            bus = bus_objs[i % len(bus_objs)]
            route = route_objs[i % len(route_objs)]
            journey_date = today + timedelta(days=(i % 5))
            seat_number = i + 1
            status_choice = statuses[i % len(statuses)]
            price = route.base_fare

            booking = Booking.objects.create(
                bus=bus,
                route=route,
                passenger=passenger,
                journey_date=journey_date,
                seat_number=seat_number,
                price=price,
                status=status_choice
            )

            pay_status = 'Completed' if status_choice == 'Confirmed' else ('Refunded' if status_choice == 'Cancelled' else 'Pending')
            Payment.objects.create(
                booking=booking,
                amount=price,
                payment_method=random.choice(methods),
                payment_status=pay_status
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded database with buses, routes, passengers, bookings, and payments!'))

