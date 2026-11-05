# Bus Ticket Reservation Management System

A production-ready, full-stack **Bus Ticket Reservation Management System** built with **Django & Django REST Framework**, **MySQL**, **Bootstrap 5**, **Docker**, **Docker Compose**, and **Nginx**.

---

## 1. Project Overview

The **Bus Ticket Reservation Management System** provides end-to-end management for transit operators and passengers. The platform features complete CRUD operations for fleet buses, transit routes, passenger profiles, ticket reservations, and payment transactions, backed by an interactive seat selection map, duplicate booking prevention algorithms, and a real-time analytics dashboard.

The entire multi-tier system runs inside isolated Docker containers with Nginx serving as the high-performance reverse proxy and web server listening on standard HTTP port 80.

---

## 2. Technology Stack

- **Frontend**:
  - HTML5 & CSS3 (Custom transit theme)
  - Bootstrap 5.3 & Bootstrap Icons
  - Vanilla JavaScript (Async/Await & Fetch API)
  - Chart.js (Real-time analytics & fleet composition)
  - Interactive Visual Seat Layout Selector
  - Printable Airline-Style Boarding Pass Generator
- **Backend**:
  - Python 3.11 / 3.12 / 3.13
  - Django 5.x
  - Django REST Framework (DRF)
  - Gunicorn WSGI HTTP Server
  - PyMySQL & Cryptography
- **Database**:
  - MySQL 8.0 (Relational storage with strict foreign keys and constraints)
- **DevOps & Containerization**:
  - Docker & Multi-container Docker Compose
  - Nginx (Reverse Proxy & Static Asset Server on Port 80)
  - Healthchecks and automated database wait scripts

---

## 3. System Architecture

```
                                  +---------------------------------------+
                                  |     Client Browser (User / Admin)     |
                                  |         http://localhost:80           |
                                  +---------------------------------------+
                                                     |
                                                     | HTTP Port 80
                                                     v
                                  +---------------------------------------+
                                  |            Nginx Container            |
                                  |       (Reverse Proxy & Static)        |
                                  +---------------------------------------+
                                        /                           \
                                       /                             \
                       Static Assets  /                               \  Proxy Pass
                      (/static/*)    /                                 \ (API & Views)
                                    v                                   v
             +------------------------------+            +---------------------------------+
             |        static_volume         |            |     Django Backend Container    |
             | (Pre-collected CSS/JS/Icons) |            |     (Gunicorn on port 8000)     |
             +------------------------------+            +---------------------------------+
                                                                         |
                                                                         | TCP Port 3306
                                                                         v
                                                         +---------------------------------+
                                                         |      MySQL 8.0 Database         |
                                                         |       (Volume: mysql_data)      |
                                                         +---------------------------------+
```

---

## 4. Key Modules & Features

### A. Bus Management (CRUD)
- **Add New Buses**: Register buses with bus number, bus name, bus classification, total capacity, and RTO registration plate.
- **View Buses**: Filter buses by classification (`AC Sleeper`, `Non-AC Sleeper`, `AC Seater`, `Non-AC Seater`, `Luxury Volvo`) and live search.
- **Update Bus**: Modify name, seat count, and fleet details.
- **Delete Bus**: Secure deletion modal with cascade warning.

### B. Route Management (CRUD)
- **Create Routes**: Origin city, destination city, distance in kilometers, estimated travel duration, and base ticket fare.
- **View & Filter Routes**: Search routes by source or destination city.
- **Edit & Update**: Modify base fare and estimated travel duration.
- **Delete Routes**: Remove unused routes with confirmation dialogs.

### C. Passenger Management (CRUD)
- **Register Passengers**: Capture full name, telephone, email address, and home address.
- **View & Search**: Live search across passenger names, email, and phone numbers.
- **Edit & Update**: Update passenger details dynamically.
- **Delete Passenger**: Safe removal with verification.

### D. Ticket Booking Management (CRUD & Seat Validation)
- **Issue Ticket**:
  - Select registered passenger (or quick-register from modal).
  - Select route (auto-calculates ticket fare).
  - Select assigned bus and journey date.
  - **Interactive Seat Map**: Displays a visual 4-column bus seating grid. Occupied seats on that bus for that specific date are highlighted in red and locked. Available seats are clickable.
  - **Double-Booking Prevention**: Enforced at both the frontend (seat grid), serializer validation, model `clean()` method, and database conditional unique constraints (`bus`, `journey_date`, `seat_number`).
  - **Unique Ticket Number**: Auto-generates unique ticket codes (e.g., `TKT-20261104-A1B2C3`).
- **Boarding Pass Modal**: Generates a printable boarding pass with origin, destination, seat number, passenger info, fare paid, barcode mockup, and browser print functionality.
- **Cancel Booking**: Releasing the seat immediately for re-booking and updating payment status to `Refunded`.

### E. Payment Management (CRUD)
- **Automatic Payment Record**: Created automatically upon ticket issuance.
- **Payment Methods**: Credit Card, Debit Card, UPI, Net Banking, and Cash.
- **Payment Statuses**: `Completed`, `Pending`, `Failed`, and `Refunded`.
- **Unique Transaction Reference**: Auto-generated transaction IDs (e.g., `TXN-20261104-XXXX`).
- **Update & Delete**: Modify payment status or delete obsolete transaction records.

### F. Analytics Dashboard
- Total Buses, Total Routes, Total Passengers, and Total Revenue collected.
- Confirmed vs. Cancelled ticket metrics.
- Chart.js Route Booking Frequency Bar Chart.
- Chart.js Bus Fleet Classification Doughnut Chart.
- Real-time recent bookings table with quick ticket inspection.

---

## 5. Docker Deployment Guide

### Prerequisites
- Docker Engine & Docker Compose (included in Docker Desktop on Windows/Mac, or standalone on Linux).
- Port 80 and 3306 available on the host machine.

### Quick Start with Docker Compose

1. **Clone or Navigate to the Project Root**:
   ```bash
   cd "Bus-Ticket-Reservation"
   ```

2. **Verify or Edit Environment Settings**:
   The default `.env` file is ready out-of-the-box:
   ```env
   SECRET_KEY=django-insecure-bus-ticket-reservation-key-change-in-production-2026!
   DEBUG=False
   ALLOWED_HOSTS=localhost,127.0.0.1,backend,web,testserver,*
   DB_ENGINE=mysql
   DB_NAME=bus_reservation_db
   DB_USER=bus_user
   DB_PASSWORD=bus_password123
   DB_HOST=db
   DB_PORT=3306
   MYSQL_ROOT_PASSWORD=root_password123
   ```

3. **Build the Docker Images**:
   ```bash
   docker compose build
   ```
   *Image Name*: `bus-ticket-reservation:latest`

4. **Launch the Containerized Services**:
   ```bash
   docker compose up -d
   ```

5. **Access the Application**:
   Open your browser and navigate to:
   ```
   http://localhost
   ```
   The dashboard will open immediately with pre-seeded sample data!

---

## 6. Docker Desktop Workflow & Important Clarification

When using **Docker Desktop**:
1. You can start all services by clicking the **Start / Play** button on the `bus-ticket-reservation` compose group.
2. In the Containers list, you will see three running containers:
   - `bus_reservation_nginx` (Port `80:80`)
   - `bus_reservation_backend` (Port `8000`)
   - `bus_reservation_mysql` (Port `3306:3306`)
3. > **Important**: Clicking on a container or image row inside Docker Desktop **does not automatically open the web page** in your browser. Docker Desktop runs background container processes. To access the web application, ensure the containers are in the **Running** status, open your web browser (Chrome, Edge, Firefox, Safari), and go to:
   >
   > **`http://localhost`** (or click the port `80:80` hyperlink next to the `bus_reservation_nginx` container).

---

## 7. Useful Docker Management Commands

- **Check Service Status**:
  ```bash
  docker compose ps
  ```

- **View Backend Logs**:
  ```bash
  docker compose logs -f backend
  ```

- **View Nginx Proxy Logs**:
  ```bash
  docker compose logs -f nginx
  ```

- **Stop All Containers**:
  ```bash
  docker compose stop
  ```

- **Stop and Remove Containers & Networks**:
  ```bash
  docker compose down
  ```

- **Reset Database & Volumes (Fresh Start)**:
  ```bash
  docker compose down -v
  docker compose up -d --build
  ```

---

## 8. Standalone Local Execution (Without Docker)

You can also run the application directly using Python:

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Apply database migrations
python manage.py migrate

# 3. Populate sample buses, routes, passengers, bookings, and payments
python manage.py seed_data

# 4. Collect static files
python manage.py collectstatic --noinput

# 5. Start development server
python manage.py runserver 127.0.0.1:8000
```
Open: `http://127.0.0.1:8000`

---

## 9. Automated Testing

The project includes automated unit and integration tests verifying all models, duplicate seat constraints, auto-generated ticket codes, cancel actions, and REST API endpoints:

```bash
python manage.py test core
```

Output:
```
Ran 10 tests in 0.074s
OK
```

---

## 10. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Responsive SPA Dashboard & Web Interface |
| `GET` | `/api/dashboard/stats/` | Aggregated metrics, charts data, and recent bookings |
| `GET` / `POST` | `/api/buses/` | List all buses / Create new bus |
| `GET` / `PUT` / `DELETE` | `/api/buses/{id}/` | Retrieve, update, or delete bus |
| `GET` / `POST` | `/api/routes/` | List all routes / Create new route |
| `GET` / `PUT` / `DELETE` | `/api/routes/{id}/` | Retrieve, update, or delete route |
| `GET` / `POST` | `/api/passengers/` | List all passengers / Register passenger |
| `GET` / `PUT` / `DELETE` | `/api/passengers/{id}/` | Retrieve, update, or delete passenger |
| `GET` / `POST` | `/api/bookings/` | List bookings / Book new ticket |
| `GET` | `/api/bookings/occupied-seats/` | Real-time query of booked seats (`?bus=<id>&journey_date=<YYYY-MM-DD>`) |
| `POST` | `/api/bookings/{id}/cancel/` | Cancel booking, release seat, and refund payment |
| `GET` / `DELETE` | `/api/bookings/{id}/` | Retrieve or delete booking record |
| `GET` | `/api/payments/` | Audit transaction history |
| `PATCH` / `DELETE` | `/api/payments/{id}/` | Update payment status or delete payment record |
| `GET` | `/admin/` | Built-in Django Administration Portal |

