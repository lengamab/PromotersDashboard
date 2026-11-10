// Instagram API Management Logic

const IG_TOKEN_KEY = 'la_french_ig_token';
const IG_ACCOUNT_ID_KEY = 'la_french_ig_account_id';
const IG_API_BASE = '/api/ig-proxy';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadInstagramData();
    
    // Attach event listener to Synergy button
    const btnSynergy = document.getElementById('btn-generate-synergy');
    if (btnSynergy) {
        btnSynergy.addEventListener('click', () => {
            if (window.updateCopilotContext) {
                const prompt = `You are a cross-platform data analyst (Synergy Mode). 

I need a Synergy Report connecting my Instagram organic growth with my Meta Ads campaigns and Fourvenues ticket sales. 
1. Review my Instagram context (below) to see what content is resonating organically.
2. Use your tools to check my Meta Ads performance (\`fetchActiveCampaigns\`, \`fetchCampaignHistoricalData\`).
3. Use your tools to check my Fourvenues performance (\`fetchFourvenuesEvents\`, \`fetchFourvenuesSalesHistory\`).

Find the synergy: Are my popular organic posts driving cheap Meta clicks or Fourvenues sales? What should I do next?`;
                window.updateCopilotContext(window.currentInstagramContext || "Instagram dashboard data is loading...", prompt, "instagram_dashboard", true);
            } else {
                alert("AI Assistant is not loaded yet.");
            }
        });
    }
});

// Modal Logic Removed - Settings configured via backend environment variables

// Data Fetching Logic
async function loadInstagramData() {
    try {
        // Step 1: Get the IG Account ID (if not cached)
        let igAccountId = localStorage.getItem(IG_ACCOUNT_ID_KEY);
        
        if (!igAccountId) {
            // Fetch FB Pages
            const pagesRes = await fetch(`${IG_API_BASE}/me/accounts`);
            const pagesData = await pagesRes.json();
            
            if (pagesData.error) throw new Error(pagesData.error.message);
            if (!pagesData.data || pagesData.data.length === 0) throw new Error("No Facebook Pages found.");
            
            const pageId = pagesData.data[0].id;
            
            // Fetch connected IG Account
            const igRes = await fetch(`${IG_API_BASE}/${pageId}?fields=instagram_business_account`);
            const igData = await igRes.json();
            
            if (igData.error) throw new Error(igData.error.message);
            if (!igData.instagram_business_account) throw new Error("No Instagram Business Account linked to the Facebook Page.");
            
            igAccountId = igData.instagram_business_account.id;
            localStorage.setItem(IG_ACCOUNT_ID_KEY, igAccountId);
        }

        // Step 2: Fetch Profile Data
        const profileRes = await fetch(`${IG_API_BASE}/${igAccountId}?fields=username,followers_count,media_count,name`);
        const profileData = await profileRes.json();
        
        if (profileData.error) throw new Error(profileData.error.message);
        
        // Update UI Profile
        document.getElementById('profile-handle').textContent = `@${profileData.username}`;
        document.getElementById('kpi-followers').textContent = profileData.followers_count.toLocaleString();
        document.getElementById('kpi-media-count').textContent = profileData.media_count.toLocaleString();
        
        // Initialize context for AI
        window.currentInstagramContext = `Instagram Account: @${profileData.username}\nFollowers: ${profileData.followers_count}\nTotal Posts: ${profileData.media_count}\n\n`;
        
        // Note: Profile Views and Reach require the 'insights' edge which has specific metric parameters.
        // For now, we simulate or show pending as we need 28 day metrics which requires a more complex query.
        fetchInsights(igAccountId);
        
        // Step 3: Fetch Recent Media
        await loadRecentMedia(igAccountId);
        
    } catch (error) {
        console.error("Error loading Instagram data:", error);
        alert(`Failed to load Instagram data: ${error.message}\n\nPlease check your backend configuration.`);
    }
}

