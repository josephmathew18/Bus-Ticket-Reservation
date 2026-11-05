// ==============================================================
// Omnibus Pro - Bus Ticket Reservation Management System
// Frontend Single Page Application Controller
// ==============================================================

const state = {
    currentSection: 'dashboard',
    buses: [],
    routes: [],
    passengers: [],
    bookings: [],
    payments: [],
    stats: {},
    selectedSeat: null,
    occupiedSeats: [],
    deleteTarget: { type: null, id: null, title: '' },
    charts: {
        routeDemand: null,
        busFleet: null
    }
};

// ==============================================================
// Utility Functions
// ==============================================================

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

async function apiFetch(url, options = {}) {
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const csrftoken = getCookie('csrftoken');
    if (csrftoken) {
        headers['X-CSRFToken'] = csrftoken;
    }

    try {
        const response = await fetch(url, { ...options, headers });
        const contentType = response.headers.get('content-type');
        let data = null;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }

        if (!response.ok) {
            let errorMsg = 'An error occurred while processing the request.';
            if (data) {
                if (typeof data === 'string') {
                    errorMsg = data;
                } else if (data.detail) {
                    errorMsg = data.detail;
                } else {
                    const errors = [];
                    for (const [key, val] of Object.entries(data)) {
                        errors.push(`${key}: ${Array.isArray(val) ? val.join(' ') : val}`);
                    }
                    if (errors.length > 0) errorMsg = errors.join('\n');
                }
            }
            throw new Error(errorMsg);
        }

        return data;
    } catch (err) {
        console.error('API Error:', err);
        throw err;
    }
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('liveToast');
    const toastMsg = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    toastEl.className = 'toast align-items-center text-white border-0 shadow-lg';
    if (type === 'success') {
        toastEl.classList.add('bg-success');
        toastIcon.className = 'bi bi-check-circle-fill fs-5';
    } else if (type === 'danger' || type === 'error') {
        toastEl.classList.add('bg-danger');
        toastIcon.className = 'bi bi-exclamation-triangle-fill fs-5';
    } else if (type === 'warning') {
        toastEl.classList.add('bg-warning', 'text-dark');
        toastIcon.className = 'bi bi-exclamation-circle-fill fs-5';
    } else {
        toastEl.classList.add('bg-primary');
        toastIcon.className = 'bi bi-info-circle-fill fs-5';
    }

    toastMsg.innerText = message;
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}

function formatCurrency(amount) {
    const val = parseFloat(amount || 0);
    return '$' + val.toFixed(2);
}

function formatDate(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '--';
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusBadge(status) {
    switch (status) {
        case 'Confirmed':
        case 'Completed':
            return '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="bi bi-check2-circle me-1"></i>' + status + '</span>';
        case 'Pending':
            return '<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1"><i class="bi bi-clock-history me-1"></i>' + status + '</span>';
        case 'Cancelled':
        case 'Failed':
            return '<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1"><i class="bi bi-x-circle me-1"></i>' + status + '</span>';
        case 'Refunded':
            return '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1"><i class="bi bi-arrow-counterclockwise me-1"></i>' + status + '</span>';
        default:
            return '<span class="badge bg-light text-dark border px-2 py-1">' + status + '</span>';
    }
}

function getBusTypeBadge(type) {
    switch (type) {
        case 'AC Sleeper':
            return '<span class="badge bg-primary-subtle text-primary border border-primary-subtle">' + type + '</span>';
        case 'Luxury Volvo':
            return '<span class="badge bg-indigo-subtle text-purple border border-indigo-subtle" style="background:#f3e8ff;color:#7e22ce;">' + type + '</span>';
        case 'AC Seater':
            return '<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle">' + type + '</span>';
        case 'Non-AC Sleeper':
            return '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">' + type + '</span>';
        default:
            return '<span class="badge bg-light text-dark border">' + type + '</span>';
    }
}

// ==============================================================
// Section Navigation & Routing
// ==============================================================

function navigateSection(sectionName) {
    state.currentSection = sectionName;

    // Update nav links active state
    document.querySelectorAll('.nav-item-link').forEach(link => {
        if (link.getAttribute('data-section') === sectionName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Hide all sections, show target
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.add('d-none');
    });

    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.remove('d-none');
    }

    // Update Titles
    const titleMap = {
        'dashboard': 'Dashboard Overview',
        'buses': 'Fleet Bus Management',
        'routes': 'Transit Route Management',
        'passengers': 'Passenger Directory',
        'bookings': 'Ticket Bookings & Boarding Passes',
        'payments': 'Payment History & Transactions'
    };
    document.getElementById('currentSectionTitle').innerText = titleMap[sectionName] || 'Overview';
    document.getElementById('breadcrumbCurrent').innerText = (sectionName.charAt(0).toUpperCase() + sectionName.slice(1));

    // Load section data
    switch (sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'buses':
            loadBuses();
            break;
        case 'routes':
            loadRoutes();
            break;
        case 'passengers':
            loadPassengers();
            break;
        case 'bookings':
            loadBookings();
            break;
        case 'payments':
            loadPayments();
            break;
    }

    window.location.hash = sectionName;
}

function refreshCurrentSection() {
    navigateSection(state.currentSection);
    showToast('Data refreshed.', 'info');
}

// ==============================================================
// 1. DASHBOARD MODULE
// ==============================================================

async function loadDashboard() {
    try {
        const stats = await apiFetch('/api/dashboard/stats/');
        state.stats = stats;

        // Populate cards
        document.getElementById('dash-total-buses').innerText = stats.total_buses;
        document.getElementById('dash-total-routes').innerText = stats.total_routes;
        document.getElementById('dash-total-passengers').innerText = stats.total_passengers;
        document.getElementById('dash-total-revenue').innerText = formatCurrency(stats.total_revenue);

        document.getElementById('dash-total-bookings').innerText = stats.total_bookings;
        document.getElementById('dash-confirmed-tickets').innerText = stats.confirmed_tickets;
        document.getElementById('dash-cancelled-tickets').innerText = stats.cancelled_tickets;

        // Update sidebar badges
        document.getElementById('badge-total-buses').innerText = stats.total_buses;
        document.getElementById('badge-total-routes').innerText = stats.total_routes;
        document.getElementById('badge-total-passengers').innerText = stats.total_passengers;
        document.getElementById('badge-total-bookings').innerText = stats.total_bookings;

        // Render Recent Bookings
        renderRecentBookings(stats.recent_bookings || []);

        // Render Charts
        renderDashboardCharts(stats);

    } catch (err) {
        console.error('Failed to load dashboard stats:', err);
    }
}

function renderRecentBookings(bookings) {
    const tbody = document.getElementById('dash-recent-bookings-body');
    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No recent bookings recorded.</td></tr>`;
        return;
    }

    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td class="ps-4">
                <span class="badge bg-light text-dark font-monospace border">${b.ticket_number}</span>
            </td>
            <td>
                <div class="fw-semibold text-dark">${b.passenger_details ? b.passenger_details.name : 'N/A'}</div>
                <small class="text-muted fs-xxs">${b.passenger_details ? b.passenger_details.phone_number : ''}</small>
            </td>
            <td>
                <span class="badge bg-light border text-dark">
                    ${b.route_details ? `${b.route_details.source} ➔ ${b.route_details.destination}` : 'N/A'}
                </span>
            </td>
            <td>
                <div class="fw-medium">${b.bus_details ? b.bus_details.bus_name : 'N/A'}</div>
                <small class="text-muted fs-xxs">${b.bus_details ? b.bus_details.bus_number : ''}</small>
            </td>
            <td>${formatDate(b.journey_date)}</td>
            <td><span class="badge bg-primary-subtle text-primary fw-bold">Seat #${b.seat_number}</span></td>
            <td class="fw-semibold text-success">${formatCurrency(b.price)}</td>
            <td>${getStatusBadge(b.status)}</td>
            <td class="text-end pe-4">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewBoardingPass(${b.id})" title="View / Print Ticket">
                        <i class="bi bi-printer"></i>
                    </button>
                    ${b.status !== 'Cancelled' ? `
                        <button class="btn btn-outline-danger" onclick="confirmCancelBooking(${b.id}, '${b.ticket_number}')" title="Cancel Booking">
                            <i class="bi bi-x-circle"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderDashboardCharts(stats) {
    // 1. Route Demand Chart
    const routeCtx = document.getElementById('chartRouteDemand');
    if (routeCtx) {
        if (state.charts.routeDemand) {
            state.charts.routeDemand.destroy();
        }

        const routeLabels = (stats.route_stats || []).map(r => `${r.source} - ${r.destination}`);
        const routeData = (stats.route_stats || []).map(r => r.booking_count);

        state.charts.routeDemand = new Chart(routeCtx, {
            type: 'bar',
            data: {
                labels: routeLabels.length ? routeLabels : ['No Routes'],
                datasets: [{
                    label: 'Bookings Count',
                    data: routeData.length ? routeData : [0],
                    backgroundColor: '#2563eb',
                    borderRadius: 6,
                    maxBarThickness: 32
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, precision: 0 },
                        grid: { color: '#f1f5f9' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // 2. Bus Fleet Distribution Chart
    const fleetCtx = document.getElementById('chartBusFleet');
    if (fleetCtx) {
        if (state.charts.busFleet) {
            state.charts.busFleet.destroy();
        }

        const typeLabels = (stats.bus_type_stats || []).map(b => b.bus_type);
        const typeData = (stats.bus_type_stats || []).map(b => b.count);

        state.charts.busFleet = new Chart(fleetCtx, {
            type: 'doughnut',
            data: {
                labels: typeLabels.length ? typeLabels : ['No Buses'],
                datasets: [{
                    data: typeData.length ? typeData : [1],
                    backgroundColor: [
                        '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12, font: { size: 11 } }
                    }
                },
                cutout: '65%'
            }
        });
    }
}

// ==============================================================
// 2. BUS MANAGEMENT MODULE
// ==============================================================

async function loadBuses() {
    try {
        const buses = await apiFetch('/api/buses/');
        state.buses = buses;
        filterBuses();
    } catch (err) {
        showToast('Failed to load buses: ' + err.message, 'danger');
    }
}

function filterBuses() {
    const search = (document.getElementById('busSearchInput')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('busTypeFilter')?.value || '';

    const filtered = state.buses.filter(b => {
        const matchesSearch = !search ||
            b.bus_number.toLowerCase().includes(search) ||
            b.bus_name.toLowerCase().includes(search) ||
            b.registration_number.toLowerCase().includes(search);
        const matchesType = !typeFilter || b.bus_type === typeFilter;
        return matchesSearch && matchesType;
    });

    renderBuses(filtered);
}

function renderBuses(buses) {
    const tbody = document.getElementById('busesTableBody');
    const emptyState = document.getElementById('busesEmptyState');

    if (!buses || buses.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }

    emptyState.classList.add('d-none');
    tbody.innerHTML = buses.map(b => `
        <tr>
            <td class="ps-3">
                <span class="badge bg-light text-dark font-monospace border">${b.bus_number}</span>
            </td>
            <td>
                <div class="fw-semibold text-dark">${b.bus_name}</div>
            </td>
            <td>${getBusTypeBadge(b.bus_type)}</td>
            <td>
                <span class="badge bg-secondary-subtle text-secondary">${b.total_seats} Seats</span>
            </td>
            <td>
                <span class="font-monospace text-muted fs-xs">${b.registration_number}</span>
            </td>
            <td>
                <span class="badge bg-primary-subtle text-primary">${b.active_bookings_count} Bookings</span>
            </td>
            <td class="text-end pe-3">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary" onclick="openEditBusModal(${b.id})" title="Edit Bus">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="confirmDeleteBus(${b.id}, '${b.bus_number} - ${b.bus_name}')" title="Delete Bus">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openAddBusModal() {
    document.getElementById('busForm').reset();
    document.getElementById('busId').value = '';
    document.getElementById('modalBusTitle').innerText = 'Add New Bus';
    const modal = new bootstrap.Modal(document.getElementById('modalBus'));
    modal.show();
}

function openEditBusModal(id) {
    const bus = state.buses.find(b => b.id === id);
    if (!bus) return;

    document.getElementById('busId').value = bus.id;
    document.getElementById('busNumber').value = bus.bus_number;
    document.getElementById('busName').value = bus.bus_name;
    document.getElementById('busType').value = bus.bus_type;
    document.getElementById('busTotalSeats').value = bus.total_seats;
    document.getElementById('busRegNumber').value = bus.registration_number;

    document.getElementById('modalBusTitle').innerText = 'Edit Bus Details';
    const modal = new bootstrap.Modal(document.getElementById('modalBus'));
    modal.show();
}

async function handleBusSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('busId').value;
    const data = {
        bus_number: document.getElementById('busNumber').value.trim(),
        bus_name: document.getElementById('busName').value.trim(),
        bus_type: document.getElementById('busType').value,
        total_seats: parseInt(document.getElementById('busTotalSeats').value),
        registration_number: document.getElementById('busRegNumber').value.trim()
    };

    const spinner = document.getElementById('spinnerBus');
    const saveBtn = document.getElementById('btnSaveBus');
    spinner.classList.remove('d-none');
    saveBtn.disabled = true;

    try {
        if (id) {
            await apiFetch(`/api/buses/${id}/`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Bus updated successfully!');
        } else {
            await apiFetch('/api/buses/', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Bus registered successfully!');
        }

        bootstrap.Modal.getInstance(document.getElementById('modalBus')).hide();
        await loadBuses();
        loadDashboard();
    } catch (err) {
        showToast(err.message, 'danger');
    } finally {
        spinner.classList.add('d-none');
        saveBtn.disabled = false;
    }
}

function confirmDeleteBus(id, title) {
    confirmDelete('bus', id, `Delete Bus "${title}"? All associated bookings will be affected.`);
}

// ==============================================================
// 3. ROUTE MANAGEMENT MODULE
// ==============================================================

async function loadRoutes() {
    try {
        const routes = await apiFetch('/api/routes/');
        state.routes = routes;
        filterRoutes();
    } catch (err) {
        showToast('Failed to load routes: ' + err.message, 'danger');
    }
}

function filterRoutes() {
    const search = (document.getElementById('routeSearchInput')?.value || '').toLowerCase();

    const filtered = state.routes.filter(r => {
        return !search ||
            r.source.toLowerCase().includes(search) ||
            r.destination.toLowerCase().includes(search);
    });

    renderRoutes(filtered);
}

function renderRoutes(routes) {
    const tbody = document.getElementById('routesTableBody');
    const emptyState = document.getElementById('routesEmptyState');

    if (!routes || routes.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }

    emptyState.classList.add('d-none');
    tbody.innerHTML = routes.map(r => `
        <tr>
            <td class="ps-3">
                <span class="badge bg-primary-subtle text-primary border border-primary-subtle fs-xs">
                    ${r.source} ➔ ${r.destination}
                </span>
            </td>
            <td class="fw-semibold text-dark">${r.source}</td>
            <td class="fw-semibold text-dark">${r.destination}</td>
            <td><span class="badge bg-light text-dark border">${parseFloat(r.distance_km).toFixed(1)} km</span></td>
            <td>
                <span class="text-muted fs-xs"><i class="bi bi-clock me-1"></i>${r.estimated_duration}</span>
            </td>
            <td class="fw-bold text-success">${formatCurrency(r.base_fare)}</td>
            <td class="text-end pe-3">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary" onclick="openEditRouteModal(${r.id})" title="Edit Route">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="confirmDeleteRoute(${r.id}, '${r.source} to ${r.destination}')" title="Delete Route">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openAddRouteModal() {
    document.getElementById('routeForm').reset();
    document.getElementById('routeId').value = '';
    document.getElementById('modalRouteTitle').innerText = 'Add New Route';
    const modal = new bootstrap.Modal(document.getElementById('modalRoute'));
    modal.show();
}

function openEditRouteModal(id) {
    const route = state.routes.find(r => r.id === id);
    if (!route) return;

    document.getElementById('routeId').value = route.id;
    document.getElementById('routeSource').value = route.source;
    document.getElementById('routeDestination').value = route.destination;
    document.getElementById('routeDistance').value = route.distance_km;
    document.getElementById('routeBaseFare').value = route.base_fare;
    document.getElementById('routeDuration').value = route.estimated_duration;

    document.getElementById('modalRouteTitle').innerText = 'Edit Route Details';
    const modal = new bootstrap.Modal(document.getElementById('modalRoute'));
    modal.show();
}

async function handleRouteSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('routeId').value;
    const data = {
        source: document.getElementById('routeSource').value.trim(),
        destination: document.getElementById('routeDestination').value.trim(),
        distance_km: parseFloat(document.getElementById('routeDistance').value),
        base_fare: parseFloat(document.getElementById('routeBaseFare').value),
        estimated_duration: document.getElementById('routeDuration').value.trim()
    };

    const spinner = document.getElementById('spinnerRoute');
    const saveBtn = document.getElementById('btnSaveRoute');
    spinner.classList.remove('d-none');
    saveBtn.disabled = true;

    try {
        if (id) {
            await apiFetch(`/api/routes/${id}/`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Route updated successfully!');
        } else {
            await apiFetch('/api/routes/', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Route created successfully!');
        }

        bootstrap.Modal.getInstance(document.getElementById('modalRoute')).hide();
        await loadRoutes();
        loadDashboard();
    } catch (err) {
        showToast(err.message, 'danger');
    } finally {
        spinner.classList.add('d-none');
        saveBtn.disabled = false;
    }
}

function confirmDeleteRoute(id, title) {
    confirmDelete('route', id, `Delete Route "${title}"? Associated bookings will be affected.`);
}

// ==============================================================
// 4. PASSENGER MANAGEMENT MODULE
// ==============================================================

async function loadPassengers() {
    try {
        const passengers = await apiFetch('/api/passengers/');
        state.passengers = passengers;
        filterPassengers();
    } catch (err) {
        showToast('Failed to load passengers: ' + err.message, 'danger');
    }
}

function filterPassengers() {
    const search = (document.getElementById('passengerSearchInput')?.value || '').toLowerCase();

    const filtered = state.passengers.filter(p => {
        return !search ||
            p.name.toLowerCase().includes(search) ||
            p.phone_number.toLowerCase().includes(search) ||
            p.email.toLowerCase().includes(search);
    });

    renderPassengers(filtered);
}

function renderPassengers(passengers) {
    const tbody = document.getElementById('passengersTableBody');
    const emptyState = document.getElementById('passengersEmptyState');

    if (!passengers || passengers.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }

    emptyState.classList.add('d-none');
    tbody.innerHTML = passengers.map(p => `
        <tr>
            <td class="ps-3">
                <div class="d-flex align-items-center gap-2">
                    <div class="avatar-sm bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold fs-xs">
                        ${p.name.charAt(0).toUpperCase()}
                    </div>
                    <span class="fw-semibold text-dark">${p.name}</span>
                </div>
            </td>
            <td><a href="tel:${p.phone_number}" class="text-decoration-none text-dark fs-sm">${p.phone_number}</a></td>
            <td><a href="mailto:${p.email}" class="text-decoration-none text-muted fs-sm">${p.email}</a></td>
            <td><span class="text-muted fs-xs text-truncate d-inline-block" style="max-width: 200px;">${p.address || '--'}</span></td>
            <td><span class="badge bg-secondary-subtle text-secondary">${p.bookings_count} Trips</span></td>
            <td class="text-end pe-3">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary" onclick="openEditPassengerModal(${p.id})" title="Edit Passenger">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="confirmDeletePassenger(${p.id}, '${p.name}')" title="Delete Passenger">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openAddPassengerModal() {
    document.getElementById('passengerForm').reset();
    document.getElementById('passengerId').value = '';
    document.getElementById('modalPassengerTitle').innerText = 'Register Passenger';
    const modal = new bootstrap.Modal(document.getElementById('modalPassenger'));
    modal.show();
}

function openEditPassengerModal(id) {
    const passenger = state.passengers.find(p => p.id === id);
    if (!passenger) return;

    document.getElementById('passengerId').value = passenger.id;
    document.getElementById('passengerName').value = passenger.name;
    document.getElementById('passengerPhone').value = passenger.phone_number;
    document.getElementById('passengerEmail').value = passenger.email;
    document.getElementById('passengerAddress').value = passenger.address || '';

    document.getElementById('modalPassengerTitle').innerText = 'Edit Passenger Details';
    const modal = new bootstrap.Modal(document.getElementById('modalPassenger'));
    modal.show();
}

async function handlePassengerSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('passengerId').value;
    const data = {
        name: document.getElementById('passengerName').value.trim(),
        phone_number: document.getElementById('passengerPhone').value.trim(),
        email: document.getElementById('passengerEmail').value.trim(),
        address: document.getElementById('passengerAddress').value.trim()
    };

    const spinner = document.getElementById('spinnerPassenger');
    const saveBtn = document.getElementById('btnSavePassenger');
    spinner.classList.remove('d-none');
    saveBtn.disabled = true;

    try {
        if (id) {
            await apiFetch(`/api/passengers/${id}/`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Passenger updated successfully!');
        } else {
            await apiFetch('/api/passengers/', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Passenger registered successfully!');
        }

        bootstrap.Modal.getInstance(document.getElementById('modalPassenger')).hide();
        await loadPassengers();
        loadDashboard();
    } catch (err) {
        showToast(err.message, 'danger');
    } finally {
        spinner.classList.add('d-none');
        saveBtn.disabled = false;
    }
}

function confirmDeletePassenger(id, title) {
    confirmDelete('passenger', id, `Delete Passenger "${title}"? All their booking history will be removed.`);
}

function openQuickPassengerAdd() {
    openAddPassengerModal();
}

// ==============================================================
// 5. TICKET BOOKING MANAGEMENT MODULE
// ==============================================================

async function loadBookings() {
    try {
        const bookings = await apiFetch('/api/bookings/');
        state.bookings = bookings;
        filterBookings();
    } catch (err) {
        showToast('Failed to load bookings: ' + err.message, 'danger');
    }
}

function filterBookings() {
    const search = (document.getElementById('bookingSearchInput')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('bookingStatusFilter')?.value || '';

    const filtered = state.bookings.filter(b => {
        const matchesSearch = !search ||
            b.ticket_number.toLowerCase().includes(search) ||
            (b.passenger_details && b.passenger_details.name.toLowerCase().includes(search)) ||
            (b.bus_details && b.bus_details.bus_name.toLowerCase().includes(search));
        const matchesStatus = !statusFilter || b.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    renderBookings(filtered);
}

function renderBookings(bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    const emptyState = document.getElementById('bookingsEmptyState');

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }

    emptyState.classList.add('d-none');
    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td class="ps-3">
                <span class="badge bg-light text-dark font-monospace border">${b.ticket_number}</span>
            </td>
            <td>
                <div class="fw-semibold text-dark">${b.passenger_details ? b.passenger_details.name : 'N/A'}</div>
                <small class="text-muted fs-xxs">${b.passenger_details ? b.passenger_details.phone_number : ''}</small>
            </td>
            <td>
                <span class="badge bg-light border text-dark fs-xs">
                    ${b.route_details ? `${b.route_details.source} ➔ ${b.route_details.destination}` : 'N/A'}
                </span>
            </td>
            <td>
                <div class="fw-medium">${b.bus_details ? b.bus_details.bus_name : 'N/A'}</div>
                <small class="text-muted fs-xxs">${b.bus_details ? b.bus_details.bus_number : ''}</small>
            </td>
            <td>${formatDate(b.journey_date)}</td>
            <td><span class="badge bg-primary-subtle text-primary fw-bold">Seat #${b.seat_number}</span></td>
            <td class="fw-semibold text-success">${formatCurrency(b.price)}</td>
            <td>${getStatusBadge(b.status)}</td>
            <td class="text-end pe-3">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewBoardingPass(${b.id})" title="View / Print Boarding Pass">
                        <i class="bi bi-printer"></i>
                    </button>
                    ${b.status !== 'Cancelled' ? `
                        <button class="btn btn-outline-danger" onclick="confirmCancelBooking(${b.id}, '${b.ticket_number}')" title="Cancel Booking">
                            <i class="bi bi-x-circle"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-outline-secondary" onclick="confirmDeleteBooking(${b.id}, '${b.ticket_number}')" title="Delete Booking Record">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function openNewBookingModal() {
    // Make sure we have latest lists
    if (!state.passengers.length) await loadPassengers();
    if (!state.routes.length) await loadRoutes();
    if (!state.buses.length) await loadBuses();

    // Reset form
    document.getElementById('bookingForm').reset();
    document.getElementById('bookingId').value = '';
    document.getElementById('bookingSeatNumber').value = '';
    document.getElementById('selectedSeatBadge').innerText = 'Seat: Not Selected';
    document.getElementById('selectedSeatBadge').className = 'badge bg-secondary fs-xs';
    state.selectedSeat = null;
    state.occupiedSeats = [];

    // Populate Passenger Select
    const passSelect = document.getElementById('bookingPassenger');
    passSelect.innerHTML = '<option value="">Select Passenger...</option>' +
        state.passengers.map(p => `<option value="${p.id}">${p.name} (${p.phone_number})</option>`).join('');

    // Populate Route Select
    const routeSelect = document.getElementById('bookingRoute');
    routeSelect.innerHTML = '<option value="">Select Route...</option>' +
        state.routes.map(r => `<option value="${r.id}" data-fare="${r.base_fare}">${r.source} ➔ ${r.destination} (${formatCurrency(r.base_fare)})</option>`).join('');

    // Populate Bus Select
    const busSelect = document.getElementById('bookingBus');
    busSelect.innerHTML = '<option value="">Select Bus...</option>' +
        state.buses.map(b => `<option value="${b.id}" data-seats="${b.total_seats}">${b.bus_number} - ${b.bus_name} (${b.bus_type})</option>`).join('');

    // Set Default Journey Date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('bookingDate');
    dateInput.value = tomorrow.toISOString().split('T')[0];
    dateInput.min = new Date().toISOString().split('T')[0];

    // Reset seat map
    document.getElementById('seatMapGrid').innerHTML = `
        <p class="text-muted fs-xs py-4">Please select a Bus and Journey Date to view real-time seat availability.</p>
    `;

    const modal = new bootstrap.Modal(document.getElementById('modalBooking'));
    modal.show();
}

function onBookingRouteChange() {
    const routeSelect = document.getElementById('bookingRoute');
    const selectedOption = routeSelect.options[routeSelect.selectedIndex];
    if (selectedOption && selectedOption.dataset.fare) {
        document.getElementById('bookingPrice').value = parseFloat(selectedOption.dataset.fare).toFixed(2);
    } else {
        document.getElementById('bookingPrice').value = '';
    }
}

async function onBookingBusOrDateChange() {
    const busSelect = document.getElementById('bookingBus');
    const dateInput = document.getElementById('bookingDate');
    const busId = busSelect.value;
    const journeyDate = dateInput.value;

    if (!busId || !journeyDate) {
        document.getElementById('seatMapGrid').innerHTML = `
            <p class="text-muted fs-xs py-4">Please select a Bus and Journey Date to view real-time seat availability.</p>
        `;
        return;
    }

    const selectedOption = busSelect.options[busSelect.selectedIndex];
    const totalSeats = parseInt(selectedOption.dataset.seats) || 40;

    // Fetch occupied seats for this bus and date
    try {
        const res = await apiFetch(`/api/bookings/occupied-seats/?bus=${busId}&journey_date=${journeyDate}`);
        state.occupiedSeats = res.occupied_seats || [];
        renderSeatMap(totalSeats, state.occupiedSeats);
    } catch (err) {
        console.error('Error fetching occupied seats:', err);
    }
}

function renderSeatMap(totalSeats, occupiedList) {
    const grid = document.getElementById('seatMapGrid');
    let html = '';

    for (let seat = 1; seat <= totalSeats; seat++) {
        const isOccupied = occupiedList.includes(seat);
        const isSelected = state.selectedSeat === seat;
        let cls = 'seat-btn';
        if (isOccupied) {
            cls += ' occupied';
        } else if (isSelected) {
            cls += ' selected';
        }

        html += `
            <button type="button" class="${cls}" data-seat="${seat}"
                ${isOccupied ? 'disabled title="Seat already booked"' : `onclick="selectSeat(${seat})"`}>
                ${seat}
            </button>
        `;
    }

    grid.innerHTML = html;
}

function selectSeat(seatNumber) {
    state.selectedSeat = seatNumber;
    document.getElementById('bookingSeatNumber').value = seatNumber;

    const badge = document.getElementById('selectedSeatBadge');
    badge.innerText = `Seat: #${seatNumber} Selected`;
    badge.className = 'badge bg-success fs-xs';

    // Highlight in grid
    document.querySelectorAll('.seat-btn').forEach(btn => {
        const s = parseInt(btn.getAttribute('data-seat'));
        if (s === seatNumber) {
            btn.classList.add('selected');
        } else if (!btn.classList.contains('occupied')) {
            btn.classList.remove('selected');
        }
    });
}

async function handleBookingSubmit(e) {
    e.preventDefault();

    const seatNumber = parseInt(document.getElementById('bookingSeatNumber').value);
    if (!seatNumber) {
        showToast('Please pick an available seat from the seat map.', 'warning');
        return;
    }

    const data = {
        passenger: parseInt(document.getElementById('bookingPassenger').value),
        route: parseInt(document.getElementById('bookingRoute').value),
        bus: parseInt(document.getElementById('bookingBus').value),
        journey_date: document.getElementById('bookingDate').value,
        seat_number: seatNumber,
        price: parseFloat(document.getElementById('bookingPrice').value),
        status: 'Confirmed',
        payment_method: document.getElementById('bookingPaymentMethod').value
    };

    const spinner = document.getElementById('spinnerBooking');
    const saveBtn = document.getElementById('btnSaveBooking');
    spinner.classList.remove('d-none');
    saveBtn.disabled = true;

    try {
        const newBooking = await apiFetch('/api/bookings/', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        showToast(`Ticket ${newBooking.ticket_number} booked successfully!`);
        bootstrap.Modal.getInstance(document.getElementById('modalBooking')).hide();

        await loadBookings();
        loadDashboard();

        // Automatically show boarding pass modal for instant printing / verification
        viewBoardingPass(newBooking.id);

    } catch (err) {
        showToast(err.message, 'danger');
    } finally {
        spinner.classList.add('d-none');
        saveBtn.disabled = false;
    }
}

function viewBoardingPass(bookingId) {
    let booking = state.bookings.find(b => b.id === bookingId);
    if (!booking && state.stats.recent_bookings) {
        booking = state.stats.recent_bookings.find(b => b.id === bookingId);
    }
    if (!booking) return;

    document.getElementById('ticketPassengerName').innerText = booking.passenger_details ? booking.passenger_details.name : '--';
    document.getElementById('ticketNumberDisplay').innerText = booking.ticket_number;
    document.getElementById('ticketOrigin').innerText = booking.route_details ? booking.route_details.source : '--';
    document.getElementById('ticketDestination').innerText = booking.route_details ? booking.route_details.destination : '--';
    document.getElementById('ticketDuration').innerText = booking.route_details ? booking.route_details.estimated_duration : '--';
    document.getElementById('ticketBusName').innerText = booking.bus_details ? booking.bus_details.bus_name : '--';
    document.getElementById('ticketBusNumber').innerText = booking.bus_details ? `${booking.bus_details.bus_number} (${booking.bus_details.bus_type})` : '--';
    document.getElementById('ticketJourneyDate').innerText = formatDate(booking.journey_date);
    document.getElementById('ticketSeatNumber').innerText = `Seat #${booking.seat_number}`;
    document.getElementById('ticketFare').innerText = formatCurrency(booking.price);
    document.getElementById('ticketBarcodeText').innerText = booking.ticket_number;

    const paymentMethod = booking.payment ? booking.payment.payment_method : 'Cash';
    document.getElementById('ticketPaymentMethod').innerText = paymentMethod;

    const statusBadge = document.getElementById('ticketStatusBadge');
    if (booking.status === 'Confirmed') {
        statusBadge.className = 'badge bg-success-subtle text-success border border-success-subtle px-3 py-1 rounded-pill';
        statusBadge.innerText = 'CONFIRMED';
    } else if (booking.status === 'Cancelled') {
        statusBadge.className = 'badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-1 rounded-pill';
        statusBadge.innerText = 'CANCELLED';
    } else {
        statusBadge.className = 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-1 rounded-pill';
        statusBadge.innerText = 'PENDING';
    }

    const modal = new bootstrap.Modal(document.getElementById('modalTicketView'));
    modal.show();
}

function printTicket() {
    window.print();
}

async function confirmCancelBooking(id, ticketNumber) {
    if (confirm(`Are you sure you want to cancel booking ${ticketNumber}? The seat will be released and payment marked as Refunded.`)) {
        try {
            await apiFetch(`/api/bookings/${id}/cancel/`, { method: 'POST' });
            showToast(`Booking ${ticketNumber} cancelled and seat released.`);
            await loadBookings();
            loadDashboard();
        } catch (err) {
            showToast('Failed to cancel booking: ' + err.message, 'danger');
        }
    }
}

function confirmDeleteBooking(id, ticketNumber) {
    confirmDelete('booking', id, `Delete Booking Record "${ticketNumber}"?`);
}

// ==============================================================
// 6. PAYMENT MANAGEMENT MODULE
// ==============================================================

async function loadPayments() {
    try {
        const payments = await apiFetch('/api/payments/');
        state.payments = payments;
        filterPayments();
    } catch (err) {
        showToast('Failed to load payments: ' + err.message, 'danger');
    }
}

function filterPayments() {
    const search = (document.getElementById('paymentSearchInput')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('paymentStatusFilter')?.value || '';

    const filtered = state.payments.filter(p => {
        const matchesSearch = !search ||
            p.transaction_reference.toLowerCase().includes(search) ||
            p.booking_ticket.toLowerCase().includes(search) ||
            p.passenger_name.toLowerCase().includes(search);
        const matchesStatus = !statusFilter || p.payment_status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    renderPayments(filtered);
}

function renderPayments(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    const emptyState = document.getElementById('paymentsEmptyState');

    if (!payments || payments.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }

    emptyState.classList.add('d-none');
    tbody.innerHTML = payments.map(p => `
        <tr>
            <td class="ps-3">
                <span class="badge bg-light text-dark font-monospace border">${p.transaction_reference}</span>
            </td>
            <td>
                <span class="font-monospace text-primary fs-xs">${p.booking_ticket}</span>
            </td>
            <td class="fw-semibold text-dark">${p.passenger_name || 'N/A'}</td>
            <td><span class="badge bg-light border text-dark fs-xs">${p.route_summary || '--'}</span></td>
            <td class="fw-bold text-success">${formatCurrency(p.amount)}</td>
            <td><span class="badge bg-secondary-subtle text-secondary">${p.payment_method}</span></td>
            <td>${getStatusBadge(p.payment_status)}</td>
            <td class="text-muted fs-xs">${formatDateTime(p.paid_at)}</td>
            <td class="text-end pe-3">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary" onclick="openEditPaymentModal(${p.id})" title="Update Status">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="confirmDeletePayment(${p.id}, '${p.transaction_reference}')" title="Delete Payment Record">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openEditPaymentModal(id) {
    const payment = state.payments.find(p => p.id === id);
    if (!payment) return;

    document.getElementById('editPaymentId').value = payment.id;
    document.getElementById('editPaymentTxnRef').value = payment.transaction_reference;
    document.getElementById('editPaymentAmount').value = parseFloat(payment.amount).toFixed(2);
    document.getElementById('editPaymentMethod').value = payment.payment_method;
    document.getElementById('editPaymentStatus').value = payment.payment_status;

    const modal = new bootstrap.Modal(document.getElementById('modalPaymentEdit'));
    modal.show();
}

async function handlePaymentStatusSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editPaymentId').value;
    const newStatus = document.getElementById('editPaymentStatus').value;

    try {
        await apiFetch(`/api/payments/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ payment_status: newStatus })
        });

        showToast('Payment status updated successfully!');
        bootstrap.Modal.getInstance(document.getElementById('modalPaymentEdit')).hide();
        await loadPayments();
        loadDashboard();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

function confirmDeletePayment(id, title) {
    confirmDelete('payment', id, `Delete Payment Record "${title}"?`);
}

// ==============================================================
// UNIVERSAL DELETE CONFIRMATION DIALOG
// ==============================================================

function confirmDelete(type, id, message) {
    state.deleteTarget = { type, id };
    document.getElementById('deleteModalMessage').innerText = message;
    const modal = new bootstrap.Modal(document.getElementById('modalDeleteConfirm'));
    modal.show();
}

async function executeDeleteRecord() {
    const { type, id } = state.deleteTarget;
    if (!type || !id) return;

    const spinner = document.getElementById('spinnerDelete');
    const deleteBtn = document.getElementById('btnConfirmDelete');
    spinner.classList.remove('d-none');
    deleteBtn.disabled = true;

    try {
        let endpoint = '';
        switch (type) {
            case 'bus':
                endpoint = `/api/buses/${id}/`;
                break;
            case 'route':
                endpoint = `/api/routes/${id}/`;
                break;
            case 'passenger':
                endpoint = `/api/passengers/${id}/`;
                break;
            case 'booking':
                endpoint = `/api/bookings/${id}/`;
                break;
            case 'payment':
                endpoint = `/api/payments/${id}/`;
                break;
        }

        await apiFetch(endpoint, { method: 'DELETE' });
        showToast('Record deleted successfully.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalDeleteConfirm')).hide();

        // Refresh appropriate view
        if (type === 'bus') loadBuses();
        if (type === 'route') loadRoutes();
        if (type === 'passenger') loadPassengers();
        if (type === 'booking') loadBookings();
        if (type === 'payment') loadPayments();
        loadDashboard();

    } catch (err) {
        showToast('Delete failed: ' + err.message, 'danger');
    } finally {
        spinner.classList.add('d-none');
        deleteBtn.disabled = false;
        state.deleteTarget = { type: null, id: null };
    }
}

// ==============================================================
// INITIALIZATION
// ==============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Sidebar navigation click handlers
    document.querySelectorAll('.nav-item-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            navigateSection(section);
        });
    });

    // Mobile sidebar toggle button
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            document.getElementById('wrapper').classList.toggle('toggled');
        });
    }

    // Handle hash on page load
    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'buses', 'routes', 'passengers', 'bookings', 'payments'].includes(hash)) {
        navigateSection(hash);
    } else {
        navigateSection('dashboard');
    }
});

