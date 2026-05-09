const appContainer = document.getElementById('app-container');
const API_URL = '/api';
let leafletMap = null;
let markers = [];
let currentUser = null;
let offerCarPhoto = "";
let suggestTimeout = null;
let activeTrackingInterval = null;

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
        console.error(e);
        showToast(e.message, 'error');
        throw e;
    }
}

function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.style = `position:fixed; bottom:2rem; left:50%; transform:translateX(-50%); background:${type === 'error' ? '#ff3d00' : '#1d1d1f'}; color:#fff; padding:1rem 2rem; border-radius:50px; z-index:9999; box-shadow:0 10px 30px rgba(0,0,0,0.2); font-weight:600; animation:slideUp 0.3s ease;`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- Navigation ---
function navigateTo(route, params = {}) {
    if ((route === 'profile' || route === 'offer') && !currentUser) {
        route = 'login';
        showToast('Please sign in to continue');
    }
    
    // Clear intervals
    if (activeTrackingInterval) {
        clearInterval(activeTrackingInterval);
        activeTrackingInterval = null;
    }

    if (leafletMap) {
        leafletMap.remove();
        leafletMap = null;
    }

    appContainer.innerHTML = views[route] || views.home;
    
    // Initialize specific view logic
    if (route === 'search') initSearch();
    if (route === 'offer') initOffer();
    if (route === 'tracking') initTracking(params.ride);
    if (route === 'profile') initProfile();
    if (route === 'devDashboard') initDevDashboard();
    
    window.scrollTo(0, 0);
    updateNavAuth();
}

function updateNavAuth() {
    const btn = document.getElementById('nav-auth-btn');
    if (currentUser) {
        btn.innerText = currentUser.name.split(' ')[0];
        btn.onclick = () => navigateTo('profile');
    } else {
        btn.innerText = 'Sign In';
        btn.onclick = () => navigateTo('login');
    }
}

// --- Views Logic ---
async function initSearch() {
    const mapEl = document.getElementById('leaflet-map');
    leafletMap = L.map(mapEl).setView([28.6139, 77.2090], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap);
    
    const rides = await fetchAPI('/rides');
    renderRidesList(rides);
}

function renderRidesList(rides) {
    const list = document.getElementById('rides-list');
    list.innerHTML = `<h3>Available Rides (${rides.length})</h3>`;
    
    rides.forEach(ride => {
        const card = document.createElement('div');
        card.className = 'ride-card animate-up';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <b style="font-size:1.2rem;">${ride.from_loc} → ${ride.to_loc}</b>
                <span class="badge fare-${ride.ride_type.toLowerCase()}">${ride.ride_type}</span>
            </div>
            <div style="display:flex; gap:1rem; align-items:center;">
                <img src="${ride.driver_avatar || 'https://i.pravatar.cc/100?u=' + ride.driver_id}" style="width:40px; height:40px; border-radius:50%;">
                <div>
                    <b>${ride.driver_name}</b>
                    <p style="font-size:0.8rem; color:var(--text-muted);">${ride.car_name} • ${ride.seats} seats left</p>
                </div>
                <div style="margin-left:auto; text-align:right;">
                    <b style="font-size:1.3rem; color:var(--accent);">₹${ride.price}</b>
                </div>
            </div>
        `;
        card.onclick = () => startBookingFlow(ride);
        list.appendChild(card);
        
        // Add marker
        const marker = L.marker([ride.start_lat, ride.start_lng]).addTo(leafletMap);
        marker.bindPopup(`<b>${ride.driver_name}</b><br>${ride.car_name}`);
    });
}

function startBookingFlow(ride) {
    const confirm = window.confirm(`Book a ride with ${ride.driver_name} for ₹${ride.price}?`);
    if (confirm) {
        // Mock payment
        showToast('Processing Payment...');
        setTimeout(() => {
            showToast('Booking Successful!', 'success');
            navigateTo('tracking', { ride });
        }, 1500);
    }
}

function initTracking(ride) {
    if (!ride) { navigateTo('search'); return; }
    
    const mapEl = document.getElementById('leaflet-map');
    leafletMap = L.map(mapEl).setView([ride.start_lat, ride.start_lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap);

    const carIcon = L.divIcon({
        className: 'live-car-icon live-marker-pulse',
        html: '<span class="material-symbols-outlined">directions_car</span>',
        iconSize: [30, 30]
    });

    const carMarker = L.marker([ride.start_lat, ride.start_lng], { icon: carIcon }).addTo(leafletMap);
    const destMarker = L.marker([ride.end_lat, ride.end_lng]).addTo(leafletMap);
    
    // Draw route
    L.polyline([[ride.start_lat, ride.start_lng], [ride.end_lat, ride.end_lng]], { color: 'var(--accent)', weight: 4, dashArray: '10, 10' }).addTo(leafletMap);

    // Update overlay
    document.getElementById('track-status').innerText = 'Driver is en route';
    document.getElementById('track-price').innerText = `₹${ride.price}`;
    document.getElementById('track-driver-name').innerText = ride.driver_name;
    document.getElementById('track-car-info').innerText = ride.car_name;

    // Simulate movement
    let step = 0;
    const steps = 100;
    activeTrackingInterval = setInterval(() => {
        step++;
        const lat = ride.start_lat + (ride.end_lat - ride.start_lat) * (step / steps);
        const lng = ride.start_lng + (ride.end_lng - ride.start_lng) * (step / steps);
        carMarker.setLatLng([lat, lng]);
        leafletMap.panTo([lat, lng]);
        
        const eta = Math.ceil((steps - step) / 10);
        document.getElementById('track-eta').innerText = eta > 0 ? `Arriving in ${eta} mins` : 'Arrived!';
        
        if (step >= steps) {
            clearInterval(activeTrackingInterval);
            showToast('You have arrived at your destination!', 'success');
        }
    }, 2000);
}

// --- Views Content ---
const views = {
    home: `
        <div class="hero-wrapper">
            <div class="hero-content">
                <div class="hero-text-block animate-up">
                    <h1>Go anywhere.<br>With Velora.</h1>
                    <p>Premium ride-sharing with real-time tracking, verified drivers, and transparent pricing. Travel safe, travel together.</p>
                    
                    <div class="booking-widget">
                        <div class="widget-tabs">
                            <button class="tab active">Find a Ride</button>
                            <button class="tab" onclick="navigateTo('offer')">Offer a Ride</button>
                        </div>
                        <div class="input-container">
                            <span class="material-symbols-outlined">radio_button_checked</span>
                            <input type="text" id="pickup" placeholder="Pickup location">
                        </div>
                        <div class="input-container">
                            <span class="material-symbols-outlined">location_on</span>
                            <input type="text" id="dropoff" placeholder="Drop-off location">
                        </div>
                        <button class="btn-primary" style="width:100%; margin-top:1rem;" onclick="navigateTo('search')">
                            Search Rides <span class="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                </div>
                <div class="hero-image-block">
                    <img src="logo.png" style="width:100%; opacity:0.1; position:absolute; filter:grayscale(1);">
                    <div class="tracking-card animate-up">
                        <div class="track-line">
                            <div class="track-point">
                                <small>Start</small><br><b>Central Park</b>
                            </div>
                            <div class="track-point">
                                <small>End</small><br><b>Tech Hub</b>
                            </div>
                        </div>
                        <div class="driver-mini">
                            <img src="https://i.pravatar.cc/100?u=alex" class="driver-img">
                            <div>
                                <b>Alex Rivera</b><br>
                                <small>Tesla Model S • 4.9⭐</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    search: `
        <div class="map-container">
            <div class="map-sidebar" id="rides-list">
                <h3>Searching for rides...</h3>
            </div>
            <div id="leaflet-map"></div>
        </div>
    `,
    login: `
        <div class="view-section">
            <div class="form-card animate-up">
                <h2 id="auth-title" style="margin-bottom:1rem;">Welcome Back</h2>
                <p style="color:var(--text-muted); margin-bottom:2rem;">Sign in to access your Velora account</p>
                <form onsubmit="handleAuth(event)">
                    <div class="form-group" id="name-group" style="display:none;">
                        <label>Full Name</label>
                        <input type="text" id="auth-name" placeholder="John Doe">
                    </div>
                    <div class="form-group">
                        <label>Email or Phone</label>
                        <input type="text" id="auth-identifier" required placeholder="name@example.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="auth-pass" required placeholder="••••••••">
                    </div>
                    <button type="submit" class="btn-primary" style="width:100%" id="auth-btn">Continue</button>
                </form>
                <p style="text-align:center; margin-top:1.5rem; font-size:0.9rem;">
                    <a href="#" onclick="toggleAuthMode()" id="auth-toggle">New to Velora? Create account</a>
                </p>
            </div>
        </div>
    `,
    tracking: `
        <div class="map-container">
            <button class="sos-btn" onclick="alert('Emergency Alert Sent!')">
                <span class="material-symbols-outlined">sos</span> EMERGENCY
            </button>
            <div id="leaflet-map"></div>
            <div class="tracking-overlay animate-up">
                <div>
                    <h3 id="track-status">Connecting...</h3>
                    <p id="track-eta" style="color:var(--text-muted);">Calculating ETA...</p>
                    <div style="display:flex; align-items:center; gap:1rem; margin-top:1rem;">
                        <img id="track-driver-img" src="https://i.pravatar.cc/100?u=driver" style="width:50px; height:50px; border-radius:50%;">
                        <div>
                            <b id="track-driver-name">Driver</b><br>
                            <span id="track-car-info" style="font-size:0.8rem;">Vehicle</span>
                        </div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div id="track-price" style="font-size:2rem; font-weight:800; color:var(--accent);">₹--</div>
                    <button class="btn-primary" style="padding:0.6rem 1rem; font-size:0.8rem; margin-top:0.5rem;" onclick="navigateTo('search')">Cancel Ride</button>
                </div>
            </div>
        </div>
    `
};

// --- Auth Logic ---
function toggleAuthMode() {
    const isLogin = document.getElementById('auth-title').innerText === 'Welcome Back';
    document.getElementById('auth-title').innerText = isLogin ? 'Create Account' : 'Welcome Back';
    document.getElementById('auth-toggle').innerText = isLogin ? 'Already have account? Sign In' : 'New to Velora? Create account';
    document.getElementById('name-group').style.display = isLogin ? 'block' : 'none';
}

async function handleAuth(e) {
    e.preventDefault();
    const isReg = document.getElementById('auth-title').innerText === 'Create Account';
    const identifier = document.getElementById('auth-identifier').value;
    const password = document.getElementById('auth-pass').value;
    const name = document.getElementById('auth-name')?.value;
    
    const endpoint = isReg ? '/auth/register' : '/auth/login';
    const body = { identifier, password };
    if (isReg) body.name = name;

    try {
        const res = await fetchAPI(endpoint, { method: 'POST', body: JSON.stringify(body) });
        if (res.requires_otp) {
            showOtpModal(res.identifier, res.otp_fallback);
        }
    } catch (err) { }
}

function showOtpModal(identifier, fallback) {
    const otp = prompt(`DEBUG: Enter OTP sent to ${identifier} (MOCK: ${fallback})`);
    if (otp) verifyOtp(identifier, otp);
}

async function verifyOtp(identifier, otp) {
    try {
        const res = await fetchAPI('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ identifier, otp })
        });
        currentUser = res.user;
        localStorage.setItem('velora_user', JSON.stringify(currentUser));
        localStorage.setItem('velora_token', res.token);
        showToast(`Welcome, ${currentUser.name}!`, 'success');
        navigateTo('home');
    } catch (e) { }
}

// Initialize
window.onload = () => {
    const saved = localStorage.getItem('velora_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        updateNavAuth();
    }
    navigateTo('home');
};
