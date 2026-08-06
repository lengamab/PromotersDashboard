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
                const prompt = "Please generate a Synergy Report connecting my Instagram organic growth with my Meta Ads and Fourvenues ticket sales. Analyze which types of content or campaigns are driving the most value.";
                window.updateCopilotContext(window.currentInstagramContext || "Instagram dashboard data is loading...", prompt, "instagram_dashboard");
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
        // Fetch 28 day reach and impressions
        const insightsRes = await fetch(`${IG_API_BASE}/${igAccountId}/insights?metric=impressions,reach,profile_views&period=day`);
        const insightsData = await insightsRes.json();
        
        if (insightsData.data) {
            // Sum up the last 28 days for reach
            let totalReach = 0;
            let totalViews = 0;
            
            const reachData = insightsData.data.find(m => m.name === 'reach');
            const viewsData = insightsData.data.find(m => m.name === 'profile_views');
            
            if (reachData && reachData.values) {
                totalReach = reachData.values.reduce((sum, val) => sum + val.value, 0);
                document.getElementById('kpi-reach').textContent = totalReach.toLocaleString();
                if(window.currentInstagramContext) window.currentInstagramContext += `Account Reach (last 28d): ${totalReach}\n`;
            } else {
                 document.getElementById('kpi-reach').textContent = "N/A";
            }
            
            if (viewsData && viewsData.values) {
                totalViews = viewsData.values.reduce((sum, val) => sum + val.value, 0);
                document.getElementById('kpi-profile-views').textContent = totalViews.toLocaleString();
                if(window.currentInstagramContext) window.currentInstagramContext += `Profile Views (last 28d): ${totalViews}\n\n`;
            } else {
                 document.getElementById('kpi-profile-views').textContent = "N/A";
            }
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
        
    } catch (error) {
        console.error("Error loading media:", error);
        grid.innerHTML = `<div style="padding: 40px; text-align: center; width: 100%; grid-column: 1 / -1; color: #ff6b6b;">Error loading posts: ${error.message}</div>`;
    }
}
