// Global state
let cashRecords = [];
let activeFilter = 'all';
let searchQuery = '';
let dateStart = null;
let dateEnd = null;
let activeTab = 'tracking';
let salesRefreshInterval = null;

// Premium Chart.js Defaults
Chart.defaults.color = '#a1a1aa';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(13, 17, 28, 0.85)';
Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
Chart.defaults.plugins.tooltip.bodyColor = '#e4e4e7';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 8;


// Elite Animations Utility
function animateValue(obj, start, end, duration, isCurrency = false, prefix = '', suffix = '') {
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // Easing function (easeOutQuart)
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const current = start + easeProgress * (end - start);
        
        if (isCurrency) {
            obj.textContent = prefix + current.toFixed(2) + '€' + suffix;
        } else {
            obj.textContent = prefix + Math.floor(current) + suffix;
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            // Final guarantee
            if (isCurrency) obj.textContent = prefix + end.toFixed(2) + '€' + suffix;
            else obj.textContent = prefix + end + suffix;
        }
    };
    window.requestAnimationFrame(step);
}

// Pagination State
let currentSalesPage = 1;
const salesPerPage = 50;
let cachedSalesData = [];

// DOM Elements
const tableBody = document.getElementById('table-body');
const settingsTableBody = document.getElementById('settings-table-body');
const viewTracking = document.getElementById('view-tracking');
const viewSettings = document.getElementById('view-settings');
const viewOnline = document.getElementById('view-online');
const onlineTableBody = document.getElementById('online-table-body');
const viewPerformance = document.getElementById('view-performance');
const viewEventPerformance = document.getElementById('view-event-performance');
const performanceTableBody = document.getElementById('performance-table-body');
const viewSales = document.getElementById('view-sales');
const salesTableBody = document.getElementById('sales-table-body');
const navTabs = document.querySelectorAll('.nav-tab');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const statTotal = document.getElementById('stat-total');
const statCommission = document.getElementById('stat-commission');
const statNetDue = document.getElementById('stat-net-due');
const statReturned = document.getElementById('stat-returned');
const statPending = document.getElementById('stat-pending');
const toastContainer = document.getElementById('toast-container');

// Stat card label elements
const statTotalLabel = document.querySelector('.stat-card.total .stat-info h3');
const statCommissionLabel = document.querySelector('.stat-card.commission .stat-info h3');
const statNetDueLabel = document.querySelector('.stat-card.net-due .stat-info h3');
const statReturnedLabel = document.querySelector('.stat-card.returned .stat-info h3');
const statPendingLabel = document.querySelector('.stat-card.pending .stat-info h3');

// Stat card icon elements
const statTotalIcon = document.querySelector('.stat-card.total .stat-icon-wrapper i');
const statNetDueIcon = document.querySelector('.stat-card.net-due .stat-icon-wrapper i');
const statReturnedIcon = document.querySelector('.stat-card.returned .stat-icon-wrapper i');
const statPendingIcon = document.querySelector('.stat-card.pending .stat-icon-wrapper i');

// Toast notifications helper
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
     let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i>';
    
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Generate date range query string
function getDateQueryString() {
    let query = '';
    if (dateStart) query += `start=${dateStart}&`;
    if (dateEnd) query += `end=${dateEnd}&`;
    if (query.endsWith('&')) query = query.slice(0, -1);
    return query ? `?${query}` : '';
}

function getRateIcon(rateName) {
    if (rateName.toLowerCase().includes('bar')) return '<i class="fa-solid fa-martini-glass-citrus"></i>';
    if (rateName.toLowerCase().includes('pass')) return '<i class="fa-solid fa-ticket"></i>';
    if (rateName.toLowerCase().includes('vip')) return '<i class="fa-solid fa-crown"></i>';
    return '<i class="fa-solid fa-receipt"></i>';
}

async function fetchWalletBalance() {
    const amountSpan = document.getElementById('wallet-amount');
    if (!amountSpan) return;
    
    amountSpan.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    try {
        const response = await fetch('/api/wallet');
        const data = await response.json();
        if (data.success) {
            animateValue(amountSpan, 0, data.balance, 1500, true, '', '');
        } else {
            amountSpan.textContent = 'Error';
            console.error('Wallet error:', data.error);
        }
    } catch (err) {
        amountSpan.textContent = 'Error';
        console.error('Wallet fetch failed:', err);
    }
}

// Set default date range (last 30 days + 14 days future)
function initDateDefaults() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const end = new Date(now);
    end.setDate(end.getDate() + 14);
    
    dateStart = start.toISOString().split('T')[0];
    dateEnd = end.toISOString().split('T')[0];
    
    document.getElementById('date-start').value = dateStart;
    document.getElementById('date-end').value = dateEnd;
    
    // Mark 30d as default active preset
    document.querySelectorAll('.date-preset-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.preset === '30d');
    });
}

// Fetch and Load initial data
async function loadData(forceSync = false) {
    tableBody.innerHTML = '<tr><td colspan="9" class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading cash data...</td></tr>';
    onlineTableBody.innerHTML = '<tr><td colspan="7" class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading online data...</td></tr>';
    performanceTableBody.innerHTML = '<tr><td colspan="6" class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading performance data...</td></tr>';
    
    // Also load wallet balance
    fetchWalletBalance();    
    try {
        const response = await fetch(`/api/data${getDateQueryString()}`);
        const result = await response.json();
        
        if (result.success) {
            cashRecords = result.data.items || [];
            updateStats(result.data);
            renderTable();
        } else {
            showToast(result.error || 'Failed to fetch cash records', 'error');
        }
    } catch (err) {
        console.error('Failed to load data:', err);
        showToast('Failed to load data', 'error');
        tableBody.innerHTML = '<tr><td colspan="9" class="error-state"><i class="fa-solid fa-triangle-exclamation"></i> Error loading data</td></tr>';
        onlineTableBody.innerHTML = '<tr><td colspan="7" class="error-state"><i class="fa-solid fa-triangle-exclamation"></i> Error loading online data</td></tr>';
        performanceTableBody.innerHTML = '<tr><td colspan="6" class="error-state"><i class="fa-solid fa-triangle-exclamation"></i> Error loading performance data</td></tr>';
    }
}

// Update stats metrics for cash tracking
function updateStats(data) {
    animateValue(statTotal, 0, data.total_gathered || 0, 1500, true);
    animateValue(statCommission, 0, data.total_commission || 0, 1500, true);
    animateValue(statNetDue, 0, data.total_net_due || 0, 1500, true);
    animateValue(statReturned, 0, data.total_returned || 0, 1500, true);
    animateValue(statPending, 0, data.total_pending || 0, 1500, true);
}

// Update stats metrics for online tracking
function updateOnlineStats(data) {
    animateValue(statTotal, 0, data.total_sales || 0, 1500, true);
    animateValue(statCommission, 0, data.total_commission_owed || 0, 1500, true);
    animateValue(statNetDue, 0, data.total_commission_owed || 0, 1500, true);
    animateValue(statReturned, 0, data.total_paid || 0, 1500, true);
    animateValue(statPending, 0, data.total_pending || 0, 1500, true);
}

