import re

with open('frontend/app.js', 'r') as f:
    js = f.read()

# 1. Add global state variables near the top
globals_code = """// Pagination State
let currentSalesPage = 1;
const salesPerPage = 50;
let cachedSalesData = [];

// DOM Elements"""
js = js.replace('// DOM Elements', globals_code)

# 2. Add the rendering and changing page functions
pagination_funcs = """
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
        return `
            <tr class="table-row" style="${rowStyle}">
                <td data-label="Sale Date" style="font-family: var(--font-mono); font-size: 13px;">${item.sale_date}</td>
                <td data-label="Event" class="clickable-cell" onclick="openEventProfile('${item.event_id}', '${item.event_name.replace(/'/g, "\\'")}', '${item.event_date}')">
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
"""
if 'function renderSalesPage' not in js:
    js = js.replace('// Update paid online amount', pagination_funcs + '\n// Update paid online amount')

# 3. Update loadSalesHistory to just cache and call renderSalesPage
old_render_logic_pattern = r'if \(sales\.length === 0\) \{[\s\S]*?\}\)\.join\(\'\'\);'
new_render_logic = '''cachedSalesData = sales;
            
            // Re-render the current page to preserve user context during background refreshes
            renderSalesPage(currentSalesPage);'''

js = re.sub(old_render_logic_pattern, new_render_logic, js)

with open('frontend/app.js', 'w') as f:
    f.write(js)

print("JS paginated successfully")
