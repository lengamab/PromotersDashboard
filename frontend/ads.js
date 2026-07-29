const META_ACCOUNT_ID = 'act_911535275086772';

window.getColorForFreq = function(freq) {
    if (freq === 'N/A' || freq == 0) return 'var(--text-secondary)';
    const val = parseFloat(freq);
    if (val < 2) return '#10b981'; // Green
    if (val <= 4) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
};

window.getColorForCtr = function(ctr) {
    if (ctr === 'N/A' || ctr == 0) return 'var(--text-secondary)';
    const val = parseFloat(ctr);
    if (val >= 2) return '#10b981'; // Green
    if (val >= 1) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
};

window.getColorForCpc = function(cpc) {
    if (cpc === 'N/A' || cpc == 0) return 'var(--text-secondary)';
    const val = parseFloat(cpc);
    if (val <= 0.20) return '#10b981'; // Green
    if (val <= 0.50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
};
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

window.getMetaStatusDetails = function(status, effectiveStatus, endTime) {
    let finalStatus = effectiveStatus || status || 'UNKNOWN';
    if (finalStatus === 'ACTIVE' && endTime) {
        const endDate = new Date(endTime);
        if (endDate < new Date()) {
            finalStatus = 'COMPLETED';
        }
    }
    const colors = {
        ACTIVE: '#10b981',
        PAUSED: '#f59e0b',
        ARCHIVED: '#6c757d',
        CAMPAIGN_PAUSED: '#f59e0b',
        ADSET_PAUSED: '#f59e0b',
        COMPLETED: '#6c757d',
        INACTIVE: '#6c757d',
        DELETED: '#ef4444',
        PENDING_REVIEW: '#f59e0b',
        DISAPPROVED: '#ef4444',
        PREAPPROVED: '#10b981',
        PENDING_BILLING_INFO: '#ef4444',
        WITH_ISSUES: '#ef4444',
        IN_PROCESS: '#f59e0b'
    };
    let displayText = finalStatus;
    if (finalStatus === 'CAMPAIGN_PAUSED') displayText = 'PAUSED';
    if (finalStatus === 'ADSET_PAUSED') displayText = 'PAUSED';
    
    let pillClass = 'paused';
    if (['ACTIVE', 'PREAPPROVED'].includes(finalStatus)) pillClass = 'active';
    else if (['PENDING_REVIEW', 'IN_PROCESS'].includes(finalStatus)) pillClass = 'learning';
    else if (['DELETED', 'DISAPPROVED', 'PENDING_BILLING_INFO', 'WITH_ISSUES'].includes(finalStatus)) pillClass = 'error';
    
    return { text: displayText, color: colors[finalStatus] || '#6c757d', pillClass };
};

let adsChartInstance = null;
let hourlyChartInstance = null;
let modalHourlyChartInstance = null;
let currentAdsData = [];
let currentHourlyData = [];
let currentHourlyCampData = [];
let currentCampaignsData = [];
let currentAdsList = [];
let currentAdCreativesMap = {};
let currentAdSetsTargetingMap = {};
let currentSummary = {};

document.addEventListener('DOMContentLoaded', () => {
    // Helper for Learning Phase
    window.isLearningPhase = function(camp) {
        if (!camp) return false;
        const status = camp.budget_info?.effective_status || camp.budget_info?.status || '';
        if (!['ACTIVE', 'IN_PROCESS'].includes(status)) return false;
        if (status === 'IN_PROCESS') return true;
        
        if (window.currentAdSetsTargetingMap && Object.keys(window.currentAdSetsTargetingMap).length > 0) {
            const adsets = Object.values(window.currentAdSetsTargetingMap).filter(as => as.campaign_id === camp.campaign_id);
            if (adsets.length > 0) {
                return adsets.some(as => {
                    const asStatus = as.effective_status || as.status || '';
                    if (!['ACTIVE', 'IN_PROCESS'].includes(asStatus)) return false;
                    if (asStatus === 'IN_PROCESS') return true;
                    if (as.learning_stage_info && as.learning_stage_info.status === 'LEARNING') return true;
                    return false;
                });
            }
        }
        
        if (camp.budget_info && camp.budget_info.start_time) {
            const start = new Date(camp.budget_info.start_time);
            const now = new Date();
            const hoursSinceStart = (now - start) / (1000 * 60 * 60);
            if (hoursSinceStart >= 0 && hoursSinceStart < 72) {
                let purchases = 0;
                if (camp.actions) {
                    const pa = camp.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                    if (pa) purchases = parseInt(pa.value);
                }
                if (purchases < 50) return true;
            }
        }
        return false;
    };

    // Setup date filters
    const today = new Date();
    const last30 = new Date();
    last30.setDate(today.getDate() - 30);
    
    document.getElementById('date-from').value = last30.toISOString().split('T')[0];
    document.getElementById('date-to').value = today.toISOString().split('T')[0];

    // Filter Buttons
    document.querySelectorAll('.date-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.date-preset-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const period = e.target.dataset.period;
            const now = new Date();
            let fromDate = new Date();
            
            if (period === 'last7') {
                fromDate.setDate(now.getDate() - 7);
            } else if (period === 'last30') {
                fromDate.setDate(now.getDate() - 30);
            } else if (period === 'thisMonth') {
                fromDate.setDate(1);
            } else if (period === 'lastMonth') {
                now.setDate(0); // Last day of last month
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            
            document.getElementById('date-from').value = fromDate.toISOString().split('T')[0];
            document.getElementById('date-to').value = period === 'lastMonth' ? now.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            
            fetchAdsData();
        });
    });

    document.getElementById('apply-dates').addEventListener('click', () => {
        document.querySelectorAll('.date-preset-btn').forEach(b => b.classList.remove('active'));
        fetchAdsData();
    });

    fetchAdsData();
});

