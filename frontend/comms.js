/**
 * La French - Multi-Channel Comms & Group Scheduler
 * Handles WhatsApp, Telegram, Facebook, and Instagram Broadcast formatting & scheduling.
 */

let commsData = {
    groups: [],
    messages: []
};

let currentPlatformFilter = 'all';
let currentStatusFilter = 'all';
let currentActiveTab = 'queue';
let currentWeekOffset = 0;
let modalSelectedPreviewPlatform = 'whatsapp';
let cardSelectedPlatforms = {}; // maps msgId -> 'whatsapp' | 'telegram' | 'facebook' | 'instagram'

document.addEventListener('DOMContentLoaded', () => {
    initClock();
    fetchCommsData();
});

function initClock() {
    function updateClock() {
        const el = document.getElementById('headerBcnClock');
        if (!el) return;
        const now = new Date();
        const options = { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        el.textContent = new Intl.DateTimeFormat('en-GB', options).format(now);
    }
    updateClock();
    setInterval(updateClock, 1000);
}

async function fetchCommsData() {
    try {
        const res = await fetch('/api/comms/data');
        const json = await res.json();
        if (json.success) {
            commsData = json;
            document.getElementById('groupsCountBadge').textContent = (commsData.groups || []).length;
            renderCurrentView();
        }
    } catch (e) {
        console.error("Failed to load comms data:", e);
    }
}

function switchMainTab(tab) {
    currentActiveTab = tab;
    document.getElementById('tabBtnQueue').classList.toggle('active', tab === 'queue');
    document.getElementById('tabBtnCalendar').classList.toggle('active', tab === 'calendar');
    document.getElementById('tabBtnGroups').classList.toggle('active', tab === 'groups');

    document.getElementById('viewQueue').style.display = tab === 'queue' ? 'block' : 'none';
    document.getElementById('viewCalendar').style.display = tab === 'calendar' ? 'block' : 'none';
    document.getElementById('viewGroups').style.display = tab === 'groups' ? 'block' : 'none';

    renderCurrentView();
}

function renderCurrentView() {
    if (currentActiveTab === 'queue') {
        renderQueue();
    } else if (currentActiveTab === 'calendar') {
        renderCalendar();
    } else if (currentActiveTab === 'groups') {
        renderGroups();
    }
}

/* ==========================================================================
   QUEUE / FEED VIEW
   ========================================================================== */

function filterQueue(platform) {
    currentPlatformFilter = platform;
    document.querySelectorAll('.filter-queue-platform').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.platform === platform);
    });
    renderQueue();
}

function filterStatus(status) {
    currentStatusFilter = status;
    document.querySelectorAll('.filter-queue-status').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
    renderQueue();
}

function renderQueue() {
    const container = document.getElementById('messagesFeedContainer');
    if (!container) return;

    let list = [...(commsData.messages || [])];

    // Filter by platform
    if (currentPlatformFilter !== 'all') {
        list = list.filter(m => {
            const groups = getGroupsForMessage(m);
            return groups.some(g => g.platform === currentPlatformFilter);
        });
    }

    // Filter by status
    if (currentStatusFilter !== 'all') {
        list = list.filter(m => m.status === currentStatusFilter);
    }

    // Sort by scheduled time ascending
    list.sort((a, b) => new Date(a.scheduled_time || 0) - new Date(b.scheduled_time || 0));

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: var(--surface-100); border: 1px dashed var(--border-color); border-radius: 16px;">
                <i class="fa-solid fa-inbox" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 14px;"></i>
                <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0 0 6px 0;">No communications found</h3>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 18px;">Click "Generate Event Plan" or "New Message" to prepare your messages.</p>
                <button onclick="openPlanModal()" class="filter-chip" style="background: var(--color-primary); color: #fff;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Generate Event Plan
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(msg => renderMessageCard(msg)).join('');
}

function getGroupsForMessage(msg) {
    const targetIds = new Set(msg.target_group_ids || []);
    return (commsData.groups || []).filter(g => targetIds.has(g.id));
}

