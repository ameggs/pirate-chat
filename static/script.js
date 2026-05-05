const API = {
    send: '/send',
    upload: '/upload',
    messages: '/messages',
};

let username = localStorage.getItem('popupchat_username') || '';
let lastMessageId = 0;
let polling = false;

// --- DOM refs ---
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const chatContainer = document.getElementById('chat-container');
const messagesEl = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const uploadBtn = document.getElementById('upload-btn');
const imageInput = document.getElementById('image-input');
const logoutBtn = document.getElementById('logout-btn');
const userBadge = document.getElementById('user-badge');

// --- Init ---
function init() {
    if (username) {
        enterChat(username);
    } else {
        loginModal.style.display = 'flex';
        chatContainer.style.display = 'none';
        usernameInput.focus();
    }
}

function enterChat(name) {
    username = name;
    localStorage.setItem('popupchat_username', username);
    loginModal.style.display = 'none';
    chatContainer.style.display = 'flex';
    userBadge.textContent = username;
    startPolling();
}

// --- Login ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = usernameInput.value.trim();
    if (name) enterChat(name);
});

// --- Logout ---
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('popupchat_username');
    username = '';
    polling = false;
    chatContainer.style.display = 'none';
    loginModal.style.display = 'flex';
    usernameInput.value = '';
    usernameInput.focus();
    messagesEl.innerHTML = '';
    lastMessageId = 0;
});

// --- Send message ---
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    sendBtn.disabled = true;
    try {
        const res = await fetch(API.send, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, message: text }),
        });
        if (res.ok) {
            messageInput.value = '';
            messageInput.focus();
        }
    } catch (err) {
        console.error('Send failed:', err);
    } finally {
        sendBtn.disabled = false;
    }
});

// --- Upload image ---
uploadBtn.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview overlay
    const overlay = document.createElement('div');
    overlay.className = 'upload-overlay';
    overlay.innerHTML = `
        <img src="${URL.createObjectURL(file)}" class="upload-preview" />
        <div class="upload-actions">
            <button class="btn-cancel" id="upload-cancel">Cancel</button>
            <button class="btn-send-img" id="upload-send">Send Photo</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // Wait for action
    const result = await new Promise((resolve) => {
        overlay.querySelector('#upload-send').addEventListener('click', () => resolve('send'));
        overlay.querySelector('#upload-cancel').addEventListener('click', () => resolve('cancel'));
    });

    if (result === 'send') {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('image', file);
        try {
            await fetch(API.upload, { method: 'POST', body: formData });
        } catch (err) {
            console.error('Upload failed:', err);
        }
    }

    overlay.remove();
    imageInput.value = '';
});

// --- Poll messages ---
async function startPolling() {
    if (polling) return;
    polling = true;
    while (polling) {
        try {
            await fetchMessages();
        } catch (err) {
            console.error('Poll failed:', err);
        }
        await sleep(2000);
    }
}

async function fetchMessages() {
    const res = await fetch(API.messages);
    const messages = await res.json();
    const newMsgs = messages.filter(m => m.id > lastMessageId);
    for (const msg of newMsgs) {
        appendMessage(msg);
        if (msg.id > lastMessageId) lastMessageId = msg.id;
    }
    if (newMsgs.length > 0) {
        scrollToBottom();
    }
}

// --- Render single message ---
function appendMessage(msg) {
    const isOwn = msg.username === username;
    const div = document.createElement('div');
    div.className = `message ${isOwn ? 'own' : 'other'}`;

    let html = '';

    // Username label (only for others' messages)
    if (!isOwn) {
        html += `<div class="message-username">${escapeHtml(msg.username)}</div>`;
    }

    // Build bubble content
    let bubbleContent = '';
    if (msg.image_url) {
        bubbleContent += `<img src="${msg.image_url}" class="message-image" loading="lazy" onclick="viewImage(this.src)" />`;
    }
    if (msg.message) {
        bubbleContent += `<div class="message-text">${escapeHtml(msg.message)}</div>`;
    }

    // Only show bubble if there's content
    if (bubbleContent) {
        const padding = msg.image_url && !msg.message ? 'padding: 4px;' : '';
        html += `<div class="message-bubble" style="${padding}background: ${isOwn ? 'var(--bubble-own)' : 'var(--bubble-other)'}">${bubbleContent}</div>`;
    }

    html += `<div class="message-time">${formatTime(msg.timestamp)}</div>`;
    div.innerHTML = html;
    messagesEl.appendChild(div);
}

// --- Image viewer ---
function viewImage(src) {
    const viewer = document.createElement('div');
    viewer.className = 'image-viewer';
    viewer.innerHTML = `<img src="${src}" />`;
    viewer.addEventListener('click', () => viewer.remove());
    document.body.appendChild(viewer);
}

// --- Helpers ---
function formatTime(ts) {
    const d = new Date(ts * 1000);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    if (isToday) return `${hours}:${mins}`;
    return `${d.getMonth() + 1}/${d.getDate()} ${hours}:${mins}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function scrollToBottom() {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
}

// --- Start ---
init();
