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
const TWITCH_REDIRECT_URI = 'http://localhost:3000/auth/twitch/callback';
const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(TWITCH_REDIRECT_URI)}&response_type=code&scope=user:read:email&state=${Math.random().toString(36).substring(2)}`;

// StreamElements Configuration
const channelId = '6658bffc3137495d33b0a3f7';

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
        const response = await fetch(`http://localhost:3000/api/points/${username}`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data.points;
    } catch (error) {
        console.error('Error fetching points:', error);
        return null;
    }
}

// Display points
async function displayPoints(username) {
    const points = await fetchViewerPoints(username);
    if (points !== null) {
        pointsDisplay.textContent = `Points: ${points}`;
    } else {
        pointsDisplay.textContent = 'Points: 0';
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
        const response = await fetch('http://localhost:3000/api/giveaway/get', {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        const giveaway = await response.json();
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

        // Handle Profile page access when not logged in
        if (pageId === 'profile-page' && !user) {
            profilePage.innerHTML = '<h2>Profile</h2><p>Please log in to view your profile.</p>';
        }
        // Update giveaway UI when navigating to Giveaway page
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
    const sessionToken = getCookie('session_token');
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

    // Handle OAuth callback
    const userDataQuery = urlParams.get('user');
    if (userDataQuery) {
        user = JSON.parse(decodeURIComponent(userDataQuery));
        updateUserUI(user);
        window.history.replaceState({}, document.title, window.location.pathname);
        updateGiveawayUI();
        return;
    }

    // Verify existing session
    if (sessionToken) {
        try {
            const response = await fetch('http://localhost:3000/auth/verify-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ session_token: sessionToken })
            });
            const userData = await response.json();
            if (userData.error) {
                console.error('Session verification error:', userData.error);
                document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
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
            console.error('Error verifying session:', error);
            document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
            loginBtn.style.display = 'inline-block';
            pointsDisplay.textContent = '';
            if (profilePage.classList.contains('active')) {
                profilePage.innerHTML = '<h2>Profile</h2><p>Please log in to view your profile.</p>';
            }
            updateGiveawayUI();
        }
    } else {
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
    window.location.href = TWITCH_AUTH_URL;
});

// Handle logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            const sessionToken = getCookie('session_token');
            if (sessionToken) {
                await fetch('http://localhost:3000/api/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ session_token: sessionToken })
                });
            }
            user = null;
            document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
            pointsDisplay.textContent = '';
            loginBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            profilePage.innerHTML = '<h2>Profile</h2><p>Please log in to view your profile.</p>';
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById('home-page').classList.add('active');
            updateGiveawayUI();
        } catch (error) {
            console.error('Error during logout:', error);
        }
    });
}

// Handle giveaway creation
if (createGiveawayBtn) {
    adminGiveawayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (user && user.login === 'airfalconx') {
            const pointsRequired = parseInt(document.getElementById('giveaway-points').value);
            if (pointsRequired < 1) {
                alert('Points required must be at least 1');
                return;
            }
            try {
                const response = await fetch('http://localhost:3000/api/giveaway/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ pointsRequired })
                });
                const result = await response.json();
                if (result.error) throw new Error(result.error);
                alert('Giveaway created successfully!');
                document.getElementById('giveaway-points').value = '';
                updateGiveawayUI();
            } catch (error) {
                console.error('Error creating giveaway:', error);
                alert('Failed to create giveaway');
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
        try {
            const response = await fetch('http://localhost:3000/api/giveaway/enter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username: user.login })
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            alert('Entered giveaway successfully!');
            displayPoints(user.login); // Update navbar points
            await fetch('http://localhost:3000/api/giveaway/attend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ twitch_id: user.id })
            });
            updateGiveawayUI();
        } catch (error) {
            console.error('Error entering giveaway:', error);
            alert(error.message || 'Failed to enter giveaway');
        }
    });
}