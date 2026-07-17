function renderBudget(container) {
    var user = AUTH.currentUser();
    if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) {
        container.innerHTML = '<div class="empty-state">Access restricted to admin</div>';
        return;
    }
    var config = DB.get('budgetConfig') || {};
    container.innerHTML = '\
        <div class="flex-between mb-4">\
            <h2 style="font-size:18px;font-weight:700;">💰 Budget Management</h2>\
        </div>\
        <div class="card">\
            <div class="card-header"><h3>Set Total Budget</h3></div>\
            <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;">\
                <div class="form-group" style="flex:1;min-width:200px;">\
                    <label>Fiscal Year</label>\
                    <input type="text" id="bdgYear" class="form-control" value="' + (config.fiscalYear || new Date().getFullYear() + '-' + (new Date().getFullYear()+1)) + '">\
                </div>\
                <div class="form-group" style="flex:1;min-width:200px;">\
                    <label>Total Budget (₹)</label>\
                    <input type="number" id="bdgTotal" class="form-control" value="' + (config.totalBudget || 0) + '" step="0.01">\
                </div>\
                <div class="form-group" style="flex:1;min-width:200px;">\
                    <label>Maintenance Budget (₹)</label>\
                    <input type="number" id="bdgMaint" class="form-control" value="' + (config.maintenanceBudget || 0) + '" step="0.01">\
                </div>\
                <button class="btn btn-primary" onclick="saveBudgetConfig()" style="margin-bottom:16px;">Save Budget</button>\
            </div>\
        </div>\
        <div class="card">\
            <div class="card-header"><h3>📊 Budget vs Expense Overview</h3></div>\
            <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">\
                <button class="btn btn-sm ' + (budgetPeriod === 'weekly' ? 'btn-primary' : 'btn-outline') + '" onclick="switchBudgetPeriod(\'weekly\')">Weekly</button>\
                <button class="btn btn-sm ' + (budgetPeriod === 'monthly' ? 'btn-primary' : 'btn-outline') + '" onclick="switchBudgetPeriod(\'monthly\')">Monthly</button>\
                <button class="btn btn-sm ' + (budgetPeriod === 'quarterly' ? 'btn-primary' : 'btn-outline') + '" onclick="switchBudgetPeriod(\'quarterly\')">Quarterly</button>\
                <button class="btn btn-sm ' + (budgetPeriod === 'yearly' ? 'btn-primary' : 'btn-outline') + '" onclick="switchBudgetPeriod(\'yearly\')">Yearly</button>\
            </div>\
            <div id="bdgOverview"></div>\
        </div>\
        <div class="card">\
            <div class="card-header"><h3>📋 Expense Breakdown</h3></div>\
            <div id="bdgExpenseTable"></div>\
        </div>\
    ';
    renderBudgetOverview();
    renderExpenseBreakdown();
}

var budgetPeriod = 'monthly';

function switchBudgetPeriod(period) {
    budgetPeriod = period;
    var container = document.getElementById('pageContent');
    if (container) renderBudget(container);
}

function saveBudgetConfig() {
    var year = document.getElementById('bdgYear')?.value?.trim();
    var total = parseFloat(document.getElementById('bdgTotal')?.value) || 0;
    var maint = parseFloat(document.getElementById('bdgMaint')?.value) || 0;
    if (!year) { APP.notify('Enter fiscal year', 'error'); return; }
    if (total <= 0) { APP.notify('Enter a valid total budget', 'error'); return; }
    var existing = DB.get('budgetConfig') || {};
    existing.fiscalYear = year;
    existing.totalBudget = total;
    existing.maintenanceBudget = maint;
    existing.updatedAt = new Date().toISOString();
    existing.updatedBy = AUTH.currentUser()?.fullName || 'admin';
    existing.id = existing.id || 'budget_main';
    if (existing.id === 'budget_main') {
        var all = DB.get('budgetConfig');
        if (!all || typeof all !== 'object') {
            DB.set('budgetConfig', existing);
        } else {
            Object.assign(all, existing);
            DB.set('budgetConfig', all);
        }
    }
    APP.notify('Budget saved', 'success');
}

function computeExpenses(fromDate, toDate) {
    var from = fromDate ? new Date(fromDate) : new Date(0);
    var to = toDate ? new Date(toDate) : new Date(864e13);
    var inRange = function(d) { if (!d) return true; var dt = new Date(d); return dt >= from && dt <= to; };

    var materialPurchase = 0, materialUsage = 0, maintenanceCost = 0, ambulanceFare = 0, projectSpent = 0;
    var materialPurchaseItems = [], maintenanceItems = [];

    var receipts = DB.get('inventory_receipts') || [];
    receipts.filter(function(r) { return inRange(r.createdAt); }).forEach(function(r) {
        var t = parseFloat(r.total) || 0;
        materialPurchase += t;
        materialPurchaseItems.push({ date: r.createdAt, desc: r.itemName + ' (x' + r.quantity + ')', amount: t, category: 'Material Purchase' });
    });

    var phase2 = DB.get('phase2') || [];
    phase2.filter(function(e) { return inRange(e.createdAt); }).forEach(function(e) {
        var q = parseFloat(e.quantity) || 0;
        if (e.direction === 'in') {
            materialPurchase += q;
            materialPurchaseItems.push({ date: e.createdAt, desc: 'Phase 2: ' + (e.materialName || 'Material') + ' IN', amount: q, category: 'Material Purchase' });
        } else {
            materialUsage += q;
            materialPurchaseItems.push({ date: e.createdAt, desc: 'Phase 2: ' + (e.materialName || 'Material') + ' OUT', amount: q, category: 'Material Usage' });
        }
    });

    var inventory = DB.get('inventory') || [];
    inventory.forEach(function(i) {
        var q = parseFloat(i.quantity) || 0;
        var p = parseFloat(i.price) || 0;
        var val = q * p;
        if (val > 0) {
            materialUsage += val;
        }
    });

    var problems = DB.get('problems') || [];
    problems.filter(function(p) { return inRange(p.createdAt); }).forEach(function(p) {
        var cost = parseFloat(p.maintenanceCost || p.cost || 0);
        if (cost > 0) {
            maintenanceCost += cost;
            maintenanceItems.push({ date: p.createdAt, desc: p.title || 'Maintenance', amount: cost, category: 'Maintenance' });
        }
    });

    var trips = DB.get('ambulance_trips') || [];
    trips.filter(function(t) { return inRange(t.createdAt); }).forEach(function(t) {
        var f = parseFloat(t.fare) || 0;
        ambulanceFare += f;
    });

    var projects = DB.get('projects') || [];
    projects.filter(function(p) { return inRange(p.updatedAt); }).forEach(function(p) {
        var s = parseFloat(p.spent) || 0;
        projectSpent += s;
    });

    var totalExpense = materialPurchase + maintenanceCost + ambulanceFare + projectSpent;

    return {
        materialPurchase: materialPurchase,
        materialUsage: materialUsage,
        maintenanceCost: maintenanceCost,
        ambulanceFare: ambulanceFare,
        projectSpent: projectSpent,
        totalExpense: totalExpense,
        items: materialPurchaseItems.concat(maintenanceItems)
    };
}

function getPeriodRange(period, now) {
    now = now || new Date();
    var y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
    var ranges = [];
    if (period === 'weekly') {
        var start = new Date(now);
        start.setDate(d - start.getDay());
        start.setHours(0,0,0,0);
        var end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23,59,59,999);
        ranges.push({ label: 'This Week', start: start.toISOString(), end: end.toISOString() });
    } else if (period === 'monthly') {
        for (var i = 0; i < 12; i++) {
            var sm = new Date(y, i, 1);
            var em = new Date(y, i + 1, 0, 23, 59, 59, 999);
            ranges.push({ label: sm.toLocaleString('en', { month: 'short' }) + ' ' + y, start: sm.toISOString(), end: em.toISOString() });
        }
    } else if (period === 'quarterly') {
        var quarters = [['Q1 (Jan-Mar)',0,2],['Q2 (Apr-Jun)',3,5],['Q3 (Jul-Sep)',6,8],['Q4 (Oct-Dec)',9,11]];
        quarters.forEach(function(q) {
            var sm = new Date(y, q[1], 1);
            var em = new Date(y, q[2] + 1, 0, 23, 59, 59, 999);
            ranges.push({ label: q[0] + ' ' + y, start: sm.toISOString(), end: em.toISOString() });
        });
    } else {
        ranges.push({ label: String(y), start: new Date(y, 0, 1).toISOString(), end: new Date(y, 11, 31, 23, 59, 59, 999).toISOString() });
    }
    return ranges;
}

