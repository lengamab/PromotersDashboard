let adsChartInstance = null;
let currentAdsData = [];
let currentSummary = {};

document.addEventListener('DOMContentLoaded', () => {
    // Setup date filters
    const today = new Date();
    const last30 = new Date();
    last30.setDate(today.getDate() - 30);
    
    document.getElementById('date-from').value = last30.toISOString().split('T')[0];
    document.getElementById('date-to').value = today.toISOString().split('T')[0];

    // Load API Keys
    const accountId = localStorage.getItem('meta_account_id');
    const token = localStorage.getItem('meta_access_token');
    const gemini = localStorage.getItem('gemini_api_key');

    if (accountId) document.getElementById('meta-account-id').value = accountId;
    if (token) document.getElementById('meta-access-token').value = token;
    if (gemini) document.getElementById('gemini-api-key').value = gemini;

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
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
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        fetchAdsData();
    });

    if (!accountId || !token) {
        openSettings();
    } else {
        fetchAdsData();
    }
});

function openSettings() {
    document.getElementById('settingsModal').style.display = 'block';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function saveSettings() {
    const actId = document.getElementById('meta-account-id').value.trim();
    const token = document.getElementById('meta-access-token').value.trim();
    const gemini = document.getElementById('gemini-api-key').value.trim();

    // Make sure it starts with act_
    const finalActId = actId.startsWith('act_') ? actId : 'act_' + actId;

    localStorage.setItem('meta_account_id', finalActId);
    localStorage.setItem('meta_access_token', token);
    localStorage.setItem('gemini_api_key', gemini);

    closeSettings();
    fetchAdsData();
}

async function fetchAdsData() {
    const actId = localStorage.getItem('meta_account_id');
    const token = localStorage.getItem('meta_access_token');

    if (!actId || !token) return;

    const fromDate = document.getElementById('date-from').value;
    const toDate = document.getElementById('date-to').value;

    const url = `https://graph.facebook.com/v19.0/${actId}/insights`;
    const params = new URLSearchParams({
        access_token: token,
        level: 'account',
        time_range: JSON.stringify({ since: fromDate, until: toDate }),
        time_increment: 1, // Daily
        fields: 'spend,impressions,clicks,actions'
    });

    try {
        const res = await fetch(`${url}?${params.toString()}`);
        const json = await res.json();
        
        if (json.error) {
            console.error("Meta API Error:", json.error);
            alert("Meta API Error: " + json.error.message);
            return;
        }

        currentAdsData = json.data || [];
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

    currentAdsData.forEach(day => {
        labels.push(day.date_start);
        
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
    });

    // Update Cards
    document.getElementById('stat-spend').textContent = totalSpend.toFixed(2) + '€';
    document.getElementById('stat-impressions').textContent = totalImpressions.toLocaleString();
    document.getElementById('stat-clicks').textContent = totalClicks.toLocaleString();
    document.getElementById('stat-purchases').textContent = totalPurchases.toLocaleString();

    currentSummary = {
        spend: totalSpend,
        impressions: totalImpressions,
        clicks: totalClicks,
        purchases: totalPurchases,
        cpc: totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : 0,
        ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0
    };

    // Render Chart
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
}

function closeAiModal() {
    document.getElementById('aiModal').style.display = 'none';
}

async function analyzeWithAI() {
    const geminiKey = localStorage.getItem('gemini_api_key');
    if (!geminiKey) {
        alert("Please set your Gemini API Key in the settings (Setup APIs) first.");
        openSettings();
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`, {
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
        document.getElementById('ai-result').innerHTML = `<div style="color: #FF6B6B;"><strong>Error analyzing data:</strong> ${e.message}</div>`;
    }
}