async function fetchInsights(igAccountId) {
    try {
        // Fetch 28 day reach (requires daily values sum)
        const reachRes = await fetch(`${IG_API_BASE}/${igAccountId}/insights?metric=reach&period=day`);
        const reachData = await reachRes.json();
        
        let totalReach = 0;
        if (reachData.data && reachData.data.length > 0) {
            const values = reachData.data[0].values;
            if (values) {
                totalReach = values.reduce((sum, val) => sum + val.value, 0);
                document.getElementById('kpi-reach').textContent = totalReach.toLocaleString();
                if(window.currentInstagramContext) window.currentInstagramContext += `Account Reach (last 28d): ${totalReach}\n`;
                
                // --- Reach Chart logic ---
                const reachCtx = document.getElementById('reachChart').getContext('2d');
                const reachLabels = values.map(v => {
                    const d = new Date(v.end_time);
                    d.setDate(d.getDate() - 1); // FB Insight end_time is the next morning
                    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                });
                const reachValues = values.map(v => v.value);
                
                if (window.reachChartInstance) {
                    window.reachChartInstance.destroy();
                }
                
                window.reachChartInstance = new Chart(reachCtx, {
                    type: 'bar',
                    data: {
                        labels: reachLabels,
                        datasets: [{
                            label: 'Daily Reach',
                            data: reachValues,
                            backgroundColor: 'rgba(192, 132, 252, 0.6)',
                            borderColor: '#c084fc',
                            borderWidth: 1,
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            x: {
                                ticks: { color: '#a0a0b0', maxTicksLimit: 14 },
                                grid: { display: false }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { color: '#a0a0b0' },
                                grid: { color: 'rgba(255,255,255,0.05)' }
                            }
                        }
                    }
                });
            }
        } else {
            document.getElementById('kpi-reach').textContent = "N/A";
        }
        
        // Fetch 28 day profile views (requires total_value metric_type)
        const pvRes = await fetch(`${IG_API_BASE}/${igAccountId}/insights?metric=profile_views&metric_type=total_value&period=day`);
        const pvData = await pvRes.json();
        
        if (pvData.data && pvData.data.length > 0) {
            const totalViews = pvData.data[0].total_value.value;
            document.getElementById('kpi-profile-views').textContent = totalViews.toLocaleString();
            if(window.currentInstagramContext) window.currentInstagramContext += `Profile Views (last 28d): ${totalViews}\n\n`;
        } else {
            document.getElementById('kpi-profile-views').textContent = "N/A";
        }

    } catch (error) {
        console.warn("Could not fetch insights. Token might lack instagram_manage_insights permission.", error);
        document.getElementById('kpi-reach').textContent = "Permission Required";
        document.getElementById('kpi-profile-views').textContent = "Permission Required";
    }
}

async function loadRecentMedia(accountId = null) {
    const igAccountId = accountId || localStorage.getItem(IG_ACCOUNT_ID_KEY);
    
    if (!igAccountId) return;
    
    const grid = document.getElementById('media-grid');
    grid.innerHTML = '<div style="padding: 40px; text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary);"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading latest posts...</div>';
    
    try {
        const mediaRes = await fetch(`${IG_API_BASE}/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,like_count,comments_count,timestamp,permalink&limit=12`);
        const mediaData = await mediaRes.json();
        
        if (mediaData.error) throw new Error(mediaData.error.message);
        
        const posts = mediaData.data;
        if (!posts || posts.length === 0) {
            grid.innerHTML = '<div style="padding: 40px; text-align: center; width: 100%; grid-column: 1 / -1; color: var(--text-secondary);">No posts found on this account.</div>';
            if(window.currentInstagramContext) window.currentInstagramContext += "Recent Posts: None found.\n";
            return;
        }
        
        grid.innerHTML = '';
        if(window.currentInstagramContext) window.currentInstagramContext += "Recent Posts Performance:\n";
        
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'media-card';
            
            // Format date
            const date = new Date(post.timestamp);
            const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            
            // Media Image
            const imgUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
            const icon = post.media_type === 'VIDEO' ? '<i class="fa-solid fa-play"></i>' : (post.media_type === 'CAROUSEL_ALBUM' ? '<i class="fa-solid fa-layer-group"></i>' : '<i class="fa-solid fa-image"></i>');
            
            // Truncate caption safely
            const caption = post.caption ? post.caption : "No caption";
            
            card.innerHTML = `
                <div class="media-img-container">
                    <img src="${imgUrl}" alt="Instagram Post" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22280%22%20height%3D%22280%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20280%20280%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22280%22%20height%3D%22280%22%20fill%3D%22%232a2a35%22%20%2F%3E%3Ctext%20x%3D%22140%22%20y%3D%22140%22%20fill%3D%22%23777%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20text-anchor%3D%22middle%22%3EImage Unavailable%3C%2Ftext%3E%3C%2Fsvg%3E'">
                    <div class="media-type-icon">${icon}</div>
                </div>
                <div class="media-stats">
                    <div class="media-stat" style="color: #ed4956;"><i class="fa-solid fa-heart"></i> ${post.like_count.toLocaleString()}</div>
                    <div class="media-stat" style="color: #0095f6;"><i class="fa-solid fa-comment"></i> ${post.comments_count.toLocaleString()}</div>
                    <div class="media-stat" style="color: var(--text-secondary); font-weight: normal; font-size: 0.9em;"><i class="fa-regular fa-clock"></i> ${dateStr}</div>
                </div>
                <div class="media-caption">
                    ${caption}
                </div>
                <div style="padding: 10px 15px; border-top: 1px solid var(--border-color); background: rgba(0,0,0,0.2);">
                    <a href="${post.permalink}" target="_blank" style="color: #c084fc; text-decoration: none; font-size: 0.9em; font-weight: 600; display: block; text-align: center;">View on Instagram <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.8em;"></i></a>
                </div>
            `;
            
            grid.appendChild(card);
            
            if(window.currentInstagramContext) {
                window.currentInstagramContext += `- [${dateStr}] [${post.media_type}] Likes: ${post.like_count}, Comments: ${post.comments_count}. Caption snippet: "${caption.substring(0, 100).replace(/\n/g, ' ')}..."\n`;
            }
        });
        
        // --- Engagement Chart logic ---
        const ctx = document.getElementById('engagementChart').getContext('2d');
        
        // Reverse posts so oldest is on the left, newest on right for the chart
        const chartPosts = [...posts].reverse();
        const labels = chartPosts.map(p => new Date(p.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        const likesData = chartPosts.map(p => p.like_count);
        const commentsData = chartPosts.map(p => p.comments_count);

        if (window.engagementChartInstance) {
            window.engagementChartInstance.destroy();
        }

        window.engagementChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Likes',
                        data: likesData,
                        borderColor: '#ed4956',
                        backgroundColor: 'rgba(237, 73, 86, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Comments',
                        data: commentsData,
                        borderColor: '#0095f6',
                        backgroundColor: 'rgba(0, 149, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        labels: { color: '#a0a0b0' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#a0a0b0' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: { color: '#a0a0b0' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        ticks: { color: '#a0a0b0' },
                        grid: { drawOnChartArea: false } // only want the grid lines for one axis to show up
                    }
                }
            }
        });
        
    } catch (error) {
        console.error("Error loading media:", error);
        grid.innerHTML = `<div style="padding: 40px; text-align: center; width: 100%; grid-column: 1 / -1; color: #ff6b6b;">Error loading posts: ${error.message}</div>`;
    }
}

