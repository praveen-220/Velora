const appContainer = document.getElementById('app-container');
const API_URL = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000/api' : '/api';
let leafletMap = null;
let currentUser = null;
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

// --- Real Address Autocomplete (Nominatim) ---
async function searchAddress(query, inputId) {
    if (query.length < 3) return;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=in&limit=5`);
    const data = await res.json();
    const dropdown = document.getElementById(`${inputId}-results`);
    dropdown.innerHTML = data.map(item => `
        <div class="address-item" onclick="selectAddress('${item.display_name}', ${item.lat}, ${item.lon}, '${inputId}')">
            ${item.display_name}
        </div>
    `).join('');
    dropdown.style.display = 'block';
}

function selectAddress(name, lat, lon, inputId) {
    const input = document.getElementById(inputId);
    input.value = name;
    input.dataset.lat = lat;
    input.dataset.lon = lon;
    document.getElementById(`${inputId}-results`).style.display = 'none';
    
    // Update map marker
    if (leafletMap) {
        L.marker([lat, lon]).addTo(leafletMap).bindPopup(name).openPopup();
        leafletMap.setView([lat, lon], 13);
    }
}

// --- Router ---
function navigateTo(route, params = {}) {
    if (activeTrackingInterval) { clearInterval(activeTrackingInterval); activeTrackingInterval = null; }
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    toggleChat(false);
    
    appContainer.innerHTML = views[route] || views.home;
    
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
        btn.innerText = currentUser.role === 'admin' ? 'Network Hub' : currentUser.name.split(' ')[0];
        btn.onclick = () => navigateTo(currentUser.role || 'rider');
    } else {
        btn.innerText = 'Access Network';
        btn.onclick = () => navigateTo('login');
    }
}

// --- Views ---
const views = {
    home: `
        <div class="hero-live">
            <div class="hero-content animate-up">
                <h1>Velora India.</h1>
                <p>The premium ride-sharing network now across all major Indian cities. Real-time addresses, real-time safety.</p>
                <div style="display:flex; gap:1.5rem; justify-content:center; margin-top:3rem;">
                    <button class="btn-premium" onclick="navigateTo('rider')">Find a Ride</button>
                    <button class="btn-premium" style="background:rgba(255,255,255,0.05); border:1px solid var(--glass-border);" onclick="navigateTo('driver')">Offer a Ride</button>
                </div>
            </div>
        </div>
    `,
    rider: `
        <div class="map-layout">
            <aside class="side-panel">
                <h2 style="margin-bottom:2rem;">Book Your Journey</h2>
                <div class="glass-widget">
                    <div style="position:relative; margin-bottom:1rem;">
                        <input type="text" id="r-from" placeholder="Pickup in India" oninput="searchAddress(this.value, 'r-from')" style="width:100%; background:rgba(255,255,255,0.05); border:none; padding:1rem; border-radius:12px; color:#fff;">
                        <div id="r-from-results" class="autocomplete-dropdown"></div>
                    </div>
                    <div style="position:relative; margin-bottom:1.5rem;">
                        <input type="text" id="r-to" placeholder="Destination in India" oninput="searchAddress(this.value, 'r-to')" style="width:100%; background:rgba(255,255,255,0.05); border:none; padding:1rem; border-radius:12px; color:#fff;">
                        <div id="r-to-results" class="autocomplete-dropdown"></div>
                    </div>
                    <button class="btn-premium" style="width:100%;" onclick="searchLiveRides()">Search Network</button>
                </div>
                <div id="rides-list" style="margin-top:2rem;"></div>
            </aside>
            <div id="leaflet-map"></div>
        </div>
    `,
    driver: `
        <div class="map-layout">
            <aside class="side-panel">
                <h2 style="margin-bottom:2rem;">Share Your Route</h2>
                <div class="glass-widget animate-up">
                    <div style="position:relative; margin-bottom:1rem;">
                        <input type="text" id="o-from" placeholder="Starting Point" oninput="searchAddress(this.value, 'o-from')" style="width:100%; background:rgba(255,255,255,0.05); border:none; padding:1rem; border-radius:12px; color:#fff;">
                        <div id="o-from-results" class="autocomplete-dropdown"></div>
                    </div>
                    <div style="position:relative; margin-bottom:1rem;">
                        <input type="text" id="o-to" placeholder="Destination" oninput="searchAddress(this.value, 'o-to')" style="width:100%; background:rgba(255,255,255,0.05); border:none; padding:1rem; border-radius:12px; color:#fff;">
                        <div id="o-to-results" class="autocomplete-dropdown"></div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
                        <input type="number" id="o-price" placeholder="Price (₹)" style="background:rgba(255,255,255,0.05); border:none; padding:1rem; border-radius:12px; color:#fff;">
                        <input type="number" id="o-seats" placeholder="Seats" value="3" style="background:rgba(255,255,255,0.05); border:none; padding:1rem; border-radius:12px; color:#fff;">
                    </div>
                    <button class="btn-premium" style="width:100%;" onclick="handleOfferRide(event)">Share Ride</button>
                </div>
            </aside>
            <div id="leaflet-map"></div>
        </div>
    `,
    login: `
        <div class="hero-live" style="height:100vh;">
            <div class="glass-widget animate-up" style="max-width:400px; width:100%;">
                <h2 style="text-align:center; margin-bottom:2rem;">Velora Access</h2>
                <form onsubmit="handleAuth(event)">
                    <input type="text" id="auth-id" placeholder="Email (Real OTP sent here)" style="width:100%; background:rgba(255,255,255,0.05); border:none; padding:1rem; border-radius:12px; color:#fff; margin-bottom:1rem;">
                    <input type="password" id="auth-pass" placeholder="Password" style="width:100%; background:rgba(255,255,255,0.05); border:none; padding:1rem; border-radius:12px; color:#fff; margin-bottom:1.5rem;">
                    <button class="btn-premium" style="width:100%;">Continue</button>
                </form>
                <div style="margin-top:2rem; border-top:1px solid var(--glass-border); padding-top:1.5rem; text-align:center;">
                    <button class="btn-premium" style="font-size:0.7rem; padding:0.6rem 1.2rem; background:var(--accent-indigo);" onclick="masterLogin()">Master Login (One-Click)</button>
                </div>
            </div>
        </div>
    `,
    tracking: `
        <div class="map-layout">
            <aside class="side-panel">
                <h2 style="margin-bottom:1rem;">Live Journey</h2>
                <div class="ride-card-live" id="active-driver-info">Connecting...</div>
                <div class="dash-stat" style="margin-top:2rem;"><h4>ETA</h4><span id="track-eta">--</span></div>
                <button class="btn-premium" style="width:100%; margin-top:2rem; background:rgba(255,255,255,0.05);" onclick="toggleChat(true)">Open Chat</button>
            </aside>
            <div id="leaflet-map"></div>
        </div>
    `,
    admin: `
        <div class="map-layout">
            <aside class="side-panel">
                <h2>Network Hub</h2>
                <div class="dash-stat"><h4>Global Surge</h4><span id="surge-display">1.0x</span></div>
                <input type="range" min="1" max="5" step="0.1" value="1" id="surge-slider" style="width:100%; margin-top:1rem;" oninput="updateSurgeUI()">
                <button class="btn-premium" style="width:100%; margin-top:1rem;" onclick="applySurge()">Set Surge</button>
            </aside>
            <div id="leaflet-map"></div>
        </div>
    `
};

// --- Logic ---
function initHome() {}

async function initRider() {
    const mapEl = document.getElementById('leaflet-map');
    leafletMap = L.map(mapEl).setView([20.5937, 78.9629], 5); // Center on India
    L.tileLayer('https://{s}.tile.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(leafletMap);
}

async function searchLiveRides() {
    const rides = await fetchAPI('/rides');
    const settings = await fetchAPI('/admin/settings');
    const surge = parseFloat(settings.surge_multiplier || 1.0);
    const list = document.getElementById('rides-list');
    list.innerHTML = rides.map(r => `
        <div class="ride-card-live animate-up" onclick="bookVeloraRide(${r.id})">
            <div style="display:flex; justify-content:space-between;"><b>${r.car_name}</b><b>₹${Math.round(r.price * surge)}</b></div>
            <div style="font-size:0.75rem; color:var(--text-low); margin-top:0.5rem; line-height:1.2;">${r.from_loc} <br> → ${r.to_loc}</div>
        </div>
    `).join('');
}

async function bookVeloraRide(id) {
    if (!currentUser) { navigateTo('login'); return; }
    const res = await fetchAPI('/rides/book', { method: 'POST', body: JSON.stringify({ ride_id: id, user_id: currentUser.id, seats_booked: 1 }) });
    if (res && res.success) { showToast('Booking Confirmed!', 'success'); navigateTo('tracking', { rideId: id }); }
}

async function initTracking(rideId) {
    const ride = await fetchAPI(`/rides/${rideId}`);
    const mapEl = document.getElementById('leaflet-map');
    leafletMap = L.map(mapEl).setView([ride.start_lat, ride.start_lng], 13);
    L.tileLayer('https://{s}.tile.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(leafletMap);
    
    const carIcon = L.divIcon({ className: 'pulse', html: '<div style="width:20px; height:20px; background:#6366f1; border-radius:50%; border:3px solid #fff;"></div>' });
    const marker = L.marker([ride.start_lat, ride.start_lng], {icon: carIcon}).addTo(leafletMap);
    
    // Draw route line
    L.polyline([[ride.start_lat, ride.start_lng], [ride.end_lat, ride.end_lng]], {color: '#6366f1', weight: 4, opacity: 0.5}).addTo(leafletMap);

    let p = 0;
    activeTrackingInterval = setInterval(() => {
        p += 0.5;
        const lat = ride.start_lat + (ride.end_lat - ride.start_lat)*(p/100);
        const lng = ride.start_lng + (ride.end_lng - ride.start_lng)*(p/100);
        marker.setLatLng([lat, lng]); leafletMap.panTo([lat, lng]);
        document.getElementById('track-eta').innerText = Math.round(15*(1-p/100)) + 'm';
        if (p>=100) clearInterval(activeTrackingInterval);
    }, 1000);
}

// --- Auth Boilerplate ---
async function handleAuth(e) {
    e.preventDefault();
    const identifier = document.getElementById('auth-id').value;
    const password = document.getElementById('auth-pass').value;
    const res = await fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
    if (res && res.requires_otp) {
        const otp = prompt(`Enter OTP: (Check your Email or use ${res.otp_fallback})`);
        const vres = await fetchAPI('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ identifier, otp }) });
        if (vres && vres.user) {
            currentUser = vres.user;
            localStorage.setItem('velora_user', JSON.stringify(currentUser));
            navigateTo('home');
        }
    }
}

function masterLogin() {
    document.getElementById('auth-id').value = 'praveenhoratti2@gmail.com';
    document.getElementById('auth-pass').value = 'Praveen@600';
    document.querySelector('form').dispatchEvent(new Event('submit'));
}

async function handleOfferRide(e) {
    e.preventDefault();
    const rideData = {
        driver_id: currentUser.id,
        from_loc: document.getElementById('o-from').value,
        to_loc: document.getElementById('o-to').value,
        start_lat: document.getElementById('o-from').dataset.lat,
        start_lng: document.getElementById('o-from').dataset.lon,
        end_lat: document.getElementById('o-to').dataset.lat,
        end_lng: document.getElementById('o-to').dataset.lon,
        price: document.getElementById('o-price').value,
        seats: document.getElementById('o-seats').value,
        car_name: 'Tesla Model 3', ride_date: '2026-05-10', departure: '10:00'
    };
    const res = await fetchAPI('/rides', { method: 'POST', body: JSON.stringify(rideData) });
    if (res && res.success) { showToast('Ride Live in India!', 'success'); navigateTo('rider'); }
}

function toggleChat(s) { const c = document.getElementById('chat-overlay'); s ? c.classList.remove('chat-hidden') : c.classList.add('chat-hidden'); }
function logout() { currentUser = null; localStorage.removeItem('velora_user'); navigateTo('home'); }
async function initAdmin() {
    const s = await fetchAPI('/admin/settings');
    document.getElementById('surge-slider').value = s.surge_multiplier;
    document.getElementById('surge-display').innerText = s.surge_multiplier + 'x';
}
function updateSurgeUI() { document.getElementById('surge-display').innerText = document.getElementById('surge-slider').value + 'x'; }
async function applySurge() { await fetchAPI('/admin/settings', { method: 'POST', body: JSON.stringify({ surge_multiplier: document.getElementById('surge-slider').value }) }); showToast('Network Surge Updated'); }

window.onload = () => {
    const saved = localStorage.getItem('velora_user');
    if (saved) currentUser = JSON.parse(saved);
    navigateTo('home');
};
