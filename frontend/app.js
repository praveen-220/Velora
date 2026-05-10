const appContainer = document.getElementById('app-container');
const API_URL = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000/api' : '/api';
let leafletMap = null;
let currentUser = null;
let routingControl = null;

// --- Vehicle Categories ---
const vehicleTypes = [
    { id: 'go', name: 'Velora Go', icon: '🚗', multiplier: 1.0, desc: 'Affordable, compact rides' },
    { id: 'premier', name: 'Velora Premier', icon: '✨', multiplier: 1.4, desc: 'Premium sedans, top drivers' },
    { id: 'xl', name: 'Velora XL', icon: '🚐', multiplier: 1.8, desc: 'SUVs for 6 people' },
    { id: 'intercity', name: 'Intercity', icon: '🛣️', multiplier: 2.2, desc: 'Comfortable outstation trips' }
];

// --- Helpers ---
async function fetchAPI(endpoint, options = {}) {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'API Error');
        return data;
    } catch (e) {
        showToast(e.message, 'error');
        return null;
    }
}

function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.style = `position:fixed; bottom:2rem; left:50%; transform:translateX(-50%); background:${type === 'error' ? '#ef4444' : '#6366f1'}; color:#fff; padding:1rem 2.5rem; border-radius:50px; z-index:9999; box-shadow:0 10px 40px rgba(0,0,0,0.5); font-weight:700; font-size:0.9rem; animation:slideUp 0.4s ease; transition:0.3s;`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// --- Mapping ---
function initMap(elId) {
    const mapEl = document.getElementById(elId);
    if (!mapEl) return;
    leafletMap = L.map(mapEl).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(leafletMap);
    
    leafletMap.on('click', async (e) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
            const data = await res.json();
            const from = document.getElementById('r-from') || document.getElementById('o-from');
            const to = document.getElementById('r-to') || document.getElementById('o-to');
            if (from && !from.value) selectAddress(data.display_name, e.latlng.lat, e.latlng.lng, from.id);
            else if (to && !to.value) selectAddress(data.display_name, e.latlng.lat, e.latlng.lng, to.id);
        } catch (err) { console.error(err); }
    });
}

function selectAddress(name, lat, lon, inputId) {
    const input = document.getElementById(inputId);
    input.value = name;
    input.dataset.lat = lat;
    input.dataset.lon = lon;
    document.getElementById(`${inputId}-results`).style.display = 'none';
    updateRoutePreview();
}

function updateRoutePreview() {
    const from = document.getElementById('r-from') || document.getElementById('o-from');
    const to = document.getElementById('r-to') || document.getElementById('o-to');
    if (!from || !to || !from.dataset.lat || !to.dataset.lat) return;

    if (routingControl) leafletMap.removeControl(routingControl);
    routingControl = L.Routing.control({
        waypoints: [L.latLng(from.dataset.lat, from.dataset.lon), L.latLng(to.dataset.lat, to.dataset.lon)],
        routeWhileDragging: false,
        lineOptions: { styles: [{ color: '#6366f1', weight: 6, opacity: 0.8 }] },
        createMarker: () => null
    }).addTo(leafletMap);
}

// --- Router ---
function navigateTo(route) {
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    appContainer.innerHTML = views[route] || views.home;
    if (route === 'rider' || route === 'driver' || route === 'admin') initMap('leaflet-map');
    if (route === 'profile') initProfile();
    if (route === 'dashboard') initDashboard();
    window.scrollTo(0, 0);
    updateNav();
}

function updateNav() {
    const btn = document.getElementById('nav-auth-btn');
    if (currentUser) {
        btn.innerText = currentUser.name.split(' ')[0];
        btn.onclick = () => navigateTo('profile');
    } else {
        btn.innerText = 'Access Network';
        btn.onclick = () => navigateTo('login');
    }
}