async function fetchAdsData() {
    if (!META_ACCOUNT_ID) return;

    const tbody = document.getElementById('campaigns-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="padding: 25px;">
                    <div class="skeleton-loader" style="height: 36px; margin-bottom: 12px; width: 100%;"></div>
                    <div class="skeleton-loader" style="height: 36px; margin-bottom: 12px; width: 92%;"></div>
                    <div class="skeleton-loader" style="height: 36px; width: 85%;"></div>
                </td>
            </tr>
        `;
    }

    const fromDate = document.getElementById('date-from').value;
    const toDate = document.getElementById('date-to').value;

    const url = `/api/meta-proxy/${META_ACCOUNT_ID}/insights`;
    const params = new URLSearchParams({
        level: 'account',
        time_range: JSON.stringify({ since: fromDate, until: toDate }),
        time_increment: 1, // Daily
        limit: 100, // Important to prevent pagination truncating 30 days
        fields: 'spend,impressions,clicks,actions'
    });
    
    const todayISO = new Date().toISOString().split('T')[0];
    const yesterdayISO = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    try {
        const [res, hourlyRes, hourlyCampRes, campRes, budgetRes, adRes, adCreativeRes, adsetsTargetingRes] = await Promise.all([
            fetch(`${url}?${params.toString()}`),
            fetch(`${url}?${new URLSearchParams({
                level: 'account',
                time_range: JSON.stringify({ since: yesterdayISO, until: todayISO }),
                breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
                time_increment: 1,
                limit: 100,
                fields: 'spend,clicks,actions'
            }).toString()}`),
            fetch(`${url}?${new URLSearchParams({
                level: 'campaign',
                time_range: JSON.stringify({ since: yesterdayISO, until: todayISO }),
                breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
                time_increment: 1,
                limit: 2000,
                fields: 'campaign_id,spend,clicks,actions'
            }).toString()}`),
            fetch(`${url}?${new URLSearchParams({
                level: 'campaign',
                time_range: JSON.stringify({ since: fromDate, until: toDate }),
                limit: 500,
                fields: 'campaign_name,campaign_id,spend,impressions,clicks,actions,reach,frequency'
            }).toString()}`),
            fetch(`/api/meta-proxy/${META_ACCOUNT_ID}/campaigns?${new URLSearchParams({
                limit: 500,
                effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'ARCHIVED', 'IN_PROCESS', 'WITH_ISSUES', 'PENDING_REVIEW', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'DISAPPROVED']),
                fields: 'id,name,daily_budget,lifetime_budget,status,effective_status,start_time,stop_time,updated_time,objective,bid_strategy,bid_amount,spend_cap'
            }).toString()}`),
            fetch(`${url}?${new URLSearchParams({
                level: 'ad',
                time_range: JSON.stringify({ since: fromDate, until: toDate }),
                limit: 1000,
                fields: 'campaign_id,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,actions,reach,frequency,inline_link_clicks'
            }).toString()}`),
            fetch(`/api/meta-proxy/${META_ACCOUNT_ID}/ads?${new URLSearchParams({
                limit: 1000,
                effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'ARCHIVED', 'IN_PROCESS', 'WITH_ISSUES', 'PENDING_REVIEW', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'DISAPPROVED']),
                fields: 'id,name,status,effective_status,adset_id,campaign_id,creative{body,title,object_story_spec,asset_feed_spec}'
            }).toString()}`),
            fetch(`/api/meta-proxy/${META_ACCOUNT_ID}/adsets?${new URLSearchParams({
                limit: 500,
                effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'ARCHIVED', 'IN_PROCESS', 'WITH_ISSUES', 'PENDING_REVIEW', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'DISAPPROVED']),
                fields: 'id,name,status,effective_status,end_time,targeting,campaign_id,optimization_goal,billing_event,daily_budget,lifetime_budget,daily_min_spend_target,daily_spend_cap,bid_strategy,bid_amount,learning_stage_info'
            }).toString()}`)
        ]);
        
        const json = await res.json();
        const hourlyJson = await hourlyRes.json();
        const hourlyCampJson = await hourlyCampRes.json();
        const campJson = await campRes.json();
        const budgetJson = await budgetRes.json();
        const adJson = await adRes.json();
        const adCreativeJson = await adCreativeRes.json();
        const adsetsTargetingJson = await adsetsTargetingRes.json();
        
        if (json.error) {
            console.error("Meta API Error:", json.error);
            alert("Meta API Error: " + json.error.message);
            return;
        }

        const budgetMap = {};
        let totalDailyBudget = 0;
        if (budgetJson.data) {
            budgetJson.data.forEach(c => {
                budgetMap[c.id] = c;
                if (c.status === 'ACTIVE' && c.daily_budget) {
                    totalDailyBudget += parseInt(c.daily_budget, 10);
                }
            });
            const budgetEl = document.getElementById('stat-daily-budget');
            if (budgetEl) budgetEl.textContent = (totalDailyBudget / 100).toFixed(2) + '€';
        }

        currentAdsData = json.data || [];
        currentHourlyData = hourlyJson.data || [];
        currentHourlyCampData = hourlyCampJson.data || [];
        currentCampaignsData = campJson.data || [];
        currentAdsList = adJson.data || [];
        
        currentAdCreativesMap = {};
        if (adCreativeJson.data) {
            adCreativeJson.data.forEach(ad => {
                currentAdCreativesMap[ad.id] = ad;
            });
        }
        
        currentAdSetsTargetingMap = {};
        if (adsetsTargetingJson.data) {
            adsetsTargetingJson.data.forEach(adset => {
                currentAdSetsTargetingMap[adset.id] = adset;
            });
        }
        
        const existingCampIds = new Set(currentCampaignsData.map(c => c.campaign_id));
        if (budgetJson && budgetJson.data) {
            budgetJson.data.forEach(c => {
                const status = c.effective_status || c.status || '';
                const isInactive = ['ARCHIVED', 'DELETED', 'COMPLETED'].includes(status);
                if (!existingCampIds.has(c.id) && !isInactive) {
                    currentCampaignsData.push({
                        campaign_id: c.id,
                        campaign_name: c.name,
                        spend: "0",
                        impressions: "0",
                        clicks: "0",
                        actions: [],
                        reach: "0",
                        frequency: "0",
                        budget_info: c
                    });
                }
            });
        }

        currentCampaignsData.forEach(c => {
            if (budgetMap[c.campaign_id]) {
                c.budget_info = budgetMap[c.campaign_id];
            }
        });

        currentCampaignsData.sort((a, b) => parseFloat(b.spend || 0) - parseFloat(a.spend || 0));

        processAndRenderAds();
    } catch (e) {
        console.error("Failed to fetch ads", e);
        alert("Failed to fetch ads. Check console for details.");
    }
}

function processAndRenderAds() {
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalPurchases = 0;

    const labels = [];
    const spendData = [];
    const clicksData = [];
    const purchasesData = [];
    const impressionsData = [];
    const cpcData = [];
    const cpaData = [];
    const ctrData = [];

    // Pad missing dates
    const fromDateObj = new Date(document.getElementById('date-from').value);
    const toDateObj = new Date(document.getElementById('date-to').value);
    const dataByDate = {};
    
    currentAdsData.forEach(day => {
        dataByDate[day.date_start] = day;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    let liveSpendToday = 0;
    let liveImpToday = 0;
    let liveClicksToday = 0;
    let livePurchasesToday = 0;
    if (currentHourlyData && currentHourlyData.length) {
        currentHourlyData.forEach(hour => {
            if (hour.date_start === todayStr) {
                liveSpendToday += parseFloat(hour.spend || 0);
                liveImpToday += parseInt(hour.impressions || 0);
                liveClicksToday += parseInt(hour.clicks || 0);
                if (hour.actions) {
                    const pu = hour.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                    if (pu) livePurchasesToday += parseInt(pu.value || 0);
                }
            }
        });
    }

    for (let d = new Date(fromDateObj); d <= toDateObj; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        labels.push(dateStr);
        
        const day = dataByDate[dateStr] || { spend: 0, impressions: 0, clicks: 0, actions: [] };
        
        let spend = parseFloat(day.spend || 0);
        let imp = parseInt(day.impressions || 0);
        let clicks = parseInt(day.clicks || 0);
        
        let purchases = 0;
        if (day.actions) {
            const purchaseAction = day.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
            if (purchaseAction) {
                purchases = parseInt(purchaseAction.value);
            }
        }

        if (dateStr === todayStr) {
            if (spend < liveSpendToday) spend = liveSpendToday;
            if (imp < liveImpToday) imp = liveImpToday;
            if (clicks < liveClicksToday) clicks = liveClicksToday;
            if (purchases < livePurchasesToday) purchases = livePurchasesToday;
        }

        totalSpend += spend;
        totalImpressions += imp;
        totalClicks += clicks;
        totalPurchases += purchases;

        spendData.push(spend);
        clicksData.push(clicks);
        purchasesData.push(purchases);
        impressionsData.push(imp);
        cpcData.push(clicks > 0 ? spend / clicks : 0);
        cpaData.push(purchases > 0 ? spend / purchases : 0);
        ctrData.push(imp > 0 ? (clicks / imp) * 100 : 0);
    }

    // Update Cards
    document.getElementById('stat-spend').textContent = totalSpend.toFixed(2) + '€';
    document.getElementById('stat-impressions').textContent = totalImpressions.toLocaleString();
    document.getElementById('stat-clicks').textContent = totalClicks.toLocaleString();
    document.getElementById('stat-purchases').textContent = totalPurchases.toLocaleString();

    const cpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : 0;
    const cpa = totalPurchases > 0 ? (totalSpend / totalPurchases).toFixed(2) : 0;
    const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;
    
    // Check if elements exist before updating (some templates might not have them yet)
    if(document.getElementById('stat-cpc')) document.getElementById('stat-cpc').textContent = cpc + '€';
    if(document.getElementById('stat-cpa')) document.getElementById('stat-cpa').textContent = cpa + '€';
    if(document.getElementById('stat-ctr')) document.getElementById('stat-ctr').textContent = ctr + '%';

    if (window.renderSparklineAndTrend) {
        const hourlySpendSeries = currentHourlyData ? currentHourlyData.map(h => parseFloat(h.spend || 0)) : [0, 0];
        const hourlyDates = currentHourlyData ? currentHourlyData.map(h => `${(h.date_start||'').slice(5)} ${(h.hourly_stats_aggregated_by_advertiser_time_zone||'').slice(0, 5)}`) : null;
        const dailyBudgetVal = document.getElementById('stat-daily-budget') ? parseFloat(document.getElementById('stat-daily-budget').textContent) : 0;
        window.renderSparklineAndTrend({ statId: 'stat-daily-budget', data: spendData.map(() => dailyBudgetVal || 1), dates: labels, colorHex: '#20c997', labelSuffix: 'Active Cap' });
        window.renderSparklineAndTrend({ statId: 'stat-spend-today', data: hourlySpendSeries.length ? hourlySpendSeries : [0, 0], dates: hourlyDates, colorHex: '#ff6b6b', labelSuffix: 'vs 24h ago' });
        window.renderSparklineAndTrend({ statId: 'stat-spend', data: spendData, dates: labels, colorHex: '#007bff' });
        window.renderSparklineAndTrend({ statId: 'stat-purchases', data: purchasesData, dates: labels, colorHex: '#28a745' });
        window.renderSparklineAndTrend({ statId: 'stat-impressions', data: impressionsData, dates: labels, colorHex: '#17a2b8' });
        window.renderSparklineAndTrend({ statId: 'stat-clicks', data: clicksData, dates: labels, colorHex: '#ffc107' });
        window.renderSparklineAndTrend({ statId: 'stat-cpc', data: cpcData, dates: labels, colorHex: '#6f42c1', inverseTrend: true });
        window.renderSparklineAndTrend({ statId: 'stat-cpa', data: cpaData, dates: labels, colorHex: '#e83e8c', inverseTrend: true });
        window.renderSparklineAndTrend({ statId: 'stat-ctr', data: ctrData, dates: labels, colorHex: '#fd7e14' });
    }

    currentSummary = {
        spend: totalSpend,
        impressions: totalImpressions,
        clicks: totalClicks,
        purchases: totalPurchases,
        cpc: cpc,
        ctr: ctr
    };

    // Render Main Chart
    if (adsChartInstance) {
        adsChartInstance.destroy();
    }

    const ctx = document.getElementById('adsChart').getContext('2d');
    adsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Spend (€)',
                    data: spendData,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    yAxisID: 'y'
                },
                {
                    label: 'Clicks',
                    data: clicksData,
                    type: 'line',
                    borderColor: '#ffc107',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y1'
                },
                {
                    label: 'Purchases',
                    data: purchasesData,
                    type: 'line',
                    borderColor: '#28a745',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#a0a0a0' } }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#a0a0a0' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Spend (€)', color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#a0a0a0' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Clicks / Purchases', color: '#a0a0a0' },
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#a0a0a0' }
                }
            }
        }
    });

    // Render Hourly Chart
    if (hourlyChartInstance) {
        hourlyChartInstance.destroy();
    }

    const hourlyLabels = [];
    const hourlySpendData = [];
    const hourlyClicksData = [];
    const hourlyLandingPageViewsData = [];
    
    const now = new Date();
    const timeline = [];
    for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        
        timeline.push({
            dateKey: `${yyyy}-${mm}-${dd}`,
            hourKey: `${hh}:00:00 - ${hh}:59:59`,
            label: `${dd}/${mm} ${hh}:00`
        });
    }

    timeline.forEach(t => {
        hourlyLabels.push(t.label);
        
        const hourData = currentHourlyData.find(h => h.date_start === t.dateKey && h.hourly_stats_aggregated_by_advertiser_time_zone === t.hourKey);
        
        if (hourData) {
            hourlySpendData.push(parseFloat(hourData.spend || 0));
            hourlyClicksData.push(parseInt(hourData.clicks || 0));
            
            let landingPageViews = 0;
            if (hourData.actions) {
                const lpvAction = hourData.actions.find(a => a.action_type === 'landing_page_view');
                if (lpvAction) landingPageViews = parseInt(lpvAction.value);
            }
            hourlyLandingPageViewsData.push(landingPageViews);
        } else {
            hourlySpendData.push(0);
            hourlyClicksData.push(0);
            hourlyLandingPageViewsData.push(0);
        }
    });

    let actualSpendToday = 0;
    currentHourlyData.forEach(hour => {
        if (hour.date_start === todayStr) {
            actualSpendToday += parseFloat(hour.spend || 0);
        }
    });
    document.getElementById('stat-spend-today').textContent = actualSpendToday.toFixed(2) + '€';

    const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
    hourlyChartInstance = new Chart(hourlyCtx, {
        type: 'bar',
        data: {
            labels: hourlyLabels,
            datasets: [
                {
                    label: 'Hourly Spend (24h) (€)',
                    data: hourlySpendData,
                    backgroundColor: 'rgba(23, 162, 184, 0.7)',
                    yAxisID: 'y'
                },
                {
                    label: 'Hourly Clicks',
                    data: hourlyClicksData,
                    type: 'line',
                    borderColor: '#ffc107',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y1'
                },
                {
                    label: 'Hourly Landing Page Views',
                    data: hourlyLandingPageViewsData,
                    type: 'line',
                    borderColor: '#28a745',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { labels: { color: '#a0a0a0' } } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0' } },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#a0a0a0' },
                    title: { display: true, text: 'Spend (€)', color: '#a0a0a0' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#a0a0a0' },
                    title: { display: true, text: 'Clicks / Views', color: '#a0a0a0' }
                }
            }
        }
    });

    // Render Campaigns Table
    const tbody = document.getElementById('campaigns-table-body');
    if (tbody) {
        tbody.innerHTML = '';
        currentCampaignsData.forEach(camp => {
            const spend = parseFloat(camp.spend || 0);
            const imp = parseInt(camp.impressions || 0);
            const clicks = parseInt(camp.clicks || 0);
            let purchases = 0;
            let lpv = 0;
            if (camp.actions) {
                const purchaseAction = camp.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                if (purchaseAction) {
                    purchases = parseInt(purchaseAction.value);
                }
                const lpvAction = camp.actions.find(a => a.action_type === 'landing_page_view');
                if (lpvAction) {
                    lpv = parseInt(lpvAction.value);
                }
            }
            const cpa = purchases > 0 ? (spend / purchases).toFixed(2) : '0.00';
            const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : '0.00';
            const ctr = imp > 0 ? ((clicks / imp) * 100).toFixed(2) : '0.00';
            const cplpv = lpv > 0 ? (spend / lpv).toFixed(2) : '0.00';

            const campStatusDetails = window.getMetaStatusDetails(
                camp.budget_info?.status,
                camp.budget_info?.effective_status,
                camp.budget_info?.stop_time
            );
            const statusText = campStatusDetails.text;
            const statusColor = campStatusDetails.color;

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.style.cursor = 'pointer';
            
            const isLearning = window.isLearningPhase(camp);
            const learningBadge = isLearning ? `<span class="learning-badge"><i class="fa-solid fa-graduation-cap"></i>Learning</span>` : '';

            tr.innerHTML = `
                <td style="padding: 15px 12px; font-weight: 500;">${camp.campaign_name} ${learningBadge}</td>
                <td style="padding: 15px 12px;"><span class="status-pill ${campStatusDetails.pillClass || 'paused'}"><span class="status-dot"></span>${statusText}</span></td>
                <td class="tabular-nums" style="padding: 15px 12px; color: var(--text-primary); font-weight: 600; text-align: right;">${spend.toFixed(2)}€</td>
                <td class="tabular-nums" style="padding: 15px 12px; color: var(--text-secondary); text-align: right;">${imp.toLocaleString()}</td>
                <td class="tabular-nums" style="padding: 15px 12px; color: var(--text-secondary); text-align: right;">${clicks.toLocaleString()}</td>
                <td class="tabular-nums" style="padding: 15px 12px; color: var(--text-secondary); text-align: right;">${ctr}%</td>
                <td class="tabular-nums" style="padding: 15px 12px; color: var(--text-secondary); text-align: right;">${cpc}€</td>
                <td class="tabular-nums" style="padding: 15px 12px; color: var(--text-secondary); text-align: right;">${lpv.toLocaleString()}</td>
                <td class="tabular-nums" style="padding: 15px 12px; color: var(--text-secondary); text-align: right;">${cplpv}€</td>
                <td class="tabular-nums" style="padding: 15px 12px; color: var(--text-secondary); text-align: right;">${purchases.toLocaleString()}</td>
                <td class="tabular-nums" style="padding: 15px 12px; color: var(--color-primary); font-weight: 600; text-align: right;">${cpa}€</td>
            `;

            tr.onclick = () => openCampaignModal(camp, spend, imp, clicks, purchases, lpv);
            tbody.appendChild(tr);
        });
    }
}

function closeAiModal() {
    document.getElementById('aiModal').style.display = 'none';
}

async function fetchTimeSeriesContext(endpointPrefix) {
    let text = '\n\n**Temporal Evolution (Last 7 Days Daily & Last 24 Hours Hourly):**\n';
    try {
        const [dailyRes, hourlyRes] = await Promise.all([
            fetch(`/api/meta-proxy/${endpointPrefix}/insights?level=${endpointPrefix.startsWith('act_') ? 'account' : 'campaign'}&date_preset=last_7d&time_increment=1&fields=spend,impressions,clicks,actions`),
            fetch(`/api/meta-proxy/${endpointPrefix}/insights?level=${endpointPrefix.startsWith('act_') ? 'account' : 'campaign'}&date_preset=last_2d&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone&fields=spend,impressions,clicks,actions`)
        ]);
        const dailyJson = await dailyRes.json();
        const hourlyJson = await hourlyRes.json();

        if (dailyJson.data && dailyJson.data.length > 0) {
            text += 'Daily Breakdown (Last 7 Days):\n| Date | Spend | Imp | Clicks | Purchases | CPA | CPC | CTR |\n|---|---|---|---|---|---|---|---|\n';
            dailyJson.data.forEach(d => {
                const sp = parseFloat(d.spend || 0);
                const im = parseInt(d.impressions || 0);
                const cl = parseInt(d.clicks || 0);
                let pu = 0;
                if (d.actions) {
                    const pa = d.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                    if (pa) pu = parseInt(pa.value);
                }
                const cpa = pu > 0 ? (sp / pu).toFixed(2) + '€' : '0€';
                const cpc = cl > 0 ? (sp / cl).toFixed(2) + '€' : '0€';
                const ctr = im > 0 ? ((cl / im) * 100).toFixed(2) + '%' : '0%';
                text += `| ${d.date_start} | ${sp.toFixed(2)}€ | ${im} | ${cl} | ${pu} | ${cpa} | ${cpc} | ${ctr} |\n`;
            });
        } else {
            text += 'Daily Breakdown (Last 7 Days): No data recorded.\n';
        }

        if (hourlyJson.data && hourlyJson.data.length > 0) {
            const recentHours = hourlyJson.data.slice(-24);
            text += '\nHourly Breakdown (Last 24 Hours):\n| Date & Hour | Spend | Imp | Clicks | Purchases |\n|---|---|---|---|---|\n';
            recentHours.forEach(h => {
                const sp = parseFloat(h.spend || 0);
                const im = parseInt(h.impressions || 0);
                const cl = parseInt(h.clicks || 0);
                let pu = 0;
                if (h.actions) {
                    const pa = h.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                    if (pa) pu = parseInt(pa.value);
                }
                text += `| ${h.date_start} (${h.hourly_stats_aggregated_by_advertiser_time_zone}) | ${sp.toFixed(2)}€ | ${im} | ${cl} | ${pu} |\n`;
            });
        } else {
            text += '\nHourly Breakdown (Last 24 Hours): No data recorded.\n';
        }
    } catch (err) {
        console.warn('Could not load time-series insights:', err);
        text += 'Time-series data temporarily unavailable.\n';
    }
    return text;
}

async function analyzeWithAI() {
    if (currentAdsData.length === 0) {
        alert("No ad data available to analyze. Please wait for data to load.");
        return;
    }

    const contextData = `
