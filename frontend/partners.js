const API_KEY = "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";
const BASE_URL = "https://channels-service.fourvenues.com";

window.renderSparklineAndTrend = function({
    statId,
    data,
    dates = null,
    colorHex = '#3b82f6',
    inverseTrend = false,
    labelSuffix = 'vs 7d ago'
}) {
    const statEl = document.getElementById(statId);
    if (!statEl) return;

    let containerEl = statEl.parentElement;
    if (!containerEl || !containerEl.classList.contains('stat-value-container')) {
        containerEl = document.createElement('div');
        containerEl.className = 'stat-value-container';
        statEl.parentNode.insertBefore(containerEl, statEl);
        containerEl.appendChild(statEl);
    }

    let badgeEl = document.getElementById(`${statId}-trend`);
    if (!badgeEl) {
        badgeEl = document.createElement('span');
        badgeEl.id = `${statId}-trend`;
        badgeEl.className = 'trend-badge badge-neutral';
        const cardEl = containerEl.parentElement;
        if (cardEl) {
            cardEl.appendChild(badgeEl);
        }
    }

    const cardEl = containerEl.parentElement;
    let sparkEl = document.getElementById(`${statId}-sparkline`);
    if (cardEl && !sparkEl) {
        sparkEl = document.createElement('div');
        sparkEl.id = `${statId}-sparkline`;
        sparkEl.className = 'stat-sparkline-container';
        cardEl.appendChild(sparkEl);
    }

    if (!data || !Array.isArray(data) || data.length < 2) {
        if (badgeEl) badgeEl.innerHTML = `<i class="fa-solid fa-minus"></i> 0% ${labelSuffix}`;
        if (sparkEl) sparkEl.innerHTML = '';
        return;
    }

    const validData = data.map(v => parseFloat(v) || 0);
    if (validData.length < 2) return;

    const currentVal = validData[validData.length - 1];
    const compareIdx = validData.length >= 8 ? validData.length - 8 : 0;
    const priorVal = validData[compareIdx];

    let diffPct = 0;
    if (priorVal > 0) {
        diffPct = ((currentVal - priorVal) / priorVal) * 100;
    } else if (currentVal > 0) {
        diffPct = 100.0;
    }

    let isPositive = diffPct > 0.05;
    let isNegative = diffPct < -0.05;

    let badgeClass = 'badge-neutral';
    if (isPositive) {
        badgeClass = inverseTrend ? 'badge-danger' : 'badge-success';
    } else if (isNegative) {
        badgeClass = inverseTrend ? 'badge-success' : 'badge-danger';
    }

    const sign = diffPct > 0 ? '+' : '';
    const arrow = diffPct > 0.05 ? '▲' : (diffPct < -0.05 ? '▼' : '<i class="fa-solid fa-minus"></i>');
    const displayPct = Math.abs(diffPct) < 0.05 ? '0%' : `${sign}${diffPct.toFixed(1)}%`;

    if (badgeEl) {
        badgeEl.className = `trend-badge ${badgeClass}`;
        badgeEl.innerHTML = `${arrow} ${displayPct} ${labelSuffix}`;
    }

    if (sparkEl) {
        const height = 38;
        const width = 200;
        const min = Math.min(...validData);
        const max = Math.max(...validData);
        const range = (max - min) || 1;

        const pts = validData.map((val, idx) => {
            const x = (idx / (validData.length - 1)) * width;
            const y = height - ((val - min) / range) * 26 - 6;
            return { x, y };
        });

        const tension = 0.18;
        let pathD = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i];
            const p1 = pts[i + 1];
            const segDx = p1.x - p0.x;
            const cp1x = p0.x + segDx * tension;
            const cp1y = p0.y + (p1.y - p0.y) * tension;
            const cp2x = p1.x - segDx * tension;
            const cp2y = p1.y - (p1.y - p0.y) * tension;
            pathD += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
        }

        const polygonD = `${pathD} L ${width},${height} L 0,${height} Z`;
        const gradId = `grad-${statId.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const endTopPct = (pts[pts.length - 1].y / height) * 100;

        sparkEl.style.position = 'relative';
        sparkEl.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width: 100%; height: 100%; display: block; overflow: visible;">
                <defs>
                    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="${colorHex}" stop-opacity="0.35" />
                        <stop offset="100%" stop-color="${colorHex}" stop-opacity="0.0" />
                    </linearGradient>
                </defs>
                <path d="${polygonD}" fill="url(#${gradId})" />
                <path d="${pathD}" fill="none" stroke="${colorHex}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
            </svg>
            <div class="sparkline-end-dot" style="position: absolute; right: 1px; top: ${endTopPct.toFixed(1)}%; width: 7px; height: 7px; border-radius: 50%; background: ${colorHex}; border: 1.5px solid #fff; box-shadow: 0 0 6px ${colorHex}; transform: translateY(-50%); z-index: 2; pointer-events: none; transition: opacity 0.15s ease;"></div>
            <div class="sparkline-hover-dot" style="position: absolute; width: 9px; height: 9px; border-radius: 50%; background: #fff; border: 2.5px solid ${colorHex}; box-shadow: 0 0 10px ${colorHex}; transform: translate(-50%, -50%); z-index: 5; pointer-events: none; display: none;"></div>
            <div class="sparkline-tooltip" style="position: absolute; bottom: 85%; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(255, 255, 255, 0.2); padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; color: #fff; pointer-events: none; white-space: nowrap; z-index: 10; display: none; box-shadow: 0 4px 12px rgba(0,0,0,0.6); font-family: 'Inter', sans-serif;"></div>
        `;

        const endDot = sparkEl.querySelector('.sparkline-end-dot');
        const hoverDot = sparkEl.querySelector('.sparkline-hover-dot');
        const tooltip = sparkEl.querySelector('.sparkline-tooltip');

        sparkEl.style.cursor = 'crosshair';
        sparkEl.onmousemove = (e) => {
            const rect = sparkEl.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const idx = Math.round(ratio * (validData.length - 1));
            const pt = pts[idx];
            if (!pt) return;

            const valStr = typeof validData[idx] === 'number' ? validData[idx].toLocaleString(undefined, { maximumFractionDigits: 2 }) : validData[idx];
            const dateStr = (dates && dates[idx]) ? dates[idx] : `Point ${idx + 1}`;

            const leftPct = (pt.x / width) * 100;
            const topPct = (pt.y / height) * 100;

            if (endDot) endDot.style.opacity = '0.2';
            hoverDot.style.left = `${leftPct.toFixed(1)}%`;
            hoverDot.style.top = `${topPct.toFixed(1)}%`;
            hoverDot.style.display = 'block';

            tooltip.innerHTML = `<span style="color: #94a3b8; font-size: 0.68rem; display: block;">${dateStr}</span><strong style="color: ${colorHex}; font-size: 0.82rem;">${valStr}</strong>`;
            tooltip.style.left = `${Math.max(15, Math.min(85, leftPct)).toFixed(1)}%`;
            tooltip.style.display = 'block';
        };
        sparkEl.onmouseleave = () => {
            if (endDot) endDot.style.opacity = '1';
            hoverDot.style.display = 'none';
            tooltip.style.display = 'none';
        };
    }
};

let globalPartners = [];
// Array of all raw events fetched from Fourvenues
let globalEvents = [];
// Dictionary mapping event_id -> Array of tickets
let globalTicketsMap = {};

let startDate = null;
let endDate = null;

let overviewChartInstance = null;
let partnerChartInstance = null;
let currentPartnerProfileId = null;

document.addEventListener('DOMContentLoaded', async () => {
    setupDateFilters();
    try {
        await initDashboard();
    } catch (e) {
        console.error("Dashboard init error:", e);
        document.getElementById('sync-status').innerText = 'Error Syncing';
        document.getElementById('sync-status').style.color = 'var(--color-danger)';
        document.getElementById('partners-table-body').innerHTML = `
            <tr><td colspan="7" style="color: var(--color-danger); text-align:center;">Failed to load data. Check console.</td></tr>
        `;
    }
});

function setupDateFilters() {
    const today = new Date();
    
    // Set default (Last 30 days) visually and internally
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    document.getElementById('date-start').value = start.toISOString().split('T')[0];
    document.getElementById('date-end').value = end.toISOString().split('T')[0];
    
    document.querySelectorAll('.date-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.date-preset-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const preset = e.target.dataset.preset;
            const endD = new Date();
            let startD = new Date();
            
            if (preset === '7d') {
                startD.setDate(endD.getDate() - 7);
            } else if (preset === '30d') {
                startD.setDate(endD.getDate() - 30);
            } else if (preset === 'this-month') {
                startD.setDate(1);
            } else if (preset === 'last-month') {
                startD.setMonth(startD.getMonth() - 1);
                startD.setDate(1);
                endD.setDate(0); // last day of previous month
            } else if (preset === 'all') {
                startD = new Date('2020-01-01');
            }
            
            document.getElementById('date-start').value = startD.toISOString().split('T')[0];
            document.getElementById('date-end').value = endD.toISOString().split('T')[0];
            
            applyDateFilter();
        });
    });

    document.getElementById('btn-apply-dates').addEventListener('click', () => {
        document.querySelectorAll('.date-preset-btn').forEach(b => b.classList.remove('active'));
        applyDateFilter();
    });
}

function applyDateFilter() {
    const s = document.getElementById('date-start').value;
    const e = document.getElementById('date-end').value;
    if (s && e) {
        startDate = new Date(s);
        startDate.setHours(0,0,0,0);
        endDate = new Date(e);
        endDate.setHours(23,59,59,999);
        
        processAndRender();
        if (currentPartnerProfileId) {
            openPartnerProfile(currentPartnerProfileId); // re-render profile
        }
    }
}

async function apiFetch(endpoint) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
            'X-Api-Key': API_KEY,
            'Content-Type': 'application/json'
        }
    });
    if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
    }
    const data = await res.json();
    return data.data || data;
}

async function apiFetchAll(baseEndpoint) {
    let allData = [];
    let offset = 0;
    const limit = 100;
    const sep = baseEndpoint.includes('?') ? '&' : '?';
    
    while (true) {
        const url = `${baseEndpoint}${sep}limit=${limit}&offset=${offset}`;
        const data = await apiFetch(url);
        if (!data || data.length === 0) {
            break;
        }
        allData = allData.concat(data);
        if (data.length < limit) {
            break;
        }
        offset += limit;
    }
    return allData;
}

async function initDashboard() {
    const syncStatus = document.getElementById('sync-status');
    syncStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching Partners...';
    
    // 1. Fetch Partners
    const authData = await apiFetch('/auth');
    if (authData && authData.channel && authData.channel.hosts) {
        // Exclude the channel itself if it's in the list
        globalPartners = authData.channel.hosts.filter(h => h._id !== authData.channel._id && !h.name.includes('(Channel)'));

    } else {
        throw new Error("Could not load hosts from auth data");
    }
    
    syncStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching Events...';
    
    // 2. Fetch Events
    try {
        globalEvents = await apiFetchAll('/events');
    } catch(e) {
        console.warn("Failed fetching events directly, trying fallback or empty", e);
    }
    
    // 3. Fetch Tickets, Lists, and Bookings
    syncStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching Sales Data...';
    // We only fetch data for events in the last ~3 months to avoid massive loading times on init.
    // The user can filter later, but this speeds up initial boot.
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 3);

    for (const event of globalEvents) {
        const evDate = new Date(event.start_date || event.display_date);
        if (evDate < cutoffDate) continue;

        let allItems = [];
        try {
            const tickets = await apiFetchAll(`/tickets?event_id=${event._id}`);
            allItems = allItems.concat(tickets);
        } catch(e) {
            console.warn("Failed fetching tickets for event", event.name);
        }

        try {
            const lists = await apiFetchAll(`/lists?event_id=${event._id}`);
            // Map lists to look like tickets
            const mappedLists = lists.map(l => ({
                price: { price: l.raised || 0 },
                for: l.for || 0,
                enter: l.enter || 0
            }));
            allItems = allItems.concat(mappedLists);
        } catch(e) {
            console.warn("Failed fetching lists for event", event.name);
        }

        try {
            const bookings = await apiFetchAll(`/bookings?event_id=${event._id}`);
            // Map bookings to look like tickets
            const mappedBookings = bookings.map(b => {
                let entered = 0;
                if (['arrived', 'arrived-partial', 'seated', 'seated-partial'].includes(b.status)) {
                    entered = b.quantity; // approximation for partials
                }
                return {
                    price: { price: b.deposit || 0 },
                    for: b.quantity || 0,
                    enter: entered
                };
            });
            allItems = allItems.concat(mappedBookings);
        } catch(e) {
            console.warn("Failed fetching bookings for event", event.name);
        }

        globalTicketsMap[event._id] = allItems;
    }
    
    syncStatus.innerHTML = '<i class="fa-solid fa-check"></i> Synced';
    
    // Trigger initial filter and render
    document.querySelector('.date-preset-btn[data-preset="30d"]').click();
}

function processAndRender() {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalFree = 0;
    let globalTotalFor = 0;
    let globalTotalEnter = 0;
    let validEventCount = 0;
    
    const partnerData = {};
    globalPartners.forEach(p => {
        partnerData[p._id] = {
            id: p._id,
            name: p.name,
            logo_url: p.logo_url,
            events: [],
            revenue: 0,
            paid: 0,
            free: 0,
            totalFor: 0,
            totalEnter: 0
        };
    });
    
    const chartDataByDate = {}; // key: YYYY-MM-DD
    
    globalEvents.forEach(event => {
        const evDateStr = event.start_date || event.display_date;
        const evDate = new Date(evDateStr);
        if (evDate < startDate || evDate > endDate) return;
        
        validEventCount++;
        
        const orgId = event.organization_id;
        const tickets = globalTicketsMap[event._id] || [];
        
        let eventRev = 0;
        let evPaid = 0;
        let evFree = 0;
        let evTotalFor = 0;
        let evTotalEnter = 0;
        
        tickets.forEach(t => {
            const price = t.total_price !== undefined ? t.total_price : (t.price && t.price.price ? t.price.price : 0);
            const clientsFor = t.for || 1;
            const clientsEnter = t.enter || 0;
            
            if (price > 0) {
                evPaid++;
                eventRev += price;
            } else {
                evFree++;
            }
            evTotalFor += clientsFor;
            evTotalEnter += clientsEnter;
        });
        
        if (partnerData[orgId]) {
            partnerData[orgId].events.push({
                name: event.name,
                date: evDateStr,
                paid: evPaid,
                free: evFree,
                revenue: eventRev,
                totalFor: evTotalFor,
                totalEnter: evTotalEnter
            });
            partnerData[orgId].revenue += eventRev;
            partnerData[orgId].paid += evPaid;
            partnerData[orgId].free += evFree;
            partnerData[orgId].totalFor += evTotalFor;
            partnerData[orgId].totalEnter += evTotalEnter;
        }
        
        totalRevenue += eventRev;
        totalPaid += evPaid;
        totalFree += evFree;
        globalTotalFor += evTotalFor;
        globalTotalEnter += evTotalEnter;
        
        // Aggregate for chart
        const dateKey = evDate.toISOString().split('T')[0];
        if (!chartDataByDate[dateKey]) {
            chartDataByDate[dateKey] = { revenue: 0, tickets: 0, totalFor: 0, totalEnter: 0 };
        }
        chartDataByDate[dateKey].revenue += eventRev;
        chartDataByDate[dateKey].tickets += (evPaid + evFree);
        chartDataByDate[dateKey].totalFor += evTotalFor;
        chartDataByDate[dateKey].totalEnter += evTotalEnter;
    });
    
    const avgNoShow = globalTotalFor > 0 ? ((globalTotalFor - globalTotalEnter) / globalTotalFor * 100).toFixed(1) : 0;
    
    // Update top stats
    document.getElementById('stat-total-partners').innerText = globalPartners.length;
    document.getElementById('stat-total-events').innerText = validEventCount;
    document.getElementById('stat-total-tickets').innerText = totalPaid + totalFree;
    document.getElementById('stat-tickets-detail').innerText = `Paid: ${totalPaid} | Free: ${totalFree}`;
    document.getElementById('stat-total-revenue').innerText = totalRevenue.toFixed(2) + '€';
    document.getElementById('stat-avg-noshow').innerText = `${avgNoShow}%`;
    
    if (window.renderSparklineAndTrend) {
        const dates = Object.keys(chartDataByDate).sort();
        const revSeries = dates.map(d => chartDataByDate[d].revenue);
        const tixSeries = dates.map(d => chartDataByDate[d].tickets);
        const noShowSeries = dates.map(d => {
            const dd = chartDataByDate[d];
            return dd.totalFor > 0 ? ((dd.totalFor - dd.totalEnter) / dd.totalFor * 100) : 0;
        });
        window.renderSparklineAndTrend({ statId: 'stat-total-revenue', data: revSeries, dates: dates, colorHex: '#10b981' });
        window.renderSparklineAndTrend({ statId: 'stat-total-tickets', data: tixSeries, dates: dates, colorHex: '#3b82f6' });
        window.renderSparklineAndTrend({ statId: 'stat-avg-noshow', data: noShowSeries, dates: dates, colorHex: '#ef4444', inverseTrend: true });
    }

    renderPartnersTable(partnerData);
    renderChart('overviewChart', chartDataByDate, true);
}

function renderPartnersTable(partnerData) {
    const tbody = document.getElementById('partners-table-body');
    tbody.innerHTML = '';
    
    const partnersList = Object.values(partnerData);
    // Sort by revenue descending
    partnersList.sort((a,b) => b.revenue - a.revenue);
    
    if (partnersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px;">No data for selected period</td></tr>';
        return;
    }
    
    partnersList.forEach(partner => {
        const evCount = partner.events.length;
        const total = partner.paid + partner.free;
        const noShowRate = partner.totalFor > 0 ? ((partner.totalFor - partner.totalEnter) / partner.totalFor * 100).toFixed(1) : 0;
        
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => openPartnerProfile(partner.id);
        
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap: 12px;">
                    ${partner.logo_url ? `<img src="${partner.logo_url}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">` : `<div style="width:32px;height:32px;border-radius:50%;background:#333;"></div>`}
                    <span style="font-weight:600;">${partner.name}</span>
                </div>
            </td>
            <td style="text-align: center;">${evCount}</td>
            <td style="text-align: center; color: var(--color-success);">${partner.paid}</td>
            <td style="text-align: center; color: var(--text-secondary);">${partner.free}</td>
            <td style="text-align: center; color: var(--color-danger);">${noShowRate}%</td>
            <td style="text-align: center; font-weight:600;">${total}</td>
            <td style="text-align: right; font-weight:bold; color: var(--color-primary);">${partner.revenue.toFixed(2)}€</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderChart(canvasId, dataByDate, isOverview) {
    const dates = Object.keys(dataByDate).sort();
    
    const revenues = dates.map(d => dataByDate[d].revenue);
    const tickets = dates.map(d => dataByDate[d].tickets);
    const noShows = dates.map(d => {
        const dData = dataByDate[d];
        return dData.totalFor > 0 ? ((dData.totalFor - dData.totalEnter) / dData.totalFor * 100).toFixed(1) : 0;
    });
    
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (isOverview && overviewChartInstance) {
        overviewChartInstance.destroy();
    } else if (!isOverview && partnerChartInstance) {
        partnerChartInstance.destroy();
    }
    
    const newChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Revenue (€)',
                    data: revenues,
                    backgroundColor: 'rgba(29, 78, 216, 0.7)',
                    yAxisID: 'y'
                },
                {
                    label: 'Tickets',
                    data: tickets,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    yAxisID: 'y'
                },
                {
                    label: 'No-Show Rate (%)',
                    data: noShows,
                    type: 'line',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.3,
                    fill: true
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
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Amount' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'No-Show Rate (%)' },
                    grid: { drawOnChartArea: false },
                    min: 0,
                    max: 100
                }
            }
        }
    });
    
    if (isOverview) overviewChartInstance = newChart;
    else partnerChartInstance = newChart;
}

function openPartnerProfile(partnerId) {
    currentPartnerProfileId = partnerId;
    const partner = globalPartners.find(p => p._id === partnerId);
    if(!partner) return;
    
    document.getElementById('view-overview').classList.add('hidden');
    document.getElementById('view-partner-profile').classList.remove('hidden');
    
    document.getElementById('profile-partner-name').innerText = partner.name;
    const logoHtml = partner.logo_url ? `<img src="${partner.logo_url}" style="width:100%;height:100%;object-fit:cover;">` : '';
    document.getElementById('profile-logo-container').innerHTML = logoHtml;
    
    // Calculate stats specifically for this partner under current date filters
    let rev = 0;
    let paid = 0;
    let free = 0;
    let totalFor = 0;
    let totalEnter = 0;
    let evCount = 0;
    
    const chartDataByDate = {};
    const partnerEvents = [];
    
    globalEvents.forEach(event => {
        if (event.organization_id !== partnerId) return;
        
        const evDateStr = event.start_date || event.display_date;
        const evDate = new Date(evDateStr);
        if (evDate < startDate || evDate > endDate) return;
        
        evCount++;
        const tickets = globalTicketsMap[event._id] || [];
        
        let eventRev = 0;
        let evPaid = 0;
        let evFree = 0;
        let evTotalFor = 0;
        let evTotalEnter = 0;
        
        tickets.forEach(t => {
            const price = t.total_price !== undefined ? t.total_price : (t.price && t.price.price ? t.price.price : 0);
            const clientsFor = t.for || 1;
            const clientsEnter = t.enter || 0;
            
            if (price > 0) {
                evPaid++;
                eventRev += price;
            } else {
                evFree++;
            }
            evTotalFor += clientsFor;
            evTotalEnter += clientsEnter;
        });
        
        rev += eventRev;
        paid += evPaid;
        free += evFree;
        totalFor += evTotalFor;
        totalEnter += evTotalEnter;
        
        const noShowRate = evTotalFor > 0 ? ((evTotalFor - evTotalEnter) / evTotalFor * 100).toFixed(1) : 0;
        
        partnerEvents.push({
            name: event.name,
            date: evDateStr,
            paid: evPaid,
            free: evFree,
            revenue: eventRev,
            noShow: noShowRate
        });
        
        const dateKey = evDate.toISOString().split('T')[0];
        if (!chartDataByDate[dateKey]) {
            chartDataByDate[dateKey] = { revenue: 0, tickets: 0, totalFor: 0, totalEnter: 0 };
        }
        chartDataByDate[dateKey].revenue += eventRev;
        chartDataByDate[dateKey].tickets += (evPaid + evFree);
        chartDataByDate[dateKey].totalFor += evTotalFor;
        chartDataByDate[dateKey].totalEnter += evTotalEnter;
    });
    
    const noShow = totalFor > 0 ? ((totalFor - totalEnter) / totalFor * 100).toFixed(1) : 0;
    
    document.getElementById('profile-total-tickets').innerText = paid + free;
    document.getElementById('profile-total-revenue').innerText = rev.toFixed(2) + '€';
    document.getElementById('profile-total-events').innerText = evCount;
    document.getElementById('profile-avg-noshow').innerText = `${noShow}%`;
    
    // Sort events by date descending
    partnerEvents.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    const tbody = document.getElementById('profile-events-body');
    tbody.innerHTML = '';
    
    if (partnerEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No events found in this date range.</td></tr>';
    } else {
        partnerEvents.forEach(e => {
            const dateStr = new Date(e.date).toLocaleDateString();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:500;">${e.name}</td>
                <td style="text-align: center; color: var(--text-secondary);">${dateStr}</td>
                <td style="text-align: center; color: var(--color-success);">${e.paid}</td>
                <td style="text-align: center; color: var(--text-secondary);">${e.free}</td>
                <td style="text-align: center; color: var(--color-danger);">${e.noShow}%</td>
                <td style="text-align: right; font-weight:600; color: var(--color-primary);">${e.revenue.toFixed(2)}€</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    renderChart('partnerChart', chartDataByDate, false);
}

function closePartnerProfile() {
    currentPartnerProfileId = null;
    document.getElementById('view-partner-profile').classList.add('hidden');
    document.getElementById('view-overview').classList.remove('hidden');
    // Reactivate the 'Partners Overview' button
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-tab[data-tab="overview"]').classList.add('active');
}
