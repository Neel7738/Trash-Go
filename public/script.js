const API_URL = ''; // Same origin

// Check if logged in
const user = JSON.parse(localStorage.getItem('user'));

if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '') {
    if (!user) window.location.href = 'login.html';
    else if (user.role === 'admin') window.location.href = 'admin.html';
    else {
        if (document.getElementById('user-name')) document.getElementById('user-name').innerText = user.name;
        loadMyReports();
        loadLeaderboard();
        checkCleanupNotifications();
        initHeatmap();

        // Auto-trigger onboarding tour for first-time users
        setTimeout(() => {
            const tourCompleted = localStorage.getItem('trashgo-tour-completed');
            if (!tourCompleted) {
                startOnboardingTour();
            }
        }, 1000);
    }
}

if (window.location.pathname.includes('admin.html')) {
    if (!user || user.role !== 'admin') window.location.href = 'login.html';
    else {
        if (document.getElementById('admin-name')) document.getElementById('admin-name').innerText = user.name;
        loadAllReports();
        loadAdminWarriors();
        loadAdminRedemptions();
        initHeatmap();
    }
}

// ... (Signup and Login logic remains same, but we can add minor UI feedback)
if (document.getElementById('signup-form')) {
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.innerText = 'Creating Profile...';
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(data));
                window.location.href = 'index.html';
            } else {
                alert(data.message);
                btn.innerText = 'Create Account';
            }
        } catch (err) {
            console.error(err);
            btn.innerText = 'Create Account';
        }
    });
}

if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.innerText = 'Authenticating...';
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(data));
                if (data.role === 'admin') window.location.href = 'admin.html';
                else window.location.href = 'index.html';
            } else {
                alert(data.message);
                btn.innerText = 'Login';
            }
        } catch (err) {
            console.error(err);
            btn.innerText = 'Login';
        }
    });
}

