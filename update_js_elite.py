import re

with open('frontend/app.js', 'r') as f:
    js = f.read()

# 1. Inject animateValue
animate_func = '''
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
'''

if 'function animateValue' not in js:
    js = js.replace('// DOM Elements', animate_func + '\n// DOM Elements')

# 2. Apply to loadData() cash stats
js = re.sub(
    r'statTotal\.textContent = `\$\{\(data\.total_gathered \|\| 0\)\.toFixed\(2\)\}€`;',
    'animateValue(statTotal, 0, data.total_gathered || 0, 1500, true);',
    js
)
js = re.sub(
    r'statCommission\.textContent = `\$\{\(data\.total_commission \|\| 0\)\.toFixed\(2\)\}€`;',
    'animateValue(statCommission, 0, data.total_commission || 0, 1500, true);',
    js
)
js = re.sub(
    r'statNetDue\.textContent = `\$\{\(data\.total_net_due \|\| 0\)\.toFixed\(2\)\}€`;',
    'animateValue(statNetDue, 0, data.total_net_due || 0, 1500, true);',
    js
)
js = re.sub(
    r'statReturned\.textContent = `\$\{\(data\.total_returned \|\| 0\)\.toFixed\(2\)\}€`;',
    'animateValue(statReturned, 0, data.total_returned || 0, 1500, true);',
    js
)
js = re.sub(
    r'statPending\.textContent = `\$\{\(data\.total_pending \|\| 0\)\.toFixed\(2\)\}€`;',
    'animateValue(statPending, 0, data.total_pending || 0, 1500, true);',
    js
)

# 3. Apply to loadData() online stats
js = re.sub(
    r'statTotal\.textContent = `\$\{\(data\.total_sales \|\| 0\)\.toFixed\(2\)\}€`;',
    'animateValue(statTotal, 0, data.total_sales || 0, 1500, true);',
    js
)
js = re.sub(
    r'statCommission\.textContent = `\$\{\(data\.total_commission_owed \|\| 0\)\.toFixed\(2\)\}€`;',
    'animateValue(statCommission, 0, data.total_commission_owed || 0, 1500, true);',
    js
)
js = re.sub(
    r'statNetDue\.textContent = `\$\{\(data\.total_commission_owed \|\| 0\)\.toFixed\(2\)\}€`;',
    'animateValue(statNetDue, 0, data.total_commission_owed || 0, 1500, true);',
    js
)
js = re.sub(
    r'statReturned\.textContent = `\$\{\(data\.total_paid \|\| 0\)\.toFixed\(2\)\}€`;',
    'animateValue(statReturned, 0, data.total_paid || 0, 1500, true);',
    js
)
# Note: pending is already covered but let's be safe.

# 4. Replace basic Loading spinner with skeleton loader in tracking table
skeleton_row = '''
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
'''
# Using regex to replace loading state
js = re.sub(
    r'<tr>\s*<td colspan="\d+" class="loading-state">\s*<i class="fa-solid fa-spinner fa-spin"></i> Loading[^\n]*\n\s*</td>\s*</tr>',
    skeleton_row + skeleton_row + skeleton_row,
    js
)

with open('frontend/app.js', 'w') as f:
    f.write(js)
print("JS Elite upgrade applied.")
