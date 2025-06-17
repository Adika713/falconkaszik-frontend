const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const pointsDisplay = document.getElementById('points-display');
const profilePage = document.getElementById('profile-page');
const profilePic = document.getElementById('profile-pic');
const profileUsername = document.getElementById('profile-username');
const giveawaysAttended = document.getElementById('giveaways-attended');
const giveawaysWon = document.getElementById('giveaways-won');
const navLinks = document.querySelectorAll('.navbar a');
const pages = document.querySelectorAll('.page');
const adminGiveawayForm = document.getElementById('admin-giveaway-form');
const giveawayContent = document.getElementById('giveaway-content');
const noGiveaway = document.getElementById('no-giveaway');
const userGiveaway = document.getElementById('user-giveaway');
const giveawayPointsDisplay = document.getElementById('giveaway-points-display');
const createGiveawayBtn = document.getElementById('create-giveaway-btn');
const enterGiveawayBtn = document.getElementById('enter-giveaway-btn');

// Twitch OAuth Configuration
const TWITCH_CLIENT_ID = 'z2n5k9lu6ja19cq64d1n1pekwr8pcj';
const TWITCH_REDIRECT_URI = 'https://falconkaszik-backend.onrender.com/auth/twitch/callback';
const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(TWITCH_REDIRECT_URI)}&response_type=code&scope=user:read:email&state=${Math.random().toString(36).substring(2)}`;

// StreamElements Configuration
const channelId = '6658bffc3137495d33b0a3f7';
const API_BASE_URL = 'https://falconkaszik-backend.onrender.com';

let user = null;

// Get cookie by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Fetch viewer points
async function fetchViewerPoints(username) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/points/${username.toLowerCase()}`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        const data = await response.json();
        console.log('Points fetch response:', data);
        if (data.error) throw new Error(data.details || data.error);
        return data.points;
    } catch (error) {
        console.error('Error fetching points:', error);
        alert(`Failed to fetch points: ${error.message}. Please check StreamElements JWT.`);
        return null;
    }
}

// Display points
async function displayPoints(username) {
    const points = await fetchViewerPoints(username);
    if (points !== null) {
        pointsDisplay.textContent = `Points: ${points}`;
    } else {
        pointsDisplay.textContent = 'Points: N/A';
    }
}

