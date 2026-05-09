const appContainer = document.getElementById('app-container');
const API_URL = 'http://127.0.0.1:5000/api';
let leafletMap = null;
let markers = [];
let currentUser = null;
let offerCarPhoto = "";
let suggestTimeout = null;

// --- Helpers ---
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function debouncedSuggest(query, listId) {
    if(!query || query.length < 3) return;
    clearTimeout(suggestTimeout);
    suggestTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
            const data = await res.json();
            const list = document.getElementById(listId);
            if(list) {
                list.innerHTML = data.map(item => `<option value="${item.display_name}">`).join('');
            }
            if(listId.includes('offer')) checkPriceEstimate();
        } catch(e) { }
    }, 400);
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            offerCarPhoto = e.target.result;
            const preview = document.getElementById('photo-preview');
            if (preview) preview.innerHTML = `<img src="${offerCarPhoto}" style="width:100%; height:120px; object-fit:cover; border-radius:12px; margin-top:0.5rem;">`;
        };
        reader.readAsDataURL(file);
    }
}

async function getAddressFromCoords(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        return data.display_name || "Unknown Location";
    } catch(e) { return "Selected Location"; }
}

async function handleMapClick(e) {
    const { lat, lng } = e.latlng;
    const address = await getAddressFromCoords(lat, lng);
    
    // Determine which field to fill
    const pickup = document.getElementById('pickup');
    const dropoff = document.getElementById('dropoff');
    const offerFrom = document.getElementById('offer-from');
    const offerTo = document.getElementById('offer-to');

    // Simple heuristic: if pickup is empty or focused, fill pickup. Else if dropoff is empty/focused...
    if (document.activeElement === pickup || (!pickup?.value && pickup)) {
        pickup.value = address;
        if(window.pMarker) leafletMap.removeLayer(window.pMarker);
        window.pMarker = L.marker([lat, lng], {icon: L.divIcon({className:'map-pin', html:'<span class="material-symbols-outlined" style="color:#00e5ff">radio_button_checked</span>'})}).addTo(leafletMap);
    } else if (document.activeElement === dropoff || (!dropoff?.value && dropoff)) {
        dropoff.value = address;
        if(window.dMarker) leafletMap.removeLayer(window.dMarker);
        window.dMarker = L.marker([lat, lng], {icon: L.divIcon({className:'map-pin', html:'<span class="material-symbols-outlined" style="color:#ff3d00">location_on</span>'})}).addTo(leafletMap);
    } else if (document.activeElement === offerFrom || (!offerFrom?.value && offerFrom)) {
        offerFrom.value = address;
        checkPriceEstimate();
    } else if (document.activeElement === offerTo || (!offerTo?.value && offerTo)) {
        offerTo.value = address;
        checkPriceEstimate();
    }
}

async function checkPriceEstimate() {
    const from = document.getElementById('offer-from')?.value;
    const to = document.getElementById('offer-to')?.value;
    const years = document.getElementById('offer-used-years')?.value;
    const rideType = document.getElementById('offer-ride-type')?.value || 'Go';
    const display = document.getElementById('price-estimate-display');

    if(!from || !to || !years || !currentUser) return;

    try {
        const fromRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(from)}&format=json&limit=1`);
        const toRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(to)}&format=json&limit=1`);
        const fData = await fromRes.json();
        const tData = await toRes.json();

        if(fData[0] && tData[0]) {
            const res = await fetch(`${API_URL}/rides/estimate`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    start_lat: fData[0].lat, start_lng: fData[0].lon,
                    end_lat: tData[0].lat, end_lng: tData[0].lon,
                    driver_id: currentUser.id,
                    car_used_years: years,
                    ride_type: rideType
                })
            });
            const d = await res.json();
            if(d.success) {
                display.innerHTML = `<div class="estimated-price-tag">Estimated: ₹${d.estimated_price} / seat [${rideType}]</div>`;
                window.currentEstimatedPrice = d.estimated_price;
            }
        }
    } catch(e){}
}

