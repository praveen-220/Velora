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
    toast.className = `toast toast-${type}`;
    toast.style = `position:fixed; bottom:2rem; left:50%; transform:translateX(-50%); background:${type === 'error' ? '#ff3b30' : '#054752'}; color:#fff; padding:1rem 2rem; border-radius:50px; z-index:9999; box-shadow:0 10px 30px rgba(0,0,0,0.2); font-weight:600; font-size:0.9rem; transition:0.3s; animation:slideUp 0.3s ease;`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Navigation ---
function navigateTo(route, params = {}) {
    if (activeTrackingInterval) { clearInterval(activeTrackingInterval); activeTrackingInterval = null; }
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    
    appContainer.innerHTML = views[route] || views.home;
    
    if (route === 'home') initHome();
    if (route === 'search') initSearch(params);
    if (route === 'tracking') initTracking(params.rideId);
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

// --- Views Content ---
const views = {
    home: `
        <div class="hero-wrapper">
            <div class="hero-overlay"></div>
            <div class="hero-content animate-up">
                <h1>Your pick of rides at low prices</h1>
            </div>
        </div>

        <div class="search-pill animate-up">
            <div class="search-group">
                <span class="material-symbols-outlined">radio_button_checked</span>
                <input type="text" id="s-from" placeholder="Leaving from...">
            </div>
            <div class="search-group">
                <span class="material-symbols-outlined">location_on</span>
                <input type="text" id="s-to" placeholder="Going to...">
            </div>
            <div class="search-group">
                <span class="material-symbols-outlined">calendar_today</span>
                <input type="date" id="s-date">
            </div>
            <button class="search-btn" onclick="performSearch()">Search</button>
        </div>

        <section class="animate-up">
            <div class="features-grid">
                <div class="feature-card">
                    <span class="material-symbols-outlined feature-icon">payments</span>
                    <h3>Your pick of rides at low prices</h3>
                    <p>Find the perfect ride from our wide range of destinations and routes at low prices.</p>
                </div>
                <div class="feature-card">
                    <span class="material-symbols-outlined feature-icon">verified_user</span>
                    <h3>Trust who you travel with</h3>
                    <p>We check reviews, profiles and IDs, so you know who you’re travelling with.</p>
                </div>
                <div class="feature-card">
                    <span class="material-symbols-outlined feature-icon">bolt</span>
                    <h3>Scroll, click and go!</h3>
                    <p>Booking a ride has never been easier! Book a ride close to you in just minutes.</p>
                </div>
            </div>
        </section>

        <section style="background: var(--bg-light); border-top: 1px solid var(--border);">
            <div class="section-header">
                <h2>Popular Routes</h2>
                <p>Join thousands of members on these frequent journeys</p>
            </div>
            <div class="routes-grid">
                <div class="route-item" onclick="quickSearch('Indie Park', 'Tech City')">
                    <span>Indie Park → Tech City</span>
                    <span class="material-symbols-outlined">chevron_right</span>
                </div>
                <div class="route-item" onclick="quickSearch('Sector 62', 'Cyber Hub')">
                    <span>Sector 62 → Cyber Hub</span>
                    <span class="material-symbols-outlined">chevron_right</span>
                </div>
                <div class="route-item" onclick="quickSearch('Airport T3', 'Connaught Place')">
                    <span>Airport T3 → Connaught Place</span>
                    <span class="material-symbols-outlined">chevron_right</span>
                </div>
                <div class="route-item" onclick="quickSearch('Mumbai', 'Pune')">
                    <span>Mumbai → Pune</span>
                    <span class="material-symbols-outlined">chevron_right</span>
                </div>
            </div>
        </section>

        <section>
            <div class="driver-promo animate-up">
                <div class="driver-promo-text">
                    <h2>Driving in your car soon?</h2>
                    <p>Share your ride and start saving on travel costs!</p>
                </div>
                <a href="#" class="driver-promo-btn" onclick="navigateTo('offer')">Offer a ride</a>
            </div>
        </section>

        <footer>
            <div class="footer-grid">
                <div class="footer-col">
                    <h4>Top carpool routes</h4>
                    <ul><li><a href="#">Mumbai → Pune</a></li><li><a href="#">Delhi → Jaipur</a></li><li><a href="#">Bangalore → Mysore</a></li></ul>
                </div>
                <div class="footer-col">
                    <h4>About</h4>
                    <ul><li><a href="#">How it works</a></li><li><a href="#">About us</a></li><li><a href="#">Press</a></li></ul>
                </div>
                <div class="footer-col">
                    <h4>Support</h4>
                    <ul><li><a href="#">Help Centre</a></li><li><a href="#">Safety</a></li></ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>© 2026 Velora. All rights reserved.</p>
            </div>
        </footer>
    `,
    search: `
        <div class="map-page">
            <div class="sidebar">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h2 style="font-size:1.5rem;">Available Rides</h2>
                </div>
                <div id="rides-list"></div>
            </div>
            <div class="map-view"><div id="leaflet-map"></div></div>
        </div>
    `,
    tracking: `
        <div class="map-page">
            <div class="sidebar">
                <div id="tracking-info">
                    <h2 style="margin-bottom:1rem;">Your Journey</h2>
                    <div class="ride-card" id="tracking-ride-card">
                        <p>Connecting to driver...</p>
                    </div>
                    <div style="margin-top:2rem;">
                        <h3 style="font-size:1.1rem; margin-bottom:1rem;">Live Status</h3>
                        <div style="padding:1.5rem; background:var(--bg-light); border-radius:16px;">
                            <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
                                <span class="material-symbols-outlined" style="color:var(--accent);">near_me</span>
                                <span id="track-eta">Calculating ETA...</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:1rem;">
                                <span class="material-symbols-outlined" style="color:var(--success);">verified_user</span>
                                <span>Verified Driver</span>
                            </div>
                        </div>
                    </div>
                    <button class="btn-primary" style="width:100%; margin-top:2rem; background:var(--primary);" onclick="navigateTo('home')">End View</button>
                </div>
            </div>
            <div class="map-view"><div id="leaflet-map"></div></div>
        </div>
    `,
    offer: `
        <div style="max-width: 600px; margin: 100px auto; padding: 2rem;">
            <div class="animate-up" style="background:#fff; padding:3rem; border-radius:24px; border:1px solid var(--border); box-shadow:var(--shadow-md);">
                <h2 style="margin-bottom:2rem;">Offer a Ride</h2>
                <form onsubmit="handleOffer(event)">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
                        <div><label>From</label><input type="text" id="o-from" required></div>
                        <div><label>To</label><input type="text" id="o-to" required></div>
                    </div>
                    <div style="margin-bottom:1.5rem;"><label>Date</label><input type="date" id="o-date" required></div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:2rem;">
                        <div><label>Price (₹)</label><input type="number" id="o-price" required></div>
                        <div><label>Seats</label><input type="number" id="o-seats" value="3" required></div>
                    </div>
                    <button type="submit" class="btn-primary" style="width:100%;">Publish Ride</button>
                </form>
            </div>
        </div>
    `,
    login: `
        <div style="max-width: 400px; margin: 120px auto; padding: 2rem; text-align:center;">
            <div class="animate-up" style="background:#fff; padding:3rem; border-radius:24px; border:1px solid var(--border); box-shadow:var(--shadow-md);">
                <h2 style="margin-bottom:1rem;">Sign In</h2>
                <form onsubmit="handleLogin(event)">
                    <input type="text" id="l-user" placeholder="Email or Phone" required style="width:100%; padding:1rem; border-radius:8px; border:1px solid var(--border); margin-bottom:1rem;">
                    <input type="password" id="l-pass" placeholder="Password" required style="width:100%; padding:1rem; border-radius:8px; border:1px solid var(--border); margin-bottom:1.5rem;">
                    <button type="submit" class="btn-primary" style="width:100%;">Continue</button>
                </form>
            </div>
        </div>
    `,
    profile: `
        <div style="max-width: 1000px; margin: 100px auto; padding: 2rem;">
            <div class="animate-up" style="display:grid; grid-template-columns: 300px 1fr; gap:3rem;">
                <div style="background:#fff; padding:2rem; border-radius:24px; border:1px solid var(--border); text-align:center;">
                    <div style="width:80px; height:80px; background:var(--bg-light); border-radius:50%; margin:0 auto 1rem; display:flex; align-items:center; justify-content:center; font-size:2rem;">👤</div>
                    <h3 id="p-name">User</h3>
                    <button class="btn-primary" style="width:100%; margin-top:2rem; background:var(--primary);" onclick="logout()">Logout</button>
                </div>
                <div><h3>My Activity</h3><div id="activity-list"></div></div>
            </div>
        </div>
    `
};

// --- Logic ---
function performSearch() {
    const from = document.getElementById('s-from').value;
    const to = document.getElementById('s-to').value;
    const date = document.getElementById('s-date').value;
    navigateTo('search', { from, to, date });
}

function quickSearch(from, to) {
    navigateTo('search', { from, to });
}

async function initSearch(params) {
    const mapEl = document.getElementById('leaflet-map');
    leafletMap = L.map(mapEl).setView([28.6139, 77.2090], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap);

    const query = new URLSearchParams(params).toString();
    const rides = await fetchAPI(`/rides?${query}`);
    const list = document.getElementById('rides-list');
    list.innerHTML = '';

    if (!rides || rides.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:2rem;">No rides found.</p>';
        return;
    }

    rides.forEach(ride => {
        const card = document.createElement('div');
        card.className = 'ride-card animate-up';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                <b>${ride.departure}</b><b style="font-size:1.2rem;">₹${ride.price}</b>
            </div>
            <div style="border-left:2px solid var(--accent); padding-left:1rem; margin-bottom:1rem;">
                <div>${ride.from_loc}</div><div style="margin:0.2rem 0; color:var(--text-muted); font-size:0.7rem;">↓</div><div>${ride.to_loc}</div>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem; padding-top:0.8rem; border-top:1px solid var(--border);">
                <img src="${ride.driver_avatar}" style="width:24px; height:24px; border-radius:50%;">
                <span style="font-size:0.8rem; flex:1;">${ride.driver_name}</span>
                <span style="font-size:0.8rem; color:var(--success);">${ride.seats} left</span>
            </div>
        `;
        card.onclick = () => bookRide(ride);
        list.appendChild(card);

        L.marker([ride.start_lat, ride.start_lng]).addTo(leafletMap).bindPopup(`${ride.driver_name}: ${ride.from_loc}`);
    });
}

async function bookRide(ride) {
    if (!currentUser) { showToast('Please login to book'); navigateTo('login'); return; }
    showToast('Processing booking...');
    const res = await fetchAPI('/rides/book', {
        method: 'POST',
        body: JSON.stringify({ ride_id: ride.id, user_id: currentUser.id, seats_booked: 1 })
    });
    if (res && res.success) {
        showToast('Booking Successful!', 'success');
        navigateTo('tracking', { rideId: ride.id });
    }
}

async function initTracking(rideId) {
    if (!rideId) { navigateTo('home'); return; }
    const ride = await fetchAPI(`/rides/${rideId}`);
    if (!ride) return;

    const card = document.getElementById('tracking-ride-card');
    card.innerHTML = `
        <div style="font-weight:700; margin-bottom:0.5rem;">${ride.from_loc} → ${ride.to_loc}</div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
            <img src="${ride.driver_avatar}" style="width:24px; height:24px; border-radius:50%;">
            <span>${ride.driver_name} is your driver</span>
        </div>
    `;

    const mapEl = document.getElementById('leaflet-map');
    leafletMap = L.map(mapEl).setView([ride.start_lat, ride.start_lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap);

    const startPos = [ride.start_lat, ride.start_lng];
    const endPos = [ride.end_lat, ride.end_lng];
    
    L.marker(startPos).addTo(leafletMap).bindPopup('Start');
    L.marker(endPos).addTo(leafletMap).bindPopup('Destination');

    const carMarker = L.marker(startPos, {
        icon: L.divIcon({ className: 'live-marker', html: '<div style="width:15px; height:15px; background:var(--accent); border-radius:50%; border:2px solid #fff; box-shadow:0 0 10px var(--accent);"></div>' })
    }).addTo(leafletMap);

    let progress = 0;
    activeTrackingInterval = setInterval(() => {
        progress += 1;
        const lat = startPos[0] + (endPos[0] - startPos[0]) * (progress / 100);
        const lng = startPos[1] + (endPos[1] - startPos[1]) * (progress / 100);
        carMarker.setLatLng([lat, lng]);
        leafletMap.panTo([lat, lng]);
        
        document.getElementById('track-eta').innerText = `${Math.max(0, 15 - Math.floor(progress/6))} mins away`;

        if (progress >= 100) {
            clearInterval(activeTrackingInterval);
            showToast('You have arrived!', 'success');
        }
    }, 1000);
}

async function handleOffer(e) {
    e.preventDefault();
    if (!currentUser) { navigateTo('login'); return; }
    const rideData = {
        driver_id: currentUser.id,
        from_loc: document.getElementById('o-from').value,
        to_loc: document.getElementById('o-to').value,
        ride_date: document.getElementById('o-date').value,
        price: document.getElementById('o-price').value,
        seats: document.getElementById('o-seats').value,
        departure: '12:00', car_name: 'Tesla Model 3', car_year: 2024,
        start_lat: 28.6139 + (Math.random() * 0.1), start_lng: 77.2090 + (Math.random() * 0.1),
        end_lat: 28.5355 + (Math.random() * 0.1), end_lng: 77.3910 + (Math.random() * 0.1)
    };
    const res = await fetchAPI('/rides', { method: 'POST', body: JSON.stringify(rideData) });
    if (res && res.success) { showToast('Ride Published!', 'success'); navigateTo('home'); }
}

async function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('l-user').value;
    const password = document.getElementById('l-pass').value;
    const res = await fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
    if (res && res.requires_otp) {
        const otp = prompt(`Enter OTP (Check Console): ${res.otp_fallback}`);
        const vres = await fetchAPI('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ identifier, otp }) });
        if (vres && vres.user) {
            currentUser = vres.user;
            localStorage.setItem('velora_user', JSON.stringify(currentUser));
            showToast('Logged in!', 'success');
            navigateTo('home');
        }
    }
}

async function initProfile() {
    document.getElementById('p-name').innerText = currentUser.name;
    const activity = await fetchAPI('/user/activity', { method: 'POST', body: JSON.stringify({ user_id: currentUser.id }) });
    const list = document.getElementById('activity-list');
    list.innerHTML = '';
    [...activity.booked, ...activity.offered].forEach(item => {
        const card = document.createElement('div');
        card.className = 'ride-card';
        card.innerHTML = `<b>${item.from_loc} → ${item.to_loc}</b><br><small>${item.ride_date}</small>`;
        list.appendChild(card);
    });
}

function logout() { currentUser = null; localStorage.removeItem('velora_user'); navigateTo('home'); }
function initHome() {}

window.onload = () => {
    const saved = localStorage.getItem('velora_user');
    if (saved) currentUser = JSON.parse(saved);
    navigateTo('home');
};
