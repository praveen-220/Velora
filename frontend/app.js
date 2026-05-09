const appContainer = document.getElementById('app-container');
const API_URL = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000/api' : '/api';
let leafletMap = null;
let currentUser = null;
let currentRole = 'rider'; // rider, driver, admin
let activeTrackingInterval = null;

// --- Mock Data & Helpers ---
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
    toast.style = `position:fixed; bottom:2rem; left:50%; transform:translateX(-50%); background:${type === 'error' ? '#FC8181' : '#00C6FF'}; color:#fff; padding:1rem 2.5rem; border-radius:50px; z-index:9999; box-shadow:0 10px 40px rgba(0,0,0,0.5); font-weight:700; font-size:0.9rem; transition:0.3s; animation:fadeInUp 0.3s ease;`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// --- Router ---
function navigateTo(route, params = {}) {
    if (activeTrackingInterval) { clearInterval(activeTrackingInterval); activeTrackingInterval = null; }
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    
    // Check Auth
    if (['rider', 'driver', 'admin'].includes(route) && !currentUser) {
        navigateTo('login');
        return;
    }

    appContainer.innerHTML = views[route] || views.home;
    
    // Init logic per route
    if (route === 'home') initHome();
    if (route === 'rider') initRider();
    if (route === 'driver') initDriver();
    if (route === 'admin') initAdmin();
    if (route === 'tracking') initTracking(params.rideId);
    
    window.scrollTo(0, 0);
    updateNav();
}

function updateNav() {
    const btn = document.getElementById('nav-auth-btn');
    if (currentUser) {
        btn.innerText = currentUser.name.split(' ')[0];
        btn.onclick = () => navigateTo(currentUser.role || 'rider');
    } else {
        btn.innerText = 'Sign In';
        btn.onclick = () => navigateTo('login');
    }
}