// --- Views ---
const views = {
    home: `
        <div class="hero-wrapper">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <div class="hero-text-block">
                    <section class="view-section">
                        <h1>Go anywhere.<br>With Velora.</h1>
                        <p>Premium ride-sharing with real-time tracking, verified drivers, and transparent pricing. Travel safe, travel together.</p>
                        
                        <div class="booking-widget">
                            <div class="hero-actions" style="margin-top:2rem; display:flex; flex-direction:column; align-items:center; gap:1rem;">
                <button class="btn-primary" onclick="navigateTo('login')">Get Started</button>
                <a href="#" onclick="navigateTo('devLogin')" style="color:var(--accent); font-size:0.8rem; text-decoration:none; opacity:0.7; letter-spacing:1px;">DEVELOPER CORE ACCESS</a>
            </div>
                            <div class="widget-tabs">
                                <button class="tab active" onclick="navigateTo('home')">Find a Ride</button>
                                <button class="tab" onclick="navigateTo('offer')">Offer a Ride</button>
                            </div>
                            <div class="input-container">
                                <span class="material-symbols-outlined">radio_button_checked</span>
                                <input type="text" id="pickup" placeholder="Pickup location (or click map)" list="p-list" oninput="debouncedSuggest(this.value, 'p-list')">
                                <datalist id="p-list"></datalist>
                            </div>
                            <div class="input-container">
                                <span class="material-symbols-outlined">location_on</span>
                                <input type="text" id="dropoff" placeholder="Drop-off location (or click map)" list="d-list" oninput="debouncedSuggest(this.value, 'd-list')">
                                <datalist id="d-list"></datalist>
                            </div>
                            <div class="category-grid" style="display:flex; gap:0.5rem; margin-top:1rem;">
                                <div class="cat-item active" onclick="selectCat(this, 'Go')">🚗 Go</div>
                                <div class="cat-item" onclick="selectCat(this, 'Prime')">✨ Prime</div>
                                <div class="cat-item" onclick="selectCat(this, 'XL')">🚐 XL</div>
                            </div>
                            <button class="btn-primary" style="width:100%; margin-top:1rem;" onclick="searchRides()">Search Rides</button>
                        </div>
                    </section>
                </div>
                
                <div class="hero-image-block">
                    <!-- Tracking Card -->
                    <div class="tracking-card">
                        <div class="track-line">
                            <div class="track-point">
                                <small style="display:block; color:var(--text-muted);">Start</small>
                                <b>Indie Park</b>
                            </div>
                            <div class="track-point" style="margin-bottom:0.5rem;">
                                <small style="display:block; color:var(--text-muted);">End</small>
                                <b>Tech City</b>
                            </div>
                        </div>
                        <div class="driver-mini">
                            <img src="https://i.pravatar.cc/100?u=velora" class="driver-img">
                            <div>
                                <b style="display:block;">Alex Rivera</b>
                                <small style="color:var(--text-muted);">Tesla Model S • 4.9⭐</small>
                            </div>
                        </div>
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
    login: `
        <section class="view-section">
            <div class="form-card">
                <h2 id="auth-title">Welcome Back</h2>
                <form id="auth-form" onsubmit="handleAuth(event)">
                    <div class="form-group" id="name-group" style="display:none;">
                        <label>Full Name</label>
                        <input type="text" id="auth-name" placeholder="John Doe">
                    </div>
                    <div class="form-group">
                        <label>Email or Phone Number</label>
                        <input type="text" id="auth-identifier" required placeholder="name@example.com or +91...">
                    </div>
                    <div class="form-group" id="aadhaar-group" style="display:none;">
                        <label>Aadhaar Number (12 Digits)</label>
                        <input type="text" id="auth-aadhaar" placeholder="1234 5678 9012">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="auth-pass" required placeholder="••••••••">
                    </div>
                    <button type="submit" class="btn-primary" style="width:100%" id="auth-btn">Sign In</button>
                    <p class="auth-redirect">
                        <a href="#" onclick="toggleAuthMode()" id="auth-toggle">New to Velora? Create account</a>
                    </p>
                </form>
                <div style="text-align:center; margin-top:1.5rem;">
                    <button class="btn-primary-outline" style="border:none; font-size:0.8rem; opacity:0.6;" onclick="navigateTo('devLogin')">Developer Portal</button>
                </div>
            </div>
        </section>
    `,
    devLogin: `
        <section class="view-section">
            <div class="form-card" style="border: 2px solid var(--accent); max-width: 500px;">
                <h2 id="dev-auth-title">Developer Portal</h2>
                <p id="dev-auth-desc" style="margin-bottom:2rem;">System Access & Monitoring</p>
                <form onsubmit="handleDevAuth(event)">
                    <div class="form-group" id="dev-name-group" style="display:none;">
                        <label>Full Name</label>
                        <input type="text" id="dev-name" placeholder="Dev Name">
                    </div>
                    <div class="form-group">
                        <label>Email or Phone</label>
                        <input type="text" id="dev-identifier" required placeholder="dev@velora.com or +91...">
                    </div>
                    <div class="form-group" id="dev-aadhaar-group" style="display:none;">
                        <label>Aadhaar Number</label>
                        <input type="text" id="dev-aadhaar" placeholder="1234 5678 9012">
                    </div>
                    <div class="form-group">
                        <label>Master Key / Password</label>
                        <input type="password" id="dev-pass" required placeholder="••••••••">
                    </div>
                    <button type="submit" class="btn-primary" style="width:100%" id="dev-auth-btn">System Entry</button>
                    <p style="text-align:center; margin-top:1.5rem; font-size:0.9rem;">
                        <a href="#" onclick="toggleDevAuthMode()" id="dev-auth-toggle">New Developer? Create access</a>
                    </p>
                </form>
            </div>
        </section>
    `,
    devDashboard: `
        <div class="dev-container">
            <aside class="dev-sidebar">
                <div class="dev-logo">VELORA HQ COMMAND</div>
                <nav class="dev-nav">
                    <div class="dev-nav-item active" onclick="switchDevTab('ops', this)">
                        <span class="material-symbols-outlined">satellite_alt</span> Operations
                    </div>
                    <div class="dev-nav-item" onclick="switchDevTab('analytics', this)">
                        <span class="material-symbols-outlined">monitoring</span> Analytics
                    </div>
                    <div class="dev-nav-item" onclick="switchDevTab('approvals', this)">
                        <span class="material-symbols-outlined">rule</span> Approvals
                    </div>
                    <div class="dev-nav-item" onclick="switchDevTab('config', this)">
                        <span class="material-symbols-outlined">settings_input_component</span> Pricing
                    </div>
                    <div class="dev-nav-item" onclick="switchDevTab('vault', this)">
                        <span class="material-symbols-outlined">lock</span> Vault
                    </div>
                    <div class="dev-nav-item" onclick="switchDevTab('users', this)">
                        <span class="material-symbols-outlined">group</span> Governance
                    </div>
                </nav>
                <div class="dev-terminal-min" onclick="toggleTerminal()">
                    <span class="material-symbols-outlined">terminal</span> God Console
                </div>
                <button class="btn-primary-outline" style="margin-top:auto; width:100%; border-color:rgba(255,255,255,0.1); color:rgba(255,255,255,0.5);" onclick="handleLogout()">Logout System</button>
            </aside>
            <main class="dev-main">
                <header class="dev-header">
                    <div>
                        <h2 id="dev-tab-title">Global Operations</h2>
                        <div id="ops-controls" style="margin-top:0.5rem; display:none;">
                            <button class="btn-primary-outline" id="heatmap-toggle" style="padding:0.3rem 0.8rem; font-size:0.7rem; border-color:var(--accent); color:var(--accent);" onclick="toggleHeatmap()">Activate Thermal Heatmap</button>
                        </div>
                    </div>
                    <div class="dev-header-actions">
                        <div class="dev-status">
                            <span class="pulse-dot"></span> LIVE SYSTEM
                        </div>
                        <button class="killswitch" onclick="toggleKillswitch()">
                            <span class="material-symbols-outlined">emergency_home</span> Platform Shutdown
                        </button>
                    </div>
                </header>

                <!-- TAB: OPS (Satellite Tracking) -->
                <div id="tab-ops" class="dev-tab-content active">
                    <div class="dev-stats-grid">
                        <div class="dev-stat-card glow-blue">
                            <small>SATELLITE LINKS</small>
                            <h3>Active Tracking</h3>
                        </div>
                        <div class="dev-stat-card">
                            <small>ACTIVE SESSIONS</small>
                            <h2 id="stat-active">0</h2>
                        </div>
                        <div class="dev-stat-card glow-green">
                            <small>SYSTEM STABILITY</small>
                            <h2>99.9%</h2>
                        </div>
                    </div>
                    <div class="dev-panel" style="margin-top:2rem; padding:0; overflow:hidden;">
                        <div id="leaflet-map" style="height:450px;"></div>
                    </div>
                    <div class="dev-panel" style="margin-top:2rem;">
                        <h3>Active Fleet Sessions</h3>
                        <div id="dev-rides-list"></div>
                    </div>
                </div>

                <!-- TAB: ANALYTICS (Chart.js) -->
                <div id="tab-analytics" class="dev-tab-content">
                    <div class="dev-stats-grid">
                        <div class="dev-stat-card">
                            <small>TOTAL REVENUE</small>
                            <h2 id="stat-revenue">₹0</h2>
                        </div>
                        <div class="dev-stat-card">
                            <small>AVG OCCUPANCY</small>
                            <h2>82%</h2>
                        </div>
                        <div class="dev-stat-card">
                            <small>GROWTH INDEX</small>
                            <h2 style="color:#4ade80;">+12.4%</h2>
                        </div>
                    </div>
                    <div class="dev-panel" style="margin-top:2rem;">
                        <h3>Revenue Distribution</h3>
                        <canvas id="revChart" style="max-height:300px;"></canvas>
                    </div>
                    <div class="dev-panel" style="margin-top:2rem;">
                        <h3>Growth Trends</h3>
                        <canvas id="growthChart" style="max-height:300px;"></canvas>
                    </div>
                </div>

                <!-- TAB: APPROVALS (Verification Queue) -->
                <div id="tab-approvals" class="dev-tab-content">
                        <h3>Driver Authorizations</h3>
                        <div id="pending-drivers-list" class="dev-list" style="margin-bottom:3rem;"></div>
                        
                        <h3>Developer Certifications</h3>
                        <div id="pending-devs-list" class="dev-list"></div>
                    </div>
                </div>

                <!-- TAB: CONFIG (Pricing Engine) -->
                <div id="tab-config" class="dev-tab-content">
                    <div class="dev-panel god-panel">
                        <h3>God Mode: Pricing Engine</h3>
                        <div class="input-group-row">
                            <div class="form-group" style="flex:1;">
                                <label>Base Global Rate (₹/KM)</label>
                                <input type="number" id="cfg-base" step="0.5">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Surge Multiplier (x)</label>
                                <input type="number" id="cfg-surge" step="0.1">
                            </div>
                        </div>
                        <button class="btn-primary glow-btn" onclick="updateSysConfig()">Sync Global Parameters</button>
                    </div>
                    <div class="dev-panel" style="margin-top:2rem;">
                        <h3>Category Specifics</h3>
                        <div class="input-group-row">
                            <div class="form-group" style="flex:1;">
                                <label>Go Multiplier</label>
                                <input type="number" id="cfg-go-mult" step="0.1">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Prime Multiplier</label>
                                <input type="number" id="cfg-prime-mult" step="0.1">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>XL Multiplier</label>
                                <input type="number" id="cfg-xl-mult" step="0.1">
                            </div>
                        </div>
                        <button class="btn-primary" onclick="updateTierMultipliers()">Update Tiers</button>
                    </div>
                    <div class="dev-panel" style="margin-top:2rem;">
                        <h3>Fleet Expansion: Add Vehicle Model</h3>
                        <div class="form-group">
                            <label>Model Name (e.g. Toyota Fortuner)</label>
                            <input type="text" id="new-car-model" placeholder="Enter vehicle name">
                        </div>
                        <button class="btn-primary" onclick="addCarModel()">Add to Global Fleet</button>
                    </div>
                </div>

                <!-- TAB: VAULT (Coupons) -->
                <div id="tab-vault" class="dev-tab-content">
                    <div class="dev-panel">
                        <h3>Promo Vault</h3>
                        <div class="input-group-row">
                            <div class="form-group" style="flex:2;">
                                <label>Safe Code</label>
                                <input type="text" id="cpn-code" placeholder="SAFE_VELORA">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Discount %</label>
                                <input type="number" id="cpn-discount" value="20">
                            </div>
                        </div>
                        <button class="btn-primary" onclick="addCoupon()">Inject Coupon</button>
                    </div>
                    <div id="dev-coupons-list" class="dev-list" style="margin-top:2rem;"></div>
                </div>

                <!-- TAB: USERS (Governance) -->
                <div id="tab-users" class="dev-tab-content">
                    <div class="dev-panel">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                            <h3>Platform Citizen Governance</h3>
                            <input type="text" id="user-search" placeholder="Search by name/email..." oninput="renderDevUsers()" style="max-width:300px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:0.6rem 1rem; border-radius:12px;">
                        </div>
                        <div id="dev-users-list" class="dev-list"></div>
                    </div>
                </div>
            </main>

            <!-- God Console Modal -->
            <div id="terminal-modal" class="terminal-overlay" style="display:none;">
                <div class="terminal-box">
                    <div class="terminal-header">GOD CONSOLE v4.2</div>
                    <div id="terminal-output" class="terminal-content">
                        Velora System Initialized...<br>
                        Ready for instructions.<br>
                        Type 'help' for commands.
                    </div>
                    <div class="terminal-input-line">
                        <span>></span> <input type="text" id="term-input" onkeydown="handleTermCommand(event)" autofocus>
                    </div>
                </div>
            </div>
        </div>
    `,
    profile: `
        <section class="view-section">
            <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 350px 1fr; gap:3rem;">
                <div class="form-card" style="margin:0; text-align:center;">
                    <div class="avatar" id="perf-avatar" style="width:120px; height:120px; margin:0 auto 1.5rem; font-size:3rem;"></div>
                    <h2 id="perf-name"></h2>
                    <p id="perf-email" style="margin-bottom:2rem;"></p>
                    <div style="text-align:left; background:var(--bg-light); padding:1.5rem; border-radius:20px; margin-bottom:1.5rem; border:1px solid var(--glass-border);">
                        <p>⭐ <b>Driver:</b> <span id="perf-d-rating">5.0</span></p>
                        <p>⭐ <b>User:</b> <span id="perf-u-rating">5.0</span></p>
                        <p id="perf-v-status" style="margin-top:0.8rem; font-size:0.9rem; font-weight:600;"></p>
                    </div>
                    <button class="btn-primary" id="v-btn" style="width:100%; margin-bottom:1rem; display:none;" onclick="verifyDriver()">Verify Driver ID</button>
                    <button class="btn-primary-outline" onclick="handleLogout()" style="width:100%;">Sign Out</button>
                </div>
                <div id="my-rides-container">
                    <h1 style="margin-bottom:2rem;">My Activity</h1>
                    <div id="managed-rides-list"></div>
                </div>
            </div>
        </section>
    `,
    offer: `
        <section class="view-section">
            <div style="max-width: 800px; margin: 0 auto;">
                <div class="form-card" style="margin: 0; max-width: 100%;">
                    <h1 style="margin-bottom:2rem;">Offer a Ride</h1>
                    <form onsubmit="handlePublishRide(event)">
                        <div class="input-group-row">
                            <div class="form-group" style="flex:1;">
                                <label>From</label>
                                <input type="text" id="offer-from" required placeholder="City name" oninput="debouncedSuggest(this.value, 'f-list')" list="f-list">
                                <datalist id="f-list"></datalist>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>To</label>
                                <input type="text" id="offer-to" required placeholder="Destination" oninput="debouncedSuggest(this.value, 't-list')" list="t-list">
                                <datalist id="t-list"></datalist>
                            </div>
                        </div>
                        <div class="input-group-row">
                            <div class="form-group" style="flex:1;">
                                <label>Car Model</label>
                                <select id="offer-car" required>
                                    <option value="">Loading cars...</option>
                                </select>
                            </div>
                        </div>
                        <div class="input-group-row">
                            <div class="form-group" style="flex:1;">
                                <label>Ride Category</label>
                                <select id="offer-ride-type" onchange="checkPriceEstimate()">
                                    <option value="Go">Velora Go (Standard)</option>
                                    <option value="Prime">Velora Prime (Premium)</option>
                                    <option value="XL">Velora XL (Group/Large)</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Car Age (Years Used)</label>
                                <input type="number" id="offer-used-years" required placeholder="3" step="1" oninput="checkPriceEstimate()">
                            </div>
                        </div>
                        <div class="input-group-row">
                            <div class="form-group" style="flex:1;">
                                <label>Date</label>
                                <input type="date" id="offer-date" required>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Departure Time</label>
                                <input type="time" id="offer-time" required>
                            </div>
                        </div>
                        <div class="input-group-row" style="align-items:center;">
                            <div class="form-group" style="flex:2;">
                                <label>Available Seats</label>
                                <input type="number" id="offer-seats" required value="4" min="1" max="7">
                            </div>
                            <div class="form-group" style="flex:3;">
                               <label>Vehicle Photo</label>
                               <input type="file" onchange="handlePhotoUpload(event)" accept="image/*">
                            </div>
                        </div>
                        <div id="photo-preview"></div>
                        <div id="price-estimate-display" style="text-align:center; margin-top:1rem;"></div>
                        <button type="submit" class="btn-primary" style="width:100%; margin-top:2rem;">Publish Ride</button>
                    </form>
                </div>
            </div>
        </section>
    `,
    tracking: `
        <div class="map-container">
            <button class="sos-btn" onclick="alert('EMERGENCY SIGNAL SENT! Police and Emergency Services notified with your location.')">
                <span class="material-symbols-outlined">sos</span> EMERGENCY SOS
            </button>
            <div id="leaflet-map" style="position:relative;">
                <div class="tracking-overlay">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <div>
                            <h3 id="track-status">Your driver is on the way</h3>
                            <p id="track-eta" style="color:var(--text-muted);">Arriving in -- mins</p>
                        </div>
                        <div id="track-price" style="font-weight:700; font-size:1.5rem;">₹--</div>
                    </div>
                    <div id="track-driver-info" style="display:flex; align-items:center; gap:1rem; border-top:1px solid #eee; padding-top:1rem;">
                        <img src="https://i.pravatar.cc/100?u=driver" style="width:50px; height:50px; border-radius:50%;">
                        <div>
                            <b id="track-driver-name">Driver</b>
                            <p id="track-car-info" style="font-size:0.8rem; color:var(--text-muted);">Vehicle Info</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    auth: "" // Will be assigned below as alias
};
views.auth = views.login;

async function applyPromo(basePrice) {
    const code = document.getElementById('promo-code').value;
    const msg = document.getElementById('promo-msg');
    const totalVal = document.getElementById('total-val');
    const seats = document.getElementById('pay-seats').value;
    
    if(!code) return;

    try {
        const res = await fetch(`${API_URL}/coupons/verify`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ code })
        });
        const d = await res.json();
        
        if(d.success) {
            const discountPercent = d.discount / 100;
            const originalTotal = basePrice * seats;
            const discountAmt = originalTotal * discountPercent;
            const newTotal = originalTotal - discountAmt;
            
            totalVal.innerHTML = `₹${newTotal.toFixed(2)} <span style="color:#4ade80; font-size:0.8rem;">(${d.discount}% OFF)</span>`;
            msg.innerText = "Coupon applied!";
            msg.style.color = "#4ade80";
            window.finalBookingPrice = newTotal;
        } else {
            msg.innerText = d.message || "Invalid coupon.";
            msg.style.color = "#ff3d00";
        }
    } catch(e) {
        msg.innerText = "Error verifying coupon.";
    }
}

// --- Logic ---
function navigateTo(route) {
    if ((route === 'profile' || route === 'offer') && !currentUser) route = 'login';
    if(route === 'devDashboard' && (!currentUser || currentUser.role !== 'developer')) route = 'devLogin';
    if(leafletMap) { leafletMap.remove(); leafletMap = null; }
    
    appContainer.innerHTML = views[route];
    if(route === 'search') initMapAndRender();
    if(route === 'devDashboard') initDevDashboard();
    if(route === 'profile') loadProfileData();
    if(route === 'offer') loadCars();
    window.scrollTo(0,0);
}

function toggleAuthMode() {
    const isLogin = document.getElementById('auth-title').innerText === 'Welcome Back';
    document.getElementById('auth-title').innerText = isLogin ? 'Create Account' : 'Welcome Back';
    document.getElementById('auth-btn').innerText = isLogin ? 'Register' : 'Sign In';
    document.getElementById('auth-toggle').innerText = isLogin ? 'Already have account? Sign In' : 'New to Velora? Create account';
    document.getElementById('name-group').style.display = isLogin ? 'block' : 'none';
    document.getElementById('aadhaar-group').style.display = isLogin ? 'block' : 'none';
}

