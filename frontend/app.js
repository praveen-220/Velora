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
    toast.style = `position:fixed; bottom:2rem; left:50%; transform:translateX(-50%); background:${type === 'error' ? '#FC8181' : '#00C6FF'}; color:#fff; padding:1rem 2.5rem; border-radius:50px; z-index:9999; box-shadow:0 10px 40px rgba(0,0,0,0.5); font-weight:700; font-size:0.9rem; animation:fadeInUp 0.3s ease; transition:0.3s;`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// --- Router ---
function navigateTo(route, params = {}) {
    if (activeTrackingInterval) { clearInterval(activeTrackingInterval); activeTrackingInterval = null; }
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    
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
        if (currentUser.role === 'admin') {
            btn.innerText = 'Admin Dashboard';
            btn.onclick = () => navigateTo('admin');
        } else {
            btn.innerText = currentUser.name.split(' ')[0];
            btn.onclick = () => navigateTo(currentUser.role || 'rider');
        }
    } else {
        btn.innerText = 'Sign In';
        btn.onclick = () => navigateTo('login');
    }
}


// --- Views ---
const views = {
    home: `
        <div class="hero-wrapper">
            <div class="hero-glow"></div>
            <div class="hero-content">
                <div class="hero-text animate-up">
                    <h1>Your Ride.<br>Your Journey.</h1>
                    <p>Experience the future of mobility with Veora. Premium dark UI, fast, and safe.</p>
                    <div style="display:flex; gap:1.5rem;">
                        <button class="btn-veora" onclick="navigateTo('rider')">Book a Ride</button>
                        <button class="btn-veora" style="background:rgba(255,255,255,0.05); border:1px solid var(--border-glass);" onclick="navigateTo('login')">Become a Driver</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    login: `
        <div class="hero-wrapper">
            <div class="hero-glow"></div>
            <div class="glass-card animate-up" style="max-width:450px; margin:0 auto; width:100%;">
                <h2 id="auth-title" style="margin-bottom:2rem; text-align:center;">Welcome Back</h2>
                <form onsubmit="handleAuth(event)">
                    <div id="reg-fields" style="display:none;">
                        <div class="input-group"><span class="material-symbols-outlined">person</span><input type="text" id="auth-name" placeholder="Full Name"></div>
                        <div class="input-group">
                            <span class="material-symbols-outlined">badge</span>
                            <select id="auth-role" style="background:transparent; border:none; color:#fff; width:100%; outline:none;">
                                <option value="rider" style="color:#000;">Rider</option>
                                <option value="driver" style="color:#000;">Driver</option>
                                <option value="admin" style="color:#000;">Admin (Management)</option>
                            </select>
                        </div>
                    </div>
                    <div class="input-group"><span class="material-symbols-outlined">mail</span><input type="text" id="auth-id" placeholder="Email or Phone"></div>
                    <div class="input-group"><span class="material-symbols-outlined">lock</span><input type="password" id="auth-pass" placeholder="Password"></div>
                    <button class="btn-veora" style="width:100%; margin-top:1rem;" id="auth-btn">Sign In</button>
                </form>
                <p style="text-align:center; margin-top:2rem; color:var(--text-secondary);" id="auth-toggle-p">New to Veora? <a href="#" onclick="toggleAuth(event)" style="color:var(--accent-blue);">Join now</a></p>
            </div>
        </div>
    `,
    admin: `
        <div class="dash-container">
            <aside class="dash-sidebar">
                <h2 style="margin-bottom:2rem;">Veora Admin</h2>
                <a href="#" class="side-link active"><span class="material-symbols-outlined">settings</span> Controls</a>
                <a href="#" class="side-link"><span class="material-symbols-outlined">group</span> User Management</a>
            </aside>
            <main class="dash-main">
                <h2 style="margin-bottom:2rem;">Platform Controls</h2>
                <div class="stats-grid">
                    <div class="glass-card">
                        <span class="stat-label">Price Control</span>
                        <div style="margin:1.5rem 0;">
                            <label>Surge Multiplier: <b id="surge-val">1.0x</b></label>
                            <input type="range" min="1" max="5" step="0.1" value="1" style="width:100%; margin-top:1rem;" id="surge-slider" oninput="updatePriceControl()">
                        </div>
                        <button class="btn-veora" style="width:100%;" onclick="saveAdminSettings()">Apply Surge</button>
                    </div>
                    <div class="glass-card">
                        <span class="stat-label">System Status</span>
                        <div style="margin-top:1rem; display:flex; align-items:center; gap:1rem;">
                            <div class="pulse" style="width:12px; height:12px; background:var(--success); border-radius:50%;"></div>
                            <b>All Systems Online</b>
                        </div>
                    </div>
                </div>
                <div class="glass-card" style="margin-top:2rem;">
                    <h3>All Users</h3>
                    <div id="admin-user-list" style="margin-top:1.5rem;"></div>
                </div>
            </main>
        </div>
    `,
    rider: `
        <div class="dash-container">
            <aside class="dash-sidebar">
                <h2 style="margin-bottom:2rem;">Rider Console</h2>
                <a href="#" class="side-link active"><span class="material-symbols-outlined">local_taxi</span> Book Ride</a>
            </aside>
            <main class="dash-main">
                <div style="display:grid; grid-template-columns:1fr 1.2fr; gap:3rem;">
                    <div class="glass-card">
                        <div class="input-group"><span class="material-symbols-outlined">near_me</span><input type="text" id="r-from" placeholder="Pickup"></div>
                        <div class="input-group"><span class="material-symbols-outlined">place</span><input type="text" id="r-to" placeholder="Destination"></div>
                        <button class="btn-veora" style="width:100%;" onclick="findVeoraRides()">Estimate Fare</button>
                        <div id="rides-list" style="margin-top:2rem;"></div>
                    </div>
                    <div class="glass-card" style="padding:0; overflow:hidden; height:500px;"><div id="leaflet-map" style="height:100%;"></div></div>
                </div>
            </main>
        </div>
    `
};

// --- Auth Logic ---
function toggleAuth(e) {
    e.preventDefault();
    const isLogin = document.getElementById('auth-title').innerText === 'Welcome Back';
    document.getElementById('auth-title').innerText = isLogin ? 'Create Account' : 'Welcome Back';
    document.getElementById('auth-btn').innerText = isLogin ? 'Register' : 'Sign In';
    document.getElementById('reg-fields').style.display = isLogin ? 'block' : 'none';
}

async function handleAuth(e) {
    e.preventDefault();
    const isReg = document.getElementById('auth-title').innerText === 'Create Account';
    const body = { identifier: document.getElementById('auth-id').value, password: document.getElementById('auth-pass').value };
    if (isReg) {
        body.name = document.getElementById('auth-name').value;
        body.role = document.getElementById('auth-role').value;
    }
    const res = await fetchAPI(isReg ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(body) });
    if (res && res.requires_otp) {
        const otp = prompt(`Enter OTP: ${res.otp_fallback}`);
        const vres = await fetchAPI('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ identifier: body.identifier, otp }) });
        if (vres && vres.user) {
            currentUser = vres.user;
            localStorage.setItem('veora_user', JSON.stringify(currentUser));
            navigateTo(currentUser.role);
        }
    }
}

// --- Admin Logic ---
async function initAdmin() {
    const settings = await fetchAPI('/admin/settings');
    if (settings) {
        document.getElementById('surge-slider').value = settings.surge_multiplier;
        document.getElementById('surge-val').innerText = settings.surge_multiplier + 'x';
    }
    const users = await fetchAPI('/admin/users');
    const list = document.getElementById('admin-user-list');
    list.innerHTML = users.map(u => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem; border-bottom:1px solid var(--border-glass);">
            <span>${u.name} (<b>${u.role}</b>) ${u.is_driver_verified ? '✅' : ''}</span>
            <div style="display:flex; align-items:center; gap:1rem;">
                <span style="color:var(--text-secondary); font-size:0.8rem;">${u.email || u.phone}</span>
                ${u.role === 'driver' && !u.is_driver_verified ? `<button class="btn-veora" style="padding:0.4rem 0.8rem; font-size:0.6rem;" onclick="verifyDriver(${u.id})">Verify</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function verifyDriver(userId) {
    await fetchAPI('/admin/verify-driver', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
    showToast('Driver verified successfully!', 'success');
    initAdmin();
}


function updatePriceControl() {
    document.getElementById('surge-val').innerText = document.getElementById('surge-slider').value + 'x';
}

async function saveAdminSettings() {
    const surge = document.getElementById('surge-slider').value;
    await fetchAPI('/admin/settings', { method: 'POST', body: JSON.stringify({ surge_multiplier: surge }) });
    showToast('Surge applied globally!', 'success');
}

// --- Rider Logic ---
async function initRider() {
    const mapEl = document.getElementById('leaflet-map');
    leafletMap = L.map(mapEl).setView([28.6139, 77.2090], 12);
    L.tileLayer('https://{s}.tile.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(leafletMap);
}

async function findVeoraRides() {
    const rides = await fetchAPI('/rides');
    const settings = await fetchAPI('/admin/settings');
    const surge = parseFloat(settings.surge_multiplier || 1.0);
    
    const list = document.getElementById('rides-list');
    list.innerHTML = rides.map(r => `
        <div class="ride-card-veora animate-up">
            <div style="display:flex; justify-content:space-between;">
                <b>${r.car_name}</b>
                <b style="color:var(--accent-blue);">₹${Math.round(r.price * surge)}</b>
            </div>
            <small style="color:var(--warning);">${surge > 1 ? '🔥 Surge pricing active' : ''}</small>
        </div>
    `).join('');
}

window.onload = () => {
    const saved = localStorage.getItem('veora_user');
    if (saved) currentUser = JSON.parse(saved);
    navigateTo('home');
};