// --- Views Content ---
const views = {
    home: `
        <div class="hero-wrapper">
            <div class="hero-glow"></div>
            <div class="hero-content">
                <div class="hero-text animate-up">
                    <h1>Your Ride.<br>Your Journey.</h1>
                    <p>Experience the future of mobility with Veora. Fast, safe, and premium rides at your fingertips.</p>
                    <div style="display:flex; gap:1.5rem;">
                        <button class="btn-veora" onclick="navigateTo('rider')">Book a Ride</button>
                        <button class="btn-veora" style="background:rgba(255,255,255,0.05); border:1px solid var(--border-glass);" onclick="navigateTo('driver')">Become a Driver</button>
                    </div>
                </div>
                <div class="glass-card animate-up" style="max-width:500px;">
                    <h3 style="margin-bottom:1.5rem;">Ready to go?</h3>
                    <div class="input-group">
                        <span class="material-symbols-outlined">radio_button_checked</span>
                        <input type="text" id="h-from" placeholder="Enter pickup location">
                    </div>
                    <div class="input-group">
                        <span class="material-symbols-outlined">location_on</span>
                        <input type="text" id="h-to" placeholder="Enter destination">
                    </div>
                    <button class="btn-veora" style="width:100%; margin-top:1rem;" onclick="navigateTo('rider')">Estimate Fare</button>
                </div>
            </div>
        </div>
    `,
    rider: `
        <div class="dash-container">
            <aside class="dash-sidebar">
                <h2 style="margin-bottom:2rem; font-size:1.5rem;">Rider Console</h2>
                <a href="#" class="side-link active" onclick="navigateTo('rider')"><span class="material-symbols-outlined">local_taxi</span> Book Ride</a>
                <a href="#" class="side-link" onclick="showToast('Wallet coming soon')"><span class="material-symbols-outlined">account_balance_wallet</span> Wallet</a>
                <a href="#" class="side-link" onclick="navigateTo('profile')"><span class="material-symbols-outlined">history</span> Activity</a>
            </aside>
            <main class="dash-main">
                <div style="display:grid; grid-template-columns:1fr 1.2fr; gap:3rem;">
                    <div>
                        <h2 style="margin-bottom:2rem;">Where to?</h2>
                        <div class="glass-card">
                            <div class="input-group"><span class="material-symbols-outlined">near_me</span><input type="text" id="r-from" placeholder="Pickup"></div>
                            <div class="input-group"><span class="material-symbols-outlined">place</span><input type="text" id="r-to" placeholder="Destination"></div>
                            <button class="btn-veora" style="width:100%;" onclick="findRides()">Find Drivers</button>
                        </div>
                        <div id="rides-list" style="margin-top:2rem;"></div>
                    </div>
                    <div class="glass-card" style="padding:0; overflow:hidden; height:600px;">
                        <div id="leaflet-map" style="height:100%;"></div>
                    </div>
                </div>
            </main>
        </div>
    `,
    driver: `
        <div class="dash-container">
            <aside class="dash-sidebar">
                <h2 style="margin-bottom:2rem; font-size:1.5rem;">Driver Hub</h2>
                <a href="#" class="side-link active"><span class="material-symbols-outlined">dashboard</span> Dashboard</a>
                <a href="#" class="side-link"><span class="material-symbols-outlined">payments</span> Earnings</a>
                <a href="#" class="side-link"><span class="material-symbols-outlined">settings</span> Car Settings</a>
            </aside>
            <main class="dash-main">
                <div class="stats-grid">
                    <div class="stat-card"><span class="stat-label">Total Earnings</span><span class="stat-val">₹42,500</span></div>
                    <div class="stat-card"><span class="stat-label">Rides Done</span><span class="stat-val">128</span></div>
                    <div class="stat-card"><span class="stat-label">Rating</span><span class="stat-val">4.9★</span></div>
                </div>
                <div class="glass-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                        <h3>Active Requests</h3>
                        <div style="display:flex; align-items:center; gap:1rem;">
                            <span>Go Online</span>
                            <div class="pulse" style="width:12px; height:12px; background:var(--success); border-radius:50%;"></div>
                        </div>
                    </div>
                    <div id="driver-requests"><p style="color:var(--text-secondary);">Waiting for new requests...</p></div>
                </div>
            </main>
        </div>
    `,
    admin: `
        <div class="dash-container">
            <aside class="dash-sidebar">
                <h2 style="margin-bottom:2rem; font-size:1.5rem;">Veora Admin</h2>
                <a href="#" class="side-link active"><span class="material-symbols-outlined">analytics</span> Revenue</a>
                <a href="#" class="side-link"><span class="material-symbols-outlined">group</span> Drivers</a>
                <a href="#" class="side-link"><span class="material-symbols-outlined">map</span> Live Rides</a>
            </aside>
            <main class="dash-main">
                <div class="stats-grid">
                    <div class="stat-card"><span class="stat-label">Monthly Revenue</span><span class="stat-val">₹12.5L</span></div>
                    <div class="stat-card"><span class="stat-label">Active Users</span><span class="stat-val">15,420</span></div>
                    <div class="stat-card"><span class="stat-label">Live Rides</span><span class="stat-val">342</span></div>
                </div>
                <div class="glass-card" style="height:400px; display:flex; align-items:center; justify-content:center; color:var(--text-secondary);">
                    [Interactive Analytics Chart Placeholder]
                </div>
            </main>
        </div>
    `,
    login: `
        <div class="hero-wrapper">
            <div class="hero-glow"></div>
            <div class="glass-card animate-up" style="max-width:450px; margin:0 auto; width:100%;">
                <h2 style="margin-bottom:2rem; text-align:center;">Enter the Future</h2>
                <form onsubmit="handleAuth(event)">
                    <div class="input-group"><span class="material-symbols-outlined">mail</span><input type="text" id="auth-id" placeholder="Email or Phone"></div>
                    <div class="input-group"><span class="material-symbols-outlined">lock</span><input type="password" id="auth-pass" placeholder="Password"></div>
                    <button class="btn-veora" style="width:100%; margin-top:1rem;">Continue</button>
                </form>
                <p style="text-align:center; margin-top:2rem; color:var(--text-secondary);">New to Veora? <a href="#" style="color:var(--accent-blue);">Join the network</a></p>
            </div>
        </div>
    `,
    tracking: `
        <div class="dash-container">
            <main class="dash-main" style="grid-column: 1 / span 2; padding:0; position:relative;">
                <div id="leaflet-map" style="height:100vh; width:100%;"></div>
                <div class="glass-card animate-up" style="position:absolute; bottom:2rem; left:2rem; right:2rem; z-index:1000; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 id="track-status">Driver is arriving in 4 mins</h3>
                        <p style="color:var(--text-secondary);">Alex Rivera • Tesla Model S • White</p>
                    </div>
                    <div style="display:flex; gap:1.5rem;">
                        <button class="btn-veora" style="background:var(--danger);" onclick="showToast('SOS Alert Sent!')">SOS</button>
                        <button class="btn-veora" onclick="navigateTo('rider')">Back to Console</button>
                    </div>
                </div>
            </main>
        </div>
    `
};