// Switch stat card labels between cash and online contexts
function setStatLabels(mode) {
    if (mode === 'online') {
        statTotalLabel.textContent = 'Total Online Sales';
        statCommissionLabel.textContent = 'Commission To Pay';
        statNetDueLabel.textContent = 'Total Commission Due';
        statReturnedLabel.textContent = 'Commission Paid';
        statPendingLabel.textContent = 'Pending Payment';
        statTotalIcon.className = 'fa-solid fa-credit-card';
        statNetDueIcon.className = 'fa-solid fa-hand-holding-dollar';
        statReturnedIcon.className = 'fa-solid fa-circle-check';
        statPendingIcon.className = 'fa-solid fa-clock-rotate-left';
    } else {
        statTotalLabel.textContent = 'Total Cash Gathered';
        statCommissionLabel.textContent = 'Promoter Commission';
        statNetDueLabel.textContent = 'Net Cash Owed';
        statReturnedLabel.textContent = 'Cash Returned';
        statPendingLabel.textContent = 'Pending Cash';
        statTotalIcon.className = 'fa-solid fa-coins';
        statNetDueIcon.className = 'fa-solid fa-file-invoice-dollar';
        statReturnedIcon.className = 'fa-solid fa-circle-check';
        statPendingIcon.className = 'fa-solid fa-clock-rotate-left';
    }
}

// Toggle returned state in DB
// Update returned amount in DB
async function updateReturnedAmount(eventId, promoterId, amount) {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
        showToast('Please enter a valid amount.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: eventId,
                promoter_id: promoterId,
                returned_amount: numericAmount
            })
        });
        const result = await response.json();
        
        if (result.success) {
            cashRecords = result.data.items || [];
            updateStats(result.data);
            renderTable();
            showToast(`Amount updated to ${numericAmount.toFixed(2)}€`, 'success');
            refreshPromoterProfileIfOpen(promoterId);
        } else {
            showToast(result.error || 'Failed to update amount', 'error');
            renderTable();
        }
    } catch (err) {
        showToast('Error saving updates to the database.', 'error');
        console.error(err);
        renderTable();
    }
}

// Render records table
function renderTable() {
    // Filter records
    let filtered = cashRecords.filter(item => {
        // Search filter
        const matchesSearch = 
            item.promoter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.event_name.toLowerCase().includes(searchQuery.toLowerCase());
            
        if (!matchesSearch) return false;
        
        // Tab filter
        if (activeFilter === 'pending') return !item.returned;
        if (activeFilter === 'returned') return item.returned;
        return true;
    });
    
    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fa-solid fa-folder-open"></i> No matching cash records found.
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = filtered.map(item => {
        const rowClass = item.returned ? 'row-returned' : '';
        let badge = '<span class="badge badge-pending">Pending</span>';
        if (item.returned) {
            badge = '<span class="badge badge-returned">Returned</span>';
        } else if (item.partial) {
            badge = '<span class="badge badge-returned" style="background-color: rgba(245, 158, 11, 0.1); color: rgb(245, 158, 11); border: 1px solid rgba(245, 158, 11, 0.2);">Partial</span>';
        }
            
        const breakdownHtml = item.breakdown && item.breakdown.length > 0
            ? `<div class="breakdown-list">${item.breakdown.map(bd => `<span class="breakdown-tag">${bd}</span>`).join('')}</div>`
            : '';
            
        // Cash Display Column
        let cashDisplayHtml = `
            <div class="cash-row">
                <span class="cash-label">Gross:</span>
                <span class="cash-amount">${item.amount.toFixed(2)}€</span>
            </div>
        `;
        if (item.commission > 0) {
            cashDisplayHtml += `
                <div class="cash-row commission-row">
                    <span class="cash-label">Comm:</span>
                    <span class="cash-amount">-${item.commission.toFixed(2)}€</span>
                </div>
            `;
        }
        cashDisplayHtml += `
            <div class="cash-row net-row">
                <span class="cash-label">Net Due:</span>
                <span class="cash-amount">${item.net_due.toFixed(2)}€</span>
            </div>
        `;
        
        if (item.returned) {
            cashDisplayHtml += `
                <div class="cash-row returned-row">
                    <span class="cash-label">Returned:</span>
                    <span class="cash-amount">${item.returned_amount.toFixed(2)}€</span>
                </div>
            `;
        } else if (item.partial) {
            cashDisplayHtml += `
                <div class="cash-row received-row">
                    <span class="cash-label">Recv:</span>
                    <span class="cash-amount">${item.returned_amount.toFixed(2)}€</span>
                </div>
                <div class="cash-row owed-row">
                    <span class="cash-label">Owed:</span>
                    <span class="cash-amount">${(item.net_due - item.returned_amount).toFixed(2)}€</span>
                </div>
            `;
        } else {
            cashDisplayHtml += `
                <div class="cash-row owed-row">
                    <span class="cash-label">Owed:</span>
                    <span class="cash-amount">${item.net_due.toFixed(2)}€</span>
                </div>
            `;
        }
            
        return `
            <tr class="${rowClass}">
                <td class="col-date" data-label="Event Date">${item.event_date}</td>
                <td class="col-event" data-label="Event Name"><span class="clickable-promoter" onclick="openEventProfile('${item.event_id}', '${item.event_name.replace(/'/g, "\\'")}', '${item.event_date}')">${item.event_name}</span></td>
                <td class="col-promoter" data-label="Promoter Name"><span class="clickable-promoter" onclick="openPromoterProfile('${item.promoter_id}')">${item.promoter_name}</span></td>
                <td class="col-cash" data-label="Cash Collected">
                    ${cashDisplayHtml}
                    ${breakdownHtml}
                </td>
                <td class="col-status" data-label="Status">${badge}</td>
                <td class="col-action" data-label="Amount Returned">
                    <div class="action-amount-wrapper">
                        <input type="number" step="0.5" min="0" max="${item.net_due}" 
                            value="${item.returned_amount}" 
                            onchange="updateReturnedAmount('${item.event_id}', '${item.promoter_id}', this.value)" 
                            class="amount-input">
                        <span class="currency-symbol">€</span>
                        <button class="btn-check-all" 
                            onclick="updateReturnedAmount('${item.event_id}', '${item.promoter_id}', ${item.net_due})" 
                            title="Mark fully returned">
                            <i class="fa-solid fa-circle-check"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// --- Promoter Profile Modal Logic ---
const promoterModal = document.getElementById('promoter-modal');
const modalPromoterName = document.getElementById('modal-promoter-name');
const modalTotalTickets = document.getElementById('modal-total-tickets');
const modalCashPending = document.getElementById('modal-cash-pending');
const modalTotalRevenue = document.getElementById('modal-total-revenue');
const modalOnlinePending = document.getElementById('modal-online-pending');
const modalAvgScore = document.getElementById('modal-avg-score');
const modalHistoryBody = document.getElementById('modal-history-body');
let currentOpenPromoterId = null;
let currentPromoterData = null;

async function refreshPromoterProfileIfOpen(promoterId) {
    if (promoterModal.style.display === 'block' && currentOpenPromoterId === promoterId) {
        await openPromoterProfile(promoterId, true);
    }
}

async function openPromoterProfile(promoterId, isRefresh = false) {
    if (!promoterId || promoterId === 'unknown') return;
    
    currentOpenPromoterId = promoterId;
    if (!isRefresh) promoterModal.style.display = 'block';
    
    modalHistoryBody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading profile...</td></tr>';
    if (!isRefresh) modalPromoterName.textContent = 'Loading...';
    
    try {
        const response = await fetch(`/api/promoter/${promoterId}${getDateQueryString()}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const data = result.data;
            currentPromoterData = data;
            modalPromoterName.textContent = data.promoter_name;
            modalTotalTickets.textContent = data.total_tickets;
            modalTotalRevenue.textContent = `${(data.total_revenue || 0).toFixed(2)}€`;
            modalCashPending.textContent = `${data.total_cash_pending.toFixed(2)}€`;
            modalOnlinePending.textContent = `${data.total_online_pending.toFixed(2)}€`;
            modalAvgScore.textContent = `${data.avg_score}%`;
            
            if (data.history_grouped.length === 0) {
                modalHistoryBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No event history found in this period.</td></tr>';
            } else {
                let html = '';
                data.history_grouped.forEach((group, groupIndex) => {
                    // Month Header
                    html += `
                        <tr class="month-header">
                            <td colspan="6" style="background: var(--bg-body); border-bottom: 2px solid var(--border-color); padding-top: 20px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="font-weight: 700; color: var(--text-primary);">
                                        <i class="fa-regular fa-calendar" style="margin-right: 8px;"></i>${group.month}
                                    </div>
                                    <div style="font-size: 11px; font-weight: 500; display: flex; gap: 15px; align-items: center;">
                                        <span style="color: var(--color-success);"><i class="fa-solid fa-chart-line"></i> Rev: ${(group.month_revenue || 0).toFixed(2)}€</span>
                                        <span style="color: var(--color-danger);"><i class="fa-solid fa-money-bill-wave"></i> Cash Pending: ${(group.month_cash_pending || 0).toFixed(2)}€</span>
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span style="color: var(--color-primary);"><i class="fa-solid fa-globe"></i> Online Pending: ${(group.month_online_pending || 0).toFixed(2)}€</span>
                                            ${group.month_online_pending > 0 ? `<button class="btn-mark-paid" onclick="markMonthOnlinePaid('${promoterId}', ${groupIndex})"><i class="fa-solid fa-check-double"></i> Mark Paid</button>` : `<span class="badge badge-returned" style="font-size: 9px; padding: 2px 6px;">All Paid</span>`}
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                    // Events
                    group.events.forEach(ev => {
                        const cashOwed = ev.cash_pending;
                        const onlineOwed = ev.online_pending;
                        const tkts = ev.tickets;
                        
                        html += `
                            <tr>
                                <td>
                                    <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${ev.event_name}</div>
                                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">${ev.event_date}</div>
                                </td>
                                <td style="text-align: right;">
                                    <strong>${tkts - ev.no_shows} / ${tkts}</strong><br>
                                    <span class="badge ${ev.score >= 70 ? 'badge-returned' : (ev.score >= 40 ? 'badge-pending' : 'badge-unpaid')}" style="margin-top: 4px; font-size: 9px;">${ev.score}% entered</span>
                                </td>
                                <td style="text-align: right;">
                                    <div style="font-weight: 500; font-family: var(--font-mono);">${ev.cash_net_due.toFixed(2)}€</div>
                                    <div style="font-size: 11px; color: ${cashOwed <= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">Due: ${cashOwed.toFixed(2)}€</div>
                                </td>
                                <td style="text-align: center;">
                                    <div class="input-with-icon" style="justify-content: center; width: 100%; display: flex; gap: 4px; align-items: center; flex-wrap: nowrap;">
                                        <input type="number" 
                                            class="amount-input" 
                                            value="${ev.cash_returned.toFixed(2)}" 
                                            min="0" 
                                            step="0.01" 
                                            style="width: 55px; font-size: 12px; padding: 4px; background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;"
                                            onchange="updateReturnedAmount('${ev.event_id}', '${ev.promoter_id}', this.value)">
                                        <button class="status-btn returned" 
                                            title="Mark fully returned"
                                            onclick="updateReturnedAmount('${ev.event_id}', '${ev.promoter_id}', ${ev.cash_net_due})">
                                            <i class="fa-solid fa-check"></i>
                                        </button>
                                    </div>
                                </td>
                                <td style="text-align: right;">
                                    <div style="font-weight: 500; font-family: var(--font-mono); color: var(--color-primary);">${ev.online_comm.toFixed(2)}€</div>
                                    <div style="font-size: 11px; color: ${onlineOwed <= 0 ? 'var(--color-success)' : 'var(--color-primary)'}; font-weight: 600;">Owe: ${onlineOwed.toFixed(2)}€</div>
                                </td>
                                <td style="text-align: center;">
                                    <div class="input-with-icon" style="justify-content: center; width: 100%; display: flex; gap: 4px; align-items: center; flex-wrap: nowrap;">
                                        <input type="number" 
                                            class="amount-input" 
                                            value="${ev.online_paid.toFixed(2)}" 
                                            min="0" 
                                            step="0.01" 
                                            style="width: 55px; font-size: 12px; padding: 4px; background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;"
                                            onchange="updateOnlinePaidAmount('${ev.event_id}', '${ev.promoter_id}', this.value)">
                                        <button class="status-btn returned" 
                                            title="Mark paid"
                                            onclick="updateOnlinePaidAmount('${ev.event_id}', '${ev.promoter_id}', ${ev.online_comm})">
                                            <i class="fa-solid fa-check"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });
                });
                modalHistoryBody.innerHTML = html;
            }
        } else {
            modalHistoryBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger-color);">Error: ${result.error}</td></tr>`;
        }
    } catch (error) {
        modalHistoryBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger-color);">Connection error</td></tr>`;
    }
}

function closePromoterModal() {
    promoterModal.style.display = 'none';
    currentOpenPromoterId = null;
}

// --- Event Profile Modal Logic ---
const eventModal = document.getElementById('event-modal');
const modalEventName = document.getElementById('modal-event-name');
const modalEventDate = document.getElementById('modal-event-date');
const modalEventSold = document.getElementById('modal-event-sold');
const modalEventRevenue = document.getElementById('modal-event-revenue');
const modalEventNetRevenue = document.getElementById('modal-event-net-revenue');
const modalEventEntered = document.getElementById('modal-event-entered');
const modalEventNoshow = document.getElementById('modal-event-noshow');
const modalEventTicketsBody = document.getElementById('modal-event-tickets-body');
const modalEventPromotersBody = document.getElementById('modal-event-promoters-body');

async function openEventProfile(eventId, eventName, eventDate) {
    eventModal.style.display = 'block';
    
    modalEventName.textContent = eventName || 'Loading...';
    modalEventDate.textContent = eventDate || '';
    
    modalEventTicketsBody.innerHTML = '<tr><td colspan="4" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
    modalEventPromotersBody.innerHTML = '<tr><td colspan="3" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    try {
        const queryName = encodeURIComponent(eventName || '');
        const queryDate = encodeURIComponent(eventDate || '');
        const response = await fetch(`/api/event/${eventId}?name=${queryName}&date=${queryDate}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const data = result.data;
            modalEventName.textContent = data.event_name;
            modalEventDate.textContent = data.event_date;
            
            modalEventSold.textContent = data.total_tickets;
            modalEventRevenue.textContent = `${data.total_revenue.toFixed(2)}€`;
            modalEventNetRevenue.textContent = `${data.total_net_revenue.toFixed(2)}€`;
            modalEventEntered.textContent = data.total_entered;
            modalEventNoshow.textContent = `${data.no_show_rate}%`;
            
            currentEventChartData = data;
            updateEventChart();
            
            // Render Tickets Table
            if (data.ticket_breakdown.length === 0) {
                modalEventTicketsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No ticket data.</td></tr>';
            } else {
                modalEventTicketsBody.innerHTML = data.ticket_breakdown.map(t => `
                    <tr>
                        <td style="font-weight: 500;">${t.name}</td>
                        <td style="text-align: right;">${t.sold}</td>
                        <td style="text-align: right; color: var(--color-success);">${t.revenue.toFixed(2)}€</td>
                        <td style="text-align: right; color: var(--color-warning);">${(t.net_revenue !== undefined ? t.net_revenue : 0).toFixed(2)}€</td>
                    </tr>
                `).join('');
            }
            
            // Render Promoters Table
            if (data.promoter_breakdown.length === 0) {
                modalEventPromotersBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No promoter data.</td></tr>';
            } else {
                modalEventPromotersBody.innerHTML = data.promoter_breakdown.map(p => `
                    <tr>
                        <td style="font-weight: 500;">${p.name}</td>
                        <td style="text-align: right;">${p.sold}</td>
                        <td style="text-align: right; color: var(--color-success);">${p.revenue.toFixed(2)}€</td>
                    </tr>
                `).join('');
            }
        } else {
            modalEventTicketsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-danger);">Error loading data.</td></tr>`;
            modalEventPromotersBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--color-danger);">Error loading data.</td></tr>`;
        }
    } catch (err) {
        modalEventTicketsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-danger);">Connection error.</td></tr>`;
        modalEventPromotersBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--color-danger);">Connection error.</td></tr>`;
    }
}

function closeEventModal() {
    eventModal.style.display = 'none';
}

function updateEventChart() {
    if (!currentEventChartData) return;
    
    const isDayView = document.getElementById('event-chart-toggle-day').checked;
    const timeline = isDayView ? currentEventChartData.timeline_day : currentEventChartData.timeline_hour;
    
    const labels = timeline.map(item => isDayView ? item.date : item.hour);
    const salesData = timeline.map(item => item.sales);
    const revenueData = timeline.map(item => item.revenue);
    
    const ctx = document.getElementById('eventChart').getContext('2d');
    
    if (eventChartInstance) {
        eventChartInstance.destroy();
    }
    
    eventChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Revenue (€)',
                    data: revenueData,
                    type: 'line',
                    borderColor: 'rgb(29, 78, 216)',
                    backgroundColor: 'rgba(29, 78, 216, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y1'
                },
                {
                    label: 'Tickets Sold',
                    data: salesData,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: 'y'
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
                    position: 'top',
                    labels: { boxWidth: 12, usePointStyle: true }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#1e293b',
                    bodyColor: '#475569',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.datasetIndex === 0) {
                                label += context.parsed.y.toFixed(2) + '€';
                            } else {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { drawOnChartArea: false },
                    ticks: { maxRotation: 45, minRotation: 45 }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Tickets' },
                    grid: { drawOnChartArea: false },
                    min: 0,
                    suggestedMax: Math.max(...salesData) + 5
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Revenue (€)' },
                    min: 0,
                    suggestedMax: Math.max(...revenueData) * 1.2
                }
            }
        }
    });
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target == promoterModal) {
        closePromoterModal();
    }
    if (event.target == eventModal) {
        closeEventModal();
    }
    const dailySalesModal = document.getElementById('modal-daily-sales');
    if (event.target == dailySalesModal) {
        closeDailySalesModal();
    }
}

// Event Listeners
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTable();
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderTable();
    });
});

// Fetch and render ticket rates
async function loadRatesData() {
    try {
        settingsTableBody.innerHTML = `
            
            <tr class="stagger-in">
                <td colspan="6">
                    <div style="display: flex; gap: 10px; padding: 5px;">
                        <div class="skeleton-box" style="width: 15%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 25%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 20%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 10%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 10%; height: 20px;"></div>
                    </div>
                </td>
            </tr>

            <tr class="stagger-in">
                <td colspan="6">
                    <div style="display: flex; gap: 10px; padding: 5px;">
                        <div class="skeleton-box" style="width: 15%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 25%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 20%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 10%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 10%; height: 20px;"></div>
                    </div>
                </td>
            </tr>

            <tr class="stagger-in">
                <td colspan="6">
                    <div style="display: flex; gap: 10px; padding: 5px;">
                        <div class="skeleton-box" style="width: 15%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 25%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 20%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 10%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 10%; height: 20px;"></div>
                    </div>
                </td>
            </tr>

        `;
        const response = await fetch(`/api/rates${getDateQueryString()}`);
        const result = await response.json();
        
        if (result.success && result.rates) {
            if (result.rates.length === 0) {
                settingsTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state">
                            <i class="fa-solid fa-folder-open"></i> No ticket rates found.
                        </td>
                    </tr>
                `;
                return;
            }
            
            settingsTableBody.innerHTML = result.rates.map(rate => `
                <tr>
                    <td data-label="Event Date">${rate.event_date}</td>
                    <td data-label="Event Name" style="font-weight: 600; color: var(--text-primary);">${rate.event_name}</td>
                    <td data-label="Ticket Type">${rate.rate_name}</td>
                    <td data-label="Price" style="text-align: right; font-weight: 600; font-family: var(--font-mono);">${rate.price.toFixed(2)}€</td>
                    <td data-label="Cash Comm" style="text-align: center;">
                        <div class="action-amount-wrapper" style="display: inline-flex; align-items: center;">
                            <input type="number" step="0.5" min="0" 
                                value="${rate.commission_cash}" 
                                data-rateslug="${rate.rate_slug.replace(/"/g, '&quot;')}"
                                onchange="updateRateCommission(this)" 
                                class="amount-input cash-comm-input">
                            <span class="currency-symbol">€</span>
                        </div>
                    </td>
                    <td data-label="Online Comm" style="text-align: center;">
                        <div class="action-amount-wrapper" style="display: inline-flex; align-items: center;">
                            <input type="number" step="0.5" min="0" 
                                value="${rate.commission_online}" 
                                onchange="updateRateCommission(this)" 
                                class="amount-input online-comm-input">
                            <span class="currency-symbol">€</span>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            showToast(result.error || 'Failed to load ticket rates', 'error');
        }
    } catch (err) {
        showToast('Error connecting to backend for ticket rates.', 'error');
        console.error(err);
    }
}

// Save ticket rate commission configuration
async function updateRateCommission(element) {
    const row = element.closest('tr');
    const cashInput = row.querySelector('.cash-comm-input');
    const onlineInput = row.querySelector('.online-comm-input');
    
    // Read the rateSlug from the cashInput data attribute
    const rateSlug = cashInput.getAttribute('data-rateslug');
    
    const cashVal = parseFloat(cashInput ? cashInput.value : 0.0);
    const onlineVal = parseFloat(onlineInput ? onlineInput.value : 0.0);
    
    if (isNaN(cashVal) || cashVal < 0 || isNaN(onlineVal) || onlineVal < 0) {
        showToast('Please enter valid commission amounts.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/commissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rate_slug: rateSlug,
                commission_cash: cashVal,
                commission_online: onlineVal
            })
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('Commissions saved successfully!', 'success');
            await loadData(false);
            await loadRatesData();
        } else {
            showToast(result.error || 'Failed to save commission configuration', 'error');
        }
    } catch (err) {
        showToast('Error saving updates to the database.', 'error');
        console.error(err);
    }
}

let performanceChartInstance = null;
let eventChartInstance = null;
let currentEventChartData = null;

function renderPerformanceChart(dailyTrends) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    const labels = dailyTrends.map(d => d.date);
    const salesData = dailyTrends.map(d => d.sales);
    const revenueData = dailyTrends.map(d => d.revenue);
    const noShowData = dailyTrends.map(d => d.sales > 0 ? ((d.no_shows || 0) / d.sales * 100).toFixed(1) : 0);
    
    if (performanceChartInstance) {
        performanceChartInstance.destroy();
    }
    
    performanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'line',
                    label: 'No-Show %',
                    data: noShowData,
                    borderColor: '#F59E0B',
                    backgroundColor: '#F59E0B',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    yAxisID: 'y2',
                },
                {
                    type: 'line',
                    label: 'Revenue (€)',
                    data: revenueData,
                    borderColor: '#10B981',
                    backgroundColor: '#10B981',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y1',
                },
                {
                    type: 'bar',
                    label: 'Tickets Sold',
                    data: salesData,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3B82F6',
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: 'y',
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
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const dayData = dailyTrends[index];
                    openDailySalesModal(dayData);
                }
            },
            onHover: (e, elements) => {
                const target = e.native ? e.native.target : e.target;
                if (target) {
                    target.style.cursor = elements && elements.length ? 'pointer' : 'default';
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Daily Sales & Revenue',
                    color: '#9CA3AF',
                    font: { size: 14, family: "'Inter', sans-serif", weight: '500' }
                },
                legend: {
                    labels: { color: '#D1D5DB', font: { family: "'Inter', sans-serif" } }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9CA3AF' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Tickets Sold', color: '#9CA3AF' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9CA3AF' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Revenue (€)', color: '#9CA3AF' },
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#9CA3AF' }
                },
                y2: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'No-Show %', color: '#9CA3AF' },
                    grid: { drawOnChartArea: false },
                    ticks: { 
                        color: '#9CA3AF',
                        callback: function(value) { return value + '%'; }
                    },
                    min: 0,
                    max: 100
                },
            }
        }
    });
}

let eventOverviewChartInstance = null;

function renderEventOverviewChart(eventsData) {
    const ctx = document.getElementById('eventOverviewChart').getContext('2d');
    
    // Filter out empty events (0 tickets, 0 revenue)
    const filteredData = eventsData.filter(e => e.total_tickets > 0 || e.total_revenue > 0);
    
    // Sort chronologically for the chart
    const sortedData = [...filteredData].sort((a, b) => a.event_date.localeCompare(b.event_date));
    
    const labels = sortedData.map(e => `${e.event_date} - ${e.event_name}`);
    const salesData = sortedData.map(e => e.total_tickets);
    const revenueData = sortedData.map(e => e.total_revenue);
    const noShowData = sortedData.map(e => e.total_tickets > 0 ? (((e.total_tickets - e.total_entered) / e.total_tickets) * 100).toFixed(1) : 0);
    
    if (eventOverviewChartInstance) {
        eventOverviewChartInstance.destroy();
    }
    
    eventOverviewChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'line',
                    label: 'No-Show %',
                    data: noShowData,
                    borderColor: '#F59E0B',
                    backgroundColor: '#F59E0B',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    yAxisID: 'y2',
                },
                {
                    type: 'line',
                    label: 'Revenue (€)',
                    data: revenueData,
                    borderColor: '#10B981',
                    backgroundColor: '#10B981',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y1',
                },
                {
                    type: 'bar',
                    label: 'Tickets Sold',
                    data: salesData,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3B82F6',
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: 'y',
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
                title: {
                    display: true,
                    text: 'Event Sales & Revenue Overview',
                    color: '#9CA3AF',
                    font: { size: 14, family: "'Inter', sans-serif", weight: '500' }
                },
                legend: {
                    labels: { color: '#D1D5DB', font: { family: "'Inter', sans-serif" } }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { 
                        color: '#9CA3AF',
                        maxRotation: 45,
                        minRotation: 45,
                        callback: function(val, index) {
                            const label = this.getLabelForValue(val) || '';
                            return label.length > 25 ? label.substring(0, 25) + '...' : label;
                        }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Tickets Sold', color: '#9CA3AF' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9CA3AF' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Revenue (€)', color: '#9CA3AF' },
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#9CA3AF' }
                },
                y2: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'No-Show %', color: '#9CA3AF' },
                    grid: { drawOnChartArea: false },
                    ticks: { 
                        color: '#9CA3AF',
                        callback: function(value) { return value + '%'; }
                    },
                    min: 0,
                    max: 100
                },
            }
        }
    });
}

// Fetch and load performance data
async function loadPerformanceData() {
    try {
        const url = `/api/performance${getDateQueryString()}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            const promoterStats = result.data.promoter_stats || [];
            const dailyTrends = result.data.daily_trends || [];
            
            // Update KPI Cards
            const totalSold = promoterStats.reduce((sum, p) => sum + p.total_tickets, 0);
            const totalRev = promoterStats.reduce((sum, p) => sum + p.total_revenue, 0);
            const totalNoShows = promoterStats.reduce((sum, p) => sum + p.total_no_shows, 0);
            const avgNoShow = totalSold > 0 ? ((totalNoShows / totalSold) * 100).toFixed(1) : "0.0";
            
            let topPromoter = '-';
            const sortedPromoters = [...promoterStats].sort((a, b) => b.total_revenue - a.total_revenue);
            const best = sortedPromoters.find(p => p.promoter_name !== 'Direct Sale / No Promoter');
            if (best) {
                topPromoter = best.promoter_name;
            }
            
            document.getElementById('perf-total-sold').textContent = totalSold;
            document.getElementById('perf-total-revenue').textContent = totalRev.toFixed(2) + '€';
            document.getElementById('perf-avg-noshow').textContent = avgNoShow + '%';
            document.getElementById('perf-top-promoter').textContent = topPromoter;

            // Render Chart
            renderPerformanceChart(dailyTrends);

            if (promoterStats.length === 0) {
                performanceTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: var(--text-secondary);">No performance data found</td>
                    </tr>
                `;
                return;
            }
            
            performanceTableBody.innerHTML = promoterStats.map(item => {
                const noShowRate = parseFloat(item.no_show_rate) || 0;
                let noShowClass = 'badge-returned'; // green (low no-show)
                if (noShowRate > 50) {
                    noShowClass = 'badge-pending'; // red (high no-show)
                } else if (noShowRate > 25) {
                    noShowClass = 'badge-warning'; // orange (medium no-show)
                }
                
                return `
                    <tr class="table-row stagger-in">
                        <td class="promoter-name" data-label="Promoter">
                            <div style="font-weight: 500; font-size: 15px;">
                                <span class="clickable-promoter" onclick="openPromoterProfile('${item.promoter_id}')">${item.promoter_name}</span>
                            </div>
                        </td>
                        <td data-label="Total Tickets" style="text-align: center;"><strong>${item.total_tickets}</strong></td>
                        <td data-label="Revenue" style="text-align: center; font-family: var(--font-heading); color: var(--color-primary);">${item.total_revenue.toFixed(2)}€</td>
                        <td data-label="Commission" style="text-align: center; font-weight: 600;">${item.total_commission.toFixed(2)}€</td>
                        <td data-label="No-Show Rate" style="text-align: center;">
                            <span class="badge ${noShowClass}">${item.no_show_rate}%</span>
                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">(${item.total_no_shows} total)</div>
                        </td>
                        <td data-label="Sales/Event" style="text-align: center;">
                            <span class="badge" style="background-color: var(--color-primary); color: white;">${item.sales_per_event} / event</span>
                        </td>
                    </tr>
                `;
            }).join('');
            
        } else {
            showToast('Failed to load performance data', 'error');
            console.error(result.error);
        }
    } catch (error) {
        console.error('Error fetching performance:', error);
        showToast('Connection error', 'error');
    }
}