// Geolocation with UI feedback
function getLocation() {
    const btn = document.getElementById('location-btn');
    const display = document.getElementById('location-display');
    btn.innerText = '🛰️ Locating...';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            document.getElementById('latitude').value = position.coords.latitude;
            document.getElementById('longitude').value = position.coords.longitude;
            display.innerText = `📍 Location Locked: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
            display.style.color = 'var(--primary)';
            btn.innerText = '✅ Location Saved';
            btn.style.background = 'rgba(0, 255, 115, 0.15)';
            btn.style.color = 'var(--primary)';
            btn.style.border = '1px solid var(--primary)';
        }, (error) => {
            alert("Error getting location. Please enable location permissions.");
            btn.innerText = '📍 Tag Location';
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Integrated Camera Logic with Scanner Effect
let cameraStream = null;
let capturedBlob = null;

const video = document.getElementById('camera-preview');
const canvas = document.getElementById('photo-canvas');
const photoPreview = document.getElementById('photo-preview');
const scannerOverlay = document.getElementById('scanner-overlay');
const openBtn = document.getElementById('open-camera');
const captureBtn = document.getElementById('capture-photo');
const retakeBtn = document.getElementById('retake-photo');

if (openBtn) {
    openBtn.addEventListener('click', async () => {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' }, 
                audio: false 
            });
            video.srcObject = cameraStream;
            video.style.display = 'block';
            scannerOverlay.style.display = 'block';
            photoPreview.style.display = 'none';
            openBtn.style.display = 'none';
            captureBtn.style.display = 'block';
            retakeBtn.style.display = 'none';
        } catch (err) {
            alert("Could not access camera. Please ensure you have given permission.");
            console.error(err);
        }
    });
}

if (captureBtn) {
    captureBtn.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            capturedBlob = blob;
            const url = URL.createObjectURL(blob);
            photoPreview.src = url;
            photoPreview.style.display = 'block';
            video.style.display = 'none';
            scannerOverlay.style.display = 'none';
            captureBtn.style.display = 'none';
            retakeBtn.style.display = 'block';
            
            // Stop camera stream
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }

            // Automatically get location when photo is clicked
            getLocation();
        }, 'image/jpeg', 0.8);
    });
}

if (retakeBtn) {
    retakeBtn.addEventListener('click', () => {
        openBtn.click();
    });
}

// Submit Report with Success Animation
if (document.getElementById('report-form')) {
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const description = document.getElementById('description').value;
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;

        if (!capturedBlob) {
            alert("Please capture a photo of the garbage first.");
            return;
        }

        if (!latitude || !longitude) {
            alert("Please wait for the location to be captured.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = 'Uploading to Network...';

        const formData = new FormData();
        formData.append('description', description);
        formData.append('image', capturedBlob, 'capture.jpg');
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);

        try {
            const res = await fetch(`${API_URL}/api/reports`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                },
                body: formData
            });
            if (res.ok) {
                // Trigger Success Animation
                const overlay = document.getElementById('success-overlay');
                overlay.style.display = 'flex';
                
                setTimeout(() => {
                    location.reload();
                }, 2500);
            } else {
                const data = await res.json();
                alert(data.message);
                submitBtn.disabled = false;
                submitBtn.innerText = '🚀 Submit to Network';
            }
        } catch (err) {
            console.error(err);
            submitBtn.disabled = false;
            submitBtn.innerText = '🚀 Submit to Network';
        }
    });
}

// Load User Reports with Gamification Logic
async function loadMyReports() {
    try {
        // Fetch latest user data for points
        const userRes = await fetch(`${API_URL}/api/auth/profile`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (userRes.ok) {
            const userData = await userRes.json();
            const points = userData.ecoPoints || 0;
            document.getElementById('user-points').innerHTML = `🌱 ${points} Pts`;
            
            // Update available points in rewards section
            if (document.getElementById('available-points')) {
                document.getElementById('available-points').innerText = points;
            }

            // Update redeem buttons state
            const buttons = document.querySelectorAll('.redeem-btn');
            buttons.forEach(btn => {
                const costMatch = btn.previousElementSibling.querySelector('.reward-cost').innerText.match(/\d+/);
                if (costMatch) {
                    const cost = parseInt(costMatch[0]);
                    if (points >= cost) {
                        btn.classList.remove('disabled');
                    } else {
                        btn.classList.add('disabled');
                    }
                }
            });

            // Progress Bar Logic (Every 100 points is a level)
            const level = Math.floor(points / 100) + 1;
            const progressInLevel = points % 100;
            const progressBar = document.getElementById('points-progress');
            if (progressBar) progressBar.style.width = `${progressInLevel}%`;
            
            // Render Level Badge next to User Name
            let badge = '🌱 Sprout Guardian';
            if (level >= 6 && level <= 10) badge = '🌿 Green Ranger';
            if (level >= 11) badge = '🌲 Eco Legend';
            
            if (document.getElementById('user-name')) {
                document.getElementById('user-name').innerHTML = `${userData.name} <span class="level-badge" style="font-size: 0.75rem; background: rgba(0, 255, 115, 0.15); color: var(--primary); padding: 4px 10px; border-radius: 50px; margin-left: 10px; font-weight: 700; border: 1px solid rgba(0,255,115,0.3);">${badge} (Lv. ${level})</span>`;
            }
            
            // Add level indicator if you want, but sticking to progress for now
        }

        const res = await fetch(`${API_URL}/api/reports/myreports`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const reports = await res.json();
        const list = document.getElementById('reports-list');
        
        if (reports.length === 0) {
            list.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; opacity: 0.5;">No actions logged yet. Start your journey above! 🌿</p>';
            return;
        }

        list.innerHTML = reports.map(report => `
            <div class="card mb-3">
                ${report.cleanedImageUrl ? `
                <div class="comparison-slider">
                    <img src="${report.cleanedImageUrl}" alt="After" class="after-image">
                    <img src="${report.imageUrl}" alt="Before" class="before-image" id="before-${report._id}">
                    <input type="range" class="slider-input" min="0" max="100" value="50" oninput="updateSlider('${report._id}', this.value)">
                    <div class="slider-handle-line" id="line-${report._id}"></div>
                    <div class="slider-handle-button" id="btn-${report._id}"></div>
                </div>
                ` : `
                <div class="card-img-wrapper single-image">
                    <img src="${report.imageUrl}" alt="Before">
                </div>
                `}
                <div class="report-info">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                        <span class="status-badge" style="position: relative; top: 0; right: 0;">${report.status}</span>
                        <small style="font-weight: 700; color: var(--text-muted);">${new Date(report.createdAt).toLocaleDateString()}</small>
                    </div>
                    <p style="font-weight: 500; line-height: 1.4; color: var(--text-main);">${report.description}</p>
                    <div style="display: flex; gap: 8px; margin: 8px 0; flex-wrap: wrap;">
                        <span style="background: rgba(0, 255, 115, 0.1); color: var(--primary); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">🏷️ ${report.category || 'General'}</span>
                        <span style="background: rgba(251, 191, 36, 0.1); color: var(--accent); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">⚠️ Severity: ${report.aiSeverity || 'Low'}</span>
                    </div>
                    ${report.status === 'Completed' ? `
                    <div class="feedback-section">
                        <span class="feedback-title">Cleanup Quality</span>
                        ${report.rating ? `
                            <div class="static-stars">${'⭐'.repeat(report.rating)}</div>
                        ` : `
                            <div class="star-rating" id="rating-container-${report._id}">
                                <input type="radio" id="star5-${report._id}" name="rating-${report._id}" value="5" onchange="submitRating('${report._id}', 5)"><label for="star5-${report._id}">⭐</label>
                                <input type="radio" id="star4-${report._id}" name="rating-${report._id}" value="4" onchange="submitRating('${report._id}', 4)"><label for="star4-${report._id}">⭐</label>
                                <input type="radio" id="star3-${report._id}" name="rating-${report._id}" value="3" onchange="submitRating('${report._id}', 3)"><label for="star3-${report._id}">⭐</label>
                                <input type="radio" id="star2-${report._id}" name="rating-${report._id}" value="2" onchange="submitRating('${report._id}', 2)"><label for="star2-${report._id}">⭐</label>
                                <input type="radio" id="star1-${report._id}" name="rating-${report._id}" value="1" onchange="submitRating('${report._id}', 1)"><label for="star1-${report._id}">⭐</label>
                            </div>
                        `}
                    </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

// (Admin logic remains largely the same but would benefit from similar UI updates in admin.html)
// Load All Reports (Admin)
async function loadAllReports() {
    try {
        const res = await fetch(`${API_URL}/api/reports/grouped`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const clusters = await res.json();
        
        const container = document.getElementById('location-groups-container');
        if (!container) return; // Not on admin page
        
        container.innerHTML = '';
        
        if (clusters.length === 0) {
            container.innerHTML = '<p class="text-center text-muted" style="padding: 3rem;">No reports submitted globally yet. 🌍</p>';
            return;
        }

        clusters.forEach((cluster) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'glass-panel';
            groupEl.style.overflow = 'hidden';
            groupEl.style.marginBottom = '1.5rem';

            const header = document.createElement('div');
            header.style.padding = '1.5rem 2rem';
            header.style.cursor = 'pointer';
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.flexWrap = 'wrap';
            header.style.gap = '10px';
            header.style.background = 'rgba(0, 0, 0, 0.2)';
            header.style.transition = 'background 0.3s';
            header.onmouseover = () => header.style.background = 'rgba(0, 255, 115, 0.05)';
            header.onmouseout = () => header.style.background = 'rgba(0, 0, 0, 0.2)';
            
            header.innerHTML = `
                <h3 style="margin: 0; color: var(--primary); font-size: 1.4rem;">📍 ${cluster.locationName} <span style="font-size: 1rem; font-weight: 500; color: var(--text-muted); margin-left: 10px;">(${cluster.reports.length} Reports)</span></h3>
                <span id="icon-${cluster.id}" style="font-size: 1.2rem; color: var(--text-muted);">▼</span>
            `;

            // Accordion Content (The reports grid)
            const content = document.createElement('div');
            content.id = `content-${cluster.id}`;
            content.style.display = 'none';
            content.style.padding = '2rem';
            content.style.borderTop = '1px solid var(--panel-border)';
            
            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))';
            grid.style.gap = '2rem';

            // Populate reports
            cluster.reports.forEach(report => {
                const card = document.createElement('div');
                card.className = 'card mb-3';
                card.id = `report-${report._id}`;
                card.innerHTML = `
                    ${report.cleanedImageUrl ? `
                    <div class="comparison-slider">
                        <img src="${report.cleanedImageUrl}" alt="After" class="after-image">
                        <img src="${report.imageUrl}" alt="Before" class="before-image" id="before-${report._id}">
                        <input type="range" class="slider-input" min="0" max="100" value="50" oninput="updateSlider('${report._id}', this.value)">
                        <div class="slider-handle-line" id="line-${report._id}"></div>
                        <div class="slider-handle-button" id="btn-${report._id}"></div>
                    </div>
                    ` : `
                    <div class="card-img-wrapper single-image">
                        <img src="${report.imageUrl}" alt="Before">
                    </div>
                    `}
                    <div class="report-info">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <div style="font-size: 0.8rem; font-weight: 800; color: var(--secondary); letter-spacing: 1px;">PRIORITY TIER: ${report.priority}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;" title="Geolocation">
                                📍 ${parseFloat(report.latitude).toFixed(5)}, ${parseFloat(report.longitude).toFixed(5)}
                            </div>
                        </div>
                        <p style="margin-bottom: 0.5rem;"><strong style="color: var(--primary);">${report.userId ? report.userId.name : 'Unknown User'}</strong></p>
                        <p style="font-size: 0.95rem; margin: 0.8rem 0; color: var(--text-main); line-height: 1.5;">"${report.description}"</p>
                        <div style="display: flex; gap: 8px; margin-bottom: 1rem; flex-wrap: wrap;">
                            <span style="background: rgba(139, 92, 246, 0.15); color: #c4b5fd; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">🏷️ Category: ${report.category || 'General'}</span>
                            <span style="background: rgba(251, 191, 36, 0.15); color: var(--accent); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">⚠️ Severity: ${report.aiSeverity || 'Low'}</span>
                        </div>
                        ${report.rating ? `
                            <div class="feedback-section" style="margin-bottom: 10px; border:none; padding:0; gap:2px;">
                                <span class="feedback-title">Citizen Feedback</span>
                                <div class="static-stars">${'⭐'.repeat(report.rating)}</div>
                            </div>
                        ` : ''}
                        <div class="status-control mt-4">
                            ${report.status === 'Completed' ? 
                                `<span class="status-badge" style="position: relative; top: 0; right: 0; display: block; text-align: center; background: rgba(0, 255, 115, 0.2); color: var(--primary);">Completed</span>` : 
                                `<select class="form-input" id="status-${report._id}" onchange="toggleCleanedImageInput('${report._id}')" style="padding: 0.8rem; margin-bottom: 0.5rem; font-weight: bold;">
                                    <option value="Pending" ${report.status === 'Pending' ? 'selected' : ''}>Pending ⏳</option>
                                    <option value="In Progress" ${report.status === 'In Progress' ? 'selected' : ''}>In Progress ⚡</option>
                                    <option value="Completed" ${report.status === 'Completed' ? 'selected' : ''}>Completed 🌳</option>
                                </select>`
                            }
                            <div id="cleaned-image-input-${report._id}" style="display: none; margin-top: 10px;">
                                <label style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; display: block;">Upload Cleaned Verification Image</label>
                                <input type="file" id="file-${report._id}" accept="image/*" class="form-input" style="padding: 0.5rem;">
                            </div>
                            ${report.status !== 'Completed' ? `<button class="btn-secondary" onclick="saveAdminUpdate('${report._id}')" style="margin-top: 15px; padding: 0.8rem 1rem; font-size: 0.9rem; width: 100%;">Save Update</button>` : ''}
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });

            content.appendChild(grid);
            
            // Toggle Logic
            header.addEventListener('click', () => {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                document.getElementById(`icon-${cluster.id}`).innerText = isHidden ? '▲' : '▼';
            });

            groupEl.appendChild(header);
            groupEl.appendChild(content);
            container.appendChild(groupEl);
        });
    } catch (err) {
        console.error(err);
    }
}

