const appContainer = document.getElementById('app-container');
const API_URL = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000/api' : '/api';
let leafletMap = null;
let currentUser = null;

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
        return null;
    }
}

// --- Navigation ---
function navigateTo(route, params = {}) {
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    
    appContainer.innerHTML = views[route] || views.home;
    
    if (route === 'home') initHome();
    if (route === 'search') initSearch(params);
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

        <section style="background: var(--bg-light); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
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
                    <ul>
                        <li><a href="#">Mumbai → Pune</a></li>
                        <li><a href="#">Delhi → Jaipur</a></li>
                        <li><a href="#">Bangalore → Mysore</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>About</h4>
                    <ul>
                        <li><a href="#">How it works</a></li>
                        <li><a href="#">About us</a></li>
                        <li><a href="#">Press</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Support</h4>
                    <ul>
                        <li><a href="#">Help Centre</a></li>
                        <li><a href="#">Safety</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>© 2026 Velora. All rights reserved.</p>
                <div style="display:flex; gap:1.5rem;">
                    <a href="#" style="color:var(--text-muted); text-decoration:none;">Terms</a>
                    <a href="#" style="color:var(--text-muted); text-decoration:none;">Privacy</a>
                </div>
            </div>
        </footer>
    `,
    search: `
        <div class="map-page">
            <div class="sidebar">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h2 style="font-size:1.5rem;">Available Rides</h2>
                    <button class="btn-primary" onclick="navigateTo('home')">Filter</button>
                </div>
                <div id="rides-list">
                    <!-- Loaded dynamically -->
                    <div style="text-align:center; padding:3rem; color:var(--text-muted);">
                        <span class="material-symbols-outlined" style="font-size:3rem; margin-bottom:1rem;">search</span>
                        <p>Searching for best rides...</p>
                    </div>
                </div>
            </div>
            <div class="map-view">
                <div id="leaflet-map"></div>
            </div>
        </div>
    `,
    offer: `
        <div style="max-width: 600px; margin: 100px auto; padding: 2rem;">
            <div class="animate-up" style="background:#fff; padding:3rem; border-radius:var(--radius-lg); border:1px solid var(--border); box-shadow:var(--shadow-md);">
                <h2 style="margin-bottom:2rem;">Offer a Ride</h2>
                <form onsubmit="handleOffer(event)">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
                        <div><label style="display:block; margin-bottom:0.5rem; font-weight:600;">From</label><input type="text" id="o-from" required style="width:100%; padding:0.8rem; border-radius:8px; border:1px solid var(--border);"></div>
                        <div><label style="display:block; margin-bottom:0.5rem; font-weight:600;">To</label><input type="text" id="o-to" required style="width:100%; padding:0.8rem; border-radius:8px; border:1px solid var(--border);"></div>
                    </div>
                    <div style="margin-bottom:1.5rem;"><label style="display:block; margin-bottom:0.5rem; font-weight:600;">Date</label><input type="date" id="o-date" required style="width:100%; padding:0.8rem; border-radius:8px; border:1px solid var(--border);"></div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:2rem;">
                        <div><label style="display:block; margin-bottom:0.5rem; font-weight:600;">Price (₹)</label><input type="number" id="o-price" required style="width:100%; padding:0.8rem; border-radius:8px; border:1px solid var(--border);"></div>
                        <div><label style="display:block; margin-bottom:0.5rem; font-weight:600;">Seats</label><input type="number" id="o-seats" value="3" required style="width:100%; padding:0.8rem; border-radius:8px; border:1px solid var(--border);"></div>
                    </div>
                    <button type="submit" class="btn-primary" style="width:100%; padding:1.2rem; font-size:1.1rem;">Publish Ride</button>
                </form>
            </div>
        </div>
    `,
    login: `
        <div style="max-width: 400px; margin: 120px auto; padding: 2rem; text-align:center;">
            <div class="animate-up" style="background:#fff; padding:3rem; border-radius:var(--radius-lg); border:1px solid var(--border); box-shadow:var(--shadow-md);">
                <h2 style="margin-bottom:1rem;">Welcome to Velora</h2>
                <p style="color:var(--text-muted); margin-bottom:2rem;">Sign in to book your journey</p>
                <form onsubmit="handleLogin(event)">
                    <input type="text" id="l-user" placeholder="Email or Phone" required style="width:100%; padding:1rem; border-radius:8px; border:1px solid var(--border); margin-bottom:1rem;">
                    <input type="password" id="l-pass" placeholder="Password" required style="width:100%; padding:1rem; border-radius:8px; border:1px solid var(--border); margin-bottom:1.5rem;">
                    <button type="submit" class="btn-primary" style="width:100%; padding:1.2rem; font-size:1.1rem;">Sign In</button>
                </form>
                <p style="margin-top:1.5rem; font-size:0.9rem;">Don't have an account? <a href="#" style="color:var(--accent); font-weight:600;">Join now</a></p>
            </div>
        </div>
    `,
    profile: `
        <div style="max-width: 1000px; margin: 100px auto; padding: 2rem;">
            <div class="animate-up" style="display:grid; grid-template-columns: 300px 1fr; gap:3rem;">
                <div style="background:#fff; padding:2rem; border-radius:var(--radius-lg); border:1px solid var(--border); text-align:center; height:fit-content;">
                    <div id="p-avatar" style="width:100px; height:100px; background:var(--bg-light); border-radius:50%; margin:0 auto 1.5rem; display:flex; align-items:center; justify-content:center; font-size:2.5rem;">👤</div>
                    <h3 id="p-name">User Name</h3>
                    <p id="p-phone" style="color:var(--text-muted); margin-bottom:2rem;">+91 0000000000</p>
                    <button class="btn-primary" style="width:100%; background:var(--primary);" onclick="logout()">Logout</button>
                </div>
                <div>
                    <h3 style="margin-bottom:1.5rem;">My Activity</h3>
                    <div id="activity-list">
                        <p style="color:var(--text-muted);">Loading activity...</p>
                    </div>
                </div>
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
        list.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-muted);">No rides found for this route.</div>';
        return;
    }

    rides.forEach(ride => {
        const card = document.createElement('div');
        card.className = 'ride-card animate-up';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                <div style="font-weight:700; color:var(--primary);">${ride.departure || '10:30'}</div>
                <div style="font-weight:700; font-size:1.2rem; color:var(--text-main);">₹${ride.price}</div>
            </div>
            <div style="border-left:2px solid var(--accent); padding-left:1rem; margin-bottom:1rem;">
                <div style="font-weight:600;">${ride.from_loc}</div>
                <div style="margin:0.5rem 0; color:var(--text-muted); font-size:0.8rem;">↓</div>
                <div style="font-weight:600;">${ride.to_loc}</div>
            </div>
            <div style="display:flex; align-items:center; gap:1rem; padding-top:1rem; border-top:1px solid var(--border);">
                <img src="${ride.driver_avatar || 'https://i.pravatar.cc/100?u='+ride.driver_id}" style="width:32px; height:32px; border-radius:50%;">
                <div style="flex:1;">
                    <div style="font-weight:600; font-size:0.9rem;">${ride.driver_name}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">★ 4.8</div>
                </div>
                <div style="font-size:0.8rem; font-weight:600; color:var(--success);">${ride.seats} seats left</div>
            </div>
        `;
        card.onclick = () => bookRide(ride);
        list.appendChild(card);

        if (ride.start_lat && ride.start_lng) {
            L.marker([ride.start_lat, ride.start_lng]).addTo(leafletMap)
             .bindPopup(`<b>${ride.driver_name}</b><br>${ride.from_loc} to ${ride.to_loc}`);
        }
    });
}

async function bookRide(ride) {
    if (!currentUser) { navigateTo('login'); return; }
    if (confirm(`Book 1 seat for ₹${ride.price}?`)) {
        const res = await fetchAPI('/rides/book', {
            method: 'POST',
            body: JSON.stringify({ ride_id: ride.id, user_id: currentUser.id, seats_booked: 1 })
        });
        if (res && res.success) {
            alert('Booking Successful!');
            navigateTo('profile');
        }
    }
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
        departure: '10:30',
        car_name: 'Tesla Model 3',
        car_year: 2024,
        start_lat: 28.6139 + (Math.random() * 0.1),
        start_lng: 77.2090 + (Math.random() * 0.1),
        end_lat: 28.5355 + (Math.random() * 0.1),
        end_lng: 77.3910 + (Math.random() * 0.1)
    };
    const res = await fetchAPI('/rides', { method: 'POST', body: JSON.stringify(rideData) });
    if (res && res.success) {
        alert('Ride Published!');
        navigateTo('home');
    }
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
            navigateTo('home');
        }
    }
}

async function initProfile() {
    document.getElementById('p-name').innerText = currentUser.name;
    document.getElementById('p-phone').innerText = currentUser.phone || currentUser.email;
    
    const activity = await fetchAPI('/user/activity', { method: 'POST', body: JSON.stringify({ user_id: currentUser.id }) });
    const list = document.getElementById('activity-list');
    list.innerHTML = '';
    
    if (!activity || (activity.booked.length === 0 && activity.offered.length === 0)) {
        list.innerHTML = '<p style="color:var(--text-muted);">No recent activity.</p>';
        return;
    }

    [...activity.booked, ...activity.offered].forEach(item => {
        const card = document.createElement('div');
        card.className = 'ride-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <div>
                    <div style="font-weight:700;">${item.from_loc} → ${item.to_loc}</div>
                    <div style="color:var(--text-muted); font-size:0.8rem;">${item.ride_date}</div>
                </div>
                <div style="color:var(--accent); font-weight:700;">${item.price ? '₹'+item.price : 'Published'}</div>
            </div>
        `;
        list.appendChild(card);
    });
}

function logout() {
    currentUser = null;
    localStorage.removeItem('velora_user');
    navigateTo('home');
}

function initHome() {}

// --- Start ---
window.onload = () => {
    const saved = localStorage.getItem('velora_user');
    if (saved) currentUser = JSON.parse(saved);
    navigateTo('home');
};
