import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class Bus(models.Model):
    BUS_TYPE_CHOICES = [
        ('AC Sleeper', 'AC Sleeper'),
        ('Non-AC Sleeper', 'Non-AC Sleeper'),
        ('AC Seater', 'AC Seater'),
        ('Non-AC Seater', 'Non-AC Seater'),
        ('Luxury Volvo', 'Luxury Volvo'),
    ]

    bus_number = models.CharField(max_length=50, unique=True, help_text="Unique bus number (e.g., BUS-101)")
    bus_name = models.CharField(max_length=100, help_text="Operator or bus name")
    bus_type = models.CharField(max_length=50, choices=BUS_TYPE_CHOICES, default='AC Seater')
    total_seats = models.PositiveIntegerField(default=40, help_text="Total seating capacity")
    registration_number = models.CharField(max_length=50, unique=True, help_text="RTO Registration number")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Bus"
        verbose_name_plural = "Buses"
        ordering = ['bus_number']

    def __str__(self):
        return f"{self.bus_number} - {self.bus_name} ({self.bus_type})"


class Route(models.Model):
    source = models.CharField(max_length=100, help_text="Origin city/location")
    destination = models.CharField(max_length=100, help_text="Destination city/location")
    distance_km = models.DecimalField(max_digits=7, decimal_places=2, help_text="Distance in Kilometers")
    estimated_duration = models.CharField(max_length=50, help_text="e.g. 5 Hours 30 Mins")
    base_fare = models.DecimalField(max_digits=10, decimal_places=2, default=500.00, help_text="Base ticket fare")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Route"
        verbose_name_plural = "Routes"
        ordering = ['source', 'destination']

    def __str__(self):
        return f"{self.source} to {self.destination} ({self.distance_km} km)"


class Passenger(models.Model):
    name = models.CharField(max_length=120)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    address = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Passenger"
        verbose_name_plural = "Passengers"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.phone_number})"


class Booking(models.Model):
    STATUS_CHOICES = [
        ('Confirmed', 'Confirmed'),
        ('Pending', 'Pending'),
        ('Cancelled', 'Cancelled'),
    ]

    ticket_number = models.CharField(max_length=64, unique=True, editable=False, db_index=True)
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name='bookings')
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='bookings')
    passenger = models.ForeignKey(Passenger, on_delete=models.CASCADE, related_name='bookings')
    journey_date = models.DateField()
    seat_number = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Confirmed')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Ticket Booking"
        verbose_name_plural = "Ticket Bookings"
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['bus', 'journey_date', 'seat_number'],
                condition=~models.Q(status='Cancelled'),
                name='unique_active_seat_per_bus_date'
            )
        ]

    def clean(self):
        super().clean()
        if self.bus and self.seat_number:
            if self.seat_number < 1 or self.seat_number > self.bus.total_seats:
                raise ValidationError(
                    f"Seat number must be between 1 and {self.bus.total_seats} for {self.bus.bus_name}."
                )

        if self.status != 'Cancelled' and self.bus and self.journey_date and self.seat_number:
            conflict_query = Booking.objects.filter(
                bus=self.bus,
                journey_date=self.journey_date,
                seat_number=self.seat_number
            ).exclude(status='Cancelled')
            if self.pk:
                conflict_query = conflict_query.exclude(pk=self.pk)
            if conflict_query.exists():
                raise ValidationError(
                    f"Seat {self.seat_number} on {self.bus.bus_name} ({self.bus.bus_number}) is already booked for {self.journey_date}."
                )

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            today_str = timezone.now().strftime('%Y%m%d')
            unique_suffix = uuid.uuid4().hex[:6].upper()
            self.ticket_number = f"TKT-{today_str}-{unique_suffix}"
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticket_number} - {self.passenger.name} (Seat {self.seat_number})"


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('Credit Card', 'Credit Card'),
        ('Debit Card', 'Debit Card'),
        ('UPI', 'UPI'),
        ('Net Banking', 'Net Banking'),
        ('Cash', 'Cash'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('Completed', 'Completed'),
        ('Pending', 'Pending'),
        ('Failed', 'Failed'),
        ('Refunded', 'Refunded'),
    ]

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='payment')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default='UPI')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='Completed')
    transaction_reference = models.CharField(max_length=64, unique=True, db_index=True)
    paid_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        ordering = ['-paid_at']

    def save(self, *args, **kwargs):
        if not self.transaction_reference:
            unique_suffix = uuid.uuid4().hex[:8].upper()
            self.transaction_reference = f"TXN-{timezone.now().strftime('%Y%m%d')}-{unique_suffix}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_reference} - {self.booking.ticket_number} (${self.amount})"