function toggleCleanedImageInput(id) {
    const status = document.getElementById(`status-${id}`).value;
    const inputDiv = document.getElementById(`cleaned-image-input-${id}`);
    if (status === 'Completed') {
        inputDiv.style.display = 'block';
    } else {
        inputDiv.style.display = 'none';
    }
}

async function saveAdminUpdate(id) {
    const status = document.getElementById(`status-${id}`).value;
    const fileInput = document.getElementById(`file-${id}`);
    
    const formData = new FormData();
    formData.append('status', status);

    if (status === 'Completed') {
        if (fileInput.files.length > 0) {
            formData.append('cleanedImage', fileInput.files[0]);
        } else {
            alert("Please upload an image of the cleaned area to complete the report.");
            return;
        }
    }

    try {
        const res = await fetch(`${API_URL}/api/reports/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${user.token}` },
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            alert("Report updated! Points awarded.");
            loadAllReports();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}

async function submitRating(id, rating) {
    try {
        const res = await fetch(`${API_URL}/api/reports/${id}/rate`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}` 
            },
            body: JSON.stringify({ rating })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            loadMyReports(); // reload to show static stars
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}

async function redeemReward(points, reward) {
    if (!confirm(`Redeem ${points} points for ${reward}?`)) return;

    try {
        const res = await fetch(`${API_URL}/api/auth/redeem`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}` 
            },
            body: JSON.stringify({ points, reward })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`${data.message}\n\nYOUR REDEEM CODE: ${data.redeemCode}\n\nPlease save this code to claim your reward!`);
            // Refresh reports and points
            loadMyReports();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}