// =========================================================================
// VISUAL POST SCHEDULER & 24-HOUR CALENDAR LOGIC (LA FRENCH SOCIAL STUDIO)
// =========================================================================

let schedCurrentWeekStart = getSchedMonday(new Date());
let onlineScheduleData = { posts: [] };
let activeSchedulerView = 'calendar';

const SCHED_DEFAULT_TAGS = [
    "@opiumbarcelona", "@suttonbarcelona", "@shokobarcelona", "@kubarcelona",
    "@downtownbarcelona", "@beuhrice", "@lucile_bcn", "@cyruslafrench",
    "@flore_sbd", "@armand.cprn", "@mael_lafrench"
];

function getSchedMonday(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
}

function formatSchedYMD(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Sub-Tab Switcher (Scheduler vs Insights)
function switchInstagramSubTab(tab) {
    const secSched = document.getElementById('section-scheduler');
    const secInsights = document.getElementById('section-insights');
    const btnSched = document.getElementById('subtab-btn-scheduler');
    const btnInsights = document.getElementById('subtab-btn-insights');

    if (tab === 'scheduler') {
        secSched.style.display = 'block';
        secInsights.style.display = 'none';
        btnSched.classList.add('active');
        btnInsights.classList.remove('active');
        renderOnlineCalendarGrid();
    } else {
        secSched.style.display = 'none';
        secInsights.style.display = 'block';
        btnSched.classList.remove('active');
        btnInsights.classList.add('active');
    }
}

function switchSchedulerView(view) {
    activeSchedulerView = view;
    const gridView = document.getElementById('calendarGridView');
    const queueView = document.getElementById('calendarQueueView');
    const btnGrid = document.getElementById('btnCalViewGrid');
    const btnQueue = document.getElementById('btnCalViewQueue');

    if (view === 'calendar') {
        gridView.style.display = 'flex';
        queueView.style.display = 'none';
        btnGrid.classList.add('active');
        btnQueue.classList.remove('active');
        renderOnlineCalendarGrid();
    } else {
        gridView.style.display = 'none';
        queueView.style.display = 'block';
        btnGrid.classList.remove('active');
        btnQueue.classList.add('active');
        renderOnlineQueueList();
    }
}

function navigateWeek(delta) {
    schedCurrentWeekStart.setDate(schedCurrentWeekStart.getDate() + delta * 7);
    renderOnlineCalendarGrid();
}

function goToCurrentWeek() {
    schedCurrentWeekStart = getSchedMonday(new Date());
    renderOnlineCalendarGrid();
}

async function fetchOnlineSchedule() {
    try {
        const res = await fetch('/api/schedule');
        onlineScheduleData = await res.json();
        const pendingCount = (onlineScheduleData.posts || []).filter(p => p.status === 'scheduled').length;
        const countPill = document.getElementById('schedQueueCountPill');
        if (countPill) countPill.innerText = `Queue: ${pendingCount} scheduled`;
        
        if (activeSchedulerView === 'calendar') renderOnlineCalendarGrid();
        if (activeSchedulerView === 'queue') renderOnlineQueueList();
    } catch (e) {
        console.error("Failed to fetch schedule queue:", e);
    }
}

function renderOnlineCalendarGrid() {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(schedCurrentWeekStart);
        d.setDate(d.getDate() + i);
        days.push(d);
    }

    const weekEnd = days[6];
    const rangeLabel = document.getElementById('weekRangeLabel');
    if (rangeLabel) {
        rangeLabel.innerText = `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }

    const wdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayStr = formatSchedYMD(new Date());

    for (let i = 0; i < 7; i++) {
        const colHeader = document.getElementById(`wday-${i}`);
        if (!colHeader) continue;
        const dStr = formatSchedYMD(days[i]);
        const isToday = (dStr === todayStr);
        colHeader.innerHTML = `
            <div style="${isToday ? 'color: #D4AF37; font-weight: 800;' : ''}">
                ${wdayNames[i]} <span style="font-size: 0.75rem; opacity: 0.7;">${days[i].getDate()}</span>
            </div>
        `;
    }

    const grid = document.getElementById('calendarHourlyContainer');
    if (!grid) return;
    grid.innerHTML = '';

    for (let hour = 0; hour < 24; hour++) {
        const hourStr = String(hour).padStart(2, '0') + ':00';
        const isPrime = (hour >= 17 && hour <= 20);

        // Column 0: Time Label
        const timeCol = document.createElement('div');
        timeCol.className = `cal-hour-cell ${isPrime ? 'prime-hour' : ''}`;
        timeCol.style.display = 'flex';
        timeCol.style.flexDirection = 'column';
        timeCol.style.alignItems = 'center';
        timeCol.style.justifyContent = 'center';
        timeCol.style.fontFamily = 'monospace';
        timeCol.style.fontSize = '0.75rem';
        timeCol.style.color = isPrime ? '#D4AF37' : 'var(--text-secondary)';
        timeCol.style.fontWeight = isPrime ? '700' : '400';
        timeCol.innerHTML = `
            <span>${hourStr}</span>
            ${hour === 18 ? '<span style="font-size: 0.6rem; color: #D4AF37; text-transform: uppercase;">🔥 PRIME</span>' : ''}
        `;
        grid.appendChild(timeCol);

        // Days 1 to 7
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const dayDateStr = formatSchedYMD(days[dayIdx]);
            const cell = document.createElement('div');
            cell.className = `cal-hour-cell ${isPrime ? 'prime-hour' : ''}`;
            
            cell.onclick = (e) => {
                if (e.target.closest('.sched-pill')) return;
                openOnlineComposerModal({ date: dayDateStr, time: `${String(hour).padStart(2, '0')}:00` });
            };

            const matching = (onlineScheduleData.posts || []).filter(p => {
                if (!p.scheduled_time) return false;
                const pDate = p.scheduled_time.split('T')[0];
                const pHour = parseInt(p.scheduled_time.split('T')[1]?.split(':')[0] || '-1');
                return pDate === dayDateStr && pHour === hour;
            });

            matching.forEach(p => {
                const pill = document.createElement('div');
                const isPlaceholder = p.status === 'placeholder' ||
                                      p.is_placeholder === true ||
                                      (p.title || '').toUpperCase().includes('PLACEHOLDER') ||
                                      (p.caption || '').toUpperCase().includes('PLACEHOLDER');

                let statusClass = 'ready';
                let icon = '<i class="fa-solid fa-circle-play" style="color: #60a5fa; flex-shrink: 0;" title="Ready to post"></i>';

                if (p.status === 'published') {
                    statusClass = 'published';
                    icon = '<i class="fa-solid fa-circle-check" style="color: #10b981; flex-shrink: 0;" title="Published"></i>';
                } else if (p.status === 'failed') {
                    statusClass = 'failed';
                    icon = '<i class="fa-solid fa-circle-xmark" style="color: #ef4444; flex-shrink: 0;" title="Failed"></i>';
                } else if (p.status === 'missed') {
                    statusClass = 'failed';
                    icon = '<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b; flex-shrink: 0;" title="Missed scheduled window - Blocked to protect algorithm"></i>';
                } else if (isPlaceholder) {
                    statusClass = 'placeholder';
                    icon = '<i class="fa-solid fa-bookmark" style="color: #facc15; flex-shrink: 0;" title="Placeholder Slot"></i>';
                } else {
                    // Ready but not posted yet -> BLUE
                    statusClass = 'ready';
                    icon = '<i class="fa-solid fa-circle-play" style="color: #60a5fa; flex-shrink: 0;" title="Ready (Scheduled)"></i>';
                }
                pill.className = `sched-pill ${statusClass}`;
                pill.title = `${p.scheduled_time ? p.scheduled_time.replace('T', ' ') : ''} — ${p.title || (p.post_type || '').toUpperCase()}`;
                const tPart = p.scheduled_time.split('T')[1]?.substring(0, 5) || '';
                const typeLabel = (p.post_type || 'reel').replace('_', ' ');
                pill.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 4px; overflow: hidden; min-width: 0; flex: 1;">
                        ${icon}
                        <strong style="font-family: monospace; font-size: 0.7rem; flex-shrink: 0;">${tPart}</strong>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1; font-weight: 500;">${p.title || typeLabel.toUpperCase()}</span>
                    </div>
                    <span style="font-size: 0.6rem; padding: 1px 4px; background: rgba(0,0,0,0.5); border-radius: 4px; flex-shrink: 0; text-transform: uppercase;">${typeLabel}</span>
                `;
                pill.onclick = (e) => {
                    e.stopPropagation();
                    openOnlineComposerModal(p);
                };
                cell.appendChild(pill);
            });

            grid.appendChild(cell);
        }
    }

    // Scroll to 14:00 on first render
    const scrollBox = document.getElementById('calendarScrollBody');
    if (scrollBox && !scrollBox.dataset.scrolled) {
        scrollBox.scrollTop = 54 * 14;
        scrollBox.dataset.scrolled = "true";
    }
}