**Overall Account Summary for the selected period:**
- Total Daily Budget (Active Campaigns): ${document.getElementById('stat-daily-budget') ? document.getElementById('stat-daily-budget').textContent : 'N/A'}
- Total Spend: ${currentSummary.spend.toFixed(2)}€
- Impressions: ${currentSummary.impressions}
- Link Clicks: ${currentSummary.clicks}
- Purchases (Conversions): ${currentSummary.purchases}
- CPC (Cost Per Click): ${currentSummary.cpc}€
- CTR (Click-Through Rate): ${currentSummary.ctr}%
`;

    let campaignsSummary = "\n**Campaign Performance Breakdown:**\n";
    if (currentCampaignsData && currentCampaignsData.length > 0) {
        currentCampaignsData.forEach(camp => {
            const spend = parseFloat(camp.spend || 0);
            const imp = parseInt(camp.impressions || 0);
            const clicks = parseInt(camp.clicks || 0);
            let purchases = 0;
            if (camp.actions) {
                const pa = camp.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                if (pa) purchases = parseInt(pa.value);
            }
            const cpa = purchases > 0 ? (spend / purchases).toFixed(2) : 0;
            const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : 0;
            const ctr = imp > 0 ? ((clicks / imp) * 100).toFixed(2) : 0;
            
            let budgetText = "N/A";
            const status = camp.budget_info?.effective_status || 'UNKNOWN';
            if (camp.budget_info) {
                if (camp.budget_info.daily_budget) {
                    budgetText = (parseInt(camp.budget_info.daily_budget)/100).toFixed(2) + '€/day';
                } else if (camp.budget_info.lifetime_budget) {
                    budgetText = (parseInt(camp.budget_info.lifetime_budget)/100).toFixed(2) + '€ (life)';
                }
            }
            
            let bidText = camp.budget_info?.bid_strategy || "LOWEST_COST_WITHOUT_CAP";
            if (camp.budget_info?.bid_amount) {
                bidText += ` (Cap: ${(parseInt(camp.budget_info.bid_amount)/100).toFixed(2)}€)`;
            }
            
            campaignsSummary += `- [${status}] ${camp.campaign_name} | Spend: ${spend.toFixed(2)}€ | Budget: ${budgetText} | Bid Strategy: ${bidText} | Purchases: ${purchases} | CPA: ${cpa}€ | CPC: ${cpc}€ | CTR: ${ctr}%\n`;
        });
    }

    const timeSeriesText = await fetchTimeSeriesContext('act_' + META_ACCOUNT_ID);
    const fullContextData = contextData + timeSeriesText + campaignsSummary;

    if (window.updateCopilotContext) {
        const customPrompt = "Please act as an expert Meta Ads Media Buyer. Analyze my overall account performance and individual campaigns based on the extensive context data provided. Carefully inspect the Temporal Evolution tables (Daily for last 7 days and Hourly for last 24 hours) to diagnose overall account trajectory, intraday spend/conversion hours, and trends over time. 🚨 ZERO-IMPRESSION / BID CAP DIAGNOSTIC RULE: Whenever an ACTIVE campaign or ad set has generated 0 Impressions and 0 Spend over the last 24 hours (or since launching yesterday), check its Bid Strategy and Bid Cap. If a Cost Cap (COST_CAP) or Bid Cap (LOWEST_COST_WITH_BID_CAP) is set, diagnose Auction Exclusion due to Low Bid Cap immediately and recommend raising or removing the cap. Identify top-performing trends, pinpoint areas of inefficient spend, and provide 3 concrete, data-backed recommendations to optimize my budget. If you need more granular data to make recommendations, feel free to use your API tools.";
        window.updateCopilotContext(fullContextData, customPrompt, 'ads_global');
    }
}

let currentSelectedCampaign = null;

function openCampaignModal(camp, spend, imp, clicks, purchases, lpv = 0) {
    currentSelectedCampaign = { camp, spend, imp, clicks, purchases, lpv };
    const isLearning = window.isLearningPhase(camp);
    const learningBadge = isLearning ? `<span class="learning-badge"><i class="fa-solid fa-graduation-cap"></i>Learning</span>` : '';
    document.getElementById('modal-campaign-name').innerHTML = camp.campaign_name + ' ' + learningBadge;
    document.getElementById('modal-camp-spend').textContent = spend.toFixed(2) + '€';
    document.getElementById('modal-camp-purchases').textContent = purchases.toLocaleString();
    
    const campStatusDetails = window.getMetaStatusDetails(
        camp.budget_info?.status,
        camp.budget_info?.effective_status,
        camp.budget_info?.stop_time
    );
    const statusText = campStatusDetails.text;
    const statusColor = campStatusDetails.color;
    
    const statusEl = document.getElementById('modal-camp-status');
    if (statusEl) {
        statusEl.innerHTML = `<span class="status-pill ${campStatusDetails.pillClass || 'paused'}"><span class="status-dot"></span>${statusText}</span>`;
    }

    let datesText = 'Ongoing';
    if (camp.budget_info && camp.budget_info.start_time) {
        const start = new Date(camp.budget_info.start_time).toLocaleDateString();
        const end = camp.budget_info.stop_time ? new Date(camp.budget_info.stop_time).toLocaleDateString() : 'Ongoing';
        datesText = `${start} - ${end}`;
    }
    const datesEl = document.getElementById('modal-camp-dates');
    if (datesEl) datesEl.textContent = datesText;
    
    let budgetText = "N/A";
    if (camp.budget_info) {
        if (camp.budget_info.daily_budget) {
            budgetText = (parseInt(camp.budget_info.daily_budget)/100).toFixed(2) + '€/day';
        } else if (camp.budget_info.lifetime_budget) {
            budgetText = (parseInt(camp.budget_info.lifetime_budget)/100).toFixed(2) + '€ (life)';
        } else {
            budgetText = "ABO (Ad Sets)";
        }
    }
    const budgetEl = document.getElementById('modal-daily-budget');
    if (budgetEl) budgetEl.textContent = budgetText;
    
    const cpa = purchases > 0 ? (spend / purchases).toFixed(2) : 0;
    const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : 0;
    const ctr = imp > 0 ? ((clicks / imp) * 100).toFixed(2) : 0;
    const cplpv = lpv > 0 ? (spend / lpv).toFixed(2) : 0;
    
    document.getElementById('modal-camp-cpa').textContent = cpa + '€';
    
    const cpcEl = document.getElementById('modal-camp-cpc');
    if (cpcEl) {
        cpcEl.textContent = cpc + '€';
        cpcEl.style.color = window.getColorForCpc(cpc);
    }
    
    const ctrEl = document.getElementById('modal-camp-ctr');
    if (ctrEl) {
        ctrEl.textContent = ctr + '%';
        ctrEl.style.color = window.getColorForCtr(ctr);
    }
    
    const freqEl = document.getElementById('modal-camp-frequency');
    if (freqEl) {
        const freqVal = camp.frequency ? parseFloat(camp.frequency).toFixed(2) : 'N/A';
        freqEl.textContent = freqVal;
        freqEl.style.color = window.getColorForFreq(freqVal);
    }
    const impEl = document.getElementById('modal-camp-impressions');
    if (impEl) impEl.textContent = imp.toLocaleString();
    const clicksEl = document.getElementById('modal-camp-clicks');
    if (clicksEl) clicksEl.textContent = clicks.toLocaleString();
    const lpvEl = document.getElementById('modal-camp-lpv');
    if (lpvEl) lpvEl.textContent = lpv.toLocaleString();
    const cplpvEl = document.getElementById('modal-camp-cplpv');
    if (cplpvEl) cplpvEl.textContent = cplpv + '€';
    
    const adsetsContainer = document.getElementById('modal-meta-groups-container') || document.getElementById('modal-adsets-container');
    if (adsetsContainer) {
        adsetsContainer.innerHTML = '';
        const adSetMap = {};
        
        // 1. Get all Ad Sets for this campaign from TargetingMap
        Object.values(currentAdSetsTargetingMap).forEach(as => {
            if (as.campaign_id === camp.campaign_id) {
                adSetMap[as.id] = { name: as.name, spend: 0, imp: 0, clicks: 0, purchases: 0, lpv: 0, ads: [], reach: 0 };
            }
        });
        
        // 2. Add ALL ads from currentAdCreativesMap
        Object.values(currentAdCreativesMap).forEach(adData => {
            const adsetId = adData.adset_id;
            if (adSetMap[adsetId]) {
                const insightAd = currentAdsList.find(a => a.ad_id === adData.id) || {};
                
                const combinedAd = {
                    ad_id: adData.id,
                    ad_name: adData.name,
                    status: adData.status,
                    effective_status: adData.effective_status,
                    spend: parseFloat(insightAd.spend || 0),
                    impressions: parseInt(insightAd.impressions || 0),
                    clicks: parseInt(insightAd.clicks || 0),
                    actions: insightAd.actions || [],
                    reach: insightAd.reach || 0,
                    frequency: insightAd.frequency || 0
                };
                
                adSetMap[adsetId].ads.push(combinedAd);
                adSetMap[adsetId].spend += combinedAd.spend;
                adSetMap[adsetId].imp += combinedAd.impressions;
                adSetMap[adsetId].clicks += combinedAd.clicks;
                adSetMap[adsetId].reach += parseInt(combinedAd.reach || 0);
                
                let p = 0;
                let l = 0;
                if (combinedAd.actions) {
                    const pa = combinedAd.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                    if (pa) p = parseInt(pa.value);
                    const la = combinedAd.actions.find(a => a.action_type === 'landing_page_view');
                    if (la) l = parseInt(la.value);
                }
                adSetMap[adsetId].purchases += p;
                adSetMap[adsetId].lpv += l;
            }
        });

        if (Object.keys(adSetMap).length > 0) {
            for (const [adsetId, adset] of Object.entries(adSetMap)) {
                const asCpa = adset.purchases > 0 ? (adset.spend / adset.purchases).toFixed(2) : 0;
                const asCpc = adset.clicks > 0 ? (adset.spend / adset.clicks).toFixed(2) : 0;
                const asCtr = adset.imp > 0 ? ((adset.clicks / adset.imp) * 100).toFixed(2) : 0;
                const asCplpv = adset.lpv > 0 ? (adset.spend / adset.lpv).toFixed(2) : 0;
                const asFreq = adset.reach > 0 ? (adset.imp / adset.reach).toFixed(2) : 0;
                
                const adsetTargeting = currentAdSetsTargetingMap[adsetId] || {};
                const asStatusObj = window.getMetaStatusDetails(
                    adsetTargeting.status,
                    adsetTargeting.effective_status,
                    adsetTargeting.end_time || camp.budget_info?.stop_time
                );
                const asStatus = asStatusObj.text;
                
                let asBudgetText = '';
                if (adsetTargeting.daily_budget) {
                    asBudgetText = `<span>Budget: ${(parseInt(adsetTargeting.daily_budget)/100).toFixed(2)}€/day</span>`;
                } else if (adsetTargeting.lifetime_budget) {
                    asBudgetText = `<span>Budget: ${(parseInt(adsetTargeting.lifetime_budget)/100).toFixed(2)}€ (life)</span>`;
                }
                
                let asBidText = '';
                if (adsetTargeting.bid_strategy && adsetTargeting.bid_strategy !== 'LOWEST_COST_WITHOUT_CAP') {
                    asBidText = `<span>Strategy: ${adsetTargeting.bid_strategy}</span>`;
                }
                if (adsetTargeting.bid_amount) {
                    asBidText += `<span>Bid Cap: ${(parseInt(adsetTargeting.bid_amount)/100).toFixed(2)}€</span>`;
                }
                
                const adsetEl = document.createElement('div');
                adsetEl.className = 'meta-group-item';
                
                const header = document.createElement('div');
                header.className = 'meta-group-header';
                header.innerHTML = `
                    <div>
                        <div style="margin-bottom: 8px; font-size: 1.05em; color: white; display: flex; align-items: center; gap: 8px;">
                            <span class="status-pill ${asStatusObj.pillClass || 'paused'}"><span class="status-dot"></span>${asStatus}</span>
                            ${adset.name || 'Unknown Ad Set'}
                        </div>
                        <div class="meta-group-stats tabular-nums">
                            ${asBudgetText} ${asBidText}
                            <span>Spend: ${adset.spend.toFixed(2)}€</span>
                            <span>Imp: ${adset.imp.toLocaleString()}</span>
                            <span>Clicks: ${adset.clicks.toLocaleString()}</span>
                            <span>CTR: <span style="color: ${window.getColorForCtr(asCtr)}; font-weight: 600;">${asCtr}%</span></span>
                            <span>CPC: <span style="color: ${window.getColorForCpc(asCpc)}; font-weight: 600;">${asCpc}€</span></span>
                            <span>Freq: <span style="color: ${window.getColorForFreq(asFreq)}; font-weight: 600;">${asFreq}</span></span>
                            <span>LPV: ${adset.lpv.toLocaleString()}</span>
                            <span>CPLPV: ${asCplpv}€</span>
                            <span>Purchases: ${adset.purchases}</span>
                            <span>CPA: ${asCpa}€</span>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-down"></i>
                `;
                
                const body = document.createElement('div');
                body.className = 'meta-group-body';
                
                if (adset.ads.length > 0) {
                    adset.ads.forEach(ad => {
                        const adData = currentAdCreativesMap[ad.ad_id] || {};
                        const creative = adData.creative || {};
                        let titleHtml = creative.title ? `<p><strong>Title:</strong> ${creative.title}</p>` : '';
                        let descHtml = creative.body ? `<p><strong>Description:</strong> ${creative.body.substring(0, 150)}${creative.body.length > 150 ? '...' : ''}</p>` : '';

                        if (creative.asset_feed_spec) {
                            if (creative.asset_feed_spec.titles && creative.asset_feed_spec.titles.length > 0) {
                                titleHtml = `<p><strong>Title Variations:</strong></p><ul style="margin: 5px 0 10px 20px; padding: 0;">` + creative.asset_feed_spec.titles.map((t, i) => `<li style="margin-bottom:3px;">[${i+1}] ${t.text}</li>`).join('') + `</ul>`;
                            }
                            if (creative.asset_feed_spec.bodies && creative.asset_feed_spec.bodies.length > 0) {
                                descHtml = `<p><strong>Description Variations:</strong></p><ul style="margin: 5px 0 10px 20px; padding: 0;">` + creative.asset_feed_spec.bodies.map((b, i) => {
                                    const shortTxt = b.text.substring(0, 100) + (b.text.length > 100 ? '...' : '');
                                    return `<li style="margin-bottom:3px;">[${i+1}] ${shortTxt}</li>`;
                                }).join('') + `</ul>`;
                            }
                            if (creative.asset_feed_spec.descriptions && creative.asset_feed_spec.descriptions.length > 0) {
                                descHtml += `<p><strong>Sub-Descriptions:</strong></p><ul style="margin: 5px 0 10px 20px; padding: 0;">` + creative.asset_feed_spec.descriptions.map((d, i) => `<li style="margin-bottom:3px;">[${i+1}] ${d.text}</li>`).join('') + `</ul>`;
                            }
                        }
                        if (!titleHtml) titleHtml = `<p><strong>Title:</strong> No title</p>`;
                        if (!descHtml) descHtml = `<p><strong>Description:</strong> No description</p>`;
                        
                        let link = '';
                        if (creative.object_story_spec && creative.object_story_spec.link_data && creative.object_story_spec.link_data.link) {
                            link = creative.object_story_spec.link_data.link;
                        } else if (creative.object_story_spec && creative.object_story_spec.video_data && creative.object_story_spec.video_data.call_to_action && creative.object_story_spec.video_data.call_to_action.value) {
                            link = creative.object_story_spec.video_data.call_to_action.value.link;
                        } else if (creative.asset_feed_spec && creative.asset_feed_spec.link_urls && creative.asset_feed_spec.link_urls.length > 0) {
                            link = creative.asset_feed_spec.link_urls[0].website_url;
                        }
                        
                        const adSpend = parseFloat(ad.spend || 0);
                        const adImp = parseInt(ad.impressions || 0);
                        const adClicks = parseInt(ad.clicks || 0);
                        let adPurchases = 0;
                        let adLpv = 0;
                        if (ad.actions) {
                            const pa = ad.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                            if (pa) adPurchases = parseInt(pa.value);
                            const la = ad.actions.find(a => a.action_type === 'landing_page_view');
                            if (la) adLpv = parseInt(la.value);
                        }
                        const adCpa = adPurchases > 0 ? (adSpend / adPurchases).toFixed(2) : 0;
                        const adCpc = adClicks > 0 ? (adSpend / adClicks).toFixed(2) : 0;
                        const adCtr = adImp > 0 ? ((adClicks / adImp) * 100).toFixed(2) : 0;
                        const adCplpv = adLpv > 0 ? (adSpend / adLpv).toFixed(2) : 0;
                        const adFreq = ad.frequency ? parseFloat(ad.frequency).toFixed(2) : 0;
                        
                        const adStatusObj = window.getMetaStatusDetails(
                            adData.status,
                            adData.effective_status
                        );
                        const adStatus = adStatusObj.text;
                        
                        const adEl = document.createElement('div');
                        adEl.className = 'meta-creative-item';
                        adEl.innerHTML = `
                            <div class="meta-creative-header">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="status-pill ${adStatusObj.pillClass || 'paused'}"><span class="status-dot"></span>${adStatus}</span>
                                    ${ad.ad_name || ad.ad_id}
                                </div>
                            </div>
                            <div class="meta-creative-stats tabular-nums">
                                <span>Spend: ${adSpend.toFixed(2)}€</span>
                                <span>Imp: ${adImp.toLocaleString()}</span>
                                <span>Clicks: ${adClicks.toLocaleString()}</span>
                                <span>CTR: <span style="color: ${window.getColorForCtr(adCtr)}; font-weight: 600;">${adCtr}%</span></span>
                                <span>CPC: <span style="color: ${window.getColorForCpc(adCpc)}; font-weight: 600;">${adCpc}€</span></span>
                                <span>Freq: <span style="color: ${window.getColorForFreq(adFreq)}; font-weight: 600;">${adFreq}</span></span>
                                <span>LPV: ${adLpv.toLocaleString()}</span>
                                <span>CPLPV: ${adCplpv}€</span>
                                <span>Purchases: ${adPurchases}</span>
                                <span>CPA: ${adCpa}€</span>
                            </div>
                            <div class="meta-creative-details">
                                ${titleHtml}
                                ${descHtml}
                                ${link ? `<p><strong>Link:</strong> <a href="${link}" target="_blank" class="meta-creative-link">${link}</a></p>` : ''}
                            </div>
                        `;
                        body.appendChild(adEl);
                    });
                } else {
                    body.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.9em; padding: 10px;">No ads data available for this ad set in the selected period.</div>';
                }
                
                header.onclick = (e) => {
                    if (e && e.stopPropagation) e.stopPropagation();
                    const isExpanded = body.style.display === 'block';
                    body.style.display = isExpanded ? 'none' : 'block';
                    if (isExpanded) {
                        header.classList.remove('active');
                    } else {
                        header.classList.add('active');
                    }
                };
                
                adsetEl.appendChild(header);
                adsetEl.appendChild(body);
                adsetsContainer.appendChild(adsetEl);
            }
        } else {
            adsetsContainer.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.9em; padding: 10px;">No ad sets data available for this campaign in the selected period.</div>';
        }
    }

    // Render Modal Hourly Chart
    if (modalHourlyChartInstance) {
        modalHourlyChartInstance.destroy();
    }

    const modalHourlyLabels = [];
    const modalHourlySpendData = [];
    const modalHourlyClicksData = [];
    const modalHourlyLandingPageViewsData = [];
    const modalHourlyPurchasesData = [];
    const modalHourlyCpcData = [];
    
    // Filter for current campaign
    const campHourlyData = currentHourlyCampData.filter(h => h.campaign_id === camp.campaign_id);
    
    const nowModal = new Date();
    const timelineModal = [];
    for (let i = 23; i >= 0; i--) {
        const d = new Date(nowModal.getTime() - i * 60 * 60 * 1000);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        
        timelineModal.push({
            dateKey: `${yyyy}-${mm}-${dd}`,
            hourKey: `${hh}:00:00 - ${hh}:59:59`,
            label: `${dd}/${mm} ${hh}:00`
        });
    }

    timelineModal.forEach(t => {
        modalHourlyLabels.push(t.label);
        const hourData = campHourlyData.find(h => h.date_start === t.dateKey && h.hourly_stats_aggregated_by_advertiser_time_zone === t.hourKey);
        
        if (hourData) {
            const spend = parseFloat(hourData.spend || 0);
            const clicks = parseInt(hourData.clicks || 0);
            modalHourlySpendData.push(spend);
            modalHourlyClicksData.push(clicks);
            modalHourlyCpcData.push(clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0);
            
            let landingPageViews = 0;
            let purchases = 0;
            if (hourData.actions) {
                const lpvAction = hourData.actions.find(a => a.action_type === 'landing_page_view');
                if (lpvAction) landingPageViews = parseInt(lpvAction.value);
                const pAction = hourData.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                if (pAction) purchases = parseInt(pAction.value);
            }
            modalHourlyLandingPageViewsData.push(landingPageViews);
            modalHourlyPurchasesData.push(purchases);
        } else {
            modalHourlySpendData.push(0);
            modalHourlyClicksData.push(0);
            modalHourlyCpcData.push(0);
            modalHourlyLandingPageViewsData.push(0);
            modalHourlyPurchasesData.push(0);
        }
    });

    const modalHourlyCtx = document.getElementById('modalHourlyChart');
    if (modalHourlyCtx) {
        modalHourlyChartInstance = new Chart(modalHourlyCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: modalHourlyLabels,
                datasets: [
                    {
                        label: 'Hourly Spend (24h) (€)',
                        data: modalHourlySpendData,
                        backgroundColor: 'rgba(23, 162, 184, 0.7)',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Hourly Clicks',
                        data: modalHourlyClicksData,
                        type: 'line',
                        borderColor: '#ffc107',
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Hourly Landing Page Views',
                        data: modalHourlyLandingPageViewsData,
                        type: 'line',
                        borderColor: '#28a745',
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Hourly Purchases',
                        data: modalHourlyPurchasesData,
                        type: 'line',
                        borderColor: '#ff6b6b',
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Hourly CPC (€)',
                        data: modalHourlyCpcData,
                        type: 'line',
                        borderColor: '#9b59b6',
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { labels: { color: '#a0a0a0' } } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0' } },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#a0a0a0' },
                        title: { display: true, text: 'Spend (€)', color: '#a0a0a0' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#a0a0a0' },
                        title: { display: true, text: 'Clicks', color: '#a0a0a0' }
                    }
                }
            }
        });
    }

    document.getElementById('campaignModal').style.display = 'block';
}

function closeCampaignModal() {
    document.getElementById('campaignModal').style.display = 'none';
}

window.refreshCampaignModalData = async function() {
    if (!currentSelectedCampaign || !currentSelectedCampaign.camp) return;
    const btn = document.getElementById('btn-refresh-campaign-modal');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-rotate-right fa-spin"></i> Refreshing...`;
    }

    try {
        await fetchAdsData();
        if (currentSelectedCampaign && currentSelectedCampaign.camp) {
            const campId = currentSelectedCampaign.camp.campaign_id;
            const updatedCamp = currentCampaignsData.find(c => c.campaign_id === campId) || currentSelectedCampaign.camp;
            
            const spend = parseFloat(updatedCamp.spend || 0);
            const imp = parseInt(updatedCamp.impressions || 0);
            const clicks = parseInt(updatedCamp.clicks || 0);
            let purchases = 0;
            let lpv = 0;
            if (updatedCamp.actions) {
                const purchaseAction = updatedCamp.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                if (purchaseAction) purchases = parseInt(purchaseAction.value);
                const lpvAction = updatedCamp.actions.find(a => a.action_type === 'landing_page_view');
                if (lpvAction) lpv = parseInt(lpvAction.value);
            }

            openCampaignModal(updatedCamp, spend, imp, clicks, purchases, lpv);
        }
    } catch (e) {
        console.error("Failed to refresh campaign modal data", e);
    } finally {
        if (btn) {
            btn.innerHTML = `<i class="fa-solid fa-check" style="color: #10b981;"></i> Refreshed!`;
            setTimeout(() => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> Refresh`;
                }
            }, 2000);
        }
    }
};

document.getElementById('btn-analyze-campaign').addEventListener('click', () => {
    if (!currentSelectedCampaign) return;
    analyzeCampaignWithAI(currentSelectedCampaign);
});

async function analyzeCampaignWithAI(campData) {
    // We purposefully do NOT close the campaign modal here based on user request.


    const budgetEl = document.getElementById('modal-daily-budget');
    const budgetText = budgetEl ? budgetEl.textContent : 'N/A';

    const status = window.getMetaStatusDetails(
        campData.camp.budget_info?.status,
        campData.camp.budget_info?.effective_status,
        campData.camp.budget_info?.stop_time
    ).text;
    const objective = campData.camp.budget_info ? campData.camp.budget_info.objective : 'UNKNOWN';
    let datesText = 'Ongoing';
    let daysActiveText = 'Unknown';
    const now = new Date();
    const currentTimeStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

    if (campData.camp.budget_info && campData.camp.budget_info.start_time) {
        const start = new Date(campData.camp.budget_info.start_time);
        const end = campData.camp.budget_info.stop_time ? new Date(campData.camp.budget_info.stop_time).toLocaleDateString() : 'Ongoing';
        datesText = `${start.toLocaleDateString()} to ${end}`;
        
        const diffTime = Math.abs(now - start);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
        const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        daysActiveText = `${diffDays} days, ${diffHours} hours`;
    }

    let lastChangeText = 'Unknown';
    if (campData.camp.budget_info && campData.camp.budget_info.updated_time) {
        const updated = new Date(campData.camp.budget_info.updated_time);
        const diffUpdate = Math.abs(now - updated);
        const diffUpdateDays = Math.floor(diffUpdate / (1000 * 60 * 60 * 24)); 
        const diffUpdateHours = Math.floor((diffUpdate % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        lastChangeText = `${updated.toLocaleDateString()} ${updated.toLocaleTimeString()} (${diffUpdateDays} days, ${diffUpdateHours} hours ago)`;
    }

    const campStatsText = `
**Currently Selected Campaign Stats:**
Current Time: ${currentTimeStr}
Campaign Name: ${campData.camp.campaign_name}
Campaign ID: ${campData.camp.campaign_id}
Status: ${status}
Objective: ${objective}
Duration: ${datesText} (Active for: ${daysActiveText})
Last Significant Change: ${lastChangeText}
Budget: ${budgetText}
Bid Strategy: ${campData.camp.budget_info?.bid_strategy || 'LOWEST_COST_WITHOUT_CAP'} ${campData.camp.budget_info?.bid_amount ? '(Bid Cap: ' + (parseInt(campData.camp.budget_info.bid_amount)/100).toFixed(2) + '€)' : ''}
Spend: ${campData.spend.toFixed(2)}€
Impressions: ${campData.imp}
Reach: ${campData.camp.reach || 'N/A'}
Frequency: ${campData.camp.frequency || 'N/A'}
Clicks: ${campData.clicks}
Purchases: ${campData.purchases}
CPC: ${campData.clicks > 0 ? (campData.spend / campData.clicks).toFixed(2) : 0}€
CPA: ${campData.purchases > 0 ? (campData.spend / campData.purchases).toFixed(2) : 0}€
CTR: ${campData.imp > 0 ? ((campData.clicks / campData.imp) * 100).toFixed(2) : 0}%`;

    let adsText = '\n\n**Ad Sets & Ads Details:**\n';
    
    const adSetMap = {};
    
    // 1. Get all Ad Sets for this campaign from TargetingMap
    Object.values(currentAdSetsTargetingMap).forEach(as => {
        if (as.campaign_id === campData.camp.campaign_id) {
            adSetMap[as.id] = { name: as.name, ads: [] };
        }
    });
    
    // 2. Add ALL ads from currentAdCreativesMap
    Object.values(currentAdCreativesMap).forEach(adData => {
        const adsetId = adData.adset_id;
        if (adSetMap[adsetId]) {
            const insightAd = currentAdsList.find(a => a.ad_id === adData.id) || {};
            adSetMap[adsetId].ads.push({
                ad_id: adData.id,
                ad_name: adData.name,
                spend: parseFloat(insightAd.spend || 0),
                impressions: parseInt(insightAd.impressions || 0),
                clicks: parseInt(insightAd.clicks || 0),
                actions: insightAd.actions || [],
                reach: insightAd.reach || 0,
                frequency: insightAd.frequency || 0
            });
        }
    });
    
    if (Object.keys(adSetMap).length === 0) {
        adsText += 'No granular ads data available for this campaign.\n';
    } else {
        for (const [adsetId, adset] of Object.entries(adSetMap)) {
            let targetingDataStr = "No targeting data available";
            let optGoal = 'UNKNOWN';
            let billEvent = 'UNKNOWN';
            let asStatus = 'UNKNOWN';
            let asBudgetStr = 'N/A';
            let asBidStr = 'LOWEST_COST_WITHOUT_CAP (Auto Bid)';
            if (currentAdSetsTargetingMap[adsetId]) {
                const adsetData = currentAdSetsTargetingMap[adsetId];
                targetingDataStr = JSON.stringify(adsetData.targeting || {}, null, 2);
                optGoal = adsetData.optimization_goal || 'UNKNOWN';
                billEvent = adsetData.billing_event || 'UNKNOWN';
                if (adsetData.daily_budget) asBudgetStr = (parseInt(adsetData.daily_budget)/100).toFixed(2) + '€/day';
                else if (adsetData.lifetime_budget) asBudgetStr = (parseInt(adsetData.lifetime_budget)/100).toFixed(2) + '€ (life)';
                
                if (adsetData.daily_min_spend_target) asBudgetStr += ` [Min Limit: ${(parseInt(adsetData.daily_min_spend_target)/100).toFixed(2)}€]`;
                if (adsetData.daily_spend_cap) asBudgetStr += ` [Max Limit: ${(parseInt(adsetData.daily_spend_cap)/100).toFixed(2)}€]`;
                if (adsetData.bid_strategy) asBidStr = adsetData.bid_strategy;
                if (adsetData.bid_amount) asBidStr += ` (Cap: ${(parseInt(adsetData.bid_amount)/100).toFixed(2)}€)`;
                asStatus = window.getMetaStatusDetails(
                    adsetData.status,
                    adsetData.effective_status,
                    adsetData.end_time || campData.camp.budget_info?.stop_time
                ).text;
            }
            adsText += `\nAd Set: ${adset.name || adsetId} (Status: ${asStatus}, Budget: ${asBudgetStr}, Bid Strategy: ${asBidStr}, Optimization: ${optGoal}, Billing: ${billEvent})\nTargeting: ${targetingDataStr}\n`;
            
            if (adset.ads.length === 0) {
                adsText += `   No ads data available for this ad set in the selected period.\n`;
            } else {
                adset.ads.forEach(ad => {
                    const adData = currentAdCreativesMap[ad.ad_id] || {};
                    const creative = adData.creative || {};
                    const adStatus = window.getMetaStatusDetails(
                        adData.status,
                        adData.effective_status
                    ).text;
                    let copyText = creative.body ? `\n   Ad Copy: "${creative.body}"` : '';
                    let titleText = creative.title ? `\n   Ad Title: "${creative.title}"` : '';
                    let descText = '';

                    if (creative.asset_feed_spec) {
                        if (creative.asset_feed_spec.bodies && creative.asset_feed_spec.bodies.length > 0) {
                            copyText = `\n   Ad Copy Variations: ` + creative.asset_feed_spec.bodies.map((b, i) => `[${i+1}] "${b.text}"`).join(" | ");
                        }
                        if (creative.asset_feed_spec.titles && creative.asset_feed_spec.titles.length > 0) {
                            titleText = `\n   Ad Title Variations: ` + creative.asset_feed_spec.titles.map((t, i) => `[${i+1}] "${t.text}"`).join(" | ");
                        }
                        if (creative.asset_feed_spec.descriptions && creative.asset_feed_spec.descriptions.length > 0) {
                            descText = `\n   Ad Description Variations: ` + creative.asset_feed_spec.descriptions.map((d, i) => `[${i+1}] "${d.text}"`).join(" | ");
                        }
                    }
                    
                    let link = '';
                    if (creative.object_story_spec && creative.object_story_spec.link_data && creative.object_story_spec.link_data.link) {
                        link = creative.object_story_spec.link_data.link;
                    } else if (creative.object_story_spec && creative.object_story_spec.video_data && creative.object_story_spec.video_data.call_to_action && creative.object_story_spec.video_data.call_to_action.value) {
                        link = creative.object_story_spec.video_data.call_to_action.value.link;
                    } else if (creative.asset_feed_spec && creative.asset_feed_spec.link_urls && creative.asset_feed_spec.link_urls.length > 0) {
                        link = creative.asset_feed_spec.link_urls[0].website_url;
                    }
                    const destLinkText = link ? `\n   Dest Link: ${link}` : '';
                    
                    const adReach = ad.reach || 0;
                    const adFreq = ad.frequency || 0;
                    let linkClicks = 0;
                    if (ad.actions) {
                        const lca = ad.actions.find(a => a.action_type === 'link_click');
                        if (lca) linkClicks = parseInt(lca.value);
                    }
                    
                    adsText += `- Ad: ${ad.ad_name || ad.ad_id} (Status: ${adStatus})
       Spend: ${ad.spend || 0}€, Impressions: ${ad.impressions || 0}, Reach: ${adReach}, Frequency: ${adFreq}, Link Clicks: ${linkClicks}${titleText}${copyText}${descText}${destLinkText}\n`;
                });
            }
        }
    }

    const timeSeriesText = await fetchTimeSeriesContext(campData.camp.campaign_id);
    const fullContext = campStatsText + timeSeriesText + adsText;

    if (window.updateCopilotContext) {
        const customPrompt = "Please act as an expert Meta Ads Media Buyer. Analyze the performance of this specific campaign AND its individual Ad Sets and Ads (including Ad Copy/Title performance) based on the context data provided. VERY IMPORTANT: Pay close attention to the Status of each Ad Set and Ad. Do NOT suggest optimizing or changing Ad Sets or Ads that are PAUSED or ARCHIVED, focus only on ACTIVE ones. 🚨 ZERO-IMPRESSION / BID CAP DIAGNOSTIC RULE: Whenever an ACTIVE campaign or ad set has generated 0 Impressions and 0 Spend over the last 24 hours (or since launching yesterday), check its Bid Strategy and Bid Cap. If a Cost Cap (COST_CAP) or Bid Cap (LOWEST_COST_WITH_BID_CAP) is set, diagnose Auction Exclusion due to Low Bid Cap immediately and recommend raising or removing the cap. Analyze the Temporal Evolution tables (Daily for last 7 days and Hourly for last 24 hours) to diagnose trends like creative fatigue, bid exhaustion, intraday conversion hours, or scaling opportunities. Tell me what is working well, what is underperforming, and give 3 highly actionable pieces of advice to improve the active creatives and targeting based on CPC, CPA, and CTR.";
        window.updateCopilotContext(fullContext, customPrompt, 'campaign_' + campData.camp.campaign_id);
    }
}
