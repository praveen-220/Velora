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
        navigateTo('login');
        showToast('Please sign in first');
        return;
    }
    
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
        btn.innerText = 'My Dashboard';
        btn.onclick = () => navigateTo('profile');
    } else {
        btn.innerText = 'Sign In';
        btn.onclick = () => navigateTo('login');
    }
}

// --- Views Logic ---
function initHome() {
    // Basic home logic
}

async function initSearch(params = {}) {
    const list = document.getElementById('rides-list');
    const query = new URLSearchParams(params).toString();
    const rides = await fetchAPI(`/rides?${query}`);
    
    list.innerHTML = rides.length ? '' : '<p style="text-align:center; padding:2rem; color:var(--text-muted);">No rides found for your search. Try different cities or dates.</p>';
    
    rides.forEach(ride => {
        const card = document.createElement('div');
        card.className = 'ride-card animate-up';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                <div style="flex:1;">
                    <b style="font-size:1.2rem;">${ride.from_loc}</b>
                    <p style="font-size:0.8rem; color:var(--text-muted);">${ride.departure}</p>
                </div>
                <div style="text-align:center; padding:0 1rem; color:var(--accent);">→</div>
                <div style="flex:1; text-align:right;">
                    <b style="font-size:1.2rem;">${ride.to_loc}</b>
                    <p style="font-size:0.8rem; color:var(--text-muted);">${ride.ride_date}</p>
                </div>
            </div>
            <div style="display:flex; align-items:center; border-top:1px solid var(--glass-border); padding-top:1rem;">
                <img src="${ride.driver_avatar || 'https://i.pravatar.cc/100?u='+ride.driver_id}" style="width:40px; height:40px; border-radius:50%; margin-right:1rem;">
                <div>
                    <b>${ride.driver_name}</b>
                    <p style="font-size:0.8rem; color:var(--text-muted);">${ride.car_name} • ${ride.seats} seats left</p>
                </div>
                <div style="margin-left:auto; text-align:right;">
                    <b style="font-size:1.4rem; color:var(--accent);">₹${ride.price}</b>
                </div>
            </div>
        `;
        card.onclick = () => confirmBooking(ride);
        list.appendChild(card);
    });
}

async function confirmBooking(ride) {
    if (!currentUser) { navigateTo('login'); return; }
    const seats = prompt(`How many seats for ₹${ride.price} each? (Max ${ride.seats})`, "1");
    if (!seats || isNaN(seats) || seats > ride.seats) return;
    
    try {
        await fetchAPI('/rides/book', {
            method: 'POST',
            body: JSON.stringify({ ride_id: ride.id, user_id: currentUser.id, seats_booked: parseInt(seats) })
        });
        showToast('Booking Confirmed!', 'success');
        navigateTo('profile');
    } catch (e) {}
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
        start_lat: 0, start_lng: 0, end_lat: 0, end_lng: 0 // Mocked coords for now
    };
    
    await fetchAPI('/rides', { method: 'POST', body: JSON.stringify(data) });
    showToast('Ride Published!', 'success');
    navigateTo('home');
}

async function initProfile() {
    const activity = await fetchAPI('/user/activity', { method: 'POST', body: JSON.stringify({ user_id: currentUser.id }) });
    const offeredList = document.getElementById('offered-rides');
    const bookedList = document.getElementById('booked-rides');
    
    document.getElementById('prof-name').innerText = currentUser.name;
    document.getElementById('prof-email').innerText = currentUser.email || currentUser.phone;
    
    offeredList.innerHTML = activity.offered.map(r => `
        <div class="ride-card">
            <b>${r.from_loc} → ${r.to_loc}</b>
            <p>${r.ride_date} at ${r.departure} • ₹${r.price}</p>
        </div>
    `).join('') || '<p>You haven\'t offered any rides yet.</p>';
    
    bookedList.innerHTML = activity.booked.map(r => `
        <div class="ride-card" style="border-left:4px solid var(--accent);">
            <b>${r.from_loc} → ${r.to_loc}</b>
            <p>${r.ride_date} • ${r.seats_booked} seats booked</p>
        </div>
    `).join('') || '<p>You haven\'t booked any rides yet.</p>';
}

// --- Views Content ---
const views = {
    home: `
        <div class="hero-wrapper" style="background-image: url('premium_car_background_1778320751854.png');">
            <div class="hero-overlay" style="background: linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.4) 60%, rgba(255,255,255,0) 100%);"></div>
            <div class="hero-content">
                <div class="hero-text-block animate-up">
                    <span class="badge fare-prime" style="margin-bottom:1rem; display:inline-block;">NEW: Inter-city Travel</span>
                    <h1>Your premium journey<br>starts here.</h1>
                    <p>Experience the most reliable and comfortable carpooling service. Verified drivers, transparent pricing, and unparalleled safety.</p>
                    
                    <div class="booking-widget">
                        <div class="widget-tabs">
                            <button class="tab active">Find a Ride</button>
                            <button class="tab" onclick="navigateTo('offer')">Offer a Ride</button>
                        </div>
                        <div class="input-container">
                            <span class="material-symbols-outlined">radio_button_checked</span>
                            <input type="text" id="s-from" placeholder="Leaving from...">
                        </div>
                        <div class="input-container">
                            <span class="material-symbols-outlined">location_on</span>
                            <input type="text" id="s-to" placeholder="Going to...">
                        </div>
                        <div class="input-container">
                            <span class="material-symbols-outlined">calendar_today</span>
                            <input type="date" id="s-date">
                        </div>
                        <button class="btn-primary" style="width:100%; margin-top:1rem;" onclick="navigateTo('search', {from:document.getElementById('s-from').value, to:document.getElementById('s-to').value, date:document.getElementById('s-date').value})">
                            Search Rides
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <section class="info-section animate-up" style="padding:5rem 2rem; background:var(--bg-main); text-align:center;">
            <h2 style="font-size:2.5rem; margin-bottom:1rem;">Ride with confidence</h2>
            <p style="color:var(--text-muted); max-width:700px; margin:0 auto 4rem;">We prioritize your safety and comfort at every step of the journey.</p>
            
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:3rem; max-width:1200px; margin:0 auto;">
                <div class="info-card">
                    <span class="material-symbols-outlined" style="font-size:3rem; color:var(--accent); margin-bottom:1.5rem;">verified_user</span>
                    <h3>Verified Drivers</h3>
                    <p style="font-size:0.95rem; margin-top:1rem;">Every driver on Velora undergoes a multi-step background and ID verification process.</p>
                </div>
                <div class="info-card">
                    <span class="material-symbols-outlined" style="font-size:3rem; color:var(--accent); margin-bottom:1.5rem;">payments</span>
                    <h3>Fair Pricing</h3>
                    <p style="font-size:0.95rem; margin-top:1rem;">Enjoy predictable, transparent pricing with no hidden fees or surprise surges.</p>
                </div>
                <div class="info-card">
                    <span class="material-symbols-outlined" style="font-size:3rem; color:var(--accent); margin-bottom:1.5rem;">eco</span>
                    <h3>Eco Friendly</h3>
                    <p style="font-size:0.95rem; margin-top:1rem;">Carpooling reduces carbon emissions and helps save the planet, one ride at a time.</p>
                </div>
            </div>
        </section>

        <section style="padding:5rem 2rem; background:var(--bg-light); text-align:center;">
            <div style="max-width:1000px; margin:0 auto; background:var(--primary-gradient); padding:4rem; border-radius:40px; color:#fff;">
                <h2 style="color:#fff; font-size:2.5rem; margin-bottom:1rem;">Ready to hit the road?</h2>
                <p style="color:rgba(255,255,255,0.9); margin-bottom:2.5rem;">Join thousands of travelers who trust Velora for their daily commute.</p>
                <div style="display:flex; justify-content:center; gap:1.5rem;">
                    <button class="btn-primary" style="background:#fff; color:var(--accent);" onclick="navigateTo('login')">Get Started Now</button>
                    <button class="btn-primary-outline" style="border-color:#fff; color:#fff;" onclick="navigateTo('offer')">Publish a Ride</button>
                </div>
            </div>
        </section>
    `,
        <div class="view-section" style="max-width:800px; margin:0 auto; padding-top:120px;">
            <h2 style="margin-bottom:2rem;">Search Results</h2>
            <div id="rides-list"></div>
        </div>
    `,
    offer: `
        <div class="view-section" style="max-width:600px; margin:0 auto; padding-top:120px;">
            <div class="form-card" style="margin:0; width:100%; max-width:100%;">
                <h2>Offer a Ride</h2>
                <form onsubmit="handlePublishRide(event)">
                    <div class="form-group"><label>Leaving from</label><input type="text" id="off-from" required></div>
                    <div class="form-group"><label>Going to</label><input type="text" id="off-to" required></div>
                    <div class="form-group"><label>Date</label><input type="date" id="off-date" required></div>
                    <div class="form-group"><label>Time</label><input type="time" id="off-time" required></div>
                    <div class="form-group"><label>Car</label><select id="offer-car"></select></div>
                    <div class="form-group"><label>Price per seat (₹)</label><input type="number" id="off-price" required></div>
                    <div class="form-group"><label>Available Seats</label><input type="number" id="off-seats" value="3" required></div>
                    <button type="submit" class="btn-primary" style="width:100%;">Publish Ride</button>
                </form>
            </div>
        </div>
    `,
    profile: `
        <div class="view-section" style="max-width:1000px; margin:0 auto; padding-top:120px;">
            <div style="display:grid; grid-template-columns: 300px 1fr; gap:3rem;">
                <div>
                    <div class="form-card" style="margin:0; text-align:center; padding:2rem;">
                        <div class="avatar" style="width:100px; height:100px; margin:0 auto 1.5rem; font-size:2.5rem;">👤</div>
                        <h3 id="prof-name">User Name</h3>
                        <p id="prof-email" style="font-size:0.9rem; color:var(--text-muted); margin-bottom:2rem;"></p>
                        <button class="btn-primary-outline" onclick="logout()" style="width:100%;">Logout</button>
                    </div>
                </div>
                <div>
                    <h3 style="margin-bottom:1.5rem;">My Booked Rides</h3>
                    <div id="booked-rides" style="margin-bottom:3rem;"></div>
                    <h3 style="margin-bottom:1.5rem;">My Offered Rides</h3>
                    <div id="offered-rides"></div>
                </div>
            </div>
        </div>
    `,
    login: `
        <div class="view-section" style="padding-top:120px;">
            <div class="form-card animate-up">
                <h2 id="auth-title">Welcome</h2>
                <form onsubmit="handleAuth(event)">
                    <div class="form-group" id="name-group" style="display:none;"><label>Full Name</label><input type="text" id="auth-name"></div>
                    <div class="form-group"><label>Email or Phone</label><input type="text" id="auth-identifier" required></div>
                    <div class="form-group"><label>Password</label><input type="password" id="auth-pass" required></div>
                    <button type="submit" class="btn-primary" style="width:100%;" id="auth-btn">Continue</button>
                </form>
                <p style="text-align:center; margin-top:1rem; font-size:0.9rem;"><a href="#" onclick="toggleAuthMode()" id="auth-toggle">Create account</a></p>
            </div>
        </div>
    `
};

// --- Auth Utils ---
function toggleAuthMode() {
    const isLogin = document.getElementById('auth-title').innerText === 'Welcome';
    document.getElementById('auth-title').innerText = isLogin ? 'Create Account' : 'Welcome';
    document.getElementById('name-group').style.display = isLogin ? 'block' : 'none';
    document.getElementById('auth-toggle').innerText = isLogin ? 'Sign in instead' : 'Create account';
}

async function handleAuth(e) {
    e.preventDefault();
    const isReg = document.getElementById('auth-title').innerText === 'Create Account';
    const body = {
        identifier: document.getElementById('auth-identifier').value,
        password: document.getElementById('auth-pass').value,
        name: document.getElementById('auth-name')?.value
    };
    const res = await fetchAPI(isReg ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(body) });
    if (res.requires_otp) {
        const otp = prompt(`Enter OTP (MOCK: ${res.otp_fallback})`);
        if (otp) {
            const final = await fetchAPI('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ identifier: res.identifier, otp }) });
            currentUser = final.user;
            localStorage.setItem('velora_user', JSON.stringify(currentUser));
            navigateTo('home');
        }
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('velora_user');
    navigateTo('home');
}

window.onload = () => {
    const saved = localStorage.getItem('velora_user');
    if (saved) currentUser = JSON.parse(saved);
    navigateTo('home');
};