// --- Logic ---
function initHome() {}

async function initRider() {
    const mapEl = document.getElementById('leaflet-map');
    leafletMap = L.map(mapEl).setView([28.6139, 77.2090], 12);
    L.tileLayer('https://{s}.tile.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(leafletMap);
}

async function findRides() {
    const from = document.getElementById('r-from').value;
    const to = document.getElementById('r-to').value;
    showToast('Calculating dynamic fare...');
    
    const rides = await fetchAPI(`/rides?from=${from}&to=${to}`);
    const list = document.getElementById('rides-list');
    list.innerHTML = '';
    
    rides.forEach(ride => {
        const card = document.createElement('div');
        card.className = 'ride-card-veora animate-up';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                <b style="font-size:1.1rem;">${ride.car_name}</b>
                <b style="color:var(--accent-blue); font-size:1.2rem;">₹${ride.price}</b>
            </div>
            <div style="display:flex; align-items:center; gap:1rem;">
                <img src="${ride.driver_avatar}" style="width:40px; height:40px; border-radius:50%; border:2px solid var(--accent-blue);">
                <div style="flex:1;">
                    <div style="font-weight:700;">${ride.driver_name}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">4.9★ • ${ride.ride_type}</div>
                </div>
                <button class="btn-veora" style="padding:0.6rem 1.2rem; font-size:0.7rem;" onclick="bookVeoraRide(${ride.id})">Book</button>
            </div>
        `;
        list.appendChild(card);
        L.marker([ride.start_lat, ride.start_lng]).addTo(leafletMap).bindPopup(ride.driver_name);
    });
}

async function bookVeoraRide(id) {
    showToast('Matching with best driver...');
    const res = await fetchAPI('/rides/book', { method: 'POST', body: JSON.stringify({ ride_id: id, user_id: currentUser.id, seats_booked: 1 }) });
    if (res && res.success) {
        showToast('Driver matched! alex is on the way.', 'success');
        navigateTo('tracking', { rideId: id });
    }
}

async function initTracking(rideId) {
    const ride = await fetchAPI(`/rides/${rideId}`);
    const mapEl = document.getElementById('leaflet-map');
    leafletMap = L.map(mapEl).setView([ride.start_lat, ride.start_lng], 14);
    L.tileLayer('https://{s}.tile.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(leafletMap);

    const carMarker = L.marker([ride.start_lat, ride.start_lng], {
        icon: L.divIcon({ className: 'live-marker-pulse', html: '<div style="width:20px; height:20px; background:var(--accent-blue); border-radius:50%; border:3px solid #fff; box-shadow:0 0 20px var(--accent-glow);"></div>' })
    }).addTo(leafletMap);

    let progress = 0;
    activeTrackingInterval = setInterval(() => {
        progress += 1;
        const lat = ride.start_lat + (ride.end_lat - ride.start_lat) * (progress / 100);
        const lng = ride.start_lng + (ride.end_lng - ride.start_lng) * (progress / 100);
        carMarker.setLatLng([lat, lng]);
        leafletMap.panTo([lat, lng]);
        if (progress >= 100) clearInterval(activeTrackingInterval);
    }, 1500);
}

// --- Auth ---
async function handleAuth(e) {
    e.preventDefault();
    const id = document.getElementById('auth-id').value;
    const pass = document.getElementById('auth-pass').value;
    const res = await fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: id, password: pass }) });
    if (res && res.requires_otp) {
        const otp = prompt(`Enter OTP: ${res.otp_fallback}`);
        const vres = await fetchAPI('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ identifier: id, otp }) });
        if (vres && vres.user) {
            currentUser = vres.user;
            localStorage.setItem('veora_user', JSON.stringify(currentUser));
            navigateTo(currentUser.role || 'rider');
        }
    }
}

window.onload = () => {
    const saved = localStorage.getItem('veora_user');
    if (saved) currentUser = JSON.parse(saved);
    navigateTo('home');
};