function renderOnlineQueueList() {
    const wrapper = document.getElementById('queueListWrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    const posts = onlineScheduleData.posts || [];

    if (posts.length === 0) {
        wrapper.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-secondary); background: var(--surface-100); border-radius: 12px;">
                <i class="fa-regular fa-calendar-xmark" style="font-size: 2.5rem; color: #555; display: block; margin-bottom: 12px;"></i>
                No scheduled posts yet. Click "+ Schedule Post" to create one.
            </div>
        `;
        return;
    }

    posts.forEach(p => {
        const item = document.createElement('div');
        item.style.background = 'var(--surface-100)';
        item.style.border = '1px solid var(--border-color)';
        item.style.borderRadius = '12px';
        item.style.padding = '16px';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.flexWrap = 'wrap';
        item.style.gap = '15px';

        const isPlaceholder = p.status === 'placeholder' ||
                              p.is_placeholder === true ||
                              (p.title || '').toUpperCase().includes('PLACEHOLDER') ||
                              (p.caption || '').toUpperCase().includes('PLACEHOLDER');

        let statusBadge = '<span style="padding: 3px 8px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; background: rgba(59,130,246,0.18); color: #93c5fd; border: 1px solid rgba(59,130,246,0.4);">READY</span>';
        let mediaIconBg = 'rgba(59,130,246,0.1)';
        let mediaIconBorder = 'rgba(59,130,246,0.3)';
        let mediaIconColor = '#60a5fa';

        if (p.status === 'published') {
            statusBadge = '<span style="padding: 3px 8px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3);">PUBLISHED</span>';
            mediaIconBg = 'rgba(16,185,129,0.1)';
            mediaIconBorder = 'rgba(16,185,129,0.3)';
            mediaIconColor = '#10b981';
        } else if (p.status === 'failed') {
            statusBadge = '<span style="padding: 3px 8px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3);">FAILED</span>';
            mediaIconBg = 'rgba(239,68,68,0.1)';
            mediaIconBorder = 'rgba(239,68,68,0.3)';
            mediaIconColor = '#ef4444';
        } else if (p.status === 'missed') {
            statusBadge = '<span style="padding: 3px 8px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3);">MISSED</span>';
            mediaIconBg = 'rgba(245,158,11,0.1)';
            mediaIconBorder = 'rgba(245,158,11,0.3)';
            mediaIconColor = '#f59e0b';
        } else if (isPlaceholder) {
            statusBadge = '<span style="padding: 3px 8px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; background: rgba(234,179,8,0.18); color: #fef08a; border: 1px solid rgba(234,179,8,0.4);">PLACEHOLDER</span>';
            mediaIconBg = 'rgba(234,179,8,0.1)';
            mediaIconBorder = 'rgba(234,179,8,0.3)';
            mediaIconColor = '#eab308';
        }

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 44px; height: 44px; border-radius: 10px; background: ${mediaIconBg}; border: 1px solid ${mediaIconBorder}; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: ${mediaIconColor};">
                    ${p.post_type === 'both' ? '<i class="fa-solid fa-rocket"></i>' : p.post_type === 'reel' ? '<i class="fa-solid fa-film"></i>' : '<i class="fa-brands fa-instagram"></i>'}
                </div>
                <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <strong style="color: #fff; font-size: 0.95rem;">${p.title || 'Untitled Post'}</strong>
                        ${statusBadge}
                        <span style="font-family: monospace; font-size: 0.8rem; color: var(--text-secondary);">${p.scheduled_time.replace('T', ' ')}</span>
                    </div>
                    <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary); max-width: 500px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${p.caption || 'No caption provided.'}
                    </p>
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick='openOnlineComposerModal(${JSON.stringify(p)})' class="sub-tab-btn" style="padding: 6px 12px; font-size: 0.8rem;">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
                <button onclick='publishPostDirectlyOnline("${p.id}")' class="ig-btn" style="padding: 6px 12px; font-size: 0.8rem;">
                    <i class="fa-solid fa-bolt"></i> Publish Now
                </button>
            </div>
        `;
        wrapper.appendChild(item);
    });
}