function renderMessageCard(msg) {
    const groups = getGroupsForMessage(msg);
    const activePlatform = cardSelectedPlatforms[msg.id] || (groups[0]?.platform || 'whatsapp');
    const variantText = (msg.content_variants && msg.content_variants[activePlatform]) || msg.content_base || "";
    
    // Scheduled time formatting
    const dt = new Date(msg.scheduled_time);
    const timeFormatted = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + 
                          dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    // Target group pills
    const groupPills = groups.map(g => {
        let iconClass = 'fa-brands fa-whatsapp';
        if (g.platform === 'telegram') iconClass = 'fa-brands fa-telegram';
        if (g.platform === 'facebook') iconClass = 'fa-brands fa-facebook';
        if (g.platform === 'instagram') iconClass = 'fa-brands fa-instagram';
        return `
            <span class="platform-badge ${g.platform}" title="${g.name}: ${g.audience || ''}">
                <i class="${iconClass}"></i> ${escapeHtml(g.name.replace(/WhatsApp|Telegram|Facebook|Group/gi, '').trim())}
            </span>
        `;
    }).join(' ');

    // Primary target link for opening app
    const primaryGroup = groups.find(g => g.platform === activePlatform) || groups[0];
    const openLink = primaryGroup?.link || getPlatformFallbackUrl(activePlatform);

    // Status styling
    let statusLabel = '⏰ Scheduled';
    let statusPillStyle = 'background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);';
    if (msg.status === 'sent') {
        statusLabel = '✅ Sent';
        statusPillStyle = 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);';
    } else if (msg.status === 'draft') {
        statusLabel = '📝 Draft';
        statusPillStyle = 'background: rgba(255, 255, 255, 0.08); color: var(--text-secondary); border: 1px solid var(--border-color);';
    }

    return `
        <div class="comms-card status-${msg.status}" id="card_${msg.id}">
            <!-- Header Row -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
                <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                        <span style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; color: #fff;">
                            <i class="fa-regular fa-clock" style="color: var(--color-primary); margin-right: 4px;"></i>${timeFormatted}
                        </span>
                        <span style="padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; ${statusPillStyle}">
                            ${statusLabel}
                        </span>
                        ${msg.event_name ? `<span style="background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" onclick="openAiForEvent('${escapeAttr(msg.event_name)}')" title="Click to audit this event with AI"><i class="fa-solid fa-ticket"></i> ${escapeHtml(msg.event_name)} <i class="fa-solid fa-brain" style="color: #a855f7; margin-left: 4px;"></i></span>` : ''}
                    </div>
                    <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0; color: #fff;">${escapeHtml(msg.title)}</h3>
                </div>

                <div style="display: flex; gap: 6px;">
                    <button onclick="editMessage('${msg.id}')" class="btn-open-app" style="padding: 6px 10px; font-size: 0.8rem;" title="Edit">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deleteMessage('${msg.id}')" class="btn-open-app" style="padding: 6px 10px; font-size: 0.8rem; color: #ef4444;" title="Delete">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>

            <!-- Target Groups -->
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px;">
                ${groupPills || '<span style="color: var(--text-muted); font-size: 0.78rem;">No target groups selected</span>'}
            </div>

            <!-- Platform Preview Switcher Tabs -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; background: rgba(0,0,0,0.25); border-radius: 8px; padding: 4px 8px;">
                <div style="display: flex; gap: 4px;">
                    <button class="preview-tab-btn ${activePlatform === 'whatsapp' ? 'active' : ''}" onclick="switchCardPreview('${msg.id}', 'whatsapp')">
                        <i class="fab fa-whatsapp" style="color: #25D366;"></i> WhatsApp
                    </button>
                    <button class="preview-tab-btn ${activePlatform === 'telegram' ? 'active' : ''}" onclick="switchCardPreview('${msg.id}', 'telegram')">
                        <i class="fab fa-telegram" style="color: #229ED9;"></i> Telegram
                    </button>
                    <button class="preview-tab-btn ${activePlatform === 'facebook' ? 'active' : ''}" onclick="switchCardPreview('${msg.id}', 'facebook')">
                        <i class="fab fa-facebook" style="color: #1877F2;"></i> Facebook
                    </button>
                    <button class="preview-tab-btn ${activePlatform === 'instagram' ? 'active' : ''}" onclick="switchCardPreview('${msg.id}', 'instagram')">
                        <i class="fab fa-instagram" style="color: #E1306C;"></i> Instagram
                    </button>
                </div>

                <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
                    Formatted for ${activePlatform.toUpperCase()}
                </span>
            </div>

            <!-- Formatted Message Bubble -->
            <div class="preview-bubble ${activePlatform}">
${renderFormattedText(variantText, activePlatform)}
            </div>

            <!-- Mobile Ergonomic Action Bar -->
            <div class="card-action-bar" style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="copyMessageFormatted('${msg.id}', '${activePlatform}')" class="btn-copy-action">
                        <i class="fa-regular fa-copy"></i> Copy for ${capitalize(activePlatform)}
                    </button>
                    ${openLink ? `
                    <a href="${openLink}" target="_blank" rel="noopener noreferrer" class="btn-open-app">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Open ${capitalize(activePlatform)}
                    </a>` : ''}
                </div>

                <div style="display: flex; gap: 8px;">
                    ${msg.status !== 'sent' ? `
                    <button onclick="toggleMessageSent('${msg.id}', 'sent')" class="btn-open-app" style="color: #10b981; border-color: rgba(16, 185, 129, 0.4);">
                        <i class="fa-solid fa-check"></i> Mark Sent
                    </button>` : `
                    <button onclick="toggleMessageSent('${msg.id}', 'scheduled')" class="btn-open-app" style="color: var(--text-secondary);">
                        <i class="fa-solid fa-rotate-left"></i> Mark Scheduled
                    </button>`}
                </div>
            </div>
        </div>
    `;
}

function switchCardPreview(msgId, platform) {
    cardSelectedPlatforms[msgId] = platform;
    renderQueue();
}

function renderFormattedText(text, platform) {
    if (!text) return '<span style="color: #888;">(Empty message)</span>';
    let safe = escapeHtml(text);
    
    // Visual highlighters for platform bolds
    if (platform === 'whatsapp') {
        safe = safe.replace(/\*(.*?)\*/g, '<strong style="color: #fff; font-weight: 700;">$1</strong>');
        safe = safe.replace(/_(.*?)_/g, '<em style="color: #d1d5db;">$1</em>');
    } else if (platform === 'telegram') {
        safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff; font-weight: 700;">$1</strong>');
        safe = safe.replace(/__(.*?)__/g, '<em style="color: #d1d5db;">$1</em>');
    }
    
    // Auto-link URLs
    safe = safe.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #38bdf8; text-decoration: underline;">$1</a>');
    return safe;
}

function getPlatformFallbackUrl(platform) {
    if (platform === 'whatsapp') return 'https://web.whatsapp.com/';
    if (platform === 'telegram') return 'https://web.telegram.org/';
    if (platform === 'facebook') return 'https://facebook.com/groups';
    if (platform === 'instagram') return 'https://instagram.com/direct';
    return '#';
}

/* ==========================================================================
   COPY TO CLIPBOARD & TOAST
   ========================================================================== */

async function copyMessageFormatted(msgId, platform) {
    const msg = (commsData.messages || []).find(m => m.id === msgId);
    if (!msg) return;

    const textToCopy = (msg.content_variants && msg.content_variants[platform]) || msg.content_base || "";
    
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast(`Copied ready for ${capitalize(platform)}! 📋`);
    } catch (e) {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`Copied ready for ${capitalize(platform)}! 📋`);
    }
}