// --- Views ---
const views = {
    dashboard: `
        <div class="dash-container" style="max-width:1200px; margin:100px auto; padding:0 2rem;">
            <header style="margin-bottom:3rem;">
                <h1 style="font-size:3rem; font-weight:900;">Dashboard</h1>
                <p style="color:var(--text-low);">Welcome back to your command center.</p>
            </header>
            
            <div class="dash-grid">
                <div class="dash-stat">
                    <h4>Active Bookings</h4>
                    <span id="dash-active-count">0</span>
                </div>
                <div class="dash-stat">
                    <h4>Wallet Balance</h4>
                    <span id="dash-wallet-val">₹0</span>
                </div>
                <div id="admin-stat-card" class="dash-stat" style="display:none; background:rgba(249, 115, 22, 0.1); border:1px solid #f97316;">
                    <h4 style="color:#f97316;">Platform Users</h4>
                    <span id="dash-user-count" style="color:#f97316;">0</span>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:2rem; margin-top:2rem;">
                <div class="glass-widget">
                    <h3>Recent Activity</h3>
                    <div id="dash-activity-list" style="margin-top:1.5rem;"></div>
                </div>
                <div class="glass-widget">
                    <h3>Quick Actions</h3>
                    <div style="display:flex; flex-direction:column; gap:1rem; margin-top:1.5rem;">
                        <button class="btn-premium" onclick="navigateTo('rider')">Find a Ride</button>
                        <button class="btn-premium" onclick="navigateTo('driver')">Post a Ride</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    home: `
        <div class="hero-live">
            <div class="hero-content animate-up">
                <h1>Go anywhere with Velora.</h1>
                <p>Real-time vehicle choice. Professional verified partners. Transact with wallet.</p>
                <div style="display:flex; gap:1.5rem; justify-content:center; margin-top:3rem;">
                    <button class="btn-premium" onclick="navigateTo('rider')">Ride Now</button>
                    <button class="btn-premium" style="background:rgba(255,255,255,0.05); border:1px solid var(--glass-border);" onclick="navigateTo('driver')">Become a Partner</button>
                </div>
            </div>
        </div>
    `,
    rider: `
        <div class="map-layout">
            <aside class="side-panel">
                <h2 style="margin-bottom:1.5rem;">Plan Your Ride</h2>
                <div class="glass-widget">
                    <input type="text" id="r-from" placeholder="Pickup location" style="width:100%; margin-bottom:0.5rem; background:rgba(255,255,255,0.05); border:none; padding:1rem; border-radius:12px; color:#fff;">
                    <div id="r-from-results" class="autocomplete-dropdown"></div>
                    <input type="text" id="r-to" placeholder="Where to?" style="width:100%; background:rgba(255,255,255,0.05); border:none; padding:1rem; border-radius:12px; color:#fff;">
                    <div id="r-to-results" class="autocomplete-dropdown"></div>
                    <button class="btn-premium" style="width:100%; margin-top:1.5rem;" onclick="showVehicleOptions()">See Estimates</button>
                </div>
                <div id="vehicle-selector" style="margin-top:2rem;"></div>
                <div id="booking-btn-container" style="margin-top:1.5rem; display:none;">
                    <button class="btn-premium" style="width:100%;" id="confirm-booking-btn">Confirm Velora Go</button>
                </div>
            </aside>
            <div id="leaflet-map"></div>
        </div>
    `,
    login: `
        <div class="hero-live" style="height:100vh;">
            <div class="glass-widget animate-up" style="max-width:400px; width:100%;">
                <h2 style="text-align:center; margin-bottom:2rem;">Access Velora</h2>
                <button class="btn-premium" style="width:100%;" onclick="masterLogin()">Master Login (One-Click)</button>
            </div>
        </div>
    `,
    profile: `
        <div class="dash-container" style="max-width:800px; margin:100px auto; padding:0 2rem;">
            <div class="dash-grid" id="profile-stats"></div>
            <div class="glass-widget" style="margin-top:2rem;">
                <h3>Trip History</h3>
                <div id="p-history" style="margin-top:1rem;"></div>
            </div>
            <button class="btn-premium" style="margin-top:2rem; background:#ef4444;" onclick="logout()">Sign Out</button>
        </div>
    `
};

// --- Logic ---
function showVehicleOptions() {
    const from = document.getElementById('r-from');
    const to = document.getElementById('r-to');
    if (!from.value || !to.value) { showToast('Select Pickup & Destination on map', 'info'); return; }

    const selector = document.getElementById('vehicle-selector');
    const distance = 12.5; // Estimated from points
    
    selector.innerHTML = vehicleTypes.map(v => `
        <div class="vehicle-card" onclick="selectVehicle('${v.id}', ${45 * v.multiplier})">
            <div style="font-size:1.5rem;">${v.icon}</div>
            <div style="flex:1; margin-left:1rem;">
                <div style="font-weight:700;">${v.name}</div>
                <div style="font-size:0.7rem; color:var(--text-low);">${v.desc}</div>
            </div>
            <div style="font-weight:900;">₹${Math.round(45 * v.multiplier)}</div>
        </div>
    `).join('');
    document.getElementById('booking-btn-container').style.display = 'block';
}

let selectedFare = 0;
function selectVehicle(id, fare) {
    document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('active-vehicle'));
    event.currentTarget.classList.add('active-vehicle');
    const v = vehicleTypes.find(x => x.id === id);
    const btn = document.getElementById('confirm-booking-btn');
    btn.innerText = `Confirm ${v.name}`;
    selectedFare = Math.round(fare);
    btn.onclick = () => performBooking(id, selectedFare);
}

async function performBooking(vId, fare) {
    if (!currentUser) { navigateTo('login'); return; }
    if (currentUser.wallet_balance < fare) { showToast('Insufficient funds in Wallet!', 'error'); return; }
    
    const res = await fetchAPI('/rides/book', { method: 'POST', body: JSON.stringify({ ride_id: 100, user_id: currentUser.id, fare: fare }) });
    if (res) {
        showToast('Ride Request Sent! Driver is arriving.', 'success');
        currentUser.wallet_balance -= fare;
        localStorage.setItem('velora_user', JSON.stringify(currentUser));
        navigateTo('profile');
    }
}

async function initProfile() {
    if (!currentUser) return;
    const stats = document.getElementById('profile-stats');
    stats.innerHTML = `
        <div class="dash-stat"><h4>Wallet</h4><span>₹${currentUser.wallet_balance}</span></div>
        <div class="dash-stat"><h4>Trips</h4><span>12</span></div>
        <div class="dash-stat"><h4>Rating</h4><span>4.8★</span></div>
    `;
    const history = await fetchAPI(`/profile/history/${currentUser.id}`);
    const list = document.getElementById('p-history');
    list.innerHTML = (history?.rider || []).map(h => `
        <div class="ride-card-live" style="margin-bottom:1rem;">
            <b>${h.from_loc} → ${h.to_loc}</b>
            <div style="font-size:0.75rem; color:var(--text-low);">${h.car_name} • ₹${h.fare_paid}</div>
        </div>
    `).join('') || '<p>No history yet.</p>';
}

function masterLogin() {
    currentUser = { id: 1, name: 'Praveen', wallet_balance: 5000, rating: 5.0 };
    localStorage.setItem('velora_user', JSON.stringify(currentUser));
    navigateTo('home');
}

function logout() { currentUser = null; localStorage.removeItem('velora_user'); navigateTo('home'); }
async function initDashboard() {
    if (!currentUser) { navigateTo('login'); return; }
    
    document.getElementById('dash-wallet-val').innerText = `₹${currentUser.wallet_balance}`;
    
    if (currentUser.role === 'admin') {
        document.getElementById('admin-stat-card').style.display = 'block';
        const users = await fetchAPI('/admin/users'); // Mock or real
        if (users) document.getElementById('dash-user-count').innerText = users.length;
    }

    const history = await fetchAPI(`/profile/history/${currentUser.id}`);
    const list = document.getElementById('dash-activity-list');
    list.innerHTML = (history?.rider || []).slice(0, 3).map(h => `
        <div class="ride-card-live" style="margin-bottom:1rem; background:rgba(255,255,255,0.02);">
            <div style="display:flex; justify-content:between;">
                <b>${h.from_loc} → ${h.to_loc}</b>
                <span style="color:#10b981; font-size:0.8rem;">Completed</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-low); margin-top:0.5rem;">${h.car_name} • ₹${h.fare_paid}</div>
        </div>
    `).join('') || '<p style="color:var(--text-low);">No recent activity found.</p>';
}

window.onload = () => {
    const saved = localStorage.getItem('velora_user');
    if (saved) currentUser = JSON.parse(saved);
    navigateTo('home');
};