async function handleAuth(e) {
    e.preventDefault();
    const isReg = document.getElementById('auth-title').innerText === 'Create Account';
    const identifier = document.getElementById('auth-identifier').value;
    const password = document.getElementById('auth-pass').value;
    const body = { identifier, password };
    
    if(isReg) {
        body.name = document.getElementById('auth-name').value;
        body.aadhaar_no = document.getElementById('auth-aadhaar').value;
        const isPhone = !identifier.includes('@');
        if(isPhone) body.phone_no = identifier; else body.email = identifier;
    }

    const btn = document.getElementById('auth-btn');
    btn.innerText = 'Verifying...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/auth/${isReg ? 'register' : 'login'}`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        const d = await res.json();
        if(d.success && d.requires_otp) {
            showOtpModal(d.identifier, d.otp_delivered, d.otp_fallback, 'user');
        } else {
            alert(d.message || d.error || "Authentication failed.");
        }
    } catch(err) {
        alert('Connection error. Is the server running?');
    } finally {
        btn.innerText = isReg ? 'Register' : 'Sign In';
        btn.disabled = false;
    }
}

function toggleDevAuthMode() {
    const isLogin = document.getElementById('dev-auth-title').innerText === 'Developer Portal';
    document.getElementById('dev-auth-title').innerText = isLogin ? 'New Developer' : 'Developer Portal';
    document.getElementById('dev-auth-desc').innerText = isLogin ? 'Register System Admin' : 'System Access & Monitoring';
    document.getElementById('dev-auth-btn').innerText = isLogin ? 'Create Access' : 'System Entry';
    document.getElementById('dev-auth-toggle').innerText = isLogin ? 'Already have access? System Entry' : 'New Developer? Create access';
    document.getElementById('dev-name-group').style.display = isLogin ? 'block' : 'none';
    document.getElementById('dev-aadhaar-group').style.display = isLogin ? 'block' : 'none';
}

async function handleDevAuth(e) {
    e.preventDefault();
    const isReg = document.getElementById('dev-auth-title').innerText === 'New Developer';
    const identifier = document.getElementById('dev-identifier').value;
    const password = document.getElementById('dev-pass').value;
    
    let body = { identifier, password };
    if(isReg) {
        body.name = document.getElementById('dev-name').value;
        body.aadhaar_no = document.getElementById('dev-aadhaar').value;
        body.role = 'developer';
        const isPhone = !identifier.includes('@');
        if(isPhone) body.phone_no = identifier; else body.email = identifier;
    }

    const btn = document.getElementById('dev-auth-btn');
    btn.innerText = 'Verifying...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/auth/${isReg ? 'register' : 'login'}`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        const d = await res.json();
        if(d.success && d.requires_otp) {
            showOtpModal(d.identifier, d.otp_delivered, d.otp_fallback, 'developer');
        } else {
            if(res.status === 403) {
                alert("SECURITY: Account pending Master Admin approval.");
            } else {
                alert(d.message || d.error || "Access Denied.");
            }
        }
    } catch(err) {
        alert('Connection error. Is the server running?');
    } finally {
        btn.innerText = isReg ? 'Create Access' : 'System Entry';
        btn.disabled = false;
    }
}

// --- OTP Verification Modal ---
function showOtpModal(identifier, otpDelivered, otpFallback, role) {
    // Remove existing modal if any
    const existing = document.getElementById('otp-modal');
    if(existing) document.body.removeChild(existing);

    const maskedId = identifier.includes('@') 
        ? identifier.replace(/(.{2})(.*)(@.*)/, '$1***$3') 
        : identifier.replace(/(\+?\d{2})(\d+)(\d{3})/, '$1****$3');

    const overlay = document.createElement('div');
    overlay.className = 'otp-modal-bg';
    overlay.id = 'otp-modal';
    overlay.innerHTML = `
        <div class="otp-card">
            <div style="margin-bottom:2rem;">
                <span class="material-symbols-outlined" style="font-size:3rem; color:var(--accent);">verified_user</span>
            </div>
            <h2 style="margin-bottom:0.5rem; font-family:var(--font-heading);">Verify Your Identity</h2>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:2rem;">
                ${otpDelivered 
                    ? `A 6-digit code has been sent to <b>${maskedId}</b>` 
                    : `<span style="color:#F2994A;">⚠ Email/SMS not configured.</span><br>Your code is: <b style="letter-spacing:4px; font-size:1.3rem; color:var(--accent);">${otpFallback}</b>`}
            </p>
            <div style="display:flex; justify-content:center; gap:0.5rem; margin-bottom:2rem;" id="otp-inputs">
                <input class="otp-input" type="text" maxlength="1" inputmode="numeric" autofocus>
                <input class="otp-input" type="text" maxlength="1" inputmode="numeric">
                <input class="otp-input" type="text" maxlength="1" inputmode="numeric">
                <input class="otp-input" type="text" maxlength="1" inputmode="numeric">
                <input class="otp-input" type="text" maxlength="1" inputmode="numeric">
                <input class="otp-input" type="text" maxlength="1" inputmode="numeric">
            </div>
            <p id="otp-error" style="color:#ff3d00; font-size:0.85rem; min-height:1.2rem; margin-bottom:1rem;"></p>
            <button class="btn-primary" id="otp-verify-btn" style="width:100%; justify-content:center;" onclick="verifyOtpFromModal('${identifier}', '${role}')">Verify & Continue</button>
            <button class="btn-primary-outline" style="width:100%; border:none; margin-top:0.8rem; font-size:0.85rem; opacity:0.6;" onclick="document.body.removeChild(document.getElementById('otp-modal'))">Cancel</button>
            ${otpDelivered ? `<p style="margin-top:1.5rem; font-size:0.8rem; color:var(--text-muted);">Didn't receive it? <a href="#" onclick="resendOtp('${identifier}')" style="color:var(--accent); text-decoration:none; font-weight:600;">Resend Code</a></p>` : ''}
        </div>
    `;
    document.body.appendChild(overlay);

    // Auto-focus and auto-advance logic for OTP inputs
    const inputs = overlay.querySelectorAll('.otp-input');
    inputs.forEach((inp, idx) => {
        inp.addEventListener('input', () => {
            inp.value = inp.value.replace(/[^0-9]/g, '');
            if(inp.value && idx < inputs.length - 1) inputs[idx + 1].focus();
        });
        inp.addEventListener('keydown', (e) => {
            if(e.key === 'Backspace' && !inp.value && idx > 0) inputs[idx - 1].focus();
            if(e.key === 'Enter') verifyOtpFromModal(identifier, role);
        });
        // Handle paste
        inp.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
            pasted.split('').forEach((ch, i) => { if(inputs[i]) inputs[i].value = ch; });
            if(inputs[pasted.length - 1]) inputs[pasted.length - 1].focus();
        });
    });
    inputs[0].focus();
}

async function verifyOtpFromModal(identifier, role) {
    const inputs = document.querySelectorAll('#otp-inputs .otp-input');
    const otp = Array.from(inputs).map(i => i.value).join('');
    const errEl = document.getElementById('otp-error');
    const btn = document.getElementById('otp-verify-btn');

    if(otp.length !== 6) {
        errEl.innerText = 'Please enter the complete 6-digit code.';
        return;
    }

    btn.innerText = 'Verifying...';
    btn.disabled = true;
    errEl.innerText = '';

    try {
        const res = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ identifier, otp })
        });
        const d = await res.json();
        if(d.success && d.user) {
            currentUser = d.user;
            updateNavAuth();
            document.body.removeChild(document.getElementById('otp-modal'));
            navigateTo(role === 'developer' ? 'devDashboard' : 'home');
        } else {
            errEl.innerText = d.message || 'Invalid OTP. Please try again.';
            inputs.forEach(i => { i.value = ''; });
            inputs[0].focus();
        }
    } catch(err) {
        errEl.innerText = 'Verification failed. Please try again.';
    } finally {
        btn.innerText = 'Verify & Continue';
        btn.disabled = false;
    }
}

async function resendOtp(identifier) {
    const isEmail = identifier.includes('@');
    const body = isEmail ? { email: identifier } : { phone_no: identifier };
    try {
        const res = await fetch(`${API_URL}/auth/send-otp`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        const d = await res.json();
        if(d.success) {
            const errEl = document.getElementById('otp-error');
            if(errEl) {
                errEl.style.color = '#4ade80';
                errEl.innerText = 'New code sent successfully!';
                setTimeout(() => { errEl.style.color = '#ff3d00'; errEl.innerText = ''; }, 3000);
            }
        }
    } catch(e) {}
}

async function initDevDashboard() {
    setTimeout(async () => {
        leafletMap = L.map('leaflet-map').setView([20.5937, 78.9629], 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(leafletMap);
        
        // Initial config fetch
        const cfgRes = await fetch(`${API_URL}/dev/config`);
        if(cfgRes.ok) {
        const config = await cfgRes.json();
        document.getElementById('cfg-base').value = config.base_rate || 10;
        document.getElementById('cfg-surge').value = config.surge_factor || 1.0;
        document.getElementById('cfg-go-mult').value = config.go_multiplier || 1.0;
        document.getElementById('cfg-prime-mult').value = config.prime_multiplier || 1.6;
        document.getElementById('cfg-xl-mult').value = config.xl_multiplier || 2.2;
        }

        updateDevMonitor();
        // Auto-refresh stats every 10 seconds
        window.devMonitorInterval = setInterval(updateDevMonitor, 10000);
    }, 50);
}

async function updateDevMonitor() {
    if(window.location.hash !== '#devDashboard' && !document.getElementById('dev-rides-list')) {
        clearInterval(window.devMonitorInterval);
        return;
    }

    const list = document.getElementById('dev-rides-list');
    const res = await fetch(`${API_URL}/dev/all-rides`);
    const rides = await res.json();
    
    // Stats calculation
    let totalRevenue = 0;
    let activeCount = 0;
    rides.forEach(r => {
        if(r.status === 'active' || r.status === 'completed') totalRevenue += r.price;
        if(r.status === 'active') activeCount++;
    });

    document.getElementById('stat-revenue').innerText = `₹${totalRevenue.toLocaleString()}`;
    document.getElementById('stat-active').innerText = activeCount;
    document.getElementById('ride-count').innerText = `${rides.length} Total`;

    list.innerHTML = rides.map(r => {
        const platformCut = (r.price * 0.1).toFixed(2); // 10% commission
        return `
            <div class="ride-card" style="font-size:0.85rem; border-left:4px solid ${r.status === 'active' ? '#4ade80' : r.status === 'pending' ? '#F2994A' : '#94a3b8'};">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.8rem;">
                    <div>
                        <b style="color:var(--text-main);">ID: ${r.id}</b>
                        <span class="badge" style="background:${r.status==='active'?'#dcfce7':'#fef3c7'}; color:${r.status==='active'?'#166534':'#92400e'}; font-size:0.6rem; margin-left:0.5rem;">${r.status.toUpperCase()}</span>
                    </div>
                    <div style="text-align:right;">
                        <b style="display:block; font-size:1.1rem;">₹${r.price}</b>
                        <small style="color:var(--text-muted);">Cut: ₹${platformCut}</small>
                    </div>
                </div>
                <p><b>From:</b> ${r.from_loc} <br> <b>To:</b> ${r.to_loc}</p>
                <div style="margin-top:1.2rem; display:flex; gap:0.5rem;">
                    ${r.status === 'pending' ? `<button class="btn-primary" style="padding:0.4rem 0.8rem; font-size:0.7rem; flex:1;" onclick="controlRide(${r.id}, 'start', ${r.start_lat}, ${r.start_lng}, ${r.end_lat}, ${r.end_lng})">Start Tracking</button>` : ''}
                    ${r.status === 'active' ? `<button class="btn-primary" style="padding:0.4rem 0.8rem; font-size:0.7rem; flex:1; background:#ef4444;" onclick="controlRide(${r.id}, 'complete')">Force Complete</button>` : ''}
                    <button class="btn-primary-outline" style="padding:0.4rem 0.8rem; font-size:0.7rem; flex:1;" onclick="modifyRidePrice(${r.id})">Manual Fee Edit</button>
                </div>
            </div>
        `;
    }).join('');

    // --- HQ Map Markers ---
    if(leafletMap && window.location.hash === '#devDashboard') {
        if(!window.devMarkers) window.devMarkers = [];
        window.devMarkers.forEach(m => leafletMap.removeLayer(m));
        window.devMarkers = [];

        rides.forEach(r => {
            const lat = r.live_lat || r.start_lat;
            const lng = r.live_lng || r.start_lng;
            const m = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: r.status === 'active' ? 'live-marker-pulse' : '',
                    html: `<div class="live-car-icon" style="background:${r.status==='active'?'#4ade80':'#F2994A'}; border-color:#fff;">🚗</div>`
                })
            }).addTo(leafletMap);
            m.bindPopup(`<b>Ride #${r.id}</b><br>Status: ${r.status}`);
            window.devMarkers.push(m);
        });
    }
}

async function controlRide(id, action, sLat, sLng, eLat, eLng) {
    if(action === 'start') {
        alert("Initializing Satellite Tracking for Session #" + id);
        simulateRideStart(id, sLat, sLng, eLat, eLng);
    } else {
        await fetch(`${API_URL}/rides/${id}/update-location`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: 'completed' })
        });
        updateDevMonitor();
    }
}

async function updateSysConfig() {
    const body = {
        base_rate: document.getElementById('cfg-base').value,
        surge_factor: document.getElementById('cfg-surge').value
    };
    
    await fetch(`${API_URL}/dev/config`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
    alert("GLOBAL CONFIG UPDATED");
}

async function updateTierMultipliers() {
    const body = {
        go_multiplier: document.getElementById('cfg-go-mult').value,
        prime_multiplier: document.getElementById('cfg-prime-mult').value,
        xl_multiplier: document.getElementById('cfg-xl-mult').value
    };
    
    await fetch(`${API_URL}/dev/config`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
    alert("HQ: Tier multipliers synced across fleet.");
}

async function updateGodAnalytics() {
    const res = await fetch(`${API_URL}/dev/stats/summary`);
    const data = await res.json();
    
    const revCtx = document.getElementById('revChart').getContext('2d');
    const growthCtx = document.getElementById('growthChart').getContext('2d');

    // Destroy existing charts if they exist to prevent hover bugs
    if(window.revChartObj) window.revChartObj.destroy();
    if(window.growthChartObj) window.growthChartObj.destroy();

    window.revChartObj = new Chart(revCtx, {
        type: 'doughnut',
        data: {
            labels: data.categories.map(c => c.type),
            datasets: [{
                data: data.categories.map(c => c.revenue),
                backgroundColor: ['#00e5ff', '#a855f7', '#ff3d00'],
                borderWidth: 0
            }]
        },
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
    });

    window.growthChartObj = new Chart(growthCtx, {
        type: 'line',
        data: {
            labels: data.growth.map(g => g.date),
            datasets: [{
                label: 'Revenue Trend',
                data: data.growth.map(g => g.revenue),
                borderColor: '#00e5ff',
                backgroundColor: 'rgba(0, 229, 255, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { 
            scales: { 
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                x: { grid: { display: false }, ticks: { color: '#888' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    document.getElementById('stat-revenue').innerText = `₹${data.categories.reduce((a,b)=>a+b.revenue,0).toLocaleString()}`;
}

async function renderPendingDrivers() {
    const res = await fetch(`${API_URL}/dev/pending-drivers`);
    const drivers = await res.json();
    const list = document.getElementById('pending-drivers-list');
    if(!list) return;
    list.innerHTML = drivers.length ? drivers.map(d => `
        <div class="dev-list-item">
            <div style="flex:1;">
                <b>${d.name}</b><br>
                <small>${d.email} • ID: ${d.aadhaar_no}</small>
            </div>
            <div style="display:flex; gap:0.5rem;">
                <button class="btn-primary" style="padding:0.4rem 1rem;" onclick="verifyDriverAction(${d.id}, 1)">Approve</button>
                <button class="btn-primary-outline" style="padding:0.4rem 1rem;" onclick="verifyDriverAction(${d.id}, 2)">Reject</button>
            </div>
        </div>
    `).join('') : '<p style="text-align:center; opacity:0.5;">No pending verifications.</p>';
}

async function renderPendingDevs() {
    const res = await fetch(`${API_URL}/dev/pending-devs`);
    const devs = await res.json();
    const list = document.getElementById('pending-devs-list');
    if(!list) return;
    list.innerHTML = devs.length ? devs.map(d => `
        <div class="dev-list-item">
            <div style="flex:1;">
                <b>${d.name}</b> (${d.email})<br>
                <small>Aadhaar: ${d.aadhaar_no}</small>
            </div>
            <button class="btn-primary" style="padding:0.4rem 1rem; background:#a855f7;" onclick="devVerifyDev(${d.id})">Certify Admin</button>
        </div>
    `).join('') : '<p style="text-align:center; opacity:0.5;">No pending developers.</p>';
}

async function devVerifyDev(id) {
    await fetch(`${API_URL}/dev/verify-dev`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id })
    });
    alert("DEVELOPER CERTIFIED");
    renderPendingDevs();
}

async function verifyDriverAction(id, status) {
    await fetch(`${API_URL}/dev/verify-driver`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id, status })
    });
    alert(status === 1 ? "Driver Security Clearance Granted" : "Driver Access Denied");
    renderPendingDrivers();
}

function switchDevTab(tab, el) {
    document.querySelectorAll('.dev-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.dev-nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    el.classList.add('active');
    document.getElementById('dev-tab-title').innerText = tab.charAt(0).toUpperCase() + tab.slice(1);
    
    if(tab === 'analytics') updateGodAnalytics();
    if(tab === 'approvals') {
        renderPendingDrivers();
        renderPendingDevs();
    }
    if(tab === 'config') loadPricingConfig();
    if(tab === 'vault') renderDevCoupons();
    if(tab === 'users') renderDevUsers();
    if(tab === 'ops') {
        initMapAndRender();
        document.getElementById('ops-controls').style.display = 'block';
    } else {
        const ctrl = document.getElementById('ops-controls');
        if(ctrl) ctrl.style.display = 'none';
    }
}

async function renderDevUsers() {
    const res = await fetch(`${API_URL}/dev/users/list`);
    const users = await res.json();
    const query = document.getElementById('user-search').value.toLowerCase();
    const list = document.getElementById('dev-users-list');
    
    list.innerHTML = users.filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)).map(u => `
        <div class="dev-list-item" style="${u.is_banned ? 'opacity:0.5; border-left:4px solid #ef4444;' : ''}">
            <div style="flex:1;">
                <b>${u.name}</b> (${u.email})
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;">
                    Role: <span style="text-transform:uppercase;">${u.role}</span> | 
                    Status: <span style="color:${u.is_banned ? '#ef4444' : '#4ade80'};">${u.is_banned ? 'BANNED' : 'ACTIVE'}</span>
                </div>
            </div>
            <div style="display:flex; gap:0.5rem;">
                <button class="btn-primary-outline" style="padding:0.4rem 0.8rem; font-size:0.7rem;" onclick="toggleUserBan(${u.id})">
                    ${u.is_banned ? 'Revoke Ban' : 'Suspend Account'}
                </button>
            </div>
        </div>
    `).join('');
}

async function toggleUserBan(id) {
    if(!confirm("Are you sure you want to modify this account's security status?")) return;
    await fetch(`${API_URL}/dev/users/toggle-ban`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id })
    });
    renderDevUsers();
}