function showToast(text) {
    const toast = document.getElementById('copyToast');
    const toastText = document.getElementById('copyToastText');
    if (!toast) return;
    toastText.textContent = text;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

/* ==========================================================================
   CALENDAR VIEW
   ========================================================================== */

function formatLocalDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatLocalDateTime(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}`;
}

function changeWeek(offsetDelta) {
    if (offsetDelta === 0) currentWeekOffset = 0;
    else currentWeekOffset += offsetDelta;
    renderCalendar();
}

function renderCalendar() {
    const wrapper = document.getElementById('calendarGridWrapper');
    if (!wrapper) return;

    // Calculate current week bounds (Monday to Sunday)
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 is Monday, 6 is Sunday
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayOfWeek + (currentWeekOffset * 7));
    monday.setHours(0, 0, 0, 0);

    const weekLabel = document.getElementById('calendarWeekLabel');
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    weekLabel.textContent = `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    let html = '';
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateIso = formatLocalDate(d);
        const isToday = (d.toDateString() === new Date().toDateString());

        // Find messages scheduled on this day
        const dayMessages = (commsData.messages || []).filter(m => (m.scheduled_time || '').startsWith(dateIso));
        dayMessages.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));

        html += `
            <div class="cal-day-col ${isToday ? 'is-today' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                    <div>
                        <strong style="color: ${isToday ? 'var(--color-primary)' : '#fff'}; font-size: 0.95rem;">${dayNames[i]}</strong>
                        <span style="color: var(--text-secondary); font-size: 0.8rem; margin-left: 4px;">${d.getDate()}</span>
                    </div>
                    <button onclick="openMessageModalForDate('${dateIso}')" style="background: transparent; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.85rem;" title="Schedule on this day">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px; flex: 1; overflow-y: auto; max-height: 480px;">
                    ${dayMessages.length === 0 ? `<div style="color: var(--text-muted); font-size: 0.75rem; text-align: center; padding: 20px 0;">No comms</div>` : ''}
                    ${dayMessages.map(m => {
                        const t = new Date(m.scheduled_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                        const isSent = m.status === 'sent';
                        return `
                            <div onclick="editMessage('${m.id}')" style="background: rgba(0,0,0,0.3); border: 1px solid ${isSent ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)'}; border-left: 3px solid ${isSent ? '#10b981' : '#f59e0b'}; border-radius: 8px; padding: 8px; cursor: pointer; transition: transform 0.15s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='none'">
                                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 4px;">
                                    <span><i class="fa-regular fa-clock"></i> ${t}</span>
                                    <span>${isSent ? '✅' : '⏰'}</span>
                                </div>
                                <div style="font-weight: 600; font-size: 0.82rem; color: #fff; line-height: 1.3;">
                                    ${escapeHtml(m.title)}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    wrapper.innerHTML = html;
}

function openMessageModalForDate(dateIso) {
    openMessageModal();
    const scheduledInput = document.getElementById('msgScheduledTime');
    if (scheduledInput) {
        scheduledInput.value = `${dateIso}T14:00`;
    }
}

/* ==========================================================================
   GROUPS DIRECTORY VIEW
   ========================================================================== */