function renderBudgetOverview() {
    var el = document.getElementById('bdgOverview');
    if (!el) return;
    var config = DB.get('budgetConfig') || {};
    var totalBudget = parseFloat(config.totalBudget) || 0;
    var maintBudget = parseFloat(config.maintenanceBudget) || 0;
    var now = new Date();
    var ranges = getPeriodRange(budgetPeriod, now);
    var periodExpenses = 0;
    ranges.forEach(function(r) {
        if (new Date(r.end) <= now) {
            var e = computeExpenses(r.start, r.end);
            periodExpenses += e.totalExpense;
        }
    });
    var latestRanges = getPeriodRange(budgetPeriod, now);
    var latest = latestRanges[latestRanges.length - 1];
    var currentExp = computeExpenses(latest.start, latest.end);

    var utilization = totalBudget > 0 ? Math.round((currentExp.totalExpense / totalBudget) * 100) : 0;
    var remaining = totalBudget - currentExp.totalExpense;

    el.innerHTML = '\
        <div class="grid-4" style="margin-top:8px;">\
            <div class="stat-card"><div class="stat-value">₹' + totalBudget.toLocaleString() + '</div><div class="stat-label">Total Budget</div></div>\
            <div class="stat-card"><div class="stat-value" style="color:' + (utilization > 80 ? '#ea4335' : utilization > 50 ? '#fbbc04' : '#34a853') + ';">₹' + currentExp.totalExpense.toLocaleString() + '</div><div class="stat-label">' + latest.label + ' Expense</div></div>\
            <div class="stat-card"><div class="stat-value">₹' + remaining.toLocaleString() + '</div><div class="stat-label">Remaining</div></div>\
            <div class="stat-card"><div class="stat-value">' + utilization + '%</div><div class="stat-label">Utilized</div></div>\
        </div>\
        <div class="progress-bar" style="margin-top:12px;height:24px;border-radius:12px;">\
            <div class="progress-fill ' + (utilization > 80 ? 'red' : utilization > 50 ? 'yellow' : 'green') + '" style="width:' + Math.min(100, utilization) + '%;line-height:24px;font-size:12px;font-weight:600;color:#fff;text-align:center;">' + utilization + '%</div>\
        </div>\
    ';
}

function renderExpenseBreakdown() {
    var el = document.getElementById('bdgExpenseTable');
    if (!el) return;
    var config = DB.get('budgetConfig') || {};
    var totalBudget = parseFloat(config.totalBudget) || 0;
    var now = new Date();
    var ranges = getPeriodRange(budgetPeriod, now);
    var rows = '';
    var grandTotal = 0;
    var allItems = [];

    ranges.forEach(function(r) {
        if (new Date(r.end) > now && budgetPeriod !== 'yearly') return;
        var e = computeExpenses(r.start, r.end);
        grandTotal += e.totalExpense;
        allItems = allItems.concat(e.items);
        rows += '<tr><td><strong>' + r.label + '</strong></td>\
            <td>₹' + e.materialPurchase.toFixed(2) + '</td>\
            <td>₹' + e.materialUsage.toFixed(2) + '</td>\
            <td>₹' + e.maintenanceCost.toFixed(2) + '</td>\
            <td>₹' + e.ambulanceFare.toFixed(2) + '</td>\
            <td>₹' + e.projectSpent.toFixed(2) + '</td>\
            <td><strong>₹' + e.totalExpense.toFixed(2) + '</strong></td></tr>';
    });

    el.innerHTML = '\
        <div class="table-responsive">\
            <table><thead><tr>\
                <th>Period</th><th>Material Purchase</th><th>Material Usage</th><th>Maintenance</th><th>Ambulance Fare</th><th>Project Spent</th><th>Total</th>\
            </tr></thead><tbody>' + rows + '</tbody></table>\
        </div>\
        ' + (allItems.length ? '\
        <div style="margin-top:16px;">\
            <h4 style="font-size:14px;margin-bottom:8px;">📋 All Transactions</h4>\
            <div class="table-responsive" style="max-height:300px;overflow-y:auto;">\
                <table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead><tbody>' + \
            allItems.slice().reverse().map(function(i) { return '<tr><td>' + APP.formatDate(i.date) + '</td><td>' + i.desc + '</td><td>' + i.category + '</td><td>₹' + i.amount.toFixed(2) + '</td></tr>'; }).join('') + \
            '</tbody></table></div></div>' : '') + '\
    ';
}
