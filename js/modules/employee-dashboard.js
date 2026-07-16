var _empSection = 'overview';
var _empClFilter = 'daily';
var _empData = {};

function renderEmployeeDashboard(container) {
    var user = AUTH.currentUser();
    if (!user) { container.innerHTML = '<div class="empty-state">Not logged in</div>'; return; }
    var dept = user.department || 'Maintenance';

    var tasks = DB.get('tasks') || [];
    var problems = DB.get('problems') || [];
    var requests = DB.get('material_requests') || [];
    var checklists = DB.get('checklists') || [];
    var inventory = DB.get('inventory') || [];
    var projects = DB.get('projects') || [];
    var reports = DB.get('reports') || [];

    var u = user.fullName || user.username;
    _empData = {
        user: user, dept: dept,
        myTasks: tasks.filter(function(t) { return t.assignedTo === u || t.assignedTo === user.fullName || t.assignedTo === user.username || t.department === dept; }),
        myProblems: problems.filter(function(p) { return p.createdBy === user.username || p.createdBy === user.fullName; }),
        myRequests: requests.filter(function(r) { return r.createdBy === user.username || r.createdBy === user.fullName; }),
        myChecklists: checklists,
        myProjects: projects,
        deptInventory: inventory,
        myReports: reports.filter(function(r) { return r.createdBy === user.username || r.createdBy === user.fullName; })
    };

    container.innerHTML = ''
        + '<div class="flex-between mb-3" style="align-items:center;">'
        + '<h3 style="font-size:20px;font-weight:600;">My Dashboard</h3>'
        + '<div style="display:flex;align-items:center;gap:8px;"><span class="badge badge-info">' + dept + '</span><span style="font-size:14px;font-weight:600;">' + user.fullName + '</span></div></div>'

        + '<div class="emp-layout" style="display:flex;gap:16px;align-items:flex-start;">'
        + '<div class="emp-sidebar" style="width:200px;min-width:200px;background:var(--card);border-radius:var(--radius);border:1px solid var(--border);overflow:hidden;">'
        + '<div class="emp-nav-item active" onclick="empNav(\'overview\',this)" data-sec="overview" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border);font-size:14px;display:flex;align-items:center;gap:8px;transition:0.2s;">📊 Overview</div>'
        + '<div class="emp-nav-item" onclick="empNav(\'tasks\',this)" data-sec="tasks" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border);font-size:14px;display:flex;align-items:center;gap:8px;transition:0.2s;">📝 Tasks <span class="badge badge-primary" style="margin-left:auto;font-size:10px;">' + _empData.myTasks.length + '</span></div>'
        + '<div class="emp-nav-item" onclick="empNav(\'problems\',this)" data-sec="problems" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border);font-size:14px;display:flex;align-items:center;gap:8px;transition:0.2s;">🔧 Problems <span class="badge badge-danger" style="margin-left:auto;font-size:10px;">' + _empData.myProblems.filter(function(p){return p.status!=='resolved';}).length + '</span></div>'
        + '<div class="emp-nav-item" onclick="empNav(\'checklists\',this)" data-sec="checklists" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border);font-size:14px;display:flex;align-items:center;gap:8px;transition:0.2s;">✅ Checklists</div>'
        + '<div class="emp-nav-item" onclick="empNav(\'requests\',this)" data-sec="requests" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border);font-size:14px;display:flex;align-items:center;gap:8px;transition:0.2s;">📦 Materials <span class="badge badge-warning" style="margin-left:auto;font-size:10px;">' + _empData.myRequests.filter(function(r){return r.status==='pending';}).length + '</span></div>'
        + '<div class="emp-nav-item" onclick="empNav(\'lifecycle\',this)" data-sec="lifecycle" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border);font-size:14px;display:flex;align-items:center;gap:8px;transition:0.2s;">🔋 Lifecycle <span class="badge badge-info" style="margin-left:auto;font-size:10px;">' + _empData.deptInventory.length + '</span></div>'
        + '<div class="emp-nav-item" onclick="empNav(\'projects\',this)" data-sec="projects" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border);font-size:14px;display:flex;align-items:center;gap:8px;transition:0.2s;">📋 Projects <span class="badge badge-primary" style="margin-left:auto;font-size:10px;">' + _empData.myProjects.length + '</span></div>'
        + '<div class="emp-nav-item" onclick="empNav(\'reports\',this)" data-sec="reports" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border);font-size:14px;display:flex;align-items:center;gap:8px;transition:0.2s;">📋 Reports</div>'
        + '<div class="emp-nav-item" onclick="empNav(\'performance\',this)" data-sec="performance" style="padding:12px 16px;cursor:pointer;font-size:14px;display:flex;align-items:center;gap:8px;transition:0.2s;">📊 Performance</div>'
        + '</div>'

        + '<div class="emp-content" style="flex:1;min-width:0;" id="empContent">'
        + '<div id="empSectionOverview"></div>'
        + '<div id="empSectionTasks" style="display:none;"></div>'
        + '<div id="empSectionProblems" style="display:none;"></div>'
        + '<div id="empSectionChecklists" style="display:none;"></div>'
        + '<div id="empSectionRequests" style="display:none;"></div>'
        + '<div id="empSectionLifecycle" style="display:none;"></div>'
        + '<div id="empSectionProjects" style="display:none;"></div>'
        + '<div id="empSectionReports" style="display:none;"></div>'
        + '<div id="empSectionPerformance" style="display:none;"></div>'
        + '</div></div>';

    _empSection = 'overview';
    renderEmpOverview();
    renderEmpTasksSec();
    renderEmpProblemsSec();
    renderEmpChecklistsSec();
    renderEmpRequestsSec();
    renderEmpLifecycleSec();
    renderEmpProjectsSec();
    renderEmpReportsSec();
    renderEmpPerformanceSec();
}

function empNav(section, btn) {
    _empSection = section;
    document.querySelectorAll('.emp-nav-item').forEach(function(el) { el.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    document.querySelectorAll('[id^="empSection"]').forEach(function(el) { el.style.display = 'none'; });
    var target = document.getElementById('empSection' + section.charAt(0).toUpperCase() + section.slice(1));
    if (target) target.style.display = 'block';
}

function empNavStyle() {
    var style = document.createElement('style');
    style.textContent = '.emp-nav-item:hover{background:var(--light-gray);}.emp-nav-item.active{background:var(--primary);color:#fff;font-weight:600;}.emp-nav-item.active .badge{background:rgba(255,255,255,0.3);color:#fff;}';
    document.head.appendChild(style);
}
empNavStyle();

function renderEmpOverview() {
    var el = document.getElementById('empSectionOverview');
    if (!el) return;
    var d = _empData;
    var tasksPending = d.myTasks.filter(function(t) { return t.status !== 'completed'; }).length;
    var tasksDone = d.myTasks.filter(function(t) { return t.status === 'completed'; }).length;
    var problemsOpen = d.myProblems.filter(function(p) { return p.status !== 'resolved'; }).length;
    var problemsSolved = d.myProblems.filter(function(p) { return p.status === 'resolved'; }).length;
    var requestsPending = d.myRequests.filter(function(r) { return r.status === 'pending'; }).length;
    var requestsApproved = d.myRequests.filter(function(r) { return r.status === 'approved'; }).length;
    var checklistsPending = d.myChecklists.filter(function(cl) { return cl.status !== 'completed'; }).length;
    var checklistsDone = d.myChecklists.filter(function(cl) { return cl.status === 'completed'; }).length;
    var taskRate = d.myTasks.length > 0 ? Math.round((tasksDone / d.myTasks.length) * 100) : 0;
    var probRate = d.myProblems.length > 0 ? Math.round((problemsSolved / d.myProblems.length) * 100) : 0;

    el.innerHTML = ''
        + '<div class="grid-5 mb-4" style="gap:10px;">'
        + '<div class="stat-card" style="cursor:pointer;" onclick="empNav(\'tasks\',document.querySelector(\'.emp-nav-item[data-sec=tasks]\'))"><div style="font-size:24px;font-weight:700;color:var(--warning);">' + tasksPending + '</div><div style="font-size:11px;color:var(--gray);">Pending Tasks</div></div>'
        + '<div class="stat-card"><div style="font-size:24px;font-weight:700;color:var(--success);">' + tasksDone + '</div><div style="font-size:11px;color:var(--gray);">Tasks Done</div></div>'
        + '<div class="stat-card" style="cursor:pointer;" onclick="empNav(\'problems\',document.querySelector(\'.emp-nav-item[data-sec=problems]\'))"><div style="font-size:24px;font-weight:700;color:var(--danger);">' + problemsOpen + '</div><div style="font-size:11px;color:var(--gray);">Open Problems</div></div>'
        + '<div class="stat-card"><div style="font-size:24px;font-weight:700;color:var(--success);">' + problemsSolved + '</div><div style="font-size:11px;color:var(--gray);">Problems Solved</div></div>'
        + '<div class="stat-card"><div style="font-size:24px;font-weight:700;color:var(--warning);">' + requestsPending + '</div><div style="font-size:11px;color:var(--gray);">Pending Requests</div></div>'
        + '</div>'

        + '<div class="grid-4 mb-4" style="gap:10px;">'
        + '<div class="stat-card"><div style="font-size:24px;font-weight:700;color:var(--info);">' + checklistsPending + '</div><div style="font-size:11px;color:var(--gray);">Checklists Due</div></div>'
        + '<div class="stat-card"><div style="font-size:24px;font-weight:700;color:var(--success);">' + checklistsDone + '</div><div style="font-size:11px;color:var(--gray);">Checklists Done</div></div>'
        + '<div class="stat-card"><div style="font-size:24px;font-weight:700;color:var(--success);">' + requestsApproved + '</div><div style="font-size:11px;color:var(--gray);">Approved Requests</div></div>'
        + '<div class="stat-card"><div style="font-size:24px;font-weight:700;color:var(--primary);">' + d.myProjects.length + '</div><div style="font-size:11px;color:var(--gray);">My Projects</div></div>'
        + '</div>'

        + '<div class="card" style="padding:12px 16px;background:#f8f9ff;">'
        + '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">'
        + '<span style="font-weight:600;font-size:14px;">⚡ Quick Actions</span>'
        + '<button class="btn btn-sm btn-primary" onclick="Router.navigate(\'problems\')">🔧 Report Problem</button>'
        + '<button class="btn btn-sm btn-info" style="background:var(--info);color:#fff;" onclick="Router.navigate(\'material-requests\')">📦 New Request</button>'
        + '<button class="btn btn-sm btn-secondary" onclick="showReportForm()">📋 Submit Report</button>'
        + '<button class="btn btn-sm btn-success" onclick="Router.navigate(\'checklists\')">✅ Checklists</button>'
        + '<button class="btn btn-sm btn-warning" style="color:#fff;" onclick="Router.navigate(\'tasks\')">📝 My Tasks</button>'
        + '<button class="btn btn-sm btn-primary" onclick="Router.navigate(\'projects\')">📋 Projects</button>'
        + '</div></div>'

        + '<div class="grid-2 mt-4" style="gap:16px;">'
        + '<div class="card"><div class="card-header"><h3>📝 Recent Tasks</h3><button class="btn btn-sm btn-outline" onclick="empNav(\'tasks\',document.querySelector(\'.emp-nav-item[data-sec=tasks]\'))">View All</button></div><div id="empOvTasks" style="padding:12px;"></div></div>'
        + '<div class="card"><div class="card-header"><h3>🔧 Recent Problems</h3><button class="btn btn-sm btn-outline" onclick="empNav(\'problems\',document.querySelector(\'.emp-nav-item[data-sec=problems]\'))">View All</button></div><div id="empOvProblems" style="padding:12px;"></div></div>'
        + '</div>'

        + '<div class="grid-2 mt-4" style="gap:16px;">'
        + '<div class="card"><div class="card-header"><h3>📦 Recent Requests</h3><button class="btn btn-sm btn-outline" onclick="empNav(\'requests\',document.querySelector(\'.emp-nav-item[data-sec=requests]\'))">View All</button></div><div id="empOvRequests" style="padding:12px;"></div></div>'
        + '<div class="card"><div class="card-header"><h3>✅ Recent Checklists</h3><button class="btn btn-sm btn-outline" onclick="empNav(\'checklists\',document.querySelector(\'.emp-nav-item[data-sec=checklists]\'))">View All</button></div><div id="empOvChecklists" style="padding:12px;"></div></div>'
        + '</div>';

    renderSmallList('empOvTasks', d.myTasks, 'task');
    renderSmallList('empOvProblems', d.myProblems, 'problem');
    renderSmallList('empOvRequests', d.myRequests, 'request');
    renderSmallList('empOvChecklists', d.myChecklists, 'checklist');
}

function renderSmallList(id, items, type) {
    var el = document.getElementById(id);
    if (!el) return;
    if (items.length === 0) { el.innerHTML = '<div style="color:var(--gray);font-size:13px;padding:8px;">None</div>'; return; }
    var html = '';
    for (var i = 0; i < Math.min(items.length, 5); i++) {
        var item = items[i];
        if (type === 'task') {
            var badge = APP.getStatusBadge(item.status);
            html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--light-gray);font-size:13px;"><span>' + (item.title || '') + '</span><span class="badge ' + badge + '" style="font-size:10px;">' + (item.status || '') + '</span></div>';
        } else if (type === 'problem') {
            var badge = APP.getStatusBadge(item.status);
            html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--light-gray);font-size:13px;"><span>' + (item.title || '') + '</span><span class="badge ' + badge + '" style="font-size:10px;">' + (item.status || '') + '</span></div>';
        } else if (type === 'request') {
            var badge = item.status === 'approved' ? 'badge-success' : item.status === 'rejected' ? 'badge-danger' : 'badge-warning';
            html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--light-gray);font-size:13px;"><span>' + (item.title || '') + '</span><span class="badge ' + badge + '" style="font-size:10px;">' + (item.status || '') + '</span></div>';
        } else if (type === 'checklist') {
            var total = item.items ? item.items.length : 0;
            var done = item.items ? item.items.filter(function(it) { return it.status === 'ok'; }).length : 0;
            var pct = total > 0 ? Math.round((done / total) * 100) : 0;
            html += '<div style="padding:6px 0;border-bottom:1px solid var(--light-gray);font-size:13px;"><div style="display:flex;justify-content:space-between;"><span>' + (item.title || '') + '</span><span class="badge ' + (item.status === 'completed' ? 'badge-success' : 'badge-info') + '" style="font-size:10px;">' + (item.status || 'active') + '</span></div><div style="display:flex;align-items:center;gap:4px;margin-top:2px;"><div style="flex:1;height:4px;background:var(--light-gray);border-radius:2px;"><div style="height:100%;width:' + pct + '%;background:var(--success);border-radius:2px;"></div></div><span style="font-size:10px;color:var(--gray);">' + done + '/' + total + '</span></div></div>';
        }
    }
    el.innerHTML = html;
}

function renderEmpTasksSec() {
    var el = document.getElementById('empSectionTasks');
    if (!el) return;
    var d = _empData;
    var tasksPending = d.myTasks.filter(function(t) { return t.status !== 'completed'; }).length;
    var html = '<div class="card"><div class="card-header"><h3>📝 My Tasks (' + d.myTasks.length + ')</h3></div>'
        + '<div style="padding:16px;">';
    if (d.myTasks.length === 0) { html += '<div style="color:var(--gray);font-size:13px;">No tasks assigned</div>'; }
    else {
        html += '<div class="table-responsive"><table class="table"><thead><tr><th>Title</th><th>Priority</th><th>Deadline</th><th>Status</th><th>Action</th></tr></thead><tbody>';
        for (var i = 0; i < d.myTasks.length; i++) {
            var t = d.myTasks[i];
            var overdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed' ? ' <span style="color:var(--danger);font-size:11px;">⚠️</span>' : '';
            html += '<tr><td>' + (t.title || '') + overdue + '</td>'
                + '<td>' + (t.priority ? '<span class="badge ' + (t.priority === 'high' ? 'badge-danger' : t.priority === 'medium' ? 'badge-warning' : 'badge-info') + '" style="font-size:10px;">' + t.priority + '</span>' : '-') + '</td>'
                + '<td style="font-size:12px;">' + (t.deadline ? APP.formatDate(t.deadline) : '-') + '</td>'
                + '<td><span class="badge ' + APP.getStatusBadge(t.status) + '" style="font-size:11px;">' + (t.status || 'pending') + '</span></td>'
                + '<td><button class="btn btn-sm btn-primary" onclick="Router.navigate(\'tasks\')">Open</button></td></tr>';
        }
        html += '</tbody></table></div>';
    }
    html += '</div></div>';
    el.innerHTML = html;
}

function renderEmpProblemsSec() {
    var el = document.getElementById('empSectionProblems');
    if (!el) return;
    var d = _empData;
    var html = '<div class="card"><div class="card-header"><h3>🔧 My Problems (' + d.myProblems.length + ')</h3><button class="btn btn-sm btn-primary" onclick="Router.navigate(\'problems\')">+ New Problem</button></div>'
        + '<div style="padding:16px;">';
    if (d.myProblems.length === 0) { html += '<div style="color:var(--gray);font-size:13px;">No problems reported</div>'; }
    else {
        html += '<div class="table-responsive"><table class="table"><thead><tr><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead><tbody>';
        for (var i = 0; i < d.myProblems.length; i++) {
            var p = d.myProblems[i];
            html += '<tr><td>' + (p.title || '') + '</td>'
                + '<td style="font-size:12px;">' + (p.category || '-') + '</td>'
                + '<td>' + (p.priority ? '<span class="badge ' + (p.priority === 'high' ? 'badge-danger' : p.priority === 'medium' ? 'badge-warning' : 'badge-info') + '" style="font-size:10px;">' + p.priority + '</span>' : '-') + '</td>'
                + '<td><span class="badge ' + APP.getStatusBadge(p.status) + '" style="font-size:11px;">' + (p.status || 'open') + '</span></td>'
                + '<td><button class="btn btn-sm btn-primary" onclick="Router.navigate(\'problems\')">Open</button></td></tr>';
        }
        html += '</tbody></table></div>';
    }
    html += '</div></div>';
    el.innerHTML = html;
}