function renderGroups() {
    const container = document.getElementById('groupsGridContainer');
    if (!container) return;

    const list = commsData.groups || [];
    if (list.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">No groups added yet.</div>';
        return;
    }

    container.innerHTML = list.map(g => {
        let platformIcon = '<i class="fab fa-whatsapp" style="color: #25D366; font-size: 1.4rem;"></i>';
        let platformColor = '#25D366';
        if (g.platform === 'telegram') {
            platformIcon = '<i class="fab fa-telegram" style="color: #229ED9; font-size: 1.4rem;"></i>';
            platformColor = '#229ED9';
        } else if (g.platform === 'facebook') {
            platformIcon = '<i class="fab fa-facebook" style="color: #1877F2; font-size: 1.4rem;"></i>';
            platformColor = '#1877F2';
        } else if (g.platform === 'instagram') {
            platformIcon = '<i class="fab fa-instagram" style="color: #E1306C; font-size: 1.4rem;"></i>';
            platformColor = '#E1306C';
        }

        return `
            <div style="background: var(--surface-100); border: 1px solid var(--border-color); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; transition: border-color 0.2s;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${platformIcon}
                            <div>
                                <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0; color: #fff;">${escapeHtml(g.name)}</h3>
                                <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: capitalize;">${g.platform} • ${g.category || 'General'}</span>
                            </div>
                        </div>

                        <div style="display: flex; gap: 4px;">
                            <button onclick="editGroup('${g.id}')" class="btn-open-app" style="padding: 4px 8px; font-size: 0.78rem;" title="Edit">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button onclick="deleteGroup('${g.id}')" class="btn-open-app" style="padding: 4px 8px; font-size: 0.78rem; color: #ef4444;" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>

                    ${g.audience ? `<p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0 0 8px 0;"><strong>Audience:</strong> ${escapeHtml(g.audience)}</p>` : ''}
                    ${g.rules ? `<p style="font-size: 0.82rem; color: #f59e0b; margin: 0 0 12px 0;"><strong>Rules:</strong> ${escapeHtml(g.rules)}</p>` : ''}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 8px;">
                    ${g.link ? `
                    <a href="${g.link}" target="_blank" rel="noopener noreferrer" style="font-size: 0.82rem; color: ${platformColor}; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Group
                    </a>` : `<span style="font-size: 0.78rem; color: var(--text-muted);">No link set</span>`}

                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.8rem; color: var(--text-secondary);">
                        <input type="checkbox" ${g.active !== false ? 'checked' : ''} onchange="toggleGroupActive('${g.id}', this.checked)">
                        Active
                    </label>
                </div>
            </div>
        `;
    }).join('');
}

/* ==========================================================================
   MESSAGE CREATION / EDITING
   ========================================================================== */

function openMessageModal(msg = null) {
    const modal = document.getElementById('modalMessage');
    modal.style.display = 'flex';

    document.getElementById('modalMsgHeading').textContent = msg ? 'Edit Communication' : 'Schedule New Communication';
    document.getElementById('msgId').value = msg ? msg.id : '';
    document.getElementById('msgTitle').value = msg ? msg.title : '';
    document.getElementById('msgType').value = msg ? (msg.type || 'event_promo') : 'event_promo';
    document.getElementById('msgEventName').value = msg ? (msg.event_name || '') : '';
    document.getElementById('msgContentBase').value = msg ? (msg.content_base || '') : '';
    
    // Scheduled time default to tomorrow 14:00
    if (msg && msg.scheduled_time) {
        document.getElementById('msgScheduledTime').value = msg.scheduled_time.slice(0, 16);
    } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0);
        document.getElementById('msgScheduledTime').value = formatLocalDateTime(tomorrow);
    }

    // Populate Group Checkboxes
    const targetSet = new Set(msg ? (msg.target_group_ids || []) : (commsData.groups || []).filter(g => g.active !== false).map(g => g.id));
    const container = document.getElementById('modalGroupsCheckboxes');
    container.innerHTML = (commsData.groups || []).map(g => `
        <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #fff; cursor: pointer;">
            <input type="checkbox" name="targetGroup" value="${g.id}" ${targetSet.has(g.id) ? 'checked' : ''}>
            ${escapeHtml(g.name)}
        </label>
    `).join('');

    // Update live preview
    switchModalPreview(modalSelectedPreviewPlatform);
}

function closeMessageModal() {
    document.getElementById('modalMessage').style.display = 'none';
}

function switchModalPreview(platform) {
    modalSelectedPreviewPlatform = platform;
    document.querySelectorAll('.preview-tab-btn').forEach(b => {
        b.classList.toggle('active', b.textContent.toLowerCase().includes(platform));
    });

    const box = document.getElementById('modalPreviewBox');
    const baseText = document.getElementById('msgContentBase').value;
    const eventName = document.getElementById('msgEventName').value;

    if (!baseText) {
        box.innerHTML = '<span style="color: #666;">Type your draft above to see live preview...</span>';
        return;
    }

    // Quick auto-formatter for preview
    let previewFormatted = baseText;
    if (platform === 'whatsapp') {
        previewFormatted = `*LA FRENCH BARCELONA* 🇫🇷\n${eventName ? `✨ *${eventName.toUpperCase()}* ✨\n\n` : ''}${baseText}\n\n🎟️ *Billetterie & Liste :* https://site.fourvenues.com/es/la-french-list`;
    } else if (platform === 'telegram') {
        previewFormatted = `**LA FRENCH BARCELONA** 🇫🇷\n${eventName ? `✨ **${eventName}** ✨\n\n` : ''}${baseText}\n\n🎟️ **Tickets & Guestlist:** https://site.fourvenues.com/es/la-french-list`;
    } else if (platform === 'facebook') {
        previewFormatted = `🇫🇷 𝗟𝗔 𝗙𝗥𝗘𝗡𝗖𝗛 𝗕𝗔𝗥𝗖𝗘𝗟𝗢𝗡𝗔\n${baseText}\n🎟️ Billetterie : https://site.fourvenues.com/es/la-french-list\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n🇬🇧 𝗟𝗔 𝗙𝗥𝗘𝗡𝗖𝗛 𝗕𝗔𝗥𝗖𝗘𝗟𝗢𝗡𝗔 (ENGLISH)\nJoin us for an unforgettable night with La French guestlist!\n🎟️ Tickets & Free list : https://site.fourvenues.com/es/la-french-list`;
    } else if (platform === 'instagram') {
        previewFormatted = `🚨 *COMMUNITY DROP* 🚨\n\n${baseText}\n\n🔗 Link in bio: https://site.fourvenues.com/es/la-french-list\nDrop a 🔥 if you're coming!`;
    }

    box.className = `preview-bubble ${platform}`;
    box.innerHTML = renderFormattedText(previewFormatted, platform);
}

async function autoGenerateVariants() {
    const baseText = document.getElementById('msgContentBase').value;
    const eventName = document.getElementById('msgEventName').value;
    if (!baseText) {
        alert("Please enter a base message draft first.");
        return;
    }

    try {
        const res = await fetch('/api/comms/format-variants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: baseText,
                event_name: eventName,
                event_link: "https://site.fourvenues.com/es/la-french-list"
            })
        });
        const json = await res.json();
        if (json.success && json.variants) {
            showToast("Variants auto-formatted for all platforms! ✨");
            switchModalPreview(modalSelectedPreviewPlatform);
        }
    } catch (e) {
        console.error("Failed to generate variants:", e);
    }
}

async function handleSaveMessage(e) {
    e.preventDefault();
    const id = document.getElementById('msgId').value;
    const title = document.getElementById('msgTitle').value;
    const scheduledTime = document.getElementById('msgScheduledTime').value;
    const type = document.getElementById('msgType').value;
    const eventName = document.getElementById('msgEventName').value;
    const contentBase = document.getElementById('msgContentBase').value;

    const checkedGroups = Array.from(document.querySelectorAll('input[name="targetGroup"]:checked')).map(cb => cb.value);

    // Format variants
    const payload = {
        id: id || undefined,
        title,
        scheduled_time: scheduledTime,
        type,
        event_name: eventName,
        target_group_ids: checkedGroups,
        content_base: contentBase,
        status: 'scheduled',
        content_variants: {
            whatsapp: `*LA FRENCH BARCELONA* 🇫🇷\n${eventName ? `✨ *${eventName.toUpperCase()}* ✨\n\n` : ''}${contentBase}\n\n🎟️ *Billetterie & Liste :* https://site.fourvenues.com/es/la-french-list`,
            telegram: `**LA FRENCH BARCELONA** 🇫🇷\n${eventName ? `✨ **${eventName}** ✨\n\n` : ''}${contentBase}\n\n🎟️ **Tickets & Guestlist:** https://site.fourvenues.com/es/la-french-list`,
            facebook: `🇫🇷 𝗟𝗔 𝗙𝗥𝗘𝗡𝗖𝗛 𝗕𝗔𝗥𝗖𝗘𝗟𝗢𝗡𝗔\n${contentBase}\n🎟️ Billetterie : https://site.fourvenues.com/es/la-french-list\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n🇬🇧 𝗟𝗔 𝗙𝗥𝗘𝗡𝗖𝗛 𝗕𝗔𝗥𝗖𝗘𝗟𝗢𝗡𝗔 (ENGLISH)\nJoin us for an unforgettable party with La French!\n🎟️ Tickets & Free list : https://site.fourvenues.com/es/la-french-list`,
            instagram: `🚨 *COMMUNITY DROP* 🚨\n\n${contentBase}\n\n🔗 Link: https://site.fourvenues.com/es/la-french-list\nDrop a 🔥 if you're coming!`
        }
    };

    try {
        const res = await fetch('/api/comms/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            closeMessageModal();
            showToast("Communication scheduled successfully! ✅");
            fetchCommsData();
        }
    } catch (err) {
        alert("Failed to save message: " + err.message);
    }
}