// Update giveaway UI
async function updateGiveawayUI() {
    if (!user) {
        noGiveaway.style.display = 'block';
        userGiveaway.style.display = 'none';
        if (adminGiveawayForm) adminGiveawayForm.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/giveaway/get`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        const giveaway = await response.json();
        console.log('Giveaway fetch response:', giveaway);
        if (giveaway.error) throw new Error(giveaway.error);

        if (user.login === 'airfalconx') {
            adminGiveawayForm.style.display = 'block';
        } else {
            adminGiveawayForm.style.display = 'none';
        }

        if (giveaway.active) {
            noGiveaway.style.display = 'none';
            userGiveaway.style.display = 'block';
            giveawayPointsDisplay.textContent = giveaway.pointsRequired;
        } else {
            noGiveaway.style.display = 'block';
            userGiveaway.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching giveaway:', error);
        noGiveaway.style.display = 'block';
        userGiveaway.style.display = 'none';
    }
}

// Handle page navigation
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.getAttribute('data-page') + '-page';
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');

        if (pageId === 'profile-page' && !user) {
            profilePage.innerHTML = '<h2>Profile</h2><p>Please log in to view your profile.</p>';
        }
        if (pageId === 'giveaway-page') {
            updateGiveawayUI();
        }
    });
});

// Update UI with user data
function updateUserUI(userData) {
    loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (profilePic) profilePic.src = userData.profile_image_url;
    if (profileUsername) profileUsername.textContent = userData.display_name;
    if (giveawaysAttended) giveawaysAttended.textContent = userData.giveaways_attended || 0;
    if (giveawaysWon) giveawaysWon.textContent = userData.giveaways_won || 0;
    displayPoints(userData.login);
}

// Load user data on page load
window.addEventListener('load', async () => {
    const token = getCookie('jwt_token');
    console.log('Page load, token found:', !!token);
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error) {
        console.error('Authentication error:', error);
        loginBtn.style.display = 'inline-block';
        pointsDisplay.textContent = '';
        if (profilePage.classList.contains('active')) {
            profilePage.innerHTML = '<h2>Profile</h2><p>Please log in to view your profile.</p>';
        }
        updateGiveawayUI();
        return;
    }

    const userDataQuery = urlParams.get('user');
    if (userDataQuery) {
        user = JSON.parse(decodeURIComponent(userDataQuery));
        console.log('User data from query:', user);
        updateUserUI(user);
        window.history.replaceState({}, document.title, window.location.pathname);
        updateGiveawayUI();
        return;
    }

    if (token) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ jwt_token: token })
            });
            const userData = await response.json();
            console.log('Token verification response:', userData);
            if (userData.error) {
                console.error('Token verification error:', userData.error);
                document.cookie = 'jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure';
                loginBtn.style.display = 'inline-block';
                pointsDisplay.textContent = '';
                if (profilePage.classList.contains('active')) {
                    profilePage.innerHTML = '<h2>Profile</h2><p>Please log in to view your profile.</p>';
                }
                updateGiveawayUI();
                return;
            }
            user = userData;
            updateUserUI(user);
            updateGiveawayUI();
        } catch (error) {
            console.error('Error verifying token:', error);
            document.cookie = 'jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure';
            loginBtn.style.display = 'inline-block';
            pointsDisplay.textContent = '';
            if (profilePage.classList.contains('active')) {
                profilePage.innerHTML = '<h2>Profile</h2><p>Please log in to view your profile.</p>';
            }
            updateGiveawayUI();
        }
    } else {
        console.log('No token found on load');
        loginBtn.style.display = 'inline-block';
        pointsDisplay.textContent = '';
        if (profilePage.classList.contains('active')) {
            profilePage.innerHTML = '<h2>Profile</h2><p>Please log in to view your profile.</p>';
        }
        updateGiveawayUI();
    }
});

// Handle login
loginBtn.addEventListener('click', () => {
    console.log('Login clicked, redirecting to:', TWITCH_AUTH_URL);
    window.location.href = TWITCH_AUTH_URL;
});

// Handle logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        console.log('Logout clicked');
        user = null;
        document.cookie = 'jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure';
        pointsDisplay.textContent = '';
        loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        profilePage.innerHTML = '<h2>Profile</h2><p>Please log in to view your profile.</p>';
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById('home-page').classList.add('active');
        updateGiveawayUI();
    });
}

// Handle giveaway creation
if (createGiveawayBtn) {
    adminGiveawayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (user && user.login === 'airfalconx') {
            const pointsRequired = parseInt(document.getElementById('giveaway-points').value);
            console.log('Creating giveaway with points:', pointsRequired);
            if (pointsRequired < 1) {
                alert('Points required must be at least 1');
                return;
            }
            try {
                const token = getCookie('jwt_token');
                const response = await fetch(`${API_BASE_URL}/api/giveaway/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ pointsRequired, jwt_token: token })
                });
                const result = await response.json();
                console.log('Giveaway creation response:', result);
                if (result.error) throw new Error(result.error);
                alert('Giveaway created successfully!');
                document.getElementById('giveaway-points').value = '';
                updateGiveawayUI();
            } catch (error) {
                console.error('Error creating giveaway:', error);
                alert(error.message || 'Failed to create giveaway');
            }
        }
    });
}

// Handle giveaway entry
if (enterGiveawayBtn) {
    enterGiveawayBtn.addEventListener('click', async () => {
        if (!user) {
            alert('Please log in to enter the giveaway');
            return;
        }
        console.log('Entering giveaway for user:', user.login);
        try {
            const token = getCookie('jwt_token');
            const response = await fetch(`${API_BASE_URL}/api/giveaway/enter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username: user.login, jwt_token: token })
            });
            const result = await response.json();
            console.log('Giveaway entry response:', result);
            if (result.error) throw new Error(result.error);
            alert('Entered giveaway successfully!');
            displayPoints(user.login);
            await fetch(`${API_BASE_URL}/api/giveaway/attend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ twitch_id: user.id, jwt_token: token })
            });
            updateGiveawayUI();
        } catch (error) {
            console.error('Error entering giveaway:', error);
            alert(error.message || 'Failed to enter giveaway');
        }
    });
}