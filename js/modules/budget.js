function renderBudget(container) {
    try {
        var user = AUTH.currentUser();
        if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) {
            container.innerHTML = '<div class="empty-state">Access restricted to admin</div>';
            return;
        }
        var config = DB.get('budgetConfig') || {};
        if (!config || typeof config !== 'object' || Array.isArray(config)) config = {};
        var fiscalYearVal = config.fiscalYear || (new Date().getFullYear() + '-' + (new Date().getFullYear() + 1));
        var totalBudgetVal = parseFloat(config.totalBudget) || 0;
        var maintBudgetVal = parseFloat(config.maintenanceBudget) || 0;

        container.innerHTML =
            '<div class="flex-between mb-4">' +
                '<h2 style="font-size:18px;font-weight:700;">\uD83D\uDCB0 Budget Management</h2>' +
                '<button class="btn btn-success" onclick="downloadBudgetExcel()">\u2B07 Download Excel</button>' +
            '</div>' +
            '<div class="card">' +
                '<div class="card-header"><h3>Set Total Budget</h3></div>' +
                '<div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;">' +
                    '<div class="form-group" style="flex:1;min-width:200px;">' +
                        '<label>Fiscal Year</label>' +
                        '<input type="text" id="bdgYear" class="form-control" value="' + fiscalYearVal + '">' +
                    '</div>' +
                    '<div class="form-group" style="flex:1;min-width:200px;">' +
                        '<label>Total Budget (\u20B9)</label>' +
                        '<input type="number" id="bdgTotal" class="form-control" value="' + totalBudgetVal + '" step="0.01">' +
                    '</div>' +
                    '<div class="form-group" style="flex:1;min-width:200px;">' +
                        '<label>Maintenance Budget (\u20B9)</label>' +
                        '<input type="number" id="bdgMaint" class="form-control" value="' + maintBudgetVal + '" step="0.01">' +
                    '</div>' +
                    '<button class="btn btn-primary" onclick="saveBudgetConfig()" style="margin-bottom:16px;">Save Budget</button>' +
                '</div>' +
            '</div>' +
            '<div class="card">' +
                '<div class="card-header"><h3>\uD83D\uDCCA Budget vs Expense Overview</h3></div>' +
                '<div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">' +
                    '<button class="btn btn-sm ' + (budgetPeriod === 'weekly' ? 'btn-primary' : 'btn-outline') + '" onclick="switchBudgetPeriod(\'weekly\')">Weekly</button>' +
                    '<button class="btn btn-sm ' + (budgetPeriod === 'monthly' ? 'btn-primary' : 'btn-outline') + '" onclick="switchBudgetPeriod(\'monthly\')">Monthly</button>' +
                    '<button class="btn btn-sm ' + (budgetPeriod === 'quarterly' ? 'btn-primary' : 'btn-outline') + '" onclick="switchBudgetPeriod(\'quarterly\')">Quarterly</button>' +
                    '<button class="btn btn-sm ' + (budgetPeriod === 'yearly' ? 'btn-primary' : 'btn-outline') + '" onclick="switchBudgetPeriod(\'yearly\')">Yearly</button>' +
                '</div>' +
                '<div id="bdgOverview"></div>' +
            '</div>' +
            '<div class="card">' +
                '<div class="card-header"><h3>\uD83D\uDCCB Expense Breakdown</h3></div>' +
                '<div id="bdgExpenseTable"></div>' +
            '</div>';
        renderBudgetOverview();
        renderExpenseBreakdown();
    } catch (e) {
        console.error('renderBudget error:', e);
        container.innerHTML = '<div class="empty-state">Error loading budget: ' + e.message + '</div>';
    }
}

var budgetPeriod = 'monthly';

function switchBudgetPeriod(period) {
    budgetPeriod = period;
    var container = document.getElementById('pageContent');
    if (container) renderBudget(container);
}

function saveBudgetConfig() {
    try {
        var year = (document.getElementById('bdgYear') || {}).value || '';
        var total = parseFloat((document.getElementById('bdgTotal') || {}).value) || 0;
        var maint = parseFloat((document.getElementById('bdgMaint') || {}).value) || 0;
        if (!year) { APP.notify('Enter fiscal year', 'error'); return; }
        if (total <= 0) { APP.notify('Enter a valid total budget', 'error'); return; }
        var data = DB.get('budgetConfig');
        if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
        data.fiscalYear = year;
        data.totalBudget = total;
        data.maintenanceBudget = maint;
        data.updatedAt = new Date().toISOString();
        data.updatedBy = (AUTH.currentUser() || {}).fullName || 'admin';
        DB.set('budgetConfig', data);
        APP.notify('Budget saved', 'success');
    } catch (e) {
        console.error('saveBudgetConfig error:', e);
        APP.notify('Error saving budget', 'error');
    }
}

function computeExpenses(fromDate, toDate) {
    var from = fromDate ? new Date(fromDate) : new Date(0);
    var to = toDate ? new Date(toDate) : new Date(864e13);
    var inRange = function(d) { if (!d) return true; var dt = new Date(d); return dt >= from && dt <= to; };

    var materialPurchase = 0;
    var materialUsage = 0;
    var maintenanceCost = 0;
    var ambulanceFare = 0;
    var projectSpent = 0;
    var items = [];

    try {
        (DB.get('inventory_receipts') || []).forEach(function(r) {
            if (!inRange(r.createdAt)) return;
            var t = parseFloat(r.total) || 0;
            materialPurchase += t;
            items.push({ date: r.createdAt, desc: (r.itemName || 'Item') + ' x' + (r.quantity || 0), amount: t, category: 'Material Purchase' });
        });
    } catch(e) {}

    try {
        (DB.get('inventory') || []).forEach(function(i) {
            materialUsage += (parseFloat(i.quantity) || 0) * (parseFloat(i.price) || 0);
        });
    } catch(e) {}

    try {
        (DB.get('problems') || []).forEach(function(p) {
            if (!inRange(p.createdAt)) return;
            var c = parseFloat(p.maintenanceCost || p.cost || 0);
            if (c > 0) {
                maintenanceCost += c;
                items.push({ date: p.createdAt, desc: p.title || 'Maintenance', amount: c, category: 'Maintenance' });
            }
        });
    } catch(e) {}

    try {
        (DB.get('ambulance_trips') || []).forEach(function(t) {
            if (!inRange(t.createdAt)) return;
            var f = parseFloat(t.fare) || 0;
            ambulanceFare += f;
        });
    } catch(e) {}

    try {
        (DB.get('projects') || []).forEach(function(p) {
            projectSpent += parseFloat(p.spent) || 0;
        });
    } catch(e) {}

    var totalExpense = materialPurchase + maintenanceCost + ambulanceFare + projectSpent;

    return {
        materialPurchase: materialPurchase,
        materialUsage: materialUsage,
        maintenanceCost: maintenanceCost,
        ambulanceFare: ambulanceFare,
        projectSpent: projectSpent,
        totalExpense: totalExpense,
        items: items
    };
}

function getPeriodRange(period, now) {
    now = now || new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    var ranges = [];
    if (period === 'weekly') {
        var start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        var end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        ranges.push({ label: 'This Week', start: start.toISOString(), end: end.toISOString() });
    } else if (period === 'monthly') {
        for (var i = 0; i < 12; i++) {
            var sm = new Date(y, i, 1);
            var em = new Date(y, i + 1, 0, 23, 59, 59, 999);
            ranges.push({ label: sm.toLocaleString('en', { month: 'short' }) + ' ' + y, start: sm.toISOString(), end: em.toISOString() });
        }
    } else if (period === 'quarterly') {
        var qs = [
            ['Q1 (Jan-Mar)', 0, 2],
            ['Q2 (Apr-Jun)', 3, 5],
            ['Q3 (Jul-Sep)', 6, 8],
            ['Q4 (Oct-Dec)', 9, 11]
        ];
        for (var qi = 0; qi < qs.length; qi++) {
            var q = qs[qi];
            var qsm = new Date(y, q[1], 1);
            var qem = new Date(y, q[2] + 1, 0, 23, 59, 59, 999);
            ranges.push({ label: q[0] + ' ' + y, start: qsm.toISOString(), end: qem.toISOString() });
        }
    } else {
        ranges.push({ label: String(y), start: new Date(y, 0, 1).toISOString(), end: new Date(y, 11, 31, 23, 59, 59, 999).toISOString() });
    }
    return ranges;
}

function renderBudgetOverview() {
    try {
        var el = document.getElementById('bdgOverview');
        if (!el) return;
        var config = DB.get('budgetConfig') || {};
        if (Array.isArray(config)) config = {};
        var totalBudget = parseFloat(config.totalBudget) || 0;
        if (!totalBudget) {
            el.innerHTML = '<div class="empty-state">Set a budget first</div>';
            return;
        }
        var now = new Date();
        var ranges = getPeriodRange(budgetPeriod, now);
        var latest = ranges[ranges.length - 1];
        var currentExp = computeExpenses(latest.start, latest.end);
        var utilization = totalBudget > 0 ? Math.round((currentExp.totalExpense / totalBudget) * 100) : 0;
        var remaining = totalBudget - currentExp.totalExpense;
        var colorClass = utilization > 80 ? 'red' : (utilization > 50 ? 'yellow' : 'green');
        var colorStyle = utilization > 80 ? '#ea4335' : (utilization > 50 ? '#fbbc04' : '#34a853');

        el.innerHTML =
            '<div class="grid-4" style="margin-top:8px;">' +
                '<div class="stat-card"><div class="stat-value">\u20B9' + totalBudget.toLocaleString() + '</div><div class="stat-label">Total Budget</div></div>' +
                '<div class="stat-card"><div class="stat-value" style="color:' + colorStyle + ';">\u20B9' + currentExp.totalExpense.toLocaleString() + '</div><div class="stat-label">' + latest.label + ' Expense</div></div>' +
                '<div class="stat-card"><div class="stat-value">\u20B9' + Math.max(0, remaining).toLocaleString() + '</div><div class="stat-label">Remaining</div></div>' +
                '<div class="stat-card"><div class="stat-value">' + utilization + '%</div><div class="stat-label">Utilized</div></div>' +
            '</div>' +
            '<div class="progress-bar" style="margin-top:12px;height:24px;border-radius:12px;">' +
                '<div class="progress-fill ' + colorClass + '" style="width:' + Math.min(100, utilization) + '%;line-height:24px;font-size:12px;font-weight:600;color:#fff;text-align:center;">' + utilization + '%</div>' +
            '</div>';
    } catch (e) {
        console.error('renderBudgetOverview error:', e);
    }
}

function renderExpenseBreakdown() {
    try {
        var el = document.getElementById('bdgExpenseTable');
        if (!el) return;
        var config = DB.get('budgetConfig') || {};
        if (Array.isArray(config)) config = {};
        var totalBudget = parseFloat(config.totalBudget) || 0;
        var now = new Date();
        var ranges = getPeriodRange(budgetPeriod, now);
        var rows = '';
        var allItems = [];

        for (var ri = 0; ri < ranges.length; ri++) {
            var r = ranges[ri];
            if (new Date(r.end) > now) continue;
            var e = computeExpenses(r.start, r.end);
            allItems = allItems.concat(e.items);
            rows += '<tr>' +
                '<td><strong>' + r.label + '</strong></td>' +
                '<td>\u20B9' + e.materialPurchase.toFixed(2) + '</td>' +
                '<td>\u20B9' + e.materialUsage.toFixed(2) + '</td>' +
                '<td>\u20B9' + e.maintenanceCost.toFixed(2) + '</td>' +
                '<td>\u20B9' + e.ambulanceFare.toFixed(2) + '</td>' +
                '<td>\u20B9' + e.projectSpent.toFixed(2) + '</td>' +
                '<td><strong>\u20B9' + e.totalExpense.toFixed(2) + '</strong></td>' +
            '</tr>';
        }

        var html =
            '<div class="table-responsive">' +
                '<table><thead><tr>' +
                    '<th>Period</th><th>Material Purchase</th><th>Material Usage</th><th>Maintenance</th><th>Ambulance Fare</th><th>Project Spent</th><th>Total</th>' +
                '</tr></thead><tbody>' + rows + '</tbody></table>' +
            '</div>';

        if (allItems.length) {
            var txRows = '';
            for (var ai = allItems.length - 1; ai >= 0; ai--) {
                var i = allItems[ai];
                txRows += '<tr><td>' + APP.formatDate(i.date) + '</td><td>' + i.desc + '</td><td>' + i.category + '</td><td>\u20B9' + i.amount.toFixed(2) + '</td></tr>';
            }
            html +=
                '<div style="margin-top:16px;">' +
                    '<h4 style="font-size:14px;margin-bottom:8px;">\uD83D\uDCCB All Transactions</h4>' +
                    '<div class="table-responsive" style="max-height:300px;overflow-y:auto;">' +
                        '<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead><tbody>' +
                            txRows +
                        '</tbody></table>' +
                    '</div>' +
                '</div>';
        }

        el.innerHTML = html;
    } catch (e) {
        console.error('renderExpenseBreakdown error:', e);
        var el = document.getElementById('bdgExpenseTable');
        if (el) el.innerHTML = '<div class="empty-state">Error loading expenses</div>';
    }
}

function downloadBudgetExcel() {
    try {
        if (typeof XLSX === 'undefined' || !XLSX || !XLSX.utils) {
            APP.notify('Excel library not loaded. Refresh the page.', 'error');
            return;
        }
        var config = DB.get('budgetConfig') || {};
        if (Array.isArray(config)) config = {};
        var totalBudget = parseFloat(config.totalBudget) || 0;
        var fiscalYear = config.fiscalYear || (new Date().getFullYear() + '-' + (new Date().getFullYear() + 1));

        var matPurch = 0, maint = 0, ambFare = 0, projSpent = 0;
        var txItems = [];
        var deptData = {};

        (DB.get('inventory_receipts') || []).forEach(function(r) {
            var t = parseFloat(r.total) || 0;
            matPurch += t;
            txItems.push({ date: r.createdAt, desc: (r.itemName || 'Item') + ' x' + (r.quantity || 0), amount: t, category: 'Material Purchase', dept: r.department || '-' });
            var d = r.department || 'Unassigned';
            if (!deptData[d]) deptData[d] = { material: 0, maintenance: 0, ambulance: 0, project: 0, total: 0 };
            deptData[d].material += t;
            deptData[d].total += t;
        });

        (DB.get('problems') || []).forEach(function(p) {
            var c = parseFloat(p.maintenanceCost || p.cost || 0) || 0;
            maint += c;
            if (c > 0) {
                txItems.push({ date: p.createdAt, desc: p.title || 'Maintenance', amount: c, category: 'Maintenance', dept: p.area || p.department || '-' });
                var d = p.area || p.department || 'Unassigned';
                if (!deptData[d]) deptData[d] = { material: 0, maintenance: 0, ambulance: 0, project: 0, total: 0 };
                deptData[d].maintenance += c;
                deptData[d].total += c;
            }
        });

        (DB.get('ambulance_trips') || []).forEach(function(t) {
            var f = parseFloat(t.fare) || 0;
            ambFare += f;
            if (f > 0) {
                txItems.push({ date: t.createdAt, desc: 'Trip: ' + (t.patientName || '-'), amount: f, category: 'Ambulance Fare', dept: 'Ambulance' });
                var d = 'Ambulance';
                if (!deptData[d]) deptData[d] = { material: 0, maintenance: 0, ambulance: 0, project: 0, total: 0 };
                deptData[d].ambulance += f;
                deptData[d].total += f;
            }
        });

        (DB.get('projects') || []).forEach(function(p) {
            var s = parseFloat(p.spent) || 0;
            projSpent += s;
            if (s > 0) {
                txItems.push({ date: p.startDate || p.createdAt, desc: p.title || 'Project', amount: s, category: 'Project Spent', dept: p.department || '-' });
                var d = p.department || 'Unassigned';
                if (!deptData[d]) deptData[d] = { material: 0, maintenance: 0, ambulance: 0, project: 0, total: 0 };
                deptData[d].project += s;
                deptData[d].total += s;
            }
        });

        var totalExpense = matPurch + maint + ambFare + projSpent;
        var remaining = Math.max(0, totalBudget - totalExpense);
        var utilPct = totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0;

        var wb = XLSX.utils.book_new();
        var f = function(v) { return v || '-'; };

        // Sheet 1: Budget Overview
        var ovCols = ['Metric', 'Amount (\u20B9)'];
        var ovRows = [
            ['Fiscal Year', fiscalYear],
            ['Total Budget', totalBudget.toFixed(2)],
            ['', ''],
            ['--- Expenses ---', ''],
            ['Material Purchase', matPurch.toFixed(2)],
            ['Maintenance Cost', maint.toFixed(2)],
            ['Ambulance Fare', ambFare.toFixed(2)],
            ['Project Spent', projSpent.toFixed(2)],
            ['Total Expense', totalExpense.toFixed(2)],
            ['', ''],
            ['Remaining Budget', remaining.toFixed(2)],
            ['Utilization Rate', utilPct + '%'],
            ['Budget Status', utilPct > 80 ? 'Over-utilized' : (utilPct > 50 ? 'Moderate' : 'Under-utilized')]
        ];
        var ws1 = XLSX.utils.aoa_to_sheet([ovCols].concat(ovRows));
        XLSX.utils.book_append_sheet(wb, ws1, 'Budget Overview');

        // Sheet 2: Department-wise Budget
        var deptKeys = Object.keys(deptData).sort();
        if (deptKeys.length) {
            var dCols = ['Department', 'Material Purchase', 'Maintenance', 'Ambulance Fare', 'Project Spent', 'Total'];
            var dRows = deptKeys.map(function(k) {
                var d = deptData[k];
                return [k, d.material.toFixed(2), d.maintenance.toFixed(2), d.ambulance.toFixed(2), d.project.toFixed(2), d.total.toFixed(2)];
            });
            var totalRow = ['TOTAL',
                deptKeys.reduce(function(s, k) { return s + deptData[k].material; }, 0).toFixed(2),
                deptKeys.reduce(function(s, k) { return s + deptData[k].maintenance; }, 0).toFixed(2),
                deptKeys.reduce(function(s, k) { return s + deptData[k].ambulance; }, 0).toFixed(2),
                deptKeys.reduce(function(s, k) { return s + deptData[k].project; }, 0).toFixed(2),
                deptKeys.reduce(function(s, k) { return s + deptData[k].total; }, 0).toFixed(2)
            ];
            dRows.push([]);
            dRows.push(totalRow);
            var ws2 = XLSX.utils.aoa_to_sheet([dCols].concat(dRows));
            XLSX.utils.book_append_sheet(wb, ws2, 'Department-wise');
        }

        // Sheet 3: Transaction Log
        if (txItems.length) {
            txItems.sort(function(a, b) { return (a.date || '') < (b.date || '') ? 1 : -1; });
            var tCols = ['Date', 'Description', 'Category', 'Department', 'Amount (\u20B9)'];
            var tRows = txItems.map(function(i) {
                return [APP.formatDate(i.date) || '-', i.desc, i.category, i.dept, i.amount.toFixed(2)];
            });
            var ws3 = XLSX.utils.aoa_to_sheet([tCols].concat(tRows));
            XLSX.utils.book_append_sheet(wb, ws3, 'Transactions');
        }

        var wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        var blob = new Blob([wbout], { type: 'application/octet-stream' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'Budget_Report_' + fiscalYear.replace(/[\/\\]/g, '-') + '.xlsx';
        document.body.appendChild(link);
        link.click();
        setTimeout(function() {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        APP.notify('Budget Excel downloaded', 'success');
    } catch (e) {
        console.error('downloadBudgetExcel error:', e);
        APP.notify('Download failed: ' + e.message, 'error');
    }
}