async function toggleHeatmap() {
    const btn = document.getElementById('heatmap-toggle');
    if(window.heatmapActive) {
        window.heatmapActive = false;
        btn.innerText = "Activate Thermal Heatmap";
        btn.classList.remove('glow-btn');
        if(window.heatmapLayers) window.heatmapLayers.forEach(l => leafletMap.removeLayer(l));
        window.heatmapLayers = [];
    } else {
        window.heatmapActive = true;
        btn.innerText = "Deactivate Heatmap";
        btn.classList.add('glow-btn');
        
        const res = await fetch(`${API_URL}/dev/demand-data`);
        const data = await res.json();
        window.heatmapLayers = [];
        
        data.forEach(p => {
            const circle = L.circle([p.lat, p.lng], {
                radius: 1000,
                color: '#ff3d00',
                fillColor: '#ff3d00',
                fillOpacity: p.intensity * 0.4,
                weight: 0
            }).addTo(leafletMap);
            window.heatmapLayers.push(circle);
        });
    }
}

function toggleTerminal() {
    const modal = document.getElementById('terminal-modal');
    modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
    if(modal.style.display === 'flex') document.getElementById('term-input').focus();
}

function handleTermCommand(e) {
    if(e.key !== 'Enter') return;
    const input = e.target.value.toLowerCase().trim();
    const output = document.getElementById('terminal-output');
    e.target.value = '';

    const addLine = (txt) => output.innerHTML += `<br>[SYSTEM] ${txt}`;
    
    if(input === 'help') {
        addLine('Available: clear, surge [val], kill, status, exit');
    } else if(input === 'clear') {
        output.innerHTML = 'Velora Console Cleared.';
    } else if(input === 'status') {
        fetch(`${API_URL}/dev/config`).then(r => r.json()).then(cfg => {
            addLine(`VELORA HQ: Base ₹${cfg.base_rate} | Surge ${cfg.surge_factor}x | Maintenance: ${cfg.maintenance_mode === 1.0 ? 'ACTIVE' : 'OFF'}`);
        });
    } else if(input.startsWith('surge ')) {
        const val = input.split(' ')[1];
        addLine(`Inhibiting normal pricing... Global Surge set to ${val}x`);
        fetch(`${API_URL}/dev/config`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({surge_factor:val})});
    } else if(input === 'kill') {
        toggleKillswitch();
    } else if(input === 'exit') {
        toggleTerminal();
    } else {
        addLine(`Command not recognized: ${input}`);
    }
    output.scrollTop = output.scrollHeight;
}

async function toggleKillswitch() {
    const res = await fetch(`${API_URL}/dev/config`);
    const cfg = await res.json();
    const newState = cfg.maintenance_mode === 0 ? 1 : 0;
    await fetch(`${API_URL}/dev/config`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ maintenance_mode: newState })
    });
    alert(newState === 1 ? "PLATFORM SHUTDOWN INITIATED" : "SYSTEMS RECOVERED");
}

async function modifyRidePrice(id) {
    const p = prompt("Enter new price for this ride:");
    if(p) {
        await fetch(`${API_URL}/dev/update-ride-price`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ride_id: id, price: p })
        });
        updateDevMonitor();
    }
}

function simulateRideStart(id, sLat, sLng, eLat, eLng) {
    alert("Live Tracking Activated for Developer.");
    let progress = 0;
    const marker = L.marker([sLat, sLng], { icon: L.divIcon({className:'live-car-icon', html:'🚗'}) }).addTo(leafletMap);
    
    const interval = setInterval(async () => {
        progress += 0.05;
        if(progress >= 1) { 
            clearInterval(interval); 
            marker.setLatLng([eLat, eLng]);
            return; 
        }
        const lat = sLat + (eLat - sLat) * progress;
        const lng = sLng + (eLng - sLng) * progress;
        marker.setLatLng([lat, lng]);
        
        await fetch(`${API_URL}/rides/${id}/update-location`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ lat, lng, status: 'active' })
        });
    }, 2000);
}

function updateNavAuth() {
    const btn = document.getElementById('nav-auth-btn');
    if(btn) {
        btn.innerText = currentUser ? 'Profile' : 'Sign In';
        btn.className = currentUser ? 'btn-primary-outline' : 'btn-primary';
        btn.onclick = () => navigateTo(currentUser ? 'profile' : 'login');
    }
}

function handleLogout() { currentUser = null; updateNavAuth(); navigateTo('home'); }

async function verifyDriver() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        if(e.target.files[0]) {
            alert("Document uploaded successfully! Your verification is now pending admin approval.");
        }
    };
    input.click();
}

async function loadProfileData() {
    document.getElementById('perf-name').innerText = currentUser.name;
    document.getElementById('perf-email').innerText = currentUser.email;
    document.getElementById('perf-avatar').innerText = currentUser.name[0].toUpperCase();
    document.getElementById('perf-d-rating').innerText = (currentUser.driver_rating_sum / (currentUser.driver_rating_count || 1)).toFixed(1);
    document.getElementById('perf-u-rating').innerText = (currentUser.user_rating_sum / (currentUser.user_rating_count || 1)).toFixed(1);
    
    const vStatus = document.getElementById('perf-v-status');
    const vBtn = document.getElementById('v-btn');
    if(currentUser.is_driver_verified) {
        vStatus.innerHTML = '<span style="color:#4ade80">✓ Verified Driver</span>';
        vBtn.style.display = 'none';
    } else {
        vStatus.innerHTML = '<span style="color:#9aa0a6">⚠ Unverified Driver</span>';
        vBtn.style.display = 'block';
    }

    const res = await fetch(`${API_URL}/rides/my-offered`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ driver_id: currentUser.id })
    });
    const rides = await res.json();
    const container = document.getElementById('managed-rides-list');
    container.innerHTML = rides.length ? rides.map(r => `
        <div class="ride-card" style="flex-direction:column; align-items:stretch;">
            <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                <h4>${r.from_loc} ➔ ${r.to_loc}</h4>
                <span class="badge badge-success">${r.ride_date}</span>
            </div>
            <p style="font-size:0.85rem; margin-bottom:1rem;">Seats: ${r.available_seats} / ${r.total_seats} left</p>
            <div style="border-top:1px solid var(--border-color); padding-top:1rem;">
                <p style="font-weight:700; font-size:0.8rem; margin-bottom:0.5rem;">PASSENGERS</p>
                ${r.passengers.length ? r.passengers.map(p => `
                    <div class="passenger-item">
                        <div><b>${p.name}</b> (${p.email})</div>
                        <div style="font-size:0.8rem;">Seats: ${p.seats_booked} | ⭐ ${p.user_rating}</div>
                    </div>
                `).join('') : '<p style="font-size:0.8rem; color:var(--text-muted);">No bookings yet.</p>'}
            </div>
        </div>
    `).join('') : '<p>No rides offered yet.</p>';
}

