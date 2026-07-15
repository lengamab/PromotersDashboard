const META_ACCOUNT_ID = 'act_911535275086772';
const META_ACCESS_TOKEN = 'EAAMlAfQc4LsBR18bIHU1HG9VaGgmHrcu9vXtRrlLnoqHYnJiuAjdgyGTJ89q37NvYu4XjZAVjiz47WPUVOjJpYF58HtvOXJZCHLI4wk1c5ViRTzFZANZCNFoWnCZBdM0ZBwcTFqlS5IBWPwZCJcZBQPw2IqAfmgROp93elmCe9CZAEj4KXbqmOLf6MckZBONfOZA5AZD';
let GEMINI_API_KEY = 'AQ.Ab8RN6IgzUweVqfl0oB-C7TVuYVTm90clJZKEnYxblYv2trAqA';

let adsChartInstance = null;
let hourlyChartInstance = null;
let currentAdsData = [];
let currentHourlyData = [];
let currentCampaignsData = [];
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
        const [res, hourlyRes, campRes] = await Promise.all([
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
            }).toString()}`)
        ]);
        
        const json = await res.json();
        const hourlyJson = await hourlyRes.json();
        const campJson = await campRes.json();
        
        if (json.error) {
            console.error("Meta API Error:", json.error);
            alert("Meta API Error: " + json.error.message);
            return;
        }

        currentAdsData = json.data || [];
        currentHourlyData = hourlyJson.data || [];
        currentCampaignsData = campJson.data || [];
        
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

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.style.cursor = 'pointer';
            tr.onmouseover = () => tr.style.background = 'rgba(255,255,255,0.05)';
            tr.onmouseout = () => tr.style.background = 'transparent';
            
            tr.innerHTML = `
                <td style="padding: 15px 20px; font-weight: 500;">${camp.campaign_name}</td>
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
    if (!GEMINI_API_KEY) {
        alert("Please provide your Gemini API Key first so I can add it to the code.");
        return;
    }

    if (currentAdsData.length === 0) {
        alert("No ad data available to analyze. Please wait for data to load.");
        return;
    }

    document.getElementById('aiModal').style.display = 'block';
    document.getElementById('ai-loading').style.display = 'block';
    document.getElementById('ai-result').style.display = 'none';
    document.getElementById('ai-result').innerHTML = '';

    const prompt = `
You are an expert digital marketing analyst for a nightlife and event promotion company called "La French Barcelona".
Please analyze the following Meta Ads performance data and provide a concise, actionable report in Markdown format.

**Overall Summary for the selected period:**
- Total Spend: ${currentSummary.spend.toFixed(2)}€
- Impressions: ${currentSummary.impressions}
- Link Clicks: ${currentSummary.clicks}
- Purchases (Conversions): ${currentSummary.purchases}
- CPC (Cost Per Click): ${currentSummary.cpc}€
- CTR (Click-Through Rate): ${currentSummary.ctr}%

**Daily Breakdown:**
${currentAdsData.map(d => `- ${d.date_start}: Spend ${parseFloat(d.spend || 0).toFixed(2)}€, Clicks ${d.clicks || 0}`).join('\n')}

**Please structure your response with:**
1. **Performance Overview**: A quick summary of how the ads are doing.
2. **Key Anomalies/Trends**: Notice any spikes or dips in spend vs. clicks?
3. **Actionable Recommendations**: Give 2-3 specific recommendations on how to improve ROI/ROAS for event ticket sales based on this data. Keep it highly relevant to nightlife/club events.
`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const json = await response.json();
        
        if (json.error) {
            throw new Error(json.error.message);
        }

        const aiText = json.candidates[0].content.parts[0].text;
        
        document.getElementById('ai-loading').style.display = 'none';
        document.getElementById('ai-result').style.display = 'block';
        document.getElementById('ai-result').innerHTML = marked.parse(aiText);

    } catch (e) {
        console.error(e);
        document.getElementById('ai-loading').style.display = 'none';
        document.getElementById('ai-result').style.display = 'block';
        document.getElementById('ai-result').innerHTML = `<p style="color: red;">Request failed: ${e.message}</p>`;
    }
}

let currentSelectedCampaign = null;

function openCampaignModal(camp, spend, imp, clicks, purchases) {
    currentSelectedCampaign = { camp, spend, imp, clicks, purchases };
    document.getElementById('modal-campaign-name').textContent = camp.campaign_name;
    document.getElementById('modal-camp-spend').textContent = spend.toFixed(2) + '€';
    document.getElementById('modal-camp-purchases').textContent = purchases.toLocaleString();
    
    const cpa = purchases > 0 ? (spend / purchases).toFixed(2) : 0;
    const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : 0;
    const ctr = imp > 0 ? ((clicks / imp) * 100).toFixed(2) : 0;
    
    document.getElementById('modal-camp-cpa').textContent = cpa + '€';
    document.getElementById('modal-camp-cpc').textContent = cpc + '€';
    document.getElementById('modal-camp-ctr').textContent = ctr + '%';
    
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
    if (!GEMINI_API_KEY) {
        alert("Please provide your Gemini API Key first.");
        return;
    }

    closeCampaignModal();
    document.getElementById('aiModal').style.display = 'block';
    document.getElementById('ai-loading').style.display = 'block';
    document.getElementById('ai-result').innerHTML = '';

    const campStatsText = `
Campaign Name: ${campData.camp.campaign_name}
Spend: ${campData.spend.toFixed(2)}€
Impressions: ${campData.imp}
Clicks: ${campData.clicks}
Purchases: ${campData.purchases}
CPC: ${campData.clicks > 0 ? (campData.spend / campData.clicks).toFixed(2) : 0}€
CPA: ${campData.purchases > 0 ? (campData.spend / campData.purchases).toFixed(2) : 0}€
CTR: ${campData.imp > 0 ? ((campData.clicks / campData.imp) * 100).toFixed(2) : 0}%
    `;

    const accountStatsText = `
Account Total Spend: ${currentSummary.spend.toFixed(2)}€
Account Total Impressions: ${currentSummary.impressions}
Account Total Clicks: ${currentSummary.clicks}
Account Total Purchases: ${currentSummary.purchases}
Account Average CPC: ${currentSummary.cpc}€
Account Average CTR: ${currentSummary.ctr}%
    `;

    const prompt = `You are an expert Meta Ads media buyer. The user has selected a specific ad campaign to analyze.
Here are the stats for this specific campaign over the selected date range:
${campStatsText}

And for comparison, here are the overall account averages over the same period:
${accountStatsText}

Analyze the performance of this specific campaign compared to the account average. 
Tell the user what is working well, what is underperforming, and give 3 highly actionable pieces of advice to improve this specific campaign. 
Use Markdown to format your response beautifully. Do not output anything other than your analysis.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        document.getElementById('ai-loading').style.display = 'none';

        if (data.error) {
            document.getElementById('ai-result').innerHTML = `<p style="color: red;">Error: ${data.error.message}</p>`;
            return;
        }

        const text = data.candidates[0].content.parts[0].text;
        document.getElementById('ai-result').innerHTML = marked.parse(text);

    } catch (e) {
        document.getElementById('ai-loading').style.display = 'none';
        document.getElementById('ai-result').innerHTML = `<p style="color: red;">Request failed: ${e.message}</p>`;
    }
}