// Logout
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Leaderboard Loading
async function loadLeaderboard() {
    try {
        const res = await fetch(`${API_URL}/api/auth/leaderboard`);
        const users = await res.json();
        const list = document.getElementById('leaderboard-list');
        if(!list) return;
        
        list.innerHTML = users.map((u, index) => {
            const points = u.ecoPoints || 0;
            const level = Math.floor(points / 100) + 1;
            let badge = '🌱 Sprout Guardian';
            if (level >= 6 && level <= 10) badge = '🌿 Green Ranger';
            if (level >= 11) badge = '🌲 Eco Legend';
            
            return `
                <li>
                    <span class="rank">#${index + 1}</span>
                    <div style="flex: 1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                        <span class="name" style="font-weight: 600;">${u.name} <span style="font-size: 0.75rem; opacity: 0.8; margin-left: 6px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.05);">${badge} (Lv. ${level})</span></span>
                        <span class="points">🌱 ${u.ecoPoints} Pts</span>
                    </div>
                </li>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadAdminWarriors() {
    try {
        const res = await fetch(`${API_URL}/api/auth/users`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const users = await res.json();
        const list = document.getElementById('admin-warriors-list');
        if(!list) return;
        
        list.innerHTML = users.map((u, index) => {
            const points = u.ecoPoints || 0;
            const level = Math.floor(points / 100) + 1;
            let badge = '🌱 Sprout Guardian';
            if (level >= 6 && level <= 10) badge = '🌿 Green Ranger';
            if (level >= 11) badge = '🌲 Eco Legend';
            
            return `
                <tr>
                    <td style="padding: 1rem 0.5rem; font-weight: 700; color: var(--primary);">#${index + 1}</td>
                    <td style="padding: 1rem 0.5rem;">
                        <div style="font-weight: 600;">${u.name}</div>
                        <div style="font-size: 0.75rem; margin-top: 4px;"><span style="background: rgba(0, 255, 115, 0.1); color: var(--primary); padding: 2px 6px; border-radius: 4px; font-weight: 700;">Lv. ${level} ${badge}</span></div>
                    </td>
                    <td style="padding: 1rem 0.5rem; color: var(--text-muted);">${u.email}</td>
                    <td style="padding: 1rem 0.5rem;"><span class="points" style="color: var(--accent); font-weight: 700; background: rgba(251, 191, 36, 0.1); padding: 0.2rem 0.8rem; border-radius: 20px;">🌱 ${u.ecoPoints} Pts</span></td>
                    <td style="padding: 1rem 0.5rem; color: var(--text-muted);">${new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        const list = document.getElementById('admin-warriors-list');
        if(list) list.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Failed to load eco-warriors list.</td></tr>`;
    }
}

let allRedemptions = [];

async function loadAdminRedemptions() {
    try {
        const res = await fetch(`${API_URL}/api/auth/redemptions`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
        });
        allRedemptions = await res.json();
        renderRedemptionsTable(allRedemptions);
    } catch (err) {
        console.error(err);
        const list = document.getElementById('admin-redemptions-list');
        if(list) list.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Failed to load redemptions log.</td></tr>`;
    }
}

function renderRedemptionsTable(data) {
    const list = document.getElementById('admin-redemptions-list');
    if(!list) return;

    if (data.length === 0) {
        list.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No redemptions found.</td></tr>`;
        return;
    }

    list.innerHTML = data.map(r => {
        const userName = r.userId ? r.userId.name : 'Unknown User';
        const userEmail = r.userId ? r.userId.email : '';
        const isApproved = r.status === 'Approved';
        
        return `
            <tr>
                <td style="padding: 1rem 0.5rem;">
                    <div style="font-weight: 600;">${userName}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${userEmail}</div>
                </td>
                <td style="padding: 1rem 0.5rem; font-weight: 500;">${r.reward}</td>
                <td style="padding: 1rem 0.5rem;"><code style="font-family: monospace; font-size: 0.95rem; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; color: var(--primary); font-weight: 700; border: 1px solid rgba(0,255,115,0.2);">${r.code}</code></td>
                <td style="padding: 1rem 0.5rem; font-weight: 700; color: var(--accent);">💰 ${r.points} Pts</td>
                <td style="padding: 1rem 0.5rem;">
                    <span style="padding: 4px 10px; border-radius: 50px; font-size: 0.75rem; font-weight: 800; border: 1px solid ${isApproved ? 'rgba(0, 255, 115, 0.4)' : 'rgba(251, 191, 36, 0.4)'}; background: ${isApproved ? 'rgba(0, 255, 115, 0.1)' : 'rgba(251, 191, 36, 0.1)'}; color: ${isApproved ? 'var(--primary)' : 'var(--accent)'};">
                        ${r.status}
                    </span>
                </td>
                <td style="padding: 1rem 0.5rem;">
                    ${isApproved 
                        ? `<button class="btn-secondary disabled" style="padding: 4px 10px; font-size: 0.75rem;" disabled>Disbursed</button>`
                        : `<button class="btn-primary" onclick="disburseRedemption('${r._id}')" style="padding: 4px 10px; font-size: 0.75rem;">Disburse</button>`
                    }
                </td>
            </tr>
        `;
    }).join('');
}

function filterRedemptions() {
    const query = document.getElementById('redemption-search').value.toLowerCase().trim();
    if (!query) {
        renderRedemptionsTable(allRedemptions);
        return;
    }

    const filtered = allRedemptions.filter(r => {
        const userName = r.userId ? r.userId.name.toLowerCase() : '';
        const userEmail = r.userId ? r.userId.email.toLowerCase() : '';
        const code = r.code.toLowerCase();
        const reward = r.reward.toLowerCase();
        
        return userName.includes(query) || userEmail.includes(query) || code.includes(query) || reward.includes(query);
    });

    renderRedemptionsTable(filtered);
}

async function disburseRedemption(id) {
    if(!confirm('Mark this reward as disbursed/completed?')) return;

    try {
        const res = await fetch(`${API_URL}/api/auth/redemptions/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
            }
        });
        
        if (res.ok) {
            alert('Reward marked as Disbursed/Approved!');
            loadAdminRedemptions();
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
    }
}

async function checkCleanupNotifications() {
    try {
        const res = await fetch(`${API_URL}/api/reports/notifications`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const reports = await res.json();
        
        if (reports && reports.length > 0) {
            const r = reports[0];
            
            const descEl = document.getElementById('alert-modal-desc');
            const sliderWrapper = document.getElementById('alert-modal-slider-wrapper');
            const modal = document.getElementById('alert-modal-container');
            
            if (descEl && sliderWrapper && modal) {
                descEl.innerText = `Hooray! The garbage hotspot you reported ("${r.description}") has been successfully cleaned up and verified! You have been awarded +50 Eco-Points.`;
                
                // Construct the comparison slider HTML
                sliderWrapper.innerHTML = `
                    <div class="comparison-slider" style="margin: 0;">
                        <img src="${r.cleanedImageUrl}" alt="After" class="after-image">
                        <img src="${r.imageUrl}" alt="Before" class="before-image" id="before-alert-${r._id}">
                        <input type="range" class="slider-input" min="0" max="100" value="50" oninput="updateSlider('alert-${r._id}', this.value)">
                        <div class="slider-handle-line" id="line-alert-${r._id}"></div>
                        <div class="slider-handle-button" id="btn-alert-${r._id}"></div>
                    </div>
                `;
                
                // Show the modal
                modal.style.display = 'flex';
                
                // Set up the default slider clip-path
                setTimeout(() => {
                    updateSlider(`alert-${r._id}`, 50);
                }, 100);
            }
        }
    } catch (err) {
        console.error('Error checking notifications:', err);
    }
}

async function dismissAlertModal() {
    const modal = document.getElementById('alert-modal-container');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Send acknowledgement to backend
    try {
        await fetch(`${API_URL}/api/reports/notifications/ack`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
            }
        });
    } catch (err) {
        console.error('Failed to acknowledge notification:', err);
    }
}