async function handlePublishRide(e) {
    e.preventDefault();
    if(!currentUser.is_driver_verified) return alert("Verify driver status first!");

    const btn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = btn.innerText;
    btn.innerText = "Publishing Ride...";
    btn.disabled = true;

    const from = document.getElementById('offer-from').value;
    const to = document.getElementById('offer-to').value;
    
    try {
        // Geocoding to get coords for map
        const fRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(from)}&format=json&limit=1`);
        const tRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(to)}&format=json&limit=1`);
        const fD = await fRes.json(); const tD = await tRes.json();
        
        if(!fD[0] || !tD[0]) {
            alert("Location not found.");
            btn.innerText = originalBtnText;
            btn.disabled = false;
            return;
        }

        const body = {
            driver_id: currentUser.id,
            car_name: document.getElementById('offer-car').value,
            car_used_years: document.getElementById('offer-used-years').value,
            car_photo: offerCarPhoto,
            from_loc: fD[0].display_name.split(',')[0],
            to_loc: tD[0].display_name.split(',')[0],
            start_lat: fD[0].lat, start_lng: fD[0].lon,
            end_lat: tD[0].lat, end_lng: tD[0].lon,
            ride_date: document.getElementById('offer-date').value,
            departure: document.getElementById('offer-time').value,
            arrival: '--:--',
            seats: document.getElementById('offer-seats').value,
            ride_type: document.getElementById('offer-ride-type').value
        };

        const res = await fetch(`${API_URL}/rides`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        if(res.ok) { 
            alert("Ride Published Successfully!"); 
            navigateTo('search'); 
        } else {
            const err = await res.json();
            alert("Error: " + (err.error || "Failed to publish ride"));
        }
    } catch(err) {
        alert("System Error: Could not connect to satellite services.");
    } finally {
        btn.innerText = originalBtnText;
        btn.disabled = false;
    }
}

async function renderRides() {
    const list = document.getElementById('rides-list');
    const res = await fetch(`${API_URL}/rides`);
    let rides = await res.json();

    // Filter by selected category if any
    if(window.selectedCategory) {
        rides = rides.filter(r => r.ride_type === window.selectedCategory);
    }

    list.innerHTML = `<h3 style="margin-bottom:1.5rem;">Available Rides ${window.selectedCategory ? `[${window.selectedCategory}]` : ''}</h3>` + rides.map(r => {
        const catClass = `fare-${(r.ride_type || 'Go').toLowerCase()}`;
        return `
        <div class="ride-card" style="flex-direction:column; align-items:stretch; position:relative;">
            <div style="position:absolute; top:1rem; right:1rem;">
                <span class="fare-badge ${catClass}">${r.ride_type || 'Go'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:0.8rem;">
                    <div class="avatar" style="width:45px; height:45px; font-size:1.1rem;">${r.driver_name[0]}</div>
                    <div>
                        <b style="font-size:1rem; display:block;">${r.driver_name}</b>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${r.car_details}</div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <b style="font-size:1.3rem; color:var(--accent);">₹${r.price}</b>
                    <div style="font-size:0.75rem; color:var(--text-muted);">/ seat</div>
                </div>
            </div>
            <div class="trip-points" style="margin: 2rem 0;">
                <div class="point">
                    <span class="point-time">${r.departure}</span>
                    <div class="point-dot"></div>
                    <span class="point-location">${r.from_loc}</span>
                </div>
                <div class="point">
                    <span class="point-time">${r.ride_date}</span>
                    <div class="point-dot" style="border-color:var(--text-main);"></div>
                    <span class="point-location">${r.to_loc}</span>
                </div>
            </div>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">${r.available_seats} seats available</p>
            ${r.car_photo ? `<img src="${r.car_photo}" style="width:100%; height:120px; object-fit:cover; border-radius:12px; margin-bottom:1rem;">` : ''}
            <button class="btn-primary" style="width:100%;" onclick="openPaymentModal(${r.id}, ${r.price}, ${r.available_seats})">Book Now</button>
        </div>
    `;}).join('');

    markers.forEach(m => leafletMap.removeLayer(m));
    rides.forEach(r => {
        const m = L.marker([r.start_lat, r.start_lng]).addTo(leafletMap);
        m.bindPopup(`<b>${r.driver_name}</b><br>Leaving ${r.departure}`);
        markers.push(m);
    });
}

function searchRides() {
    navigateTo('search');
}

function toggleDarkMode() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    if(body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        icon.innerText = 'dark_mode';
        localStorage.setItem('velora-theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        icon.innerText = 'light_mode';
        localStorage.setItem('velora-theme', 'dark');
    }
}