function editMessage(msgId) {
    const msg = (commsData.messages || []).find(m => m.id === msgId);
    if (msg) openMessageModal(msg);
}

async function deleteMessage(msgId) {
    if (!confirm("Are you sure you want to delete this communication?")) return;
    try {
        const res = await fetch(`/api/comms/messages/${msgId}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast("Communication deleted.");
            fetchCommsData();
        }
    } catch (e) {
        alert("Failed to delete: " + e.message);
    }
}

async function toggleMessageSent(msgId, targetStatus) {
    try {
        const res = await fetch(`/api/comms/messages/${msgId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: targetStatus })
        });
        const json = await res.json();
        if (json.success) {
            showToast(targetStatus === 'sent' ? "Marked as Sent! ✅" : "Reset to Scheduled ⏰");
            fetchCommsData();
        }
    } catch (e) {
        console.error("Failed to update status:", e);
    }
}

/* ==========================================================================
   EVENT PLAN GENERATOR
   ========================================================================== */

function openPlanModal() {
    document.getElementById('modalPlan').style.display = 'flex';
    // Default to this Friday
    const fri = new Date();
    const day = fri.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    fri.setDate(fri.getDate() + diff);
    document.getElementById('planEventDate').value = formatLocalDate(fri);
}

function closePlanModal() {
    document.getElementById('modalPlan').style.display = 'none';
}