// DRAG AND DROP FILE UPLOADS (OPTION B)
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
}

function handleFileDrop(e, targetType) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        uploadFileToServer(e.dataTransfer.files[0], targetType);
    }
}

function handleFileSelect(e, targetType) {
    if (e.target.files && e.target.files.length > 0) {
        uploadFileToServer(e.target.files[0], targetType);
    }
}

async function uploadFileToServer(file, targetType) {
    const prog = document.getElementById('primaryUploadProgress');
    if (prog) prog.style.display = 'block';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', targetType);

    try {
        const res = await fetch('/api/upload-media', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Upload failed');

        if (targetType === 'primary') {
            document.getElementById('schedPrimaryMediaUrl').value = data.url;
            document.getElementById('primaryDropLabel').innerText = `✅ Attached: ${data.filename} (${data.size_mb} MB)`;
            previewOnlineMedia(data.url, data.is_video);
        } else if (targetType === 'story1') {
            document.getElementById('schedStory1Url').value = data.url;
            document.getElementById('story1DropLabel').innerText = `✅ ${data.filename}`;
        } else if (targetType === 'story2') {
            document.getElementById('schedStory2Url').value = data.url;
            document.getElementById('story2DropLabel').innerText = `✅ ${data.filename}`;
        }
    } catch (err) {
        alert("Upload error: " + err.message);
    } finally {
        if (prog) prog.style.display = 'none';
    }
}

function previewOnlineMedia(url, isVideo = null) {
    const wrap = document.getElementById('onlineMediaPreviewWrapper');
    const vid = document.getElementById('onlinePreviewVideo');
    const img = document.getElementById('onlinePreviewImage');
    const err = document.getElementById('onlinePreviewError');
    const extLink = document.getElementById('onlinePreviewExtLink');
    if (!wrap || !url) {
        if (wrap) wrap.style.display = 'none';
        return;
    }

    if (err) err.style.display = 'none';

    // Normalize URL
    let resolvedUrl = url.trim();
    if (!resolvedUrl.startsWith('http') && !resolvedUrl.startsWith('/')) {
        resolvedUrl = '/' + resolvedUrl;
    }

    if (extLink) extLink.href = resolvedUrl;

    const isVid = (isVideo !== null) ? isVideo : /\.(mp4|mov|webm|m4v)($|\?)/i.test(resolvedUrl);

    wrap.style.display = 'block';
    if (isVid) {
        if (img) {
            img.style.display = 'none';
            img.src = '';
            img.onerror = null;
        }
        if (vid) {
            vid.style.display = 'block';
            vid.onerror = () => {
                if (!vid.src || vid.src === window.location.href) return;
                if (err) err.style.display = 'block';
            };
            vid.onloadeddata = () => {
                if (err) err.style.display = 'none';
            };
            vid.src = resolvedUrl;
            vid.load();
        }
    } else {
        if (vid) {
            vid.style.display = 'none';
            vid.onerror = null;
            vid.removeAttribute('src');
            vid.load();
        }
        if (img) {
            img.style.display = 'block';
            img.onerror = () => {
                if (err) err.style.display = 'block';
            };
            img.onload = () => {
                if (err) err.style.display = 'none';
            };
            img.src = resolvedUrl;
        }
    }
}

function setupPreviewTabs(post) {
    const tabsContainer = document.getElementById('previewTabs');
    const badge = document.getElementById('carouselSlideBadge');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';

    const mediaList = [];
    const isCarousel = (post.post_type === 'carousel') || (post.carousel_items && Array.isArray(post.carousel_items) && post.carousel_items.length > 0);

    if (isCarousel && post.carousel_items && post.carousel_items.length > 0) {
        post.carousel_items.forEach((url, i) => {
            mediaList.push({ label: `🖼️ Slide ${i + 1}`, url: url, index: i });
        });
        if (badge) {
            badge.style.display = 'block';
            badge.innerHTML = `<i class="fa-solid fa-layer-group" style="color: #38bdf8;"></i> <strong style="color: #38bdf8;">Carousel Album:</strong> ${post.carousel_items.length} slides attached. <em>All ${post.carousel_items.length} slides will be published to Instagram.</em>`;
        }
    } else {
        if (badge) badge.style.display = 'none';
        if (post.primary_media && post.post_type !== 'story_parts') {
            mediaList.push({ label: '📹 Reel / Media', url: post.primary_media });
        }
        if (post.story_part1) {
            mediaList.push({ label: '📹 Story Part 1', url: post.story_part1 });
        }
        if (post.story_part2) {
            mediaList.push({ label: '📹 Story Part 2', url: post.story_part2 });
        }
        if (post.cover_media) {
            mediaList.push({ label: '🖼️ Flyer Preview', url: post.cover_media });
        }
    }

    if (mediaList.length > 1) {
        tabsContainer.style.display = 'flex';
        mediaList.forEach((m, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `sub-tab-btn ${idx === 0 ? 'active' : ''}`;
            btn.style.padding = '4px 10px';
            btn.style.fontSize = '0.75rem';
            btn.style.borderRadius = '6px';
            btn.style.cursor = 'pointer';
            btn.innerText = m.label;
            btn.onclick = () => {
                Array.from(tabsContainer.children).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                previewOnlineMedia(m.url);
            };
            tabsContainer.appendChild(btn);
        });
    } else {
        tabsContainer.style.display = 'none';
    }

    if (mediaList.length > 0) {
        previewOnlineMedia(mediaList[0].url);
    }
}

// MODAL COMPOSER ACTIONS
function openOnlineComposerModal(initial = null) {
    const modal = document.getElementById('onlineComposerModal');
    if (!modal) return;
    modal.style.display = 'flex';
    renderSchedTagPills();

    const dInput = document.getElementById('schedInputDate');
    const tInput = document.getElementById('schedInputTime');
    const idInput = document.getElementById('schedEditPostId');
    const titleInput = document.getElementById('schedInputTitle');
    const capInput = document.getElementById('schedInputCaption');
    const delBtn = document.getElementById('btnOnlineDelete');

    if (initial && initial.id) {
        idInput.value = initial.id;
        titleInput.value = initial.title || '';
        capInput.value = initial.caption || '';
        const parts = (initial.scheduled_time || '').split('T');
        dInput.value = parts[0] || formatSchedYMD(new Date());
        tInput.value = parts[1]?.substring(0, 5) || '18:00';
        selectOnlinePostType(initial.post_type || 'both');
        document.getElementById('schedPrimaryMediaUrl').value = initial.primary_media || '';
        document.getElementById('schedStory1Url').value = initial.story_part1 || '';
        document.getElementById('schedStory2Url').value = initial.story_part2 || '';
        
        if (initial.primary_media) {
            document.getElementById('primaryDropLabel').innerText = `✅ Attached: ${initial.primary_media.split('/').pop()}`;
        }
        if (initial.story_part1) {
            document.getElementById('story1DropLabel').innerText = `✅ ${initial.story_part1.split('/').pop()}`;
        }
        if (initial.story_part2) {
            document.getElementById('story2DropLabel').innerText = `✅ ${initial.story_part2.split('/').pop()}`;
        }

        setupPreviewTabs(initial);

        delBtn.style.display = 'inline-block';
        document.getElementById('onlineComposerTitle').innerText = "Edit Scheduled Post";
    } else {
        idInput.value = '';
        titleInput.value = '';
        capInput.value = '';
        dInput.value = initial?.date || formatSchedYMD(new Date());
        tInput.value = initial?.time || '18:00';
        selectOnlinePostType('both');
        delBtn.style.display = 'none';
        document.getElementById('onlineComposerTitle').innerText = "Schedule New Instagram Post";
        document.getElementById('primaryDropLabel').innerText = "Drag & drop your Reel Video or Photo here";
        document.getElementById('story1DropLabel').innerText = "Story Part 1 (Sliding Flyers)";
        document.getElementById('story2DropLabel').innerText = "Story Part 2 (Schedule List)";
        document.getElementById('schedPrimaryMediaUrl').value = '';
        document.getElementById('schedStory1Url').value = '';
        document.getElementById('schedStory2Url').value = '';
        const wrap = document.getElementById('onlineMediaPreviewWrapper');
        if (wrap) wrap.style.display = 'none';
        const tabsContainer = document.getElementById('previewTabs');
        if (tabsContainer) {
            tabsContainer.innerHTML = '';
            tabsContainer.style.display = 'none';
        }
    }
    updateOnlineCaptionCounts();
}

function closeOnlineComposerModal() {
    const modal = document.getElementById('onlineComposerModal');
    if (modal) modal.style.display = 'none';
}

function selectOnlinePostType(type) {
    document.getElementById('schedSelectedType').value = type;
    ['both', 'reel', 'story_single', 'story_parts', 'photo', 'carousel'].forEach(t => {
        const btn = document.getElementById(`typeBtn_${t}`);
        if (!btn) return;
        if (t === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const storyFields = document.getElementById('storyUploadFields');
    if (storyFields) {
        storyFields.style.display = (type === 'both' || type === 'story_parts') ? 'grid' : 'none';
    }

    const primaryBox = document.getElementById('dropzonePrimary');
    const primaryLabel = document.getElementById('primaryDropLabel');
    if (type === 'story_single') {
        if (primaryLabel) primaryLabel.innerText = "Drag & drop your 1-Part Story Video or Photo here";
    } else if (type === 'reel') {
        if (primaryLabel) primaryLabel.innerText = "Drag & drop your Reel Video (9:16 1080x1920) here";
    } else if (type === 'photo') {
        if (primaryLabel) primaryLabel.innerText = "Drag & drop your Feed Photo Flyer here";
    } else {
        if (primaryLabel) primaryLabel.innerText = "Drag & drop your Reel Video or Photo here";
    }
}

function setOnlinePreset(preset) {
    const now = new Date();
    if (preset === 'today_prime') {
        document.getElementById('schedInputDate').value = formatSchedYMD(now);
        document.getElementById('schedInputTime').value = "18:00";
    } else if (preset === 'tomorrow_prime') {
        now.setDate(now.getDate() + 1);
        document.getElementById('schedInputDate').value = formatSchedYMD(now);
        document.getElementById('schedInputTime').value = "18:00";
    } else if (preset === 'friday_prime') {
        const day = now.getDay();
        const diff = (5 - day + 7) % 7;
        now.setDate(now.getDate() + diff);
        document.getElementById('schedInputDate').value = formatSchedYMD(now);
        document.getElementById('schedInputTime').value = "18:30";
    }
}

function updateOnlineCaptionCounts() {
    const val = document.getElementById('schedInputCaption').value;
    const chars = val.length;
    const hashtags = (val.match(/#[a-zA-Z0-9_]+/g) || []).length;
    document.getElementById('schedCaptionCounts').innerText = `${chars} chars · ${hashtags} hashtags`;
}

function renderSchedTagPills(selectedTags = SCHED_DEFAULT_TAGS) {
    const box = document.getElementById('schedTagPillsBox');
    if (!box) return;
    box.innerHTML = '';
    selectedTags.forEach(t => {
        const span = document.createElement('span');
        span.style.padding = '4px 8px';
        span.style.borderRadius = '6px';
        span.style.background = 'rgba(212,175,55,0.1)';
        span.style.border = '1px solid rgba(212,175,55,0.3)';
        span.style.color = '#F3E5AB';
        span.style.fontSize = '0.75rem';
        span.style.fontFamily = 'monospace';
        span.style.display = 'inline-flex';
        span.style.alignItems = 'center';
        span.style.gap = '4px';
        span.innerHTML = `${t} <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:#888; cursor:pointer;">&times;</button>`;
        box.appendChild(span);
    });
}

async function saveOnlinePostSchedule(targetStatus = 'scheduled') {
    const dVal = document.getElementById('schedInputDate').value;
    const tVal = document.getElementById('schedInputTime').value;
    if (!dVal || !tVal) {
        alert("Please set Date and Time.");
        return null;
    }

    const pills = document.getElementById('schedTagPillsBox').querySelectorAll('span');
    const tags = Array.from(pills).map(p => p.textContent.replace('×', '').trim());

    const payload = {
        id: document.getElementById('schedEditPostId').value || undefined,
        title: document.getElementById('schedInputTitle').value.trim() || 'Instagram Post',
        scheduled_time: `${dVal}T${tVal}`,
        post_type: document.getElementById('schedSelectedType').value,
        primary_media: document.getElementById('schedPrimaryMediaUrl').value.trim(),
        story_part1: document.getElementById('schedStory1Url').value.trim(),
        story_part2: document.getElementById('schedStory2Url').value.trim(),
        caption: document.getElementById('schedInputCaption').value.trim(),
        user_tags: tags,
        status: targetStatus
    };

    try {
        const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        await fetchOnlineSchedule();
        closeOnlineComposerModal();
        return data.post;
    } catch (e) {
        alert("Failed to save post: " + e);
        return null;
    }
}

async function publishOnlinePostNow() {
    const post = await saveOnlinePostSchedule('publishing');
    if (!post) return;
    publishPostDirectlyOnline(post.id, post);
}

async function publishPostDirectlyOnline(postId, postData = null) {
    openOnlineLogModal();
    addOnlineLogLine("Connecting to Instagram Meta Graph API...");
    addOnlineLogLine(`Triggering Post ID: ${postId}...`);

    try {
        const res = await fetch('/api/publish-now', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: postId, ...(postData || {}) })
        });
        const result = await res.json();
        (result.logs || []).forEach(l => addOnlineLogLine(l));
        if (result.success) {
            addOnlineLogLine("🎉 Post successfully published to Instagram!");
        } else {
            addOnlineLogLine("❌ Publication failed. Review error output above.");
        }
        document.getElementById('onlineLogSpinner').style.display = 'none';
        await fetchOnlineSchedule();
    } catch (err) {
        addOnlineLogLine("❌ Network or API error: " + err);
        document.getElementById('onlineLogSpinner').style.display = 'none';
    }
}

async function deleteOnlinePost() {
    const id = document.getElementById('schedEditPostId').value;
    if (!id) return;
    if (!confirm("Are you sure you want to delete this scheduled post?")) return;
    try {
        await fetch(`/api/schedule/${id}`, { method: 'DELETE' });
        await fetchOnlineSchedule();
        closeOnlineComposerModal();
    } catch (e) {
        alert("Delete failed: " + e);
    }
}

function openOnlineLogModal() {
    document.getElementById('onlineLogModal').style.display = 'flex';
    document.getElementById('onlineLogTerminal').innerHTML = '';
    document.getElementById('onlineLogSpinner').style.display = 'inline-block';
}

function closeOnlineLogModal() {
    document.getElementById('onlineLogModal').style.display = 'none';
}

function addOnlineLogLine(txt) {
    const term = document.getElementById('onlineLogTerminal');
    const div = document.createElement('div');
    div.innerText = txt;
    term.appendChild(div);
    term.scrollTop = term.scrollHeight;
}

// BCN Clock
function startOnlineClock() {
    function tick() {
        const now = new Date();
        const str = now.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour12: false });
        const el = document.getElementById('headerBcnClock');
        if (el) el.innerText = str;
    }
    tick();
    setInterval(tick, 1000);
}

// Auto-boot scheduler on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    startOnlineClock();
    fetchOnlineSchedule();
    setInterval(fetchOnlineSchedule, 15000);
});
