var _dashReportCharts = [];

function destroyDashCharts() {
    _dashReportCharts.forEach(function(c) { try { c.destroy(); } catch(e) {} });
    _dashReportCharts = [];
}

/* ─── CHART HELPERS with percentage labels ─── */

function dashColors(n) {
    var pal = ['#1a73e8','#34a853','#fbbc04','#ea4335','#4285f4','#7b1fa2','#00bcd4','#e91e63','#ff5722','#607d8b','#8bc34a','#ff9800','#795548','#9e9e9e'];
    return pal.slice(0, n);
}

function pctPlugin(pctArr) {
    return {
        id: 'pctLabel',
        afterDraw: function(chart) {
            var ctx = chart.ctx;
            chart.data.datasets.forEach(function(ds, i) {
                var meta = chart.getDatasetMeta(i);
                meta.data.forEach(function(el, j) {
                    var pct = pctArr[j];
                    if (!pct || pct < 3) return;
                    var pos = el.tooltipPosition();
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(pct + '%', pos.x, pos.y);
                });
            });
        }
    };
}

function renderDashChart(canvasId, type, labels, data, label, pcts) {
    var el = document.getElementById(canvasId);
    if (!el) return null;
    try {
        var isBar = type === 'bar';
        var isPie = type === 'pie' || type === 'doughnut';
        var cfg = {
            type: type,
            data: {
                labels: labels,
                datasets: [{ label: label || '', data: data, backgroundColor: isBar ? dashColors(labels.length) : dashColors(labels.length), borderColor: '#fff', borderWidth: 1 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: !isBar, position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: function(ti) {
                                var raw = ti.raw;
                                var total = ti.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                                var pct = total > 0 ? Math.round((raw / total) * 100) : 0;
                                return ti.label + ': ' + raw + ' (' + pct + '%)';
                            }
                        }
                    }
                },
                scales: isBar ? {
                    y: { beginAtZero: true, grid: { color: '#eee' }, ticks: { font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 9 } } }
                } : {}
            }
        };
        if (isPie && pcts && pcts.length) {
            cfg.plugins = cfg.plugins || {};
            var p = document.getElementById(canvasId + '_pct');
            if (p) {
                var total = data.reduce(function(a, b) { return a + b; }, 0);
                var html = '';
                labels.forEach(function(l, i) {
                    var pc = total > 0 ? Math.round((data[i] / total) * 100) : 0;
                    html += '<span style="display:inline-block;margin:2px 6px;font-size:11px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + dashColors(labels.length)[i] + ';margin-right:4px;"></span>' + l + ': <strong>' + pc + '%</strong></span>';
                });
                p.innerHTML = html;
            }
        }
        var chart = new Chart(el.getContext('2d'), cfg);
        _dashReportCharts.push(chart);
        return chart;
    } catch (e) { return null; }
}

/* ─── EMPLOYEE REPORTS DASHBOARD ─── */

function renderEmployeeReports(container) {
    destroyDashCharts();
    var users = DB.get('users') || [];
    var employees = users.filter(function(u) { return !u.isSuperAdmin; });
    var tasks = DB.get('tasks') || [];
    var checklists = DB.get('checklists') || [];
    var complaints = DB.get('complaints') || [];
    var problems = DB.get('problems') || [];
    var materialRequests = DB.get('material_requests') || [];

    var roleDist = {};
    var empKpi = [];
    employees.forEach(function(e) {
        roleDist[e.role || 'employee'] = (roleDist[e.role || 'employee'] || 0) + 1;
        var empTasks = tasks.filter(function(t) { return t.assignedTo === e.fullName; });
        var doneTasks = empTasks.filter(function(t) { return t.status === 'completed'; }).length;
        var totalTasks = empTasks.length;
        var empCls = checklists.filter(function(c) { return c.assignedTo === e.fullName; });
        var doneCls = empCls.filter(function(c) { return c.status === 'completed'; }).length;
        var totalCls = empCls.length;
        var empComps = complaints.filter(function(c) { return c.patientName === e.fullName || c.resolvedBy === e.fullName; });
        var resolvedComps = empComps.filter(function(c) { return c.status === 'resolved'; }).length;
        var empProbs = problems.filter(function(p) { return p.createdBy === e.fullName || p.assignedTo === e.fullName; });
        var solvedProbs = empProbs.filter(function(p) { return p.status === 'resolved'; }).length;
        var empMrs = materialRequests.filter(function(m) { return m.requestedBy === e.fullName; });
        var approvedMrs = empMrs.filter(function(m) { return m.status === 'approved'; }).length;
        empKpi.push({
            name: e.fullName, dept: e.department || '-', role: e.role || 'employee',
            tasksDone: doneTasks, tasksTotal: totalTasks, taskRate: totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0,
            clsDone: doneCls, clsTotal: totalCls, clsRate: totalCls > 0 ? Math.round(doneCls / totalCls * 100) : 0,
            compsResolved: resolvedComps, compsTotal: empComps.length, compRate: empComps.length > 0 ? Math.round(resolvedComps / empComps.length * 100) : 0,
            probsSolved: solvedProbs, probsTotal: empProbs.length,
            mrsApproved: approvedMrs, mrsTotal: empMrs.length
        });
    });

    var rLabels = Object.keys(roleDist);
    var rData = rLabels.map(function(k) { return roleDist[k]; });
    var totalEmp = employees.length;

    var html =
        '<div style="margin-bottom:16px;"><h2 style="font-size:18px;font-weight:700;">\uD83D\uDC64 Employee Reports</h2></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:12px;margin-bottom:16px;">' +
            '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:28px;font-weight:700;color:#1a73e8;">' + totalEmp + '</div><div style="font-size:12px;color:#888;">Total Employees</div></div>' +
            '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:28px;font-weight:700;color:#34a853;">' + rLabels.length + '</div><div style="font-size:12px;color:#888;">Roles</div></div>' +
            '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:28px;font-weight:700;color:#fbbc04;">' + empKpi.filter(function(e) { return e.taskRate >= 80; }).length + '</div><div style="font-size:12px;color:#888;">High Performers (80%+)</div></div>' +
            '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:28px;font-weight:700;color:#ea4335;">' + empKpi.filter(function(e) { return e.taskRate < 30 && e.tasksTotal > 0; }).length + '</div><div style="font-size:12px;color:#888;">Needs Improvement</div></div>' +
        '</div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">';
    html += '<div class="card"><div class="card-header"><h3>\uD83D\uDCCA Role Distribution</h3></div><div style="height:220px;"><canvas id="empRoleChart"></canvas></div><div id="empRoleChart_pct" style="text-align:center;padding:6px;"></div></div>';
    html += '<div class="card"><div class="card-header"><h3>\u2705 Task Completion per Employee</h3></div><div style="height:220px;"><canvas id="empTaskChart"></canvas></div></div>';
    html += '</div>';

    html += '<div class="card" style="margin-bottom:16px;"><div class="card-header"><h3>\uD83D\uDCCB Employee Performance Details</h3></div>';
    html += '<div class="table-responsive"><table><thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Tasks</th><th>Checklists</th><th>Complaints</th><th>Problems</th><th>Material Req</th></tr></thead><tbody>';
    empKpi.forEach(function(e) {
        var tColor = e.taskRate >= 70 ? 'green' : (e.taskRate >= 40 ? 'yellow' : 'red');
        var cColor = e.clsRate >= 70 ? 'green' : (e.clsRate >= 40 ? 'yellow' : 'red');
        html += '<tr>' +
            '<td><strong>' + e.name + '</strong></td>' +
            '<td>' + e.dept + '</td>' +
            '<td><span class="badge ' + APP.getRoleBadge(e.role) + '">' + e.role + '</span></td>' +
            '<td>' + e.tasksDone + '/' + e.tasksTotal + ' <div class="progress-bar" style="width:60px;display:inline-block;vertical-align:middle;"><div class="progress-fill ' + tColor + '" style="width:' + e.taskRate + '%;"></div></div> <span style="font-size:10px;">' + e.taskRate + '%</span></td>' +
            '<td>' + e.clsDone + '/' + e.clsTotal + ' <div class="progress-bar" style="width:50px;display:inline-block;vertical-align:middle;"><div class="progress-fill ' + cColor + '" style="width:' + e.clsRate + '%;"></div></div> <span style="font-size:10px;">' + e.clsRate + '%</span></td>' +
            '<td>' + e.compsResolved + '/' + e.compsTotal + ' (' + e.compRate + '%)</td>' +
            '<td>' + e.probsSolved + '/' + e.probsTotal + '</td>' +
            '<td>' + e.mrsApproved + '/' + e.mrsTotal + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div>';

    container.innerHTML = html;

    var pctData = rData.map(function(d) { var t = rData.reduce(function(a, b) { return a + b; }, 0); return t > 0 ? Math.round(d / t * 100) : 0; });
    renderDashChart('empRoleChart', 'doughnut', rLabels, rData, 'Employees', pctData);

    var empNames = empKpi.map(function(e) { return e.name; });
    var empDone = empKpi.map(function(e) { return e.tasksDone; });
    var empTotal = empKpi.map(function(e) { return e.tasksTotal; });
    var taskCtx = document.getElementById('empTaskChart');
    if (taskCtx) {
        try {
            var taskChart = new Chart(taskCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: empNames,
                    datasets: [
                        { label: 'Completed', data: empDone, backgroundColor: '#34a853', borderColor: '#2d8f47', borderWidth: 1 },
                        { label: 'Total', data: empTotal, backgroundColor: '#1a73e8', borderColor: '#1557b0', borderWidth: 1 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 8, font: { size: 10 } } } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#eee' }, ticks: { font: { size: 9 } } },
                        x: { grid: { display: false }, ticks: { font: { size: 8 }, maxRotation: 45 } }
                    }
                }
            });
            _dashReportCharts.push(taskChart);
        } catch(e) {}
    }
}

/* ─── BUDGET REPORTS DASHBOARD ─── */

function renderBudgetReports(container) {
    destroyDashCharts();
    var cfg = DB.get('budgetConfig');
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) cfg = {};
    var totalBudget = parseFloat(cfg.totalBudget) || 0;
    var maintBudget = parseFloat(cfg.maintenanceBudget) || 0;

    var matPurch = 0, maint = 0, ambFare = 0, projSpent = 0;
    var monthlyData = {};
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    months.forEach(function(m) { monthlyData[m] = { purchase: 0, maintenance: 0, fare: 0, project: 0, total: 0 }; });

    (DB.get('inventory_receipts') || []).forEach(function(r) {
        var t = parseFloat(r.total) || 0;
        matPurch += t;
        if (r.createdAt) {
            try { var d = new Date(r.createdAt); var mn = months[d.getMonth()]; monthlyData[mn].purchase += t; monthlyData[mn].total += t; } catch(e) {}
        }
    });

    (DB.get('problems') || []).forEach(function(p) {
        var c = parseFloat(p.maintenanceCost || p.cost || 0) || 0;
        maint += c;
        if (p.createdAt) {
            try { var d = new Date(p.createdAt); var mn = months[d.getMonth()]; monthlyData[mn].maintenance += c; monthlyData[mn].total += c; } catch(e) {}
        }
    });

    (DB.get('ambulance_trips') || []).forEach(function(t) {
        var f = parseFloat(t.fare) || 0;
        ambFare += f;
        if (t.createdAt) {
            try { var d = new Date(t.createdAt); var mn = months[d.getMonth()]; monthlyData[mn].fare += f; monthlyData[mn].total += f; } catch(e) {}
        }
    });

    (DB.get('projects') || []).forEach(function(p) {
        var s = parseFloat(p.spent) || 0;
        projSpent += s;
        if (p.startDate) {
            try { var d = new Date(p.startDate); var mn = months[d.getMonth()]; monthlyData[mn].project += s; monthlyData[mn].total += s; } catch(e) {}
        }
    });

    var totalExpense = matPurch + maint + ambFare + projSpent;
    var remaining = Math.max(0, totalBudget - totalExpense);
    var utilPct = totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0;

    var html =
        '<div style="margin-bottom:16px;"><h2 style="font-size:18px;font-weight:700;">\uD83D\uDCB0 Budget Reports</h2></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:12px;margin-bottom:16px;">' +
            '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:22px;font-weight:700;color:#1a73e8;">\u20B9' + (totalBudget.toLocaleString()) + '</div><div style="font-size:11px;color:#888;">Total Budget</div></div>' +
            '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:22px;font-weight:700;color:#ea4335;">\u20B9' + (totalExpense.toLocaleString()) + '</div><div style="font-size:11px;color:#888;">Total Expense</div></div>' +
            '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:22px;font-weight:700;color:#34a853;">\u20B9' + (remaining.toLocaleString()) + '</div><div style="font-size:11px;color:#888;">Remaining</div></div>' +
            '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:22px;font-weight:700;color:' + (utilPct > 80 ? '#ea4335' : utilPct > 50 ? '#fbbc04' : '#34a853') + ';">' + utilPct + '%</div><div style="font-size:11px;color:#888;">Utilization</div></div>' +
        '</div>';

    html += '<div class="card" style="margin-bottom:16px;">' +
        '<div class="card-header"><h3>\uD83D\uDCC8 Budget Utilization</h3></div>' +
        '<div style="padding:12px 16px;">' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span>Used: \u20B9' + totalExpense.toLocaleString() + '</span><span>' + utilPct + '%</span></div>' +
            '<div class="progress-bar" style="height:24px;"><div class="progress-fill ' + (utilPct > 80 ? 'red' : utilPct > 50 ? 'yellow' : 'green') + '" style="width:' + utilPct + '%;line-height:24px;font-size:12px;color:#fff;text-align:center;font-weight:600;">' + utilPct + '%</div></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px;"><span>Remaining: \u20B9' + remaining.toLocaleString() + '</span><span>Total: \u20B9' + totalBudget.toLocaleString() + '</span></div>' +
        '</div></div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">';
    html += '<div class="card"><div class="card-header"><h3>\uD83E\uDDFE Expense Breakdown</h3></div><div style="height:220px;"><canvas id="bdgPieChart"></canvas></div><div id="bdgPieChart_pct" style="text-align:center;padding:6px;"></div></div>';
    html += '<div class="card"><div class="card-header"><h3>\uD83D\uDCC8 Monthly Expense Trend</h3></div><div style="height:220px;"><canvas id="bdgMonthlyChart"></canvas></div></div>';
    html += '</div>';

    html += '<div class="card">' +
        '<div class="card-header"><h3>\uD83D\uDCCB Expense Details</h3></div>' +
        '<div class="table-responsive"><table><thead><tr><th>Category</th><th>Amount (\u20B9)</th><th>% of Budget</th><th>Progress</th></tr></thead><tbody>' +
            '<tr><td>Material Purchase</td><td>\u20B9' + matPurch.toLocaleString() + '</td><td>' + (totalBudget > 0 ? Math.round(matPurch / totalBudget * 100) : 0) + '%</td><td><div class="progress-bar" style="width:100px;display:inline-block;"><div class="progress-fill ' + (totalBudget > 0 && matPurch / totalBudget > 0.5 ? 'red' : 'green') + '" style="width:' + (totalBudget > 0 ? Math.round(matPurch / totalBudget * 100) : 0) + '%;"></div></div></td></tr>' +
            '<tr><td>Maintenance Cost</td><td>\u20B9' + maint.toLocaleString() + '</td><td>' + (totalBudget > 0 ? Math.round(maint / totalBudget * 100) : 0) + '%</td><td><div class="progress-bar" style="width:100px;display:inline-block;"><div class="progress-fill yellow" style="width:' + (totalBudget > 0 ? Math.round(maint / totalBudget * 100) : 0) + '%;"></div></div></td></tr>' +
            '<tr><td>Ambulance Fare</td><td>\u20B9' + ambFare.toLocaleString() + '</td><td>' + (totalBudget > 0 ? Math.round(ambFare / totalBudget * 100) : 0) + '%</td><td><div class="progress-bar" style="width:100px;display:inline-block;"><div class="progress-fill green" style="width:' + (totalBudget > 0 ? Math.round(ambFare / totalBudget * 100) : 0) + '%;"></div></div></td></tr>' +
            '<tr><td>Project Spent</td><td>\u20B9' + projSpent.toLocaleString() + '</td><td>' + (totalBudget > 0 ? Math.round(projSpent / totalBudget * 100) : 0) + '%</td><td><div class="progress-bar" style="width:100px;display:inline-block;"><div class="progress-fill blue" style="width:' + (totalBudget > 0 ? Math.round(projSpent / totalBudget * 100) : 0) + '%;"></div></div></td></tr>' +
            '<tr style="font-weight:600;"><td>Total Expense</td><td>\u20B9' + totalExpense.toLocaleString() + '</td><td>' + utilPct + '%</td><td><div class="progress-bar" style="width:100px;display:inline-block;"><div class="progress-fill ' + (utilPct > 80 ? 'red' : utilPct > 50 ? 'yellow' : 'green') + '" style="width:' + utilPct + '%;"></div></div></td></tr>' +
        '</tbody></table></div></div>';

    container.innerHTML = html;

    var expLabels = ['Material Purchase', 'Maintenance', 'Ambulance Fare', 'Project Spent'];
    var expData = [matPurch, maint, ambFare, projSpent];
    var expPcts = expData.map(function(d) { var t = expData.reduce(function(a, b) { return a + b; }, 0); return t > 0 ? Math.round(d / t * 100) : 0; });
    renderDashChart('bdgPieChart', 'pie', expLabels, expData, 'Expenses', expPcts);

    var mLabels = months;
    var mTotal = months.map(function(m) { return monthlyData[m].total; });
    var mPurch = months.map(function(m) { return monthlyData[m].purchase; });
    var mMaint = months.map(function(m) { return monthlyData[m].maintenance; });
    var mCtx = document.getElementById('bdgMonthlyChart');
    if (mCtx) {
        try {
            var mChart = new Chart(mCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: mLabels,
                    datasets: [
                        { label: 'Material Purchase', data: mPurch, backgroundColor: '#1a73e8' },
                        { label: 'Maintenance', data: mMaint, backgroundColor: '#fbbc04' }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 8, font: { size: 10 } } } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#eee' }, ticks: { font: { size: 9 } } },
                        x: { grid: { display: false }, ticks: { font: { size: 9 } } }
                    }
                }
            });
            _dashReportCharts.push(mChart);
        } catch(e) {}
    }
}

/* ─── DEPARTMENT REPORTS DASHBOARD ─── */

function renderDeptReports(container) {
    destroyDashCharts();
    var depts = (DB.get('departments') || []).filter(function(d) { return d.active !== false; });
    var users = DB.get('users') || [];
    var tasks = DB.get('tasks') || [];
    var complaints = DB.get('complaints') || [];
    var checklists = DB.get('checklists') || [];
    var problems = DB.get('problems') || [];

    var deptKpi = [];
    var deptNames = [];
    var deptUsersData = [];
    var deptTasksData = [];
    var deptCompsData = [];
    var deptClData = [];
    depts.forEach(function(d) {
        var du = users.filter(function(u) { return u.department === d.name; });
        var dt = tasks.filter(function(t) { return t.department === d.name; });
        var dtDone = dt.filter(function(t) { return t.status === 'completed'; }).length;
        var dc = complaints.filter(function(c) { return c.category === d.name || c.roomNo && c.roomNo.indexOf(d.name) === 0; });
        var dcRes = dc.filter(function(c) { return c.status === 'resolved'; }).length;
        var dcl = checklists.filter(function(cl) { return cl.assignedTo === d.name; });
        var dclDone = dcl.filter(function(cl) { return cl.status === 'completed'; }).length;
        var dp = problems.filter(function(p) { return p.area === d.name || p.department === d.name; });
        var dpRes = dp.filter(function(p) { return p.status === 'resolved'; }).length;
        deptKpi.push({
            name: d.name,
            users: du.length,
            tasks: dt.length, tasksDone: dtDone, taskRate: dt.length > 0 ? Math.round(dtDone / dt.length * 100) : 0,
            comps: dc.length, compsResolved: dcRes, compRate: dc.length > 0 ? Math.round(dcRes / dc.length * 100) : 0,
            cls: dcl.length, clsDone: dclDone, clsRate: dcl.length > 0 ? Math.round(dclDone / dcl.length * 100) : 0,
            probs: dp.length, probsResolved: dpRes
        });
        deptNames.push(d.name);
        deptUsersData.push(du.length);
        deptTasksData.push(dt.length);
        deptCompsData.push(dc.length);
        deptClData.push(dcl.length);
    });

    var totalDepts = depts.length;
    var totalUsers = depts.reduce(function(s, d) { return s + d.users; }, 0);

    var html =
        '<div style="margin-bottom:16px;"><h2 style="font-size:18px;font-weight:700;">\uD83C\uDFE2 Department Reports</h2></div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:12px;margin-bottom:16px;">' +
            '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:28px;font-weight:700;color:#1a73e8;">' + totalDepts + '</div><div style="font-size:12px;color:#888;">Departments</div></div>' +
            '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:28px;font-weight:700;color:#34a853;">' + deptKpi.reduce(function(s, d) { return s + d.users; }, 0) + '</div><div style="font-size:12px;color:#888;">Total Employees</div></div>' +
            '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:28px;font-weight:700;color:#fbbc04;">' + deptKpi.reduce(function(s, d) { return s + d.tasks; }, 0) + '</div><div style="font-size:12px;color:#888;">Total Tasks</div></div>' +
            '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:28px;font-weight:700;color:#ea4335;">' + deptKpi.reduce(function(s, d) { return s + d.comps; }, 0) + '</div><div style="font-size:12px;color:#888;">Complaints</div></div>' +
        '</div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">';
    html += '<div class="card"><div class="card-header"><h3>\uD83D\uDCCA Employee Distribution</h3></div><div style="height:220px;"><canvas id="deptPieChart"></canvas></div><div id="deptPieChart_pct" style="text-align:center;padding:6px;"></div></div>';
    html += '<div class="card"><div class="card-header"><h3>\uD83D\uDCCA Records per Department</h3></div><div style="height:220px;"><canvas id="deptBarChart"></canvas></div></div>';
    html += '</div>';

    html += '<div class="card">' +
        '<div class="card-header"><h3>\uD83D\uDCCB Department Performance</h3></div>' +
        '<div class="table-responsive"><table><thead><tr><th>Department</th><th>Employees</th><th>Tasks Done/Total</th><th>Task Rate</th><th>Complaints Resolved/Total</th><th>Checklists Done/Total</th><th>Problems Solved</th></tr></thead><tbody>';
    deptKpi.forEach(function(d) {
        var tColor = d.taskRate >= 70 ? 'green' : (d.taskRate >= 40 ? 'yellow' : 'red');
        var cColor = d.compRate >= 70 ? 'green' : (d.compRate >= 40 ? 'yellow' : 'red');
        html += '<tr>' +
            '<td><strong>' + d.name + '</strong></td>' +
            '<td>' + d.users + '</td>' +
            '<td>' + d.tasksDone + '/' + d.tasks + '</td>' +
            '<td><div class="progress-bar" style="width:60px;display:inline-block;vertical-align:middle;"><div class="progress-fill ' + tColor + '" style="width:' + d.taskRate + '%;"></div></div> <span style="font-size:10px;">' + d.taskRate + '%</span></td>' +
            '<td>' + d.compsResolved + '/' + d.comps + ' (' + d.compRate + '%)</td>' +
            '<td>' + d.clsDone + '/' + d.cls + ' <div class="progress-bar" style="width:50px;display:inline-block;vertical-align:middle;"><div class="progress-fill ' + (d.clsRate >= 70 ? 'green' : d.clsRate >= 40 ? 'yellow' : 'red') + '" style="width:' + d.clsRate + '%;"></div></div></td>' +
            '<td>' + d.probsResolved + '/' + d.probs + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div></div>';

    container.innerHTML = html;

    var deptPctData = deptUsersData.map(function(d) { var t = deptUsersData.reduce(function(a, b) { return a + b; }, 0); return t > 0 ? Math.round(d / t * 100) : 0; });
    renderDashChart('deptPieChart', 'doughnut', deptNames, deptUsersData, 'Employees', deptPctData);

    var barCtx = document.getElementById('deptBarChart');
    if (barCtx) {
        try {
            var barChart = new Chart(barCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: deptNames,
                    datasets: [
                        { label: 'Tasks', data: deptTasksData, backgroundColor: '#1a73e8' },
                        { label: 'Complaints', data: deptCompsData, backgroundColor: '#ea4335' },
                        { label: 'Checklists', data: deptClData, backgroundColor: '#34a853' }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 8, font: { size: 10 } } } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#eee' }, ticks: { font: { size: 9 } } },
                        x: { grid: { display: false }, ticks: { font: { size: 8 }, maxRotation: 45 } }
                    }
                }
            });
            _dashReportCharts.push(barChart);
        } catch(e) {}
    }
}