async function handleGeneratePlan(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitPlan');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating 5 Messages...';

    const payload = {
        event_name: document.getElementById('planEventName').value,
        event_date: document.getElementById('planEventDate').value,
        theme: document.getElementById('planTheme').value,
        event_link: document.getElementById('planEventLink').value
    };

    try {
        const res = await fetch('/api/comms/generate-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            closePlanModal();
            showToast(`Created & scheduled ${json.count} multi-channel comms! 🎉`);
            fetchCommsData();
        }
    } catch (err) {
        alert("Failed to generate plan: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate 5-Message Cadence';
    }
}

/* ==========================================================================
   GROUPS MANAGEMENT
   ========================================================================== */

function openGroupModal(grp = null) {
    document.getElementById('modalGroup').style.display = 'flex';
    document.getElementById('modalGroupHeading').textContent = grp ? 'Edit Group / Channel' : 'Add Channel / Group';
    document.getElementById('grpId').value = grp ? grp.id : '';
    document.getElementById('grpName').value = grp ? grp.name : '';
    document.getElementById('grpPlatform').value = grp ? grp.platform : 'whatsapp';
    document.getElementById('grpCategory').value = grp ? (grp.category || 'campus') : 'campus';
    document.getElementById('grpLink').value = grp ? (grp.link || '') : '';
    document.getElementById('grpRules').value = grp ? (grp.rules || '') : '';
}

function closeGroupModal() {
    document.getElementById('modalGroup').style.display = 'none';
}

function editGroup(grpId) {
    const grp = (commsData.groups || []).find(g => g.id === grpId);
    if (grp) openGroupModal(grp);
}

async function handleSaveGroup(e) {
    e.preventDefault();
    const id = document.getElementById('grpId').value;
    const name = document.getElementById('grpName').value;
    const platform = document.getElementById('grpPlatform').value;
    const category = document.getElementById('grpCategory').value;
    const link = document.getElementById('grpLink').value;
    const rules = document.getElementById('grpRules').value;

    const payload = {
        id: id || undefined,
        name,
        platform,
        category,
        link,
        rules,
        active: true
    };

    try {
        const res = await fetch('/api/comms/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
            closeGroupModal();
            showToast("Group saved to directory! ✅");
            fetchCommsData();
        }
    } catch (err) {
        alert("Failed to save group: " + err.message);
    }
}

async function deleteGroup(grpId) {
    if (!confirm("Are you sure you want to delete this group from the directory?")) return;
    try {
        const res = await fetch(`/api/comms/groups/${grpId}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast("Group removed from directory.");
            fetchCommsData();
        }
    } catch (e) {
        alert("Failed to delete group: " + e.message);
    }
}

async function toggleGroupActive(grpId, isActive) {
    const grp = (commsData.groups || []).find(g => g.id === grpId);
    if (!grp) return;
    grp.active = isActive;
    try {
        await fetch('/api/comms/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(grp)
        });
        showToast(isActive ? "Group activated" : "Group deactivated");
    } catch (e) {
        console.error("Failed to update active state:", e);
    }
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ==========================================================================
   AI STRATEGIST (POWERED BY GEMINI 2.5 FLASH)
   ========================================================================== */

let currentAiTab = 'strategy';
let aiChatHistory = [];
let aiSuggestedMessagesCache = {};

function openAiStrategistModal(tab = 'strategy', eventName = '') {
    const modal = document.getElementById('modalAiStrategist');
    if (!modal) return;
    modal.style.display = 'flex';
    populateAiEventSelector(eventName);
    switchAiTab(tab);
    if (tab === 'event' && eventName) {
        runAiEventReview(eventName);
    }
}

function closeAiModal() {
    const modal = document.getElementById('modalAiStrategist');
    if (modal) modal.style.display = 'none';
}

function openAiForEvent(eventName) {
    openAiStrategistModal('event', eventName);
}

function switchAiTab(tab) {
    currentAiTab = tab;
    
    // Update tab button classes
    document.getElementById('aiTabBtnStrategy')?.classList.toggle('active', tab === 'strategy');
    document.getElementById('aiTabBtnEvent')?.classList.toggle('active', tab === 'event');
    document.getElementById('aiTabBtnPolls')?.classList.toggle('active', tab === 'polls');
    document.getElementById('aiTabBtnChat')?.classList.toggle('active', tab === 'chat');

    // Update section visibility
    document.getElementById('aiSectionStrategy').style.display = tab === 'strategy' ? 'block' : 'none';
    document.getElementById('aiSectionEvent').style.display = tab === 'event' ? 'block' : 'none';
    document.getElementById('aiSectionPolls').style.display = tab === 'polls' ? 'block' : 'none';
    document.getElementById('aiSectionChat').style.display = tab === 'chat' ? 'block' : 'none';
}

function populateAiEventSelector(selectedEvent = '') {
    const select = document.getElementById('aiEventSelector');
    if (!select) return;

    // Collect all unique event names from messages
    const eventNames = new Set();
    (commsData.messages || []).forEach(m => {
        if (m.event_name && m.event_name.trim()) eventNames.add(m.event_name.trim());
    });
    // Add default events if empty
    eventNames.add("Wednesday Experience @ Verne");
    eventNames.add("Friday Circus @ La Fira");

    select.innerHTML = '<option value="">-- Choose an Event to Audit --</option>';
    eventNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (selectedEvent && name.toLowerCase() === selectedEvent.toLowerCase()) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });
}

function setAiLoading(isLoading, subtext = "Auditing communications & cadence...") {
    const loader = document.getElementById('aiLoadingIndicator');
    const subtextEl = document.getElementById('aiLoadingSubtext');
    if (subtextEl) subtextEl.textContent = subtext;
    if (loader) loader.style.display = isLoading ? 'block' : 'none';

    // Hide active section body while loading
    if (document.getElementById('aiSectionStrategy')) document.getElementById('aiSectionStrategy').style.opacity = isLoading ? '0.3' : '1';
    if (document.getElementById('aiSectionEvent')) document.getElementById('aiSectionEvent').style.opacity = isLoading ? '0.3' : '1';
    if (document.getElementById('aiSectionPolls')) document.getElementById('aiSectionPolls').style.opacity = isLoading ? '0.3' : '1';
}

async function runAiStrategyAudit() {
    setAiLoading(true, "Auditing complete communication schedule and multi-channel balance...");
    try {
        const res = await fetch('/api/comms/ai/review-strategy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        setAiLoading(false);
        if (json.success && json.analysis) {
            renderStrategyAuditResults(json.analysis);
        } else {
            alert("Strategy audit failed: " + (json.error || "Unknown error"));
        }
    } catch (e) {
        setAiLoading(false);
        console.error("Strategy audit error:", e);
        alert("Failed to connect to AI Strategist: " + e.message);
    }
}

function renderStrategyAuditResults(analysis) {
    const container = document.getElementById('aiStrategyResultsContainer');
    if (!container) return;

    const score = analysis.overall_score || 0;
    let scoreColor = '#10b981';
    let scoreBadge = 'OPTIMAL STRATEGY';
    if (score < 55) {
        scoreColor = '#ef4444';
        scoreBadge = 'CRITICAL GAPS';
    } else if (score < 75) {
        scoreColor = '#f59e0b';
        scoreBadge = 'NEEDS IMPROVEMENT';
    }

    const b = analysis.score_breakdown || {};

    let html = `
        <div style="background: var(--surface-100); border: 1px solid var(--border-color); border-radius: 18px; padding: 20px; margin-bottom: 20px;">
            <!-- Score & Executive Summary -->
            <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 18px; flex-wrap: wrap;">
                <div style="width: 100px; height: 100px; border-radius: 50%; border: 6px solid ${scoreColor}; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 0 20px ${scoreColor}33; flex-shrink: 0;">
                    <span style="font-size: 1.8rem; font-weight: 800; color: #fff; line-height: 1;">${score}</span>
                    <span style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 700; text-transform: uppercase;">/ 100</span>
                </div>
                <div style="flex: 1; min-width: 240px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <span style="background: ${scoreColor}22; color: ${scoreColor}; border: 1px solid ${scoreColor}55; padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">
                            ${scoreBadge}
                        </span>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">Comprehensive Cadence Audit</span>
                    </div>
                    <p style="font-size: 0.95rem; font-weight: 500; color: #fff; margin: 0; line-height: 1.45;">
                        ${escapeHtml(analysis.executive_summary || "Audit complete.")}
                    </p>
                </div>
            </div>

            <!-- Score Breakdown Meters -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 18px;">
                <div style="background: rgba(0,0,0,0.25); border-radius: 10px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 2px;">Cadence Rhythm</div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: #3b82f6;">${b.cadence_rhythm || 0}%</div>
                </div>
                <div style="background: rgba(0,0,0,0.25); border-radius: 10px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 2px;">Channel Mix</div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: #a855f7;">${b.channel_diversity || 0}%</div>
                </div>
                <div style="background: rgba(0,0,0,0.25); border-radius: 10px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 2px;">Engagement</div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: #10b981;">${b.community_engagement || 0}%</div>
                </div>
                <div style="background: rgba(0,0,0,0.25); border-radius: 10px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 2px;">Conversion</div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: #f59e0b;">${b.conversion_power || 0}%</div>
                </div>
            </div>

            <!-- Strengths & Critical Gaps Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                <!-- Strengths -->
                <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 14px;">
                    <h5 style="color: #10b981; margin: 0 0 10px 0; font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-circle-check"></i> Key Strengths
                    </h5>
                    <ul style="margin: 0; padding-left: 18px; font-size: 0.84rem; color: var(--text-secondary); line-height: 1.5;">
                        ${(analysis.strengths || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                    </ul>
                </div>

                <!-- Critical Gaps -->
                <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 14px;">
                    <h5 style="color: #ef4444; margin: 0 0 10px 0; font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Critical Gaps & Risks
                    </h5>
                    <ul style="margin: 0; padding-left: 18px; font-size: 0.84rem; color: var(--text-secondary); line-height: 1.5;">
                        ${(analysis.critical_gaps || []).map(g => `<li>${escapeHtml(g)}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <!-- Actionable Recommendations -->
            <div style="margin-top: 16px; background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 14px;">
                <h5 style="color: #818cf8; margin: 0 0 10px 0; font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-list-check"></i> Prioritized Action Items
                </h5>
                <ol style="margin: 0; padding-left: 20px; font-size: 0.84rem; color: #fff; line-height: 1.6;">
                    ${(analysis.actionable_recommendations || []).map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                </ol>
            </div>
        </div>
    `;

    // Suggested messages to solve gaps
    if (analysis.suggested_messages && analysis.suggested_messages.length > 0) {
        html += `
            <div style="margin-top: 24px;">
                <h4 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 4px 0; color: #fff; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-wand-magic-sparkles" style="color: #a855f7;"></i> AI Recommended Additions (1-Click Schedule)
                </h4>
                <p style="color: var(--text-secondary); font-size: 0.82rem; margin: 0 0 14px 0;">These messages directly address the gaps identified in your audit.</p>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${analysis.suggested_messages.map((m, idx) => {
                        aiSuggestedMessagesCache[`strategy_${idx}`] = m;
                        return renderSuggestedMessageCard(`strategy_${idx}`, m);
                    }).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

async function runAiEventReview(presetEvent = '') {
    const select = document.getElementById('aiEventSelector');
    const eventName = presetEvent || (select ? select.value : "");
    if (!eventName) {
        alert("Please select an event to audit.");
        return;
    }
    if (select) select.value = eventName;

    setAiLoading(true, `Auditing 5-step cadence and copy for "${eventName}"...`);
    try {
        const res = await fetch('/api/comms/ai/review-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_name: eventName })
        });
        const json = await res.json();
        setAiLoading(false);
        if (json.success && json.analysis) {
            renderEventReviewResults(json.analysis);
        } else {
            alert("Event audit failed: " + (json.error || "Unknown error"));
        }
    } catch (e) {
        setAiLoading(false);
        console.error("Event review error:", e);
        alert("Failed to review event: " + e.message);
    }
}

function renderEventReviewResults(analysis) {
    const container = document.getElementById('aiEventResultsContainer');
    if (!container) return;

    const score = analysis.readiness_score || 0;
    let scoreColor = '#10b981';
    if (score < 60) scoreColor = '#ef4444';
    else if (score < 80) scoreColor = '#f59e0b';

    let html = `
        <div style="background: var(--surface-100); border: 1px solid var(--border-color); border-radius: 18px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                <div>
                    <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary); font-weight: 700;">Event Audit</span>
                    <h3 style="font-size: 1.25rem; font-weight: 800; margin: 2px 0 0 0; color: #fff;">${escapeHtml(analysis.event_name)}</h3>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.3); padding: 8px 16px; border-radius: 12px; border: 1px solid ${scoreColor}44;">
                    <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">Readiness Score:</span>
                    <strong style="font-size: 1.3rem; color: ${scoreColor}; font-weight: 800;">${score}/100</strong>
                </div>
            </div>

            <p style="font-size: 0.92rem; color: #e2e8f0; line-height: 1.45; margin-bottom: 20px; background: rgba(255,255,255,0.03); padding: 12px 14px; border-radius: 10px; border-left: 4px solid #3b82f6;">
                ${escapeHtml(analysis.verdict || "")}
            </p>

            <!-- 5-Step Cadence Checklist -->
            <h4 style="font-size: 0.95rem; font-weight: 700; color: #fff; margin: 0 0 10px 0;">5-Step Launch Cadence Checklist</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                ${(analysis.cadence_audit || []).map(c => {
                    let pillBg = 'rgba(16, 185, 129, 0.15)';
                    let pillColor = '#10b981';
                    let icon = 'fa-solid fa-circle-check';
                    let statusLabel = 'Covered';
                    if (c.status === 'missing') {
                        pillBg = 'rgba(239, 68, 68, 0.15)';
                        pillColor = '#ef4444';
                        icon = 'fa-solid fa-circle-xmark';
                        statusLabel = 'Missing';
                    } else if (c.status === 'improvable') {
                        pillBg = 'rgba(245, 158, 11, 0.15)';
                        pillColor = '#f59e0b';
                        icon = 'fa-solid fa-triangle-exclamation';
                        statusLabel = 'Improvable';
                    }
                    return `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 10px; padding: 10px 14px; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 220px;">
                                <div style="font-size: 0.88rem; font-weight: 700; color: #fff; margin-bottom: 2px;">${escapeHtml(c.step)}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(c.comment || "")}</div>
                            </div>
                            <span style="background: ${pillBg}; color: ${pillColor}; border: 1px solid ${pillColor}44; padding: 3px 10px; border-radius: 20px; font-size: 0.74rem; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;">
                                <i class="${icon}"></i> ${statusLabel}
                            </span>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Copy Critique & Conversion Tips -->
            <div style="background: rgba(168, 85, 247, 0.05); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 12px; padding: 14px;">
                <h5 style="color: #c084fc; margin: 0 0 10px 0; font-size: 0.88rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-bullhorn"></i> Copy & Conversion Critique
                </h5>
                <ul style="margin: 0; padding-left: 18px; font-size: 0.84rem; color: var(--text-secondary); line-height: 1.5;">
                    ${(analysis.copy_critique || []).map(cc => `<li>${escapeHtml(cc)}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;

    // Missing messages to add
    if (analysis.missing_messages_to_add && analysis.missing_messages_to_add.length > 0) {
        html += `
            <div style="margin-top: 20px;">
                <h4 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 4px 0; color: #fff; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-plus-circle" style="color: #10b981;"></i> Complete Cadence (Add Missing Messages)
                </h4>
                <p style="color: var(--text-secondary); font-size: 0.82rem; margin: 0 0 14px 0;">Click "Add to Schedule" to fill in the missing cadence steps.</p>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${analysis.missing_messages_to_add.map((m, idx) => {
                        aiSuggestedMessagesCache[`event_${idx}`] = m;
                        return renderSuggestedMessageCard(`event_${idx}`, m);
                    }).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

async function runAiSuggestPolls() {
    setAiLoading(true, "Brainstorming high-engagement WhatsApp & Telegram polls...");
    try {
        const res = await fetch('/api/comms/ai/suggest-polls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        setAiLoading(false);
        if (json.success && json.polls) {
            renderPollsResults(json.polls);
        } else {
            alert("Failed to generate polls: " + (json.error || "Unknown error"));
        }
    } catch (e) {
        setAiLoading(false);
        console.error("Poll generation error:", e);
        alert("Failed to connect to AI Strategist: " + e.message);
    }
}

function renderPollsResults(polls) {
    const container = document.getElementById('aiPollsResultsContainer');
    if (!container) return;

    let html = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
            ${polls.map((p, idx) => {
                aiSuggestedMessagesCache[`poll_${idx}`] = p;
                return renderSuggestedMessageCard(`poll_${idx}`, p);
            }).join('')}
        </div>
    `;
    container.innerHTML = html;
}

function renderSuggestedMessageCard(cacheKey, msg) {
    const previewText = (msg.content_variants && msg.content_variants.whatsapp) || msg.content_base || "";
    const dt = msg.scheduled_time ? new Date(msg.scheduled_time) : new Date();
    const timeFormatted = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + 
                          dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    return `
        <div style="background: var(--surface-100); border: 1px solid var(--border-color); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
                <div>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap;">
                        <span style="font-size: 0.75rem; font-family: var(--font-mono); color: #3b82f6; font-weight: 700;">
                            <i class="fa-regular fa-clock"></i> ${timeFormatted}
                        </span>
                        <span style="background: rgba(168,85,247,0.15); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700; text-transform: uppercase;">
                            ${escapeHtml(msg.type || 'message')}
                        </span>
                        ${msg.event_name ? `<span style="background: rgba(99,102,241,0.15); color: #818cf8; padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600;">${escapeHtml(msg.event_name)}</span>` : ''}
                    </div>
                    <strong style="font-size: 0.95rem; color: #fff;">${escapeHtml(msg.title)}</strong>
                </div>

                <button id="btnAddSug_${cacheKey}" onclick="addAiSuggestedMessage('${cacheKey}')" class="filter-chip" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; border: none; font-size: 0.8rem; padding: 6px 14px; font-weight: 700; white-space: nowrap;">
                    <i class="fa-solid fa-plus"></i> Add to Schedule
                </button>
            </div>

            <!-- Preview -->
            <div class="preview-bubble whatsapp" style="max-height: 120px; font-size: 0.8rem; padding: 10px 12px;">
                ${renderFormattedText(previewText, 'whatsapp')}
            </div>
        </div>
    `;
}

async function addAiSuggestedMessage(cacheKey) {
    const msg = aiSuggestedMessagesCache[cacheKey];
    if (!msg) {
        alert("Message data not found in cache.");
        return;
    }

    const btn = document.getElementById(`btnAddSug_${cacheKey}`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Adding...`;
    }

    try {
        const res = await fetch('/api/comms/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...msg,
                status: 'scheduled'
            })
        });
        const json = await res.json();
        if (json.success) {
            showToast("Added to schedule successfully!");
            if (btn) {
                btn.style.background = '#4b5563';
                btn.innerHTML = `✅ Added to Schedule`;
            }
            await fetchCommsData();
        } else {
            alert("Failed to save: " + (json.error || "Unknown error"));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-plus"></i> Add to Schedule`;
            }
        }
    } catch (e) {
        console.error("Save error:", e);
        alert("Error saving message: " + e.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-plus"></i> Add to Schedule`;
        }
    }
}

async function handleSendAiChat(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('aiChatInput');
    const msgText = input ? input.value.trim() : "";
    if (!msgText) return;

    input.value = "";
    appendChatMessage('user', msgText);

    // Get event context if any
    const select = document.getElementById('aiEventSelector');
    const eventContext = select ? select.value : "";

    const sendBtn = document.getElementById('btnSendAiChat');
    if (sendBtn) sendBtn.disabled = true;

    try {
        const res = await fetch('/api/comms/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: msgText,
                history: aiChatHistory,
                event_context: eventContext
            })
        });
        const json = await res.json();
        if (sendBtn) sendBtn.disabled = false;
        if (json.success && json.reply) {
            aiChatHistory.push({ role: 'user', content: msgText });
            aiChatHistory.push({ role: 'assistant', content: json.reply });
            appendChatMessage('assistant', json.reply);
        } else {
            appendChatMessage('assistant', `⚠️ *Error:* ${json.error || "Failed to generate reply"}`);
        }
    } catch (e) {
        if (sendBtn) sendBtn.disabled = false;
        console.error("Chat error:", e);
        appendChatMessage('assistant', `⚠️ *Connection Error:* ${e.message}`);
    }
}

function sendQuickAiPrompt(text) {
    const input = document.getElementById('aiChatInput');
    if (input) input.value = text;
    handleSendAiChat(null);
}

function appendChatMessage(role, text) {
    const container = document.getElementById('aiChatMessages');
    if (!container) return;

    const isUser = role === 'user';
    const bubble = document.createElement('div');
    bubble.style.cssText = isUser ? `
        align-self: flex-end;
        background: var(--color-primary);
        color: #fff;
        padding: 10px 14px;
        border-radius: 14px 14px 2px 14px;
        max-width: 80%;
        font-size: 0.88rem;
        line-height: 1.45;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
    ` : `
        align-self: flex-start;
        background: var(--surface-200);
        color: #e2e8f0;
        padding: 12px 16px;
        border-radius: 14px 14px 14px 2px;
        max-width: 88%;
        font-size: 0.88rem;
        line-height: 1.5;
        border: 1px solid var(--border-color);
    `;

    // Simple markdown formatting: bold, italic, line breaks
    let formatted = escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');

    bubble.innerHTML = formatted;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}