function startOnboardingTour() {
    if (typeof window.driver === 'undefined' || typeof window.driver.js === 'undefined') {
        console.error('Driver.js is not loaded yet.');
        return;
    }

    const driverObj = window.driver.js.driver({
        showProgress: true,
        steps: [
            {
                element: '#report-section',
                popover: {
                    title: '📸 Log a Discovery',
                    description: 'Capture a photo of litter, specify the details, tag your geolocation, and upload it. The network will verify it and you will earn Eco-Points!',
                    side: 'bottom',
                    align: 'start'
                }
            },
            {
                element: '#heatmap-section',
                popover: {
                    title: '🗺️ Waste Hotspots',
                    description: 'View real-time, density-weighted hotspots needing restoration in your community.',
                    side: 'top',
                    align: 'start'
                }
            },
            {
                element: '#rewards-section',
                popover: {
                    title: '🚌 Redeeming Eco-Incentives',
                    description: 'Redeem your hard-earned Eco-Points here for Cafe Coupons, Light Bill Discounts, or Transit Passes!',
                    side: 'top',
                    align: 'start'
                }
            }
        ],
        onDestroyed: () => {
            localStorage.setItem('trashgo-tour-completed', 'true');
        }
    });

    driverObj.drive();
}

// Heatmap Initialization
async function initHeatmap() {
    const container = document.getElementById('heatmap-container');
    if (!container) return; // not on page where heatmap exists

    try {
        const res = await fetch(`${API_URL}/api/reports/heatmap`, {
            headers: user ? { 'Authorization': `Bearer ${user.token}` } : {}
        });
        const reports = await res.json();
        
        // Default center
        let center = [0, 0];
        if(reports.length > 0) {
            center = [reports[0].latitude, reports[0].longitude];
        }

        const map = L.map('heatmap-container').setView(center, 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        const heatData = reports.map(r => [r.latitude, r.longitude, 0.5 + (r.priority * 0.1)]);
        
        L.heatLayer(heatData, {
            radius: 35,
            blur: 25,
            maxZoom: 14,
            minOpacity: 0.6,
            gradient: {0.3: 'blue', 0.5: 'lime', 0.7: 'yellow', 1.0: 'red'}
        }).addTo(map);
        
    } catch (err) {
        console.error("Heatmap Load Error", err);
    }
}

// Time-lapse Slider Update
function updateSlider(id, value) {
    const beforeImg = document.getElementById(`before-${id}`);
    const line = document.getElementById(`line-${id}`);
    const btn = document.getElementById(`btn-${id}`);
    
    if(beforeImg) beforeImg.style.clipPath = `polygon(0 0, ${value}% 0, ${value}% 100%, 0 100%)`;
    if(line) line.style.left = `${value}%`;
    if(btn) btn.style.left = `${value}%`;
}
