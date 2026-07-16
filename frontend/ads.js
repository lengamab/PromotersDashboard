const META_ACCOUNT_ID = 'act_911535275086772';
const META_ACCESS_TOKEN = 'EAAMlAfQc4LsBR18bIHU1HG9VaGgmHrcu9vXtRrlLnoqHYnJiuAjdgyGTJ89q37NvYu4XjZAVjiz47WPUVOjJpYF58HtvOXJZCHLI4wk1c5ViRTzFZANZCNFoWnCZBdM0ZBwcTFqlS5IBWPwZCJcZBQPw2IqAfmgROp93elmCe9CZAEj4KXbqmOLf6MckZBONfOZA5AZD';
let GEMINI_API_KEY = 'AQ.Ab8RN6IgzUweVqfl0oB-C7TVuYVTm90clJZKEnYxblYv2trAqA';
window.META_ACCESS_TOKEN = META_ACCESS_TOKEN;

let adsChartInstance = null;
let hourlyChartInstance = null;
let currentAdsData = [];
let currentHourlyData = [];
let currentCampaignsData = [];
let currentAdsList = [];
let currentAdCreativesMap = {};
let currentSummary = {};

document.addEventListener('DOMContentLoaded', () => {
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
    if (!META_ACCOUNT_ID || !META_ACCESS_TOKEN) return;

    const fromDate = document.getElementById('date-from').value;
    const toDate = document.getElementById('date-to').value;

    const url = `https://graph.facebook.com/v19.0/${META_ACCOUNT_ID}/insights`;
    const params = new URLSearchParams({
        access_token: META_ACCESS_TOKEN,
        level: 'account',
        time_range: JSON.stringify({ since: fromDate, until: toDate }),
        time_increment: 1, // Daily
        limit: 100, // Important to prevent pagination truncating 30 days
        fields: 'spend,impressions,clicks,actions'
    });

    try {
        const [res, hourlyRes, campRes, budgetRes, adRes, adCreativeRes] = await Promise.all([
            fetch(`${url}?${params.toString()}`),
            fetch(`${url}?${new URLSearchParams({
                access_token: META_ACCESS_TOKEN,
                level: 'account',
                time_range: JSON.stringify({ since: new Date().toISOString().split('T')[0], until: new Date().toISOString().split('T')[0] }),
                breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
                limit: 100,
                fields: 'spend'
            }).toString()}`),
            fetch(`${url}?${new URLSearchParams({
                access_token: META_ACCESS_TOKEN,
                level: 'campaign',
                time_range: JSON.stringify({ since: fromDate, until: toDate }),
                limit: 500,
                fields: 'campaign_name,campaign_id,spend,impressions,clicks,actions'
            }).toString()}`),
            fetch(`https://graph.facebook.com/v19.0/${META_ACCOUNT_ID}/campaigns?${new URLSearchParams({
                access_token: META_ACCESS_TOKEN,
                limit: 500,
                fields: 'id,name,daily_budget,lifetime_budget,status,start_time,stop_time'
            }).toString()}`),
            fetch(`${url}?${new URLSearchParams({
                access_token: META_ACCESS_TOKEN,
                level: 'ad',
                time_range: JSON.stringify({ since: fromDate, until: toDate }),
                limit: 1000,
                fields: 'campaign_id,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,actions'
            }).toString()}`),
            fetch(`https://graph.facebook.com/v19.0/${META_ACCOUNT_ID}/ads?${new URLSearchParams({
                access_token: META_ACCESS_TOKEN,
                limit: 1000,
                fields: 'id,name,creative{body,title,object_story_spec,asset_feed_spec}'
            }).toString()}`)
        ]);
        
        const json = await res.json();
        const hourlyJson = await hourlyRes.json();
        const campJson = await campRes.json();
        const budgetJson = await budgetRes.json();
        const adJson = await adRes.json();
        const adCreativeJson = await adCreativeRes.json();
        
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
        currentCampaignsData = campJson.data || [];
        currentAdsList = adJson.data || [];
        
        currentAdCreativesMap = {};
        if (adCreativeJson.data) {
            adCreativeJson.data.forEach(ad => {
                currentAdCreativesMap[ad.id] = ad.creative;
            });
        }
        
        currentCampaignsData.forEach(c => {
            if (budgetMap[c.campaign_id]) {
                c.budget_info = budgetMap[c.campaign_id];
            }
        });
        
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

    // Pad missing dates
    const fromDateObj = new Date(document.getElementById('date-from').value);
    const toDateObj = new Date(document.getElementById('date-to').value);
    const dataByDate = {};
    
    currentAdsData.forEach(day => {
        dataByDate[day.date_start] = day;
    });

    for (let d = new Date(fromDateObj); d <= toDateObj; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        labels.push(dateStr);
        
        const day = dataByDate[dateStr] || { spend: 0, impressions: 0, clicks: 0, actions: [] };
        
        const spend = parseFloat(day.spend || 0);
        const imp = parseInt(day.impressions || 0);
        const clicks = parseInt(day.clicks || 0);
        
        let purchases = 0;
        if (day.actions) {
            const purchaseAction = day.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
            if (purchaseAction) {
                purchases = parseInt(purchaseAction.value);
            }
        }

        totalSpend += spend;
        totalImpressions += imp;
        totalClicks += clicks;
        totalPurchases += purchases;

        spendData.push(spend);
        clicksData.push(clicks);
        purchasesData.push(purchases);
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
    
    // Sort hourly data by hour
    currentHourlyData.sort((a, b) => a.hourly_stats_aggregated_by_advertiser_time_zone.localeCompare(b.hourly_stats_aggregated_by_advertiser_time_zone));
    
    currentHourlyData.forEach(hour => {
        hourlyLabels.push(hour.hourly_stats_aggregated_by_advertiser_time_zone.split(' - ')[0].substring(0, 5)); // "00:00:00 - 00:59:59" -> "00:00"
        hourlySpendData.push(parseFloat(hour.spend || 0));
    });

    const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
    hourlyChartInstance = new Chart(hourlyCtx, {
        type: 'bar',
        data: {
            labels: hourlyLabels,
            datasets: [{
                label: 'Hourly Spend Today (€)',
                data: hourlySpendData,
                backgroundColor: 'rgba(23, 162, 184, 0.7)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#a0a0a0' } } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a0a0a0' } }
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
            if (camp.actions) {
                const purchaseAction = camp.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                if (purchaseAction) {
                    purchases = parseInt(purchaseAction.value);
                }
            }

            const statusColors = { ACTIVE: '#28a745', PAUSED: '#ffc107', ARCHIVED: '#6c757d' };
            const statusText = camp.budget_info && camp.budget_info.status ? camp.budget_info.status : 'UNKNOWN';
            const statusColor = statusColors[statusText] || '#6c757d';

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.style.cursor = 'pointer';
            tr.onmouseover = () => tr.style.background = 'rgba(255,255,255,0.05)';
            tr.onmouseout = () => tr.style.background = 'transparent';
            
            tr.innerHTML = `
                <td style="padding: 15px 20px; font-weight: 500;">${camp.campaign_name}</td>
                <td style="padding: 15px 20px;"><span style="color: ${statusColor}; font-size: 0.85em; border: 1px solid ${statusColor}; padding: 2px 8px; border-radius: 12px; font-weight: 600;">${statusText}</span></td>
                <td style="padding: 15px 20px; color: var(--text-secondary);">${spend.toFixed(2)}€</td>
                <td style="padding: 15px 20px; color: var(--text-secondary);">${imp.toLocaleString()}</td>
                <td style="padding: 15px 20px; color: var(--text-secondary);">${clicks.toLocaleString()}</td>
                <td style="padding: 15px 20px; color: var(--text-secondary);">${purchases.toLocaleString()}</td>
            `;

            tr.onclick = () => openCampaignModal(camp, spend, imp, clicks, purchases);
            tbody.appendChild(tr);
        });
    }
}

function closeAiModal() {
    document.getElementById('aiModal').style.display = 'none';
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

    if (window.updateCopilotContext) {
        const customPrompt = "Please act as an expert Meta Ads Media Buyer. Analyze my overall account performance based on the context data. Identify top-performing trends, pinpoint areas of inefficient spend, and provide 3 concrete, data-backed recommendations to optimize my budget.";
        window.updateCopilotContext(contextData, customPrompt);
    }
}

let currentSelectedCampaign = null;

function openCampaignModal(camp, spend, imp, clicks, purchases) {
    currentSelectedCampaign = { camp, spend, imp, clicks, purchases };
    document.getElementById('modal-campaign-name').textContent = camp.campaign_name;
    document.getElementById('modal-camp-spend').textContent = spend.toFixed(2) + '€';
    document.getElementById('modal-camp-purchases').textContent = purchases.toLocaleString();
    
    const statusColors = { ACTIVE: '#28a745', PAUSED: '#ffc107', ARCHIVED: '#6c757d' };
    const statusText = camp.budget_info && camp.budget_info.status ? camp.budget_info.status : 'UNKNOWN';
    const statusColor = statusColors[statusText] || '#6c757d';
    
    const statusEl = document.getElementById('modal-camp-status');
    if (statusEl) {
        statusEl.textContent = statusText;
        statusEl.style.color = statusColor;
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
        }
    }
    const budgetEl = document.getElementById('modal-daily-budget');
    if (budgetEl) budgetEl.textContent = budgetText;
    
    const cpa = purchases > 0 ? (spend / purchases).toFixed(2) : 0;
    const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : 0;
    const ctr = imp > 0 ? ((clicks / imp) * 100).toFixed(2) : 0;
    
    document.getElementById('modal-camp-cpa').textContent = cpa + '€';
    document.getElementById('modal-camp-cpc').textContent = cpc + '€';
    document.getElementById('modal-camp-ctr').textContent = ctr + '%';
    
    const adsetsContainer = document.getElementById('modal-adsets-container');
    if (adsetsContainer) {
        adsetsContainer.innerHTML = '';
        const campaignAds = currentAdsList.filter(ad => ad.campaign_id === camp.campaign_id);
        
        if (campaignAds.length > 0) {
            const adSetMap = {};
            campaignAds.forEach(ad => {
                if (!adSetMap[ad.adset_id]) {
                    adSetMap[ad.adset_id] = { name: ad.adset_name, spend: 0, imp: 0, clicks: 0, purchases: 0, ads: [] };
                }
                adSetMap[ad.adset_id].ads.push(ad);
                adSetMap[ad.adset_id].spend += parseFloat(ad.spend || 0);
                adSetMap[ad.adset_id].imp += parseInt(ad.impressions || 0);
                adSetMap[ad.adset_id].clicks += parseInt(ad.clicks || 0);
                
                let p = 0;
                if (ad.actions) {
                    const pa = ad.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                    if (pa) p = parseInt(pa.value);
                }
                adSetMap[ad.adset_id].purchases += p;
            });

            for (const [adsetId, adset] of Object.entries(adSetMap)) {
                const asCpa = adset.purchases > 0 ? (adset.spend / adset.purchases).toFixed(2) : 0;
                const asCpc = adset.clicks > 0 ? (adset.spend / adset.clicks).toFixed(2) : 0;
                const asCtr = adset.imp > 0 ? ((adset.clicks / adset.imp) * 100).toFixed(2) : 0;
                
                const adsetEl = document.createElement('div');
                adsetEl.className = 'adset-item';
                
                const header = document.createElement('div');
                header.className = 'adset-header';
                header.innerHTML = `
                    <div>
                        <div style="margin-bottom: 5px; font-size: 1.05em; color: white;">${adset.name || 'Unknown Ad Set'}</div>
                        <div class="adset-stats">
                            <span>Spend: ${adset.spend.toFixed(2)}€</span>
                            <span>CPA: ${asCpa}€</span>
                            <span>CPC: ${asCpc}€</span>
                            <span>CTR: ${asCtr}%</span>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-down"></i>
                `;
                
                const body = document.createElement('div');
                body.className = 'adset-body';
                
                adset.ads.forEach(ad => {
                    const creative = currentAdCreativesMap[ad.ad_id] || {};
                    const copyText = creative.body || 'No description';
                    const titleText = creative.title || 'No title';
                    
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
                    if (ad.actions) {
                        const pa = ad.actions.find(a => a.action_type === 'purchase' || a.action_type === 'omni_purchase');
                        if (pa) adPurchases = parseInt(pa.value);
                    }
                    const adCpa = adPurchases > 0 ? (adSpend / adPurchases).toFixed(2) : 0;
                    const adCpc = adClicks > 0 ? (adSpend / adClicks).toFixed(2) : 0;
                    const adCtr = adImp > 0 ? ((adClicks / adImp) * 100).toFixed(2) : 0;
                    
                    const adEl = document.createElement('div');
                    adEl.className = 'ad-item';
                    adEl.innerHTML = \`
                        <div class="ad-header">${ad.ad_name || ad.ad_id}</div>
                        <div class="ad-stats">
                            <span>Spend: ${adSpend.toFixed(2)}€</span>
                            <span>Imp: ${adImp}</span>
                            <span>Clicks: ${adClicks}</span>
                            <span>Purchases: ${adPurchases}</span>
                            <span>CPA: ${adCpa}€</span>
                            <span>CPC: ${adCpc}€</span>
                            <span>CTR: ${adCtr}%</span>
                        </div>
                        <div class="ad-details">
                            <p><strong>Title:</strong> ${titleText}</p>
                            <p><strong>Description:</strong> ${copyText.substring(0, 150)}${copyText.length > 150 ? '...' : ''}</p>
                            \${link ? \`<p><strong>Link:</strong> <a href="\${link}" target="_blank" class="ad-link">\${link}</a></p>\` : ''}
                        </div>
                    \`;
                    body.appendChild(adEl);
                });
                
                header.onclick = () => {
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

    document.getElementById('campaignModal').style.display = 'block';
}

function closeCampaignModal() {
    document.getElementById('campaignModal').style.display = 'none';
}

document.getElementById('btn-analyze-campaign').addEventListener('click', () => {
    if (!currentSelectedCampaign) return;
    analyzeCampaignWithAI(currentSelectedCampaign);
});

async function analyzeCampaignWithAI(campData) {
    // We purposefully do NOT close the campaign modal here based on user request.


    const budgetEl = document.getElementById('modal-daily-budget');
    const budgetText = budgetEl ? budgetEl.textContent : 'N/A';

    const status = campData.camp.budget_info ? campData.camp.budget_info.status : 'UNKNOWN';
    let datesText = 'Ongoing';
    if (campData.camp.budget_info && campData.camp.budget_info.start_time) {
        const start = new Date(campData.camp.budget_info.start_time).toLocaleDateString();
        const end = campData.camp.budget_info.stop_time ? new Date(campData.camp.budget_info.stop_time).toLocaleDateString() : 'Ongoing';
        datesText = `${start} to ${end}`;
    }

    const campStatsText = `
**Currently Selected Campaign Stats:**
Campaign Name: ${campData.camp.campaign_name}
Campaign ID: ${campData.camp.campaign_id}
Status: ${status}
Duration: ${datesText}
Budget: ${budgetText}
Spend: ${campData.spend.toFixed(2)}€
Impressions: ${campData.imp}
Clicks: ${campData.clicks}
Purchases: ${campData.purchases}
CPC: ${campData.clicks > 0 ? (campData.spend / campData.clicks).toFixed(2) : 0}€
CPA: ${campData.purchases > 0 ? (campData.spend / campData.purchases).toFixed(2) : 0}€
CTR: ${campData.imp > 0 ? ((campData.clicks / campData.imp) * 100).toFixed(2) : 0}%`;

    let adsText = '\n\n**Ad Sets & Ads Details:**\n';
    const campaignAds = currentAdsList.filter(ad => ad.campaign_id === campData.camp.campaign_id);
    
    if (campaignAds.length === 0) {
        adsText += 'No granular ads data available for this campaign.\n';
    } else {
        const adSetMap = {};
        campaignAds.forEach(ad => {
            if (!adSetMap[ad.adset_id]) adSetMap[ad.adset_id] = { name: ad.adset_name, ads: [] };
            adSetMap[ad.adset_id].ads.push(ad);
        });
        
        for (const [adsetId, adset] of Object.entries(adSetMap)) {
            adsText += `\nAd Set: ${adset.name || adsetId}\n`;
            adset.ads.forEach(ad => {
                const creative = currentAdCreativesMap[ad.ad_id] || {};
                const copyText = creative.body ? `\n   Ad Copy: "${creative.body}"` : '';
                const titleText = creative.title ? `\n   Ad Title: "${creative.title}"` : '';
                
                let link = '';
                if (creative.object_story_spec && creative.object_story_spec.link_data && creative.object_story_spec.link_data.link) {
                    link = creative.object_story_spec.link_data.link;
                } else if (creative.object_story_spec && creative.object_story_spec.video_data && creative.object_story_spec.video_data.call_to_action && creative.object_story_spec.video_data.call_to_action.value) {
                    link = creative.object_story_spec.video_data.call_to_action.value.link;
                } else if (creative.asset_feed_spec && creative.asset_feed_spec.link_urls && creative.asset_feed_spec.link_urls.length > 0) {
                    link = creative.asset_feed_spec.link_urls[0].website_url;
                }
                const destLinkText = link ? `\n   Dest Link: ${link}` : '';
                
                adsText += ` - Ad: ${ad.ad_name || ad.ad_id} | Spend: ${ad.spend || 0}€ | Imp: ${ad.impressions || 0} | Clicks: ${ad.clicks || 0}${titleText}${copyText}${destLinkText}\n`;
            });
        }
    }

    const fullContext = campStatsText + adsText;

    if (window.updateCopilotContext) {
        const customPrompt = "Please act as an expert Meta Ads Media Buyer. Analyze the performance of this specific campaign AND its individual Ad Sets and Ads (including Ad Copy/Title performance) based on the context data provided. Tell me what is working well, what is underperforming, and give 3 highly actionable pieces of advice to improve the creatives and targeting based on CPC, CPA, and CTR.";
        window.updateCopilotContext(fullContext, customPrompt);
    }
}