// Fetch and load event performance data
async function loadEventPerformanceData() {
    try {
        const url = `/api/events/performance${getDateQueryString()}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            const eventsData = result.data || [];
            
            // Separate future and past events
            const today = new Date().toISOString().split('T')[0];
            const futureEvents = eventsData.filter(e => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
            const pastEvents = eventsData.filter(e => e.event_date < today).sort((a, b) => b.event_date.localeCompare(a.event_date));
            
            // KPI Cards
            const totalEvents = eventsData.length;
            const totalRevenue = eventsData.reduce((sum, e) => sum + e.total_revenue, 0);
            
            let avgNoShow = 0;
            if (pastEvents.length > 0) {
                const totalPastSold = pastEvents.reduce((sum, e) => sum + e.total_tickets, 0);
                const totalPastEntered = pastEvents.reduce((sum, e) => sum + e.total_entered, 0);
                if (totalPastSold > 0) {
                    avgNoShow = ((totalPastSold - totalPastEntered) / totalPastSold) * 100;
                }
            }
            
            document.getElementById('event-perf-total').textContent = totalEvents;
            document.getElementById('event-perf-future').textContent = futureEvents.length;
            document.getElementById('event-perf-past').textContent = pastEvents.length;
            document.getElementById('event-perf-revenue').textContent = totalRevenue.toFixed(2) + '€';
            
            const noShowEl = document.getElementById('event-perf-avg-noshow');
            if (noShowEl) {
                noShowEl.textContent = avgNoShow.toFixed(1) + '%';
                if (avgNoShow > 50) noShowEl.style.color = 'var(--color-danger)';
                else if (avgNoShow > 25) noShowEl.style.color = 'var(--color-warning)';
                else noShowEl.style.color = 'var(--color-success)';
            }
            
            // Render Event Overview Chart
            renderEventOverviewChart(eventsData);
            
            // Render Future Events Table
            const futureBody = document.getElementById('event-perf-future-body');
            if (futureEvents.length === 0) {
                futureBody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-folder-open"></i> No future events found in period.</td></tr>';
            } else {
                futureBody.innerHTML = futureEvents.map(e => `
                    <tr class="table-row stagger-in">
                        <td data-label="Date" style="font-family: var(--font-mono); font-size: 13px;">${e.event_date}</td>
                        <td data-label="Event Name" class="clickable-cell" onclick="openEventProfile('${e.event_id}', '${e.event_name.replace(/'/g, "\\'")}', '${e.event_date}')">
                            <span style="font-weight: 500;">${e.event_name}</span>
                        </td>
                        <td data-label="Tickets Sold" style="text-align: center;">${e.total_tickets}</td>
                        <td data-label="Entrances" style="text-align: center; color: var(--text-secondary);">${e.total_entered}</td>
                        <td data-label="No-Show Rate" style="text-align: center; color: var(--text-secondary);">-</td>
                        <td data-label="Revenue" style="text-align: right; font-weight: 600; font-family: var(--font-mono); color: var(--color-primary);">${e.total_revenue.toFixed(2)}€</td>
                    </tr>
                `).join('');
            }
            
            // Render Past Events Table
            const pastBody = document.getElementById('event-perf-past-body');
            if (pastEvents.length === 0) {
                pastBody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-folder-open"></i> No past events found in period.</td></tr>';
            } else {
                pastBody.innerHTML = pastEvents.map(e => {
                    const noShowRate = e.no_show_rate;
                    let noShowColor = 'var(--color-success)';
                    if (noShowRate > 50) noShowColor = 'var(--color-danger)';
                    else if (noShowRate > 25) noShowColor = 'var(--color-warning)';
                    
                    return `
                        <tr class="table-row stagger-in">
                            <td data-label="Date" style="font-family: var(--font-mono); font-size: 13px;">${e.event_date}</td>
                            <td data-label="Event Name" class="clickable-cell" onclick="openEventProfile('${e.event_id}', '${e.event_name.replace(/'/g, "\\'")}', '${e.event_date}')">
                                <span style="font-weight: 500;">${e.event_name}</span>
                            </td>
                            <td data-label="Tickets Sold" style="text-align: center;">${e.total_tickets}</td>
                            <td data-label="Entrances" style="text-align: center;">
                                <span style="font-weight: 600; color: var(--color-primary);">${e.total_entered}</span><span style="color: var(--text-secondary); font-size: 0.9em;">/${e.total_tickets}</span>
                            </td>
                            <td data-label="No-Show Rate" style="text-align: center; font-weight: 600; color: ${noShowColor};">${noShowRate}%</td>
                            <td data-label="Revenue" style="text-align: right; font-weight: 600; font-family: var(--font-mono); color: var(--color-primary);">${e.total_revenue.toFixed(2)}€</td>
                        </tr>
                    `;
                }).join('');
            }
            
        } else {
            showToast('Failed to load event performance data', 'error');
            console.error(result.error);
        }
    } catch (error) {
        console.error('Error fetching event performance:', error);
        showToast('Connection error', 'error');
    }
}

// Fetch and load online sales data
async function loadOnlineData() {
    try {
        onlineTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-state">
                    <i class="fa-solid fa-spinner fa-spin"></i> Refreshing online tracking data...
                </td>
            </tr>
        `;
        const response = await fetch(`/api/online-data${getDateQueryString()}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            // Update stats cards with online data
            updateOnlineStats(result.data);
            
            const items = result.data.items || [];
            if (items.length === 0) {
                onlineTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 20px;">No online sales records found.</td>
                    </tr>
                `;
                return;
            }
            
            onlineTableBody.innerHTML = items.map(item => {
                const rowClass = item.paid ? 'table-row checked-row' : 'table-row';
                const statusBadge = item.paid 
                    ? '<span class="badge badge-returned">PAID</span>'
                    : (item.partial ? '<span class="badge badge-pending">PARTIAL</span>' : '<span class="badge badge-pending">PENDING</span>');
                
                const breakdownHtml = item.breakdown && item.breakdown.length > 0
                    ? `<div class="breakdown-wrapper">
                         ${item.breakdown.map(bd => `<div class="breakdown-item"><i class="fa-solid fa-ticket"></i> ${bd}</div>`).join('')}
                       </div>`
                    : '';
                
                return `
                    <tr class="${rowClass}">
                        <td data-label="Event Date">${item.event_date}</td>
                        <td data-label="Event Name" style="font-weight: 600; color: var(--text-primary);"><span class="clickable-promoter" onclick="openEventProfile('${item.event_id}', '${item.event_name.replace(/'/g, "\\'")}', '${item.event_date}')">${item.event_name}</span></td>
                        <td data-label="Promoter Name" style="font-weight: 500;"><span class="clickable-promoter" onclick="openPromoterProfile('${item.promoter_id}')">${item.promoter_name}</span></td>
                        <td data-label="Breakdown">${breakdownHtml}</td>
                        <td data-label="Revenue" style="text-align: right; font-family: var(--font-mono);">${item.amount.toFixed(2)}€</td>
                        <td data-label="Commission" style="text-align: center; font-weight: 600; color: var(--color-primary);">${item.commission.toFixed(2)}€</td>
                        <td data-label="Status" style="text-align: center;">${statusBadge}</td>
                        <td data-label="Amount Paid" style="text-align: center;">
                            <div class="action-amount-wrapper" style="display: inline-flex; align-items: center;">
                                <input type="number" step="0.01" min="0" max="${item.commission}" 
                                    value="${item.paid_amount}" 
                                    onchange="updateOnlinePaidAmount('${item.event_id}', '${item.promoter_id}', this.value)" 
                                    class="amount-input">
                                <span class="currency-symbol">€</span>
                                <button class="btn-check-all" 
                                    onclick="updateOnlinePaidAmount('${item.event_id}', '${item.promoter_id}', ${item.commission})" 
                                    title="Mark fully paid">
                                    <i class="fa-solid fa-circle-check"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            showToast('Failed to load online sales data.', 'error');
        }
    } catch (error) {
        console.error('Error fetching online sales data:', error);
        showToast('Connection error.', 'error');
    }
}


function renderSalesPage(page) {
    if (cachedSalesData.length === 0) {
        salesTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 20px;">No sales found for this period.</td>
            </tr>
        `;
        document.getElementById('sales-page-info').textContent = 'Page 1 of 1';
        document.getElementById('btn-prev-page').disabled = true;
        document.getElementById('btn-next-page').disabled = true;
        return;
    }
    
    const totalPages = Math.ceil(cachedSalesData.length / salesPerPage);
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentSalesPage = page;
    
    const startIndex = (page - 1) * salesPerPage;
    const endIndex = startIndex + salesPerPage;
    const pageData = cachedSalesData.slice(startIndex, endIndex);
    
    salesTableBody.innerHTML = pageData.map(item => {
        const isCancelled = item.status === 'cancelled';
        let badgeClass = item.payment_method === 'Online' ? 'badge badge-returned' : 'badge badge-pending';
        let badgeText = item.payment_method;
        
        if (isCancelled) {
            badgeClass = 'badge badge-cancelled';
            badgeText = 'Cancelled';
        }
        
        const rowStyle = isCancelled ? 'opacity: 0.6;' : '';
        
        // Notice we REMOVED stagger-in here to fix mobile freezing!
        const highlightClass = item.is_new_highlight ? 'new-row-highlight' : '';
        return `
            <tr class="table-row ${highlightClass}" style="${rowStyle}">
                <td data-label="Sale Date" style="font-family: var(--font-mono); font-size: 13px;">${item.sale_date}</td>
                <td data-label="Event" class="clickable-cell" onclick="openEventProfile('${item.event_id}', '${item.event_name.replace(/'/g, "\'")}', '${item.event_date}')">
                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">${item.event_name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>${item.event_date}</div>
                </td>
                <td data-label="Promoter" style="font-weight: 500;" class="clickable-cell" onclick="openPromoterProfile('${item.promoter_id}')">${item.promoter_name}</td>
                <td data-label="Method" style="text-align: center;"><span class="${badgeClass}">${badgeText}</span></td>
                <td data-label="Price" style="text-align: right; font-weight: 600; font-family: var(--font-mono);">${item.price.toFixed(2)}€</td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('sales-page-info').textContent = `Page ${page} of ${totalPages} (Total: ${cachedSalesData.length})`;
    document.getElementById('btn-prev-page').disabled = page === 1;
    document.getElementById('btn-next-page').disabled = page === totalPages;
}

function changeSalesPage(delta) {
    renderSalesPage(currentSalesPage + delta);
    // Scroll to top of table wrapper smoothly
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) {
        tableWrapper.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Update paid online amount
async function updateOnlinePaidAmount(eventId, promoterId, amount) {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
        showToast('Please enter a valid amount.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/toggle-online', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: eventId,
                promoter_id: promoterId,
                paid_amount: numericAmount
            })
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('Payment status updated successfully!', 'success');
            refreshPromoterProfileIfOpen(promoterId);
            await loadOnlineData();
        } else {
            showToast(result.error || 'Failed to update payment status.', 'error');
        }
    } catch (err) {
        showToast('Failed to update payment status.', 'error');
        console.error(err);
    }
}

// Mark all online sales as paid for a specific month
async function markMonthOnlinePaid(promoterId, groupIndex) {
    if (!currentPromoterData || !currentPromoterData.history_grouped[groupIndex]) return;
    
    const group = currentPromoterData.history_grouped[groupIndex];
    const eventsToUpdate = group.events.filter(ev => ev.online_pending > 0);
    
    if (eventsToUpdate.length === 0) return;
    
    try {
        const updates = eventsToUpdate.map(ev => ({
            event_id: ev.event_id,
            promoter_id: promoterId,
            paid_amount: ev.online_comm
        }));
        
        const response = await fetch('/api/toggle-online-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates })
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('Monthly online payments updated successfully!', 'success');
            refreshPromoterProfileIfOpen(promoterId);
            await loadOnlineData();
        } else {
            showToast(result.error || 'Failed to update month payments.', 'error');
        }
    } catch (err) {
        showToast('Failed to update month payments.', 'error');
        console.error(err);
    }
}

// Navigation Tabs switching
navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        navTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const viewName = tab.dataset.tab;
        activeTab = viewName;
        
        // Save active tab state
        localStorage.setItem('activeDashboardTab', viewName);
        
        // Clear sales auto-refresh if we leave the tab
        if (activeTab !== 'sales' && salesRefreshInterval) {
            clearInterval(salesRefreshInterval);
            salesRefreshInterval = null;
        }
        
        const mainStats = document.getElementById('main-stats-grid');
        
        // Hide all
        viewTracking.classList.add('hidden');
        viewSettings.classList.add('hidden');
        viewOnline.classList.add('hidden');
        viewPerformance.classList.add('hidden');
        if (viewEventPerformance) viewEventPerformance.classList.add('hidden');
        if (viewSales) viewSales.classList.add('hidden');
        
        // Show active and update stat labels
        if (viewName === 'tracking') {
            viewTracking.classList.remove('hidden');
            mainStats.classList.remove('hidden');
            setStatLabels('cash');
            loadData(false);
        } else if (viewName === 'commissions') {
            viewSettings.classList.remove('hidden');
            mainStats.classList.add('hidden');
            setStatLabels('cash');
            loadRatesData();
        } else if (viewName === 'online') {
            viewOnline.classList.remove('hidden');
            mainStats.classList.remove('hidden');
            setStatLabels('online');
            loadOnlineData();
        } else if (viewName === 'performance') {
            viewPerformance.classList.remove('hidden');
            mainStats.classList.add('hidden');
            setStatLabels('cash');
            loadPerformanceData();
        } else if (viewName === 'event-performance') {
            if (viewEventPerformance) viewEventPerformance.classList.remove('hidden');
            mainStats.classList.add('hidden');
            loadEventPerformanceData();
        } else if (viewName === 'sales') {
            if (viewSales) viewSales.classList.remove('hidden');
            mainStats.classList.add('hidden');
            loadSalesHistory();
            
            if (!salesRefreshInterval) {
                salesRefreshInterval = setInterval(() => {
                    if (activeTab === 'sales') {
                        loadSalesHistory(true);
                    }
                }, 60000);
            }
        }
    });
});

// Fetch and load sales history
async function loadSalesHistory(isBackgroundRefresh = false) {
    try {
        if (!isBackgroundRefresh) {
            salesTableBody.innerHTML = `
                
            <tr class="stagger-in">
                <td colspan="6">
                    <div style="display: flex; gap: 10px; padding: 5px;">
                        <div class="skeleton-box" style="width: 15%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 25%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 20%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 10%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 10%; height: 20px;"></div>
                    </div>
                </td>
            </tr>

            <tr class="stagger-in">
                <td colspan="6">
                    <div style="display: flex; gap: 10px; padding: 5px;">
                        <div class="skeleton-box" style="width: 15%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 25%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 20%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 10%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 10%; height: 20px;"></div>
                    </div>
                </td>
            </tr>

            <tr class="stagger-in">
                <td colspan="6">
                    <div style="display: flex; gap: 10px; padding: 5px;">
                        <div class="skeleton-box" style="width: 15%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 25%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 20%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 10%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 10%; height: 20px;"></div>
                    </div>
                </td>
            </tr>

            `;
        }
        
        // Format today's date for the API
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
        
        const response = await fetch(`/api/sales${getDateQueryString()}`);
        const result = await response.json();
        
        if (result.success) {
            const sales = result.data || [];
            let todaySales = [];
            let yesterdaySales = [];
            
            const isDateInRange = (dStr) => {
                if (!dateStart || !dateEnd) return true;
                return dStr >= dateStart && dStr <= dateEnd;
            };
            
            if (isDateInRange(todayStr)) {
                todaySales = sales.filter(s => s.sale_date && s.sale_date.startsWith(todayStr));
            } else {
                try {
                    const tr = await fetch(`/api/sales?start=${todayStr}&end=${todayStr}`);
                    const tres = await tr.json();
                    todaySales = tres.data || [];
                } catch(e) { console.error(e); }
            }
            
            if (isDateInRange(yesterdayStr)) {
                yesterdaySales = sales.filter(s => s.sale_date && s.sale_date.startsWith(yesterdayStr));
            } else {
                try {
                    const yr = await fetch(`/api/sales?start=${yesterdayStr}&end=${yesterdayStr}`);
                    const yres = await yr.json();
                    yesterdaySales = yres.data || [];
                } catch(e) { console.error(e); }
            }
            
            // Filter yesterday's sales up to the current time
            const currentHour = String(today.getHours()).padStart(2, '0');
            const currentMinute = String(today.getMinutes()).padStart(2, '0');
            const currentSecond = String(today.getSeconds()).padStart(2, '0');
            const currentTimeStr = `${currentHour}:${currentMinute}:${currentSecond}`;
            
            const yesterdaySalesToTime = yesterdaySales.filter(s => {
                if (!s.sale_date) return false;
                const timePart = s.sale_date.split(' ')[1];
                return timePart && timePart <= currentTimeStr;
            });
            
            const calcStats = (arr) => {
                let cash = 0, online = 0, count = 0;
                arr.forEach(item => {
                    if (item.status !== 'cancelled') {
                        count++;
                        if (item.payment_method === 'Online') {
                            online += item.price;
                        } else {
                            cash += item.price;
                        }
                    }
                });
                return { cash, online, total: cash + online, count };
            };
            
            const periodStats = calcStats(sales);
            const todayStats = calcStats(todaySales);
            const yesterdayStatsToTime = calcStats(yesterdaySalesToTime);
            
            // Update UI
            document.getElementById('sales-stat-period').innerText = periodStats.total.toFixed(2) + '€';
            document.getElementById('sales-stat-period-detail').innerText = `Cash: ${periodStats.cash.toFixed(2)}€ | Online: ${periodStats.online.toFixed(2)}€`;
            document.getElementById('sales-count-period').innerText = periodStats.count;
            
            const getTrendHtml = (todayVal, yesterdayVal, isCurrency = false) => {
                const formatVal = (val) => isCurrency ? val.toFixed(2) + '€' : val;
                const diff = todayVal - yesterdayVal;
                const titleStr = `vs yesterday same time (${formatVal(yesterdayVal)})`;
                
                if (todayVal > yesterdayVal) {
                    const diffStr = isCurrency ? '+' + diff.toFixed(2) + '€' : '+' + diff;
                    return ` <span style="font-size: 14px; margin-left: 5px; color: var(--color-success);" title="${titleStr}"><i class="fa-solid fa-arrow-trend-up"></i> ${diffStr}</span>`;
                } else if (todayVal < yesterdayVal) {
                    const diffStr = isCurrency ? diff.toFixed(2) + '€' : diff;
                    return ` <span style="font-size: 14px; margin-left: 5px; color: var(--color-danger);" title="${titleStr}"><i class="fa-solid fa-arrow-trend-down"></i> ${diffStr}</span>`;
                }
                return ` <span style="font-size: 14px; margin-left: 5px; color: var(--text-secondary);" title="${titleStr}"><i class="fa-solid fa-minus"></i></span>`;
            };

            document.getElementById('sales-stat-today').innerHTML = todayStats.total.toFixed(2) + '€' + getTrendHtml(todayStats.total, yesterdayStatsToTime.total, true);
            document.getElementById('sales-stat-today-detail').innerText = `Cash: ${todayStats.cash.toFixed(2)}€ | Online: ${todayStats.online.toFixed(2)}€`;
            document.getElementById('sales-count-today').innerHTML = todayStats.count + getTrendHtml(todayStats.count, yesterdayStatsToTime.count, false);
            
            // Highlight new sales during background refreshes
            if (isBackgroundRefresh && cachedSalesData.length > 0) {
                const getSaleHash = (s) => `${s.sale_date}_${s.event_id}_${s.promoter_id}_${s.payment_method}_${s.price}_${s.status}`;
                const oldHashes = new Set(cachedSalesData.map(getSaleHash));
                
                sales.forEach(s => {
                    if (!oldHashes.has(getSaleHash(s))) {
                        s.is_new_highlight = true;
                    }
                });
            }

            cachedSalesData = sales;
            
            // Re-render the current page to preserve user context during background refreshes
            renderSalesPage(currentSalesPage);
        } else {
            showToast('Failed to load sales history.', 'error');
        }
    } catch (error) {
        console.error('Error fetching sales history:', error);
        showToast('Connection error.', 'error');
    }
}

// Initial load
initDateDefaults();

// Restore active tab from localStorage if available
const savedTab = localStorage.getItem('activeDashboardTab');
if (savedTab) {
    const tabToClick = Array.from(navTabs).find(t => t.dataset.tab === savedTab);
    if (tabToClick) {
        tabToClick.click();
    }
}

loadData();

// Date Filter Presets
const datePresetBtns = document.querySelectorAll('.date-preset-btn');
const dateStartInput = document.getElementById('date-start');
const dateEndInput = document.getElementById('date-end');
const btnApplyDates = document.getElementById('btn-apply-dates');

function applyDatePreset(preset) {
    const now = new Date();
    let start, end;
    
    switch (preset) {
        case '7d':
            start = new Date(now);
            start.setDate(start.getDate() - 7);
            end = new Date(now);
            end.setDate(end.getDate() + 14);
            break;
        case '30d':
            start = new Date(now);
            start.setDate(start.getDate() - 30);
            end = new Date(now);
            end.setDate(end.getDate() + 14);
            break;
        case 'this-month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'last-month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case 'all':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
            break;
        default:
            return;
    }
    
    dateStart = start.toISOString().split('T')[0];
    dateEnd = end.toISOString().split('T')[0];
    dateStartInput.value = dateStart;
    dateEndInput.value = dateEnd;
    
    datePresetBtns.forEach(b => b.classList.toggle('active', b.dataset.preset === preset));
    
    reloadCurrentTab();
}

function reloadCurrentTab() {
    switch (activeTab) {
        case 'tracking':
            loadData(true);
            break;
        case 'commissions':
            loadRatesData();
            break;
        case 'online':
            loadOnlineData();
            break;
        case 'performance':
            loadPerformanceData();
            break;
        case 'event-performance':
            loadEventPerformanceData();
            break;
        case 'sales':
            loadSalesHistory();
            break;
    }
}

datePresetBtns.forEach(btn => {
    btn.addEventListener('click', () => applyDatePreset(btn.dataset.preset));
});

btnApplyDates.addEventListener('click', () => {
    const startVal = dateStartInput.value;
    const endVal = dateEndInput.value;
    
    if (!startVal || !endVal) {
        showToast('Please select both start and end dates.', 'error');
        return;
    }
    
    if (startVal > endVal) {
        showToast('Start date must be before end date.', 'error');
        return;
    }
    
    dateStart = startVal;
    dateEnd = endVal;
    
    // Clear preset active state (custom range)
    datePresetBtns.forEach(b => b.classList.remove('active'));
    
    reloadCurrentTab();
    showToast(`Filtering: ${startVal} → ${endVal}`, 'info');
});

// Daily Sales Modal
function openDailySalesModal(dayData) {
    const modal = document.getElementById('modal-daily-sales');
    document.getElementById('daily-sales-date').textContent = dayData.date;
    document.getElementById('daily-total-sold').textContent = dayData.sales;
    document.getElementById('daily-total-revenue').textContent = dayData.revenue.toFixed(2) + '€';
    
    const tbody = document.getElementById('daily-sales-tbody');
    const promoters = dayData.promoters || [];
    
    if (promoters.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No sales data for this date</td></tr>';
    } else {
        tbody.innerHTML = promoters.map(p => `
            <tr class="table-row stagger-in">
                <td class="promoter-name">
                    <div style="font-weight: 500; font-size: 14px;">${p.promoter_name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${p.events_sold || ''}</div>
                </td>
                <td style="text-align: center; font-weight: 500;">${p.sales}</td>
                <td style="text-align: right; font-family: var(--font-heading); color: var(--color-primary);">${p.revenue.toFixed(2)}€</td>
            </tr>
        `).join('');
    }
    
    modal.style.display = 'block';
}

function closeDailySalesModal() {
    document.getElementById('modal-daily-sales').style.display = 'none';
}