async function initMapAndRender() {
    setTimeout(async () => {
        leafletMap = L.map('leaflet-map').setView([20.5937, 78.9629], 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(leafletMap);
        leafletMap.on('click', handleMapClick);
        renderRides();
    }, 50);
}

function selectCat(el, val) {
    document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    window.selectedCategory = val;
}

function openPaymentModal(rideId, price, maxSeats) {
    if(!currentUser) return navigateTo('login');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'payment-modal';
    window.selectedPaymentMethod = 'card';
    window.currentRidePrice = price;
    window.finalBookingPrice = null;

    overlay.innerHTML = `
        <div class="modal-content">
            <h3 style="margin-bottom:0.5rem;">Confirm Booking</h3>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:2rem;">Secure your seat with Velora Premium Payments</p>
            
            <div class="payment-method-selector" style="display:flex; gap:1rem; margin-bottom:2rem;">
                <div class="pay-method active" id="pay-card" onclick="switchPaymentMethod('card')">
                    <span class="material-symbols-outlined">credit_card</span>
                    <span>Card</span>
                </div>
                <div class="pay-method" id="pay-upi" onclick="switchPaymentMethod('upi')">
                    <span class="material-symbols-outlined">payments</span>
                    <span>UPI</span>
                </div>
            </div>

            <div class="form-group">
                <label>Number of Seats</label>
                <select id="pay-seats" onchange="updateTotal(${price})">
                    ${Array.from({length: maxSeats}, (_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
                </select>
            </div>

            <div class="form-group">
                <label>Promo Code</label>
                <div style="display:flex; gap:0.5rem;">
                    <input type="text" id="promo-code" placeholder="VELORA50" style="flex:1;">
                    <button class="btn-primary-outline" style="padding:0.5rem 1rem; border-width:1px;" onclick="applyPromo(${price})">Apply</button>
                </div>
                <small id="promo-msg" style="display:block; margin-top:0.3rem;"></small>
            </div>

            <div id="payment-details-container">
                <!-- Card View -->
                <div id="card-view" class="payment-view active">
                    <div class="payment-card-mock" style="background: linear-gradient(135deg, var(--text-main) 0%, #000 100%); padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; color: #fff; font-family: monospace; position:relative; overflow:hidden;">
                        <div style="font-size:0.8rem; margin-bottom:2rem; opacity:0.7;">PREMIUM VELORA BLACK</div>
                        <input type="text" id="card-no" placeholder="5544 0000 1122 3344" style="width:100%; background:transparent; border:none; color:#fff; font-size:1.2rem; border-bottom:1px solid rgba(255,255,255,0.2); letter-spacing:2px;">
                        <div style="display:flex; justify-content:space-between; margin-top:1.5rem; font-size:0.8rem;">
                            <span>${currentUser.name.toUpperCase()}</span>
                            <span>12 / 28</span>
                        </div>
                        <div style="position:absolute; top:-20px; right:-20px; width:100px; height:100px; background:rgba(255,255,255,0.05); border-radius:50%;"></div>
                    </div>
                </div>

                <!-- UPI View -->
                <div id="upi-view" class="payment-view" style="display:none;">
                    <div class="upi-mock" style="background: var(--bg-light); padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; border: 1px solid var(--glass-border); text-align:center;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" style="height:30px; margin-bottom:1rem; opacity:0.8;">
                        <div class="form-group" style="text-align:left;">
                            <label>UPI ID</label>
                            <input type="text" id="upi-id" placeholder="yourname@bank" style="background:#fff;">
                        </div>
                        <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem;">A payment request will be sent to your UPI app.</p>
                    </div>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem; padding:0 0.5rem;">
                <span style="color:var(--text-muted);">Total Amount</span>
                <b id="total-val" style="font-size:1.2rem; color:var(--text-main);">₹${price}</b>
            </div>
            
            <button class="btn-primary" id="confirm-pay-btn" style="width:100%; margin-bottom:0.8rem; justify-content:center;" onclick="processPayment(${rideId})">Pay Now</button>
            <button class="btn-primary-outline" style="width:100%; border:none; font-size:0.9rem; opacity:0.6;" onclick="document.body.removeChild(document.getElementById('payment-modal'))">Go Back</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

function switchPaymentMethod(method) {
    window.selectedPaymentMethod = method;
    document.getElementById('pay-card').classList.toggle('active', method === 'card');
    document.getElementById('pay-upi').classList.toggle('active', method === 'upi');
    document.getElementById('card-view').style.display = method === 'card' ? 'block' : 'none';
    document.getElementById('upi-view').style.display = method === 'upi' ? 'block' : 'none';
}

function updateTotal(p) {
    const s = document.getElementById('pay-seats').value;
    const total = (p * s).toFixed(2);
    document.getElementById('total-val').innerText = `₹${total}`;
    // If a coupon was applied, this might reset it. 
    // In a real app we'd re-apply the promo automatically.
}

async function processPayment(ride_id) {
    const seats = document.getElementById('pay-seats').value;
    const amount = window.finalBookingPrice || (window.currentRidePrice * seats);
    
    const btn = document.getElementById('confirm-pay-btn');
    btn.innerText = "Initializing Secure Checkout...";
    btn.disabled = true;

    try {
        const orderRes = await fetch(`${API_URL}/rides/${ride_id}/create_order`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ amount: amount })
        });
        const orderData = await orderRes.json();

        const options = {
            "key": "rzp_test_dummy",
            "amount": amount * 100,
            "currency": "INR",
            "name": "Velora Premium",
            "description": "Secure Ride Booking",
            "order_id": orderData.order_id,
            "handler": async function (response) {
                const confirmRes = await fetch(`${API_URL}/rides/${ride_id}/confirm_payment`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature,
                        seats: seats
                    })
                });
                if(confirmRes.ok) {
                    alert("Payment Successful! Your ride is confirmed.");
                    document.body.removeChild(document.getElementById('payment-modal'));
                    window.activeRideId = ride_id;
                    navigateTo('tracking');
                    startRiderTracking(ride_id);
                }
            },
            "prefill": {
                "name": currentUser.name,
                "email": currentUser.email
            },
            "theme": { "color": "#00e5ff" }
        };
        const rzp = new Razorpay(options);
        rzp.open();
    } catch(e) {
        alert("Transaction Error: Could not initialize payment gateway.");
    } finally {
        if(btn) { btn.innerText = "Pay Now"; btn.disabled = false; }
    }
}

async function loadCars() {
    try {
        const res = await fetch(`${API_URL}/cars`);
        const cars = await res.json();
        const select = document.getElementById('offer-car');
        if(select) {
            select.innerHTML = cars.map(c => `<option value="${c.model}">${c.model}</option>`).join('');
        }
    } catch(e) {}
}

async function addCarModel() {
    const model = document.getElementById('new-car-model').value;
    if(!model) return;
    const res = await fetch(`${API_URL}/dev/cars`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ model })
    });
    if(res.ok) {
        alert("System: New vehicle category added successfully.");
        document.getElementById('new-car-model').value = '';
    }
}

async function startRiderTracking(ride_id) {
    // Initial fetch to get ride/driver details
    const res = await fetch(`${API_URL}/rides`);
    const rides = await res.json();
    const ride = rides.find(r => r.id === ride_id);
    if(ride) {
        document.getElementById('track-driver-name').innerText = ride.driver_name;
        document.getElementById('track-car-info').innerText = `${ride.car_details} • ${ride.ride_type}`;
        document.getElementById('track-price').innerText = `₹${ride.price}`;
    }

    const interval = setInterval(async () => {
        if(window.location.hash !== '#tracking' && !document.getElementById('track-status')) {
            clearInterval(interval);
            return;
        }

        const res = await fetch(`${API_URL}/rides`);
        const rides = await res.json();
        const r = rides.find(rd => rd.id === ride_id);
        
        if(r && r.live_lat) {
            if(window.riderDriverMarker) leafletMap.removeLayer(window.riderDriverMarker);
            window.riderDriverMarker = L.marker([r.live_lat, r.live_lng], {
                icon: L.divIcon({className:'car-marker', html:'🚗'})
            }).addTo(leafletMap);
            leafletMap.setView([r.live_lat, r.live_lng], 15);
            
            // Calculate ETA (simple math based on distance)
            const dist = haversine(r.live_lat, r.live_lng, r.end_lat, r.end_lng); // Actually should be to pickup first, but let's just show distance to end
            const eta = Math.ceil(dist * 2); // 2 mins per km approx
            document.getElementById('track-eta').innerText = `Arriving in ${eta} mins • ${dist.toFixed(1)} km left`;
            
            if(r.status === 'completed') {
                document.getElementById('track-status').innerText = 'Arrived at Destination!';
                clearInterval(interval);
                showRatingModal(ride_id, ride ? ride.driver_name : 'Driver');
            }
        }
    }, 3000);
}

function showRatingModal(ride_id, driver_name) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'rating-modal';
    overlay.innerHTML = `
        <div class="modal-content" style="text-align:center;">
            <h2 style="margin-bottom:0.5rem;">Rate your Ride</h2>
            <p style="color:var(--text-muted); margin-bottom:1.5rem;">How was your trip with ${driver_name}?</p>
            
            <div style="font-size:3rem; margin-bottom:1.5rem; color:#facc15; cursor:pointer;" id="star-container">
                <span onclick="setRating(1)">☆</span>
                <span onclick="setRating(2)">☆</span>
                <span onclick="setRating(3)">☆</span>
                <span onclick="setRating(4)">☆</span>
                <span onclick="setRating(5)">☆</span>
            </div>
            
            <textarea id="rating-comment" placeholder="Leave a compliment or feedback..." style="width:100%; height:80px; background:var(--bg-light); border:1px solid var(--glass-border); border-radius:12px; padding:1rem; color:#fff; margin-bottom:1.5rem;"></textarea>
            
            <button class="btn-primary" style="width:100%; justify-content:center;" onclick="submitRating(${ride_id})">Submit Review</button>
            <button class="btn-primary-outline" style="width:100%; border:none; margin-top:0.5rem;" onclick="skipRating()">Skip</button>
        </div>
    `;
    document.body.appendChild(overlay);
    window.currentSelectedRating = 5;
    setRating(5); // Default to 5 stars
}

function setRating(val) {
    window.currentSelectedRating = val;
    const spans = document.querySelectorAll('#star-container span');
    spans.forEach((s, idx) => {
        s.innerText = idx < val ? '★' : '☆';
    });
}

function skipRating() {
    document.body.removeChild(document.getElementById('rating-modal'));
    navigateTo('profile');
}

async function submitRating(ride_id) {
    const comment = document.getElementById('rating-comment').value;
    try {
        await fetch(`${API_URL}/rides/${ride_id}/rate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ rating: window.currentSelectedRating, comment })
        });
        alert("Thanks for your feedback!");
    } catch(e) {}
    skipRating();
}

async function searchRides() {
    navigateTo('search');
}

async function loadPricingConfig() {
    const res = await fetch(`${API_URL}/dev/config`);
    const cfg = await res.json();
    if(document.getElementById('cfg-base')) {
        document.getElementById('cfg-base').value = cfg.base_rate || 10;
        document.getElementById('cfg-surge').value = cfg.surge_factor || 1.0;
        document.getElementById('cfg-go-mult').value = cfg.go_multiplier || 1.0;
        document.getElementById('cfg-prime-mult').value = cfg.prime_multiplier || 1.6;
        document.getElementById('cfg-xl-mult').value = cfg.xl_multiplier || 2.2;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('velora-theme');
    if(savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        const icon = document.getElementById('theme-icon');
        if(icon) icon.innerText = 'light_mode';
    }
    navigateTo('home');
});
