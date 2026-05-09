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
    if ((route === 'profile' || route === 'offer' || route === 'tracking') && !currentUser) {
        navigateTo('login');
        showToast('Please sign in first');
        return;
    }
    
    if (activeTrackingInterval) { clearInterval(activeTrackingInterval); activeTrackingInterval = null; }
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    
    appContainer.innerHTML = views[route] || views.home;
    
    if (route === 'home') initHome();
    if (route === 'search') initSearch(params);
    if (route === 'tracking') initTracking(params.ride);
    if (route === 'offer') initOffer();
    if (route === 'profile') initProfile();
    
    window.scrollTo(0, 0);
    updateNav();
}

function updateNav() {
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
function initHome() {}

async function initSearch(params = {}) {
    const mapEl = document.getElementById('leaflet-map');
    leafletMap = L.map(mapEl).setView([28.6139, 77.2090], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap);
    
    const query = new URLSearchParams(params).toString();
    const rides = await fetchAPI(`/rides?${query}`);
    
    const list = document.getElementById('rides-list');
    list.innerHTML = `<h3>Available Rides (${rides.length})</h3>`;
    
    rides.forEach(ride => {
        const card = document.createElement('div');
        card.className = 'ride-card animate-up';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.8rem;">
                <b>${ride.from_loc} → ${ride.to_loc}</b>
                <b style="color:var(--accent);">₹${ride.price}</b>
            </div>
            <div style="display:flex; align-items:center; gap:1rem;">
                <img src="${ride.driver_avatar || 'https://i.pravatar.cc/100?u='+ride.driver_id}" style="width:35px; height:35px; border-radius:50%;">
                <div>
                    <span style="font-size:0.9rem; font-weight:600;">${ride.driver_name}</span><br>
                    <small style="color:var(--text-muted);">${ride.car_name} • ${ride.seats} seats left</small>
                </div>
            </div>
        `;
        card.onclick = () => startBooking(ride);
        list.appendChild(card);
        
        L.marker([ride.start_lat || 28.6, ride.start_lng || 77.2]).addTo(leafletMap)
         .bindPopup(`<b>${ride.driver_name}</b><br>${ride.car_name}`);
    });
}

async function startBooking(ride) {
    const seats = prompt(`Book how many seats? (Max ${ride.seats})`, "1");
    if (!seats || isNaN(seats) || seats > ride.seats) return;

    showToast('Confirming booking...');
    try {
        await fetchAPI('/rides/book', {
            method: 'POST',
            body: JSON.stringify({ ride_id: ride.id, user_id: currentUser.id, seats_booked: parseInt(seats) })
        });
        showToast('Booking Confirmed!', 'success');
        navigateTo('tracking', { ride });
    } catch(e) {}
}

function initTracking(ride) {
    if (!ride) { navigateTo('search'); return; }
    
    const mapEl = document.getElementById('leaflet-map');
    leafletMap = L.map(mapEl).setView([ride.start_lat || 28.6, ride.start_lng || 77.2], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap);

    const carIcon = L.divIcon({ className: 'live-marker-pulse', iconSize: [20, 20] });
    const carMarker = L.marker([ride.start_lat || 28.6, ride.start_lng || 77.2], { icon: carIcon }).addTo(leafletMap);
    
    // Simulate movement towards destination
    const start = [ride.start_lat || 28.6, ride.start_lng || 77.2];
    const end = [ride.end_lat || 28.7, ride.end_lng || 77.3];
    
    let step = 0;
    activeTrackingInterval = setInterval(() => {
        step++;
        const lat = start[0] + (end[0] - start[0]) * (step / 100);
        const lng = start[1] + (end[1] - start[1]) * (step / 100);
        carMarker.setLatLng([lat, lng]);
        leafletMap.panTo([lat, lng]);
        
        document.getElementById('track-eta').innerText = `${Math.ceil((100-step)/5)} mins away`;
        if (step >= 100) {
            clearInterval(activeTrackingInterval);
            showToast('Arrived!', 'success');
        }
    }, 2000);
}

async function initOffer() {
    const carSelect = document.getElementById('offer-car');
    const cars = await fetchAPI('/cars');
    carSelect.innerHTML = cars.map(c => `<option value="${c.model}">${c.model}</option>`).join('');
}

async function handlePublishRide(e) {
    e.preventDefault();
    const data = {
        driver_id: currentUser.id,
        from_loc: document.getElementById('off-from').value,
        to_loc: document.getElementById('off-to').value,
        ride_date: document.getElementById('off-date').value,
        departure: document.getElementById('off-time').value,
        car_name: document.getElementById('offer-car').value,
        car_year: 2024,
        price: parseFloat(document.getElementById('off-price').value),
        seats: parseInt(document.getElementById('off-seats').value),
        ride_type: 'Go',
        start_lat: 28.6 + (Math.random() * 0.1), start_lng: 77.2 + (Math.random() * 0.1),
        end_lat: 28.7 + (Math.random() * 0.1), end_lng: 77.3 + (Math.random() * 0.1)
    };
    await fetchAPI('/rides', { method: 'POST', body: JSON.stringify(data) });
    showToast('Ride Published!', 'success');
    navigateTo('home');
}

async function initProfile() {
    const activity = await fetchAPI('/user/activity', { method: 'POST', body: JSON.stringify({ user_id: currentUser.id }) });
    document.getElementById('prof-name').innerText = currentUser.name;
    document.getElementById('booked-list').innerHTML = activity.booked.map(r => `
        <div class="ride-card">
            <b>${r.from_loc} → ${r.to_loc}</b>
            <p>${r.ride_date} • ${r.seats_booked} seats</p>
        </div>
    `).join('') || '<p>No bookings yet.</p>';
}

// --- Views ---
const views = {
    home: `
        <div class="hero-wrapper">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <div class="hero-text-block animate-up">
                    <h1>Your pick of rides<br>at low prices.</h1>
                    <div class="booking-widget">
                        <div class="input-container">
                            <span class="material-symbols-outlined">radio_button_checked</span>
                            <input type="text" id="s-from" placeholder="From where?">
                        </div>
                        <div class="input-container">
                            <span class="material-symbols-outlined">location_on</span>
                            <input type="text" id="s-to" placeholder="To where?">
                        </div>
                        <div class="input-container">
                            <span class="material-symbols-outlined">calendar_today</span>
                            <input type="date" id="s-date">
                        </div>
                        <button class="btn-primary" style="width:100%; margin-top:1rem;" onclick="navigateTo('search', {from:document.getElementById('s-from').value, to:document.getElementById('s-to').value, date:document.getElementById('s-date').value})">
                            Find a ride
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    search: `
        <div class="map-container">
            <div class="map-sidebar" id="rides-list"></div>
            <div id="leaflet-map"></div>
        </div>
    `,
    tracking: `
        <div class="map-container">
            <div id="leaflet-map"></div>
            <div class="tracking-overlay animate-up">
                <div>
                    <h3 id="track-status">Your driver is on the way</h3>
                    <p id="track-eta" style="color:var(--text-muted);">Calculating...</p>
                </div>
                <button class="btn-primary" onclick="navigateTo('home')">Go Back</button>
            </div>
        </div>
    `,
    offer: `
        <div class="view-section" style="padding-top:120px;">
            <div class="form-card animate-up">
                <h2>Publish a ride</h2>
                <form onsubmit="handlePublishRide(event)">
                    <div class="form-group"><label>From</label><input type="text" id="off-from" required></div>
                    <div class="form-group"><label>To</label><input type="text" id="off-to" required></div>
                    <div class="form-group"><label>Date</label><input type="date" id="off-date" required></div>
                    <div class="form-group"><label>Time</label><input type="time" id="off-time" required></div>
                    <div class="form-group"><label>Car</label><select id="offer-car"></select></div>
                    <div class="form-group"><label>Price (₹)</label><input type="number" id="off-price" required></div>
                    <div class="form-group"><label>Seats</label><input type="number" id="off-seats" value="3" required></div>
                    <button type="submit" class="btn-primary" style="width:100%;">Publish</button>
                </form>
            </div>
        </div>
    `,
    profile: `
        <div class="dashboard-container">
            <div class="sidebar-card">
                <div style="width:80px; height:80px; background:var(--accent); border-radius:50%; margin:0 auto 1.5rem; display:flex; align-items:center; justify-content:center; font-size:2rem; color:#fff;">👤</div>
                <h3 id="prof-name" style="text-align:center;">User</h3>
                <button class="btn-primary" style="width:100%; margin-top:2rem;" onclick="logout()">Logout</button>
            </div>
            <div>
                <h3>My Bookings</h3>
                <div id="booked-list" style="margin-top:1.5rem;"></div>
            </div>
        </div>
    `,
    login: `
        <div class="view-section" style="padding-top:120px;">
            <div class="form-card animate-up">
                <h2 id="auth-title">Welcome Back</h2>
                <form onsubmit="handleAuth(event)">
                    <div class="form-group" id="name-group" style="display:none;"><label>Name</label><input type="text" id="auth-name"></div>
                    <div class="form-group"><label>Email/Phone</label><input type="text" id="auth-identifier" required></div>
                    <div class="form-group"><label>Password</label><input type="password" id="auth-pass" required></div>
                    <button type="submit" class="btn-primary" style="width:100%;" id="auth-btn">Continue</button>
                </form>
                <p style="text-align:center; margin-top:1rem;"><a href="#" onclick="toggleAuthMode()" id="auth-toggle">Join Velora</a></p>
            </div>
        </div>
    `
};

// --- Auth Utils ---
function toggleAuthMode() {
    const isLogin = document.getElementById('auth-title').innerText === 'Welcome Back';
    document.getElementById('auth-title').innerText = isLogin ? 'Create Account' : 'Welcome Back';
    document.getElementById('name-group').style.display = isLogin ? 'block' : 'none';
}

async function handleAuth(e) {
    e.preventDefault();
    const isReg = document.getElementById('auth-title').innerText === 'Create Account';
    const body = { identifier: document.getElementById('auth-identifier').value, password: document.getElementById('auth-pass').value, name: document.getElementById('auth-name')?.value };
    const res = await fetchAPI(isReg ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(body) });
    if (res.requires_otp) {
        const otp = prompt(`OTP: ${res.otp_fallback}`);
        if (otp) {
            const final = await fetchAPI('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ identifier: res.identifier, otp }) });
            currentUser = final.user;
            localStorage.setItem('velora_user', JSON.stringify(currentUser));
            navigateTo('home');
        }
    }
}

function logout() { currentUser = null; localStorage.removeItem('velora_user'); navigateTo('home'); }

window.onload = () => {
    const saved = localStorage.getItem('velora_user');
    if (saved) currentUser = JSON.parse(saved);
    navigateTo('home');
};