function renderEmpChecklistsSec() {
    var el = document.getElementById('empSectionChecklists');
    if (!el) return;
    var d = _empData;
    var html = '<div class="card"><div class="card-header" style="flex-wrap:wrap;"><h3>✅ Checklists (' + d.myChecklists.length + ')</h3>'
        + '<div style="display:flex;gap:4px;font-size:12px;">'
        + '<button class="tab-btn active" onclick="filterEmpCl(\'daily\',this)">Daily</button>'
        + '<button class="tab-btn" onclick="filterEmpCl(\'weekly\',this)">Weekly</button>'
        + '<button class="tab-btn" onclick="filterEmpCl(\'monthly\',this)">Monthly</button>'
        + '<button class="tab-btn" onclick="filterEmpCl(\'all\',this)">All</button>'
        + '</div></div><div id="empClList" style="padding:16px;"></div></div>';
    el.innerHTML = html;
    _empClFilter = 'daily';
    window._empChecklists = d.myChecklists;
    renderEmpFullChecklists(d.myChecklists);
}

function filterEmpCl(filter, btn) {
    _empClFilter = filter;
    var parent = btn.parentNode;
    if (parent) {
        var btns = parent.querySelectorAll('.tab-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    }
    btn.classList.add('active');
    renderEmpFullChecklists(window._empChecklists || []);
}

function renderEmpFullChecklists(checklists) {
    var el = document.getElementById('empClList');
    if (!el) return;
    var filtered = [];
    for (var i = 0; i < checklists.length; i++) {
        var cl = checklists[i];
        var title = (cl.title || '').toLowerCase();
        if (_empClFilter === 'daily' && title.indexOf('daily') === -1) continue;
        if (_empClFilter === 'weekly' && title.indexOf('weekly') === -1) continue;
        if (_empClFilter === 'monthly' && title.indexOf('monthly') === -1) continue;
        filtered.push(cl);
    }
    if (filtered.length === 0) { el.innerHTML = '<div style="color:var(--gray);font-size:13px;">No ' + _empClFilter + ' checklists</div>'; return; }
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
        var cl = filtered[i];
        var total = cl.items ? cl.items.length : 0;
        var done = cl.items ? cl.items.filter(function(it) { return it.status === 'ok'; }).length : 0;
        var pct = total > 0 ? Math.round((done / total) * 100) : 0;
        html += '<div style="padding:10px 0;border-bottom:1px solid var(--light-gray);">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;">'
            + '<div><strong>' + (cl.title || '') + '</strong><span style="font-size:12px;color:var(--gray);margin-left:8px;">' + (cl.floor || '') + '</span></div>'
            + '<div style="display:flex;align-items:center;gap:8px;"><span class="badge ' + (cl.status === 'completed' ? 'badge-success' : 'badge-info') + '" style="font-size:11px;">' + (cl.status || 'active') + '</span><button class="btn btn-sm btn-outline" onclick="Router.navigate(\'checklists\')">Open</button></div>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">'
            + '<div style="flex:1;max-width:300px;height:6px;background:var(--light-gray);border-radius:3px;"><div style="height:100%;width:' + pct + '%;background:var(--success);border-radius:3px;"></div></div>'
            + '<span style="font-size:11px;color:var(--gray);">' + done + '/' + total + ' items</span>'
            + '</div></div>';
    }
    el.innerHTML = html;
}

function renderEmpRequestsSec() {
    var el = document.getElementById('empSectionRequests');
    if (!el) return;
    var d = _empData;
    var html = '<div class="card"><div class="card-header"><h3>📦 Material Requests (' + d.myRequests.length + ')</h3><button class="btn btn-sm btn-primary" onclick="Router.navigate(\'material-requests\')">+ New Request</button></div>'
        + '<div style="padding:16px;">';
    if (d.myRequests.length === 0) { html += '<div style="color:var(--gray);font-size:13px;">No material requests</div>'; }
    else {
        html += '<div class="table-responsive"><table class="table"><thead><tr><th>Title</th><th>Items</th><th>Date</th><th>Status</th><th>Approved By</th><th>Action</th></tr></thead><tbody>';
        for (var i = 0; i < d.myRequests.length; i++) {
            var r = d.myRequests[i];
            var badge = r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning';
            var itemsStr = '';
            if (r.items) {
                for (var j = 0; j < r.items.length; j++) {
                    itemsStr += r.items[j].name + ' x' + r.items[j].qty + (j < r.items.length - 1 ? ', ' : '');
                }
            }
            html += '<tr><td>' + (r.title || 'Request') + '</td>'
                + '<td style="font-size:12px;">' + (itemsStr || '-') + '</td>'
                + '<td style="font-size:12px;">' + APP.formatDate(r.createdAt) + '</td>'
                + '<td><span class="badge ' + badge + '" style="font-size:11px;">' + (r.status || 'pending') + '</span></td>'
                + '<td style="font-size:12px;">' + (r.approvedBy || '-') + '</td>'
                + '<td><button class="btn btn-sm btn-primary" onclick="Router.navigate(\'material-requests\')">Open</button></td></tr>';
        }
        html += '</tbody></table></div>';
    }
    html += '</div></div>';
    el.innerHTML = html;
}

function renderEmpLifecycleSec() {
    var el = document.getElementById('empSectionLifecycle');
    if (!el) return;
    var d = _empData;
    var html = '<div class="card"><div class="card-header"><h3>🔋 Product Lifecycle</h3></div><div style="padding:16px;">';
    if (d.deptInventory.length === 0) { html += '<div style="color:var(--gray);font-size:13px;">No inventory items found</div>'; }
    else {
        var now = new Date();
        html += '<div class="table-responsive"><table class="table"><thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Expiry</th><th>Warranty</th><th>Lifecycle</th></tr></thead><tbody>';
        for (var i = 0; i < d.deptInventory.length; i++) {
            var it = d.deptInventory[i];
            var expPct = null, warPct = null, expColor = '', warColor = '';
            if (it.expiryDate) {
                var exp = new Date(it.expiryDate);
                var daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (daysLeft > 365) { expPct = 100; expColor = 'var(--success)'; }
                else if (daysLeft > 90) { expPct = Math.round((daysLeft / 365) * 100); expColor = 'var(--success)'; }
                else if (daysLeft > 30) { expPct = Math.round((daysLeft / 365) * 100); expColor = 'var(--warning)'; }
                else if (daysLeft > 0) { expPct = Math.round((daysLeft / 365) * 100); expColor = 'var(--danger)'; }
                else { expPct = 0; expColor = 'var(--danger)'; }
                expPct = Math.max(0, Math.min(100, expPct));
            }
            if (it.warrantyDate) {
                var war = new Date(it.warrantyDate);
                var wDays = Math.ceil((war.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (wDays > 365) { warPct = 100; warColor = 'var(--success)'; }
                else if (wDays > 90) { warPct = Math.round((wDays / 365) * 100); warColor = 'var(--success)'; }
                else if (wDays > 30) { warPct = Math.round((wDays / 365) * 100); warColor = 'var(--warning)'; }
                else if (wDays > 0) { warPct = Math.round((wDays / 365) * 100); warColor = 'var(--danger)'; }
                else { warPct = 0; warColor = 'var(--danger)'; }
                warPct = Math.max(0, Math.min(100, warPct));
            }
            html += '<tr><td><strong>' + (it.name || '') + '</strong></td>'
                + '<td style="font-size:12px;">' + (it.category || '-') + '</td>'
                + '<td style="font-size:12px;">' + (it.quantity || 0) + '</td>'
                + '<td style="font-size:12px;">' + (it.expiryDate ? '<span style="color:' + expColor + ';">' + APP.formatDate(it.expiryDate) + '</span>' : '-') + '</td>'
                + '<td style="font-size:12px;">' + (it.warrantyDate ? '<span style="color:' + warColor + ';">' + APP.formatDate(it.warrantyDate) + '</span>' : '-') + '</td>'
                + '<td style="min-width:120px;">'
                + (it.expiryDate ? '<div style="display:flex;align-items:center;gap:4px;font-size:10px;margin-bottom:2px;"><span style="width:28px;">Exp</span><div style="flex:1;height:5px;background:var(--light-gray);border-radius:2px;"><div style="height:100%;width:' + expPct + '%;background:' + expColor + ';border-radius:2px;"></div></div></div>' : '')
                + (it.warrantyDate ? '<div style="display:flex;align-items:center;gap:4px;font-size:10px;"><span style="width:28px;">War</span><div style="flex:1;height:5px;background:var(--light-gray);border-radius:2px;"><div style="height:100%;width:' + warPct + '%;background:' + warColor + ';border-radius:2px;"></div></div></div>' : '')
                + '</td></tr>';
        }
        html += '</tbody></table></div>';
    }
    html += '</div></div>';
    el.innerHTML = html;
}

function renderEmpProjectsSec() {
    var el = document.getElementById('empSectionProjects');
    if (!el) return;
    var d = _empData;
    var html = '<div class="card"><div class="card-header"><h3>📋 My Projects (' + d.myProjects.length + ')</h3></div><div style="padding:16px;">';
    if (d.myProjects.length === 0) { html += '<div style="color:var(--gray);font-size:13px;">No projects assigned</div>'; }
    else {
        html += '<div class="table-responsive"><table class="table"><thead><tr><th>Project</th><th>Status</th><th>Budget</th><th>Spent</th><th>Progress</th></tr></thead><tbody>';
        for (var i = 0; i < d.myProjects.length; i++) {
            var p = d.myProjects[i];
            var pct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
            html += '<tr><td><strong>' + (p.name || '') + '</strong></td>'
                + '<td><span class="badge ' + APP.getStatusBadge(p.status) + '" style="font-size:11px;">' + (p.status || 'planning') + '</span></td>'
                + '<td style="font-size:12px;">₹' + (p.budget || 0).toLocaleString() + '</td>'
                + '<td style="font-size:12px;">₹' + (p.spent || 0).toLocaleString() + '</td>'
                + '<td style="min-width:100px;"><div style="display:flex;align-items:center;gap:4px;"><div style="flex:1;height:6px;background:var(--light-gray);border-radius:3px;"><div style="height:100%;width:' + pct + '%;background:' + (pct > 80 ? 'var(--danger)' : pct > 50 ? 'var(--warning)' : 'var(--success)') + ';border-radius:3px;"></div></div><span style="font-size:11px;color:var(--gray);">' + pct + '%</span></div></td>'
                + '</tr>';
        }
        html += '</tbody></table></div>';
    }
    html += '</div></div>';
    el.innerHTML = html;
}

function renderEmpReportsSec() {
    var el = document.getElementById('empSectionReports');
    if (!el) return;
    var d = _empData;
    var html = '<div class="card"><div class="card-header"><h3>📋 My Reports (' + d.myReports.length + ')</h3><button class="btn btn-sm btn-primary" onclick="showReportForm()">+ New Report</button></div><div style="padding:16px;">';
    if (d.myReports.length === 0) { html += '<div style="color:var(--gray);font-size:13px;">No reports submitted yet</div>'; }
    else {
        html += '<div class="table-responsive"><table class="table"><thead><tr><th>Title</th><th>Category</th><th>Sent To</th><th>Date</th><th>Status</th></tr></thead><tbody>';
        for (var i = d.myReports.length - 1; i >= 0; i--) {
            var r = d.myReports[i];
            html += '<tr><td>' + (r.title || '') + '</td>'
                + '<td style="font-size:12px;">' + (r.category || '-') + '</td>'
                + '<td style="font-size:12px;">' + (r.sentTo || '-') + '</td>'
                + '<td style="font-size:12px;">' + APP.formatDate(r.createdAt) + '</td>'
                + '<td><span class="badge ' + (r.status === 'sent' ? 'badge-success' : 'badge-warning') + '" style="font-size:11px;">' + (r.status || 'draft') + '</span></td></tr>';
        }
        html += '</tbody></table></div>';
    }
    html += '</div></div>';
    el.innerHTML = html;
}

function renderEmpPerformanceSec() {
    var el = document.getElementById('empSectionPerformance');
    if (!el) return;
    var d = _empData;
    var tasksDone = d.myTasks.filter(function(t) { return t.status === 'completed'; }).length;
    var problemsSolved = d.myProblems.filter(function(p) { return p.status === 'resolved'; }).length;
    var requestsApproved = d.myRequests.filter(function(r) { return r.status === 'approved'; }).length;
    var checklistsDone = d.myChecklists.filter(function(cl) { return cl.status === 'completed'; }).length;
    var taskRate = d.myTasks.length > 0 ? Math.round((tasksDone / d.myTasks.length) * 100) : 0;
    var probRate = d.myProblems.length > 0 ? Math.round((problemsSolved / d.myProblems.length) * 100) : 0;
    var reqRate = d.myRequests.length > 0 ? Math.round((requestsApproved / d.myRequests.length) * 100) : 0;
    var clRate = d.myChecklists.length > 0 ? Math.round((checklistsDone / d.myChecklists.length) * 100) : 0;

    var html = '<div class="card"><div class="card-header"><h3>📊 My Performance</h3></div><div style="padding:24px;">'
        + '<div class="grid-2" style="gap:24px;">'
        + '<div><h4 style="font-size:14px;margin-bottom:12px;">Task Completion</h4><div class="progress-bar" style="height:24px;border-radius:12px;"><div class="progress-fill" style="width:' + taskRate + '%;background:var(--success);height:100%;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;">' + taskRate + '%</div></div><div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px;color:var(--gray);"><span>' + tasksDone + ' completed</span><span>' + d.myTasks.length + ' total</span></div></div>'
        + '<div><h4 style="font-size:14px;margin-bottom:12px;">Problem Resolution</h4><div class="progress-bar" style="height:24px;border-radius:12px;"><div class="progress-fill" style="width:' + probRate + '%;background:var(--info);height:100%;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;">' + probRate + '%</div></div><div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px;color:var(--gray);"><span>' + problemsSolved + ' solved</span><span>' + d.myProblems.length + ' total</span></div></div>'
        + '<div><h4 style="font-size:14px;margin-bottom:12px;">Request Approval Rate</h4><div class="progress-bar" style="height:24px;border-radius:12px;"><div class="progress-fill" style="width:' + reqRate + '%;background:var(--warning);height:100%;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;">' + reqRate + '%</div></div><div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px;color:var(--gray);"><span>' + requestsApproved + ' approved</span><span>' + d.myRequests.length + ' total</span></div></div>'
        + '<div><h4 style="font-size:14px;margin-bottom:12px;">Checklist Completion</h4><div class="progress-bar" style="height:24px;border-radius:12px;"><div class="progress-fill" style="width:' + clRate + '%;background:var(--primary);height:100%;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;">' + clRate + '%</div></div><div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px;color:var(--gray);"><span>' + checklistsDone + ' completed</span><span>' + d.myChecklists.length + ' total</span></div></div>'
        + '</div></div></div>';
    el.innerHTML = html;
}

function showReportForm() {
    var user = AUTH.currentUser();
    if (!user) return;
    var html = '<form id="reportForm">'
        + '<div class="form-group"><label>Report Title</label><input type="text" name="title" class="form-control" required></div>'
        + '<div class="form-group"><label>Category</label><select name="category" class="form-control"><option value="daily">Daily Report</option><option value="weekly">Weekly Report</option><option value="monthly">Monthly Report</option><option value="custom">Custom Report</option></select></div>'
        + '<div class="form-group"><label>Send To</label><select name="sentTo" class="form-control"><option value="hod">HOD</option><option value="admin">Admin</option><option value="both">Both HOD & Admin</option></select></div>'
        + '<div class="form-group"><label>Description</label><textarea name="description" class="form-control" rows="5" required></textarea></div>'
        + '</form>';
    openFormModal('Submit Report', html, 'saveReport()', false);
}

function saveReport() {
    var user = AUTH.currentUser();
    if (!user) return false;
    var data = getFormData('reportForm');
    if (!data.title || !data.description) { APP.notify('Title and description required', 'error'); return false; }
    data.createdBy = user.username;
    data.createdByName = user.fullName;
    data.status = 'sent';
    DB.add('reports', data);
    APP.notify('Report submitted successfully', 'success');
    Router.navigate('employee-dashboard');
}
