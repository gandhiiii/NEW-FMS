var hodTab = 'overview';
var _hodCharts = [];

function destroyHodCharts() {
    _hodCharts.forEach(function(c) { try { c.destroy(); } catch(e) {} });
    _hodCharts = [];
}

function getDeptMaterials(dept) {
    var map = {
        'Radiology': ['X-ray Films','X-ray Color Pages','MRI Films','MRI Color Pages','CT Scan Films','CT Scan Color Pages','Open MRI Films','Open MRI Color Pages','Dexa Report','Dexa Color Pages','Sonography Report','Sonography Color Pages'],
        'Maintenance': ['Fittings Tools','Loose Hardware','Electrical Wires','PVC Pipes','Lubricants','Paint','Cement','Tiles','Screws & Nails','Sealants'],
        'IT': ['Connectivity Wire','Network Device','Computer','Telephone','WiFi Device','Printer','Access Device','Speaker','CCTV Camera','Storage Device','Server','Microphone','Keyboard','Mouse','Interactive Display','UPS']
    };
    return map[dept] || [];
}

function renderHodDashboard(container) {
    destroyHodCharts();
    var user = AUTH.currentUser();
    if (!user || (user.role !== 'hod' && user.role !== 'admin' && !user.isSuperAdmin)) {
        container.innerHTML = '<div class="empty-state">Access restricted to HOD and Admin</div>';
        return;
    }
    var isAdmin = user.role === 'admin' || user.isSuperAdmin;
    var dept = user.department || '';
    var deptMaterials = getDeptMaterials(dept);
    var isFacility = dept === 'Facility';
    var tabs = [
        { id: 'overview', label: 'Dashboard', icon: '📊' },
        { id: 'problems', label: 'Problems', icon: '🔧' },
        { id: 'tasks', label: 'Tasks', icon: '✅' },
        { id: 'materials', label: 'Material Requests', icon: '📦' },
        { id: 'checklist', label: 'Checklists', icon: '📋' },
        { id: 'breakdown', label: 'Daily Breakdown', icon: '📉' },
        { id: 'maintenance', label: 'Maintenance Identifier', icon: '🔄' },
        { id: 'leave', label: 'Leave Approvals', icon: '🏖️' },
        { id: 'daily-mat', label: 'Daily Material Use', icon: '📝' },
        { id: 'reports', label: 'Reports', icon: '📊' },
        { id: 'audit', label: 'Self Audit', icon: '📋' }
    ];
    if (isFacility) tabs.push({ id: 'sub-inv', label: 'Sub Inventory', icon: '📦' });

    var tabBtns = tabs.map(function(t) {
        return '<button class="tab-btn ' + (hodTab === t.id ? 'active' : '') + '" onclick="switchHodTab(\'' + t.id + '\',this)">' + t.icon + ' ' + t.label + '</button>';
    }).join('');

    container.innerHTML =
        '<div style="margin-bottom:12px;"><h2 style="font-size:18px;font-weight:700;">\uD83C\uDFE2 ' + dept + ' Department - HOD Dashboard</h2></div>' +
        '<div class="tabs" style="flex-wrap:wrap;gap:4px;">' + tabBtns + '</div>' +
        '<div id="hodContent" style="margin-top:12px;"></div>';

    renderHodOverview();
}

function switchHodTab(tab, btn) {
    hodTab = tab;
    document.querySelectorAll('#pageContent .tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var fns = {
        overview: renderHodOverview,
        problems: renderHodProblems,
        tasks: renderHodTasks,
        materials: renderHodMaterials,
        checklist: renderHodChecklist,
        breakdown: renderHodBreakdown,
        maintenance: renderHodMaintenance,
        leave: renderHodLeave,
        'daily-mat': renderHodDailyMat,
        'sub-inv': renderHodSubInv,
        reports: renderHodReports,
        audit: renderHodAudit
    };
    if (fns[tab]) fns[tab]();
}

/* ─── Helpers ─── */

function getDeptUsers() {
    var user = AUTH.currentUser();
    var isAdmin = user.role === 'admin' || user.isSuperAdmin;
    var all = DB.get('users') || [];
    if (isAdmin) return all;
    return all.filter(function(u) { return u.department === user.department && u.role !== 'admin'; });
}

function getDeptFilter() {
    var user = AUTH.currentUser();
    if (user.role === 'admin' || user.isSuperAdmin) return {};
    return { department: user.department };
}

function filterByDept(items) {
    var user = AUTH.currentUser();
    if (user.role === 'admin' || user.isSuperAdmin) return items || [];
    return (items || []).filter(function(i) { return i.department === user.department; });
}

function computeTAT(createdAt, completedAt) {
    if (!createdAt) return '-';
    var start = new Date(createdAt);
    var end = completedAt ? new Date(completedAt) : new Date();
    var diffMs = end - start;
    if (diffMs < 0) return '-';
    var hrs = Math.floor(diffMs / 3600000);
    var mins = Math.floor((diffMs % 3600000) / 60000);
    if (hrs >= 24) { var d = Math.floor(hrs / 24); return d + 'd ' + (hrs % 24) + 'h'; }
    return hrs + 'h ' + mins + 'm';
}

function getTATColor(tat) {
    if (tat === '-' || !tat) return '';
    var parts = tat.split(' ');
    if (parts.length === 2) {
        var val = parseInt(parts[0]);
        if (parts[1] === 'd' || parts[1] === 'd') return val > 3 ? 'red' : (val > 1 ? 'yellow' : 'green');
        if (parts[1] === 'h') return val > 8 ? 'red' : (val > 4 ? 'yellow' : 'green');
    }
    return 'green';
}

/* ─── OVERVIEW TAB ─── */

function renderHodOverview() {
    var el = document.getElementById('hodContent');
    if (!el) return;
    destroyHodCharts();
    var user = AUTH.currentUser();
    var dept = user.department || '';
    var tasks = filterByDept(DB.get('tasks'));
    var problems = filterByDept(DB.get('problems'));
    var mrs = filterByDept(DB.get('material_requests'));
    var leaves = filterByDept(DB.get('leave_requests'));
    var breakdowns = filterByDept(DB.get('daily_breakdown'));
    var checklists = filterByDept(DB.get('checklists'));
    var deptUsers = getDeptUsers();

    var tTotal = tasks.length;
    var tDone = tasks.filter(function(t) { return t.status === 'completed'; }).length;
    var tRate = tTotal > 0 ? Math.round(tDone / tTotal * 100) : 0;
    var pTotal = problems.length;
    var pDone = problems.filter(function(p) { return p.status === 'resolved'; }).length;
    var pRate = pTotal > 0 ? Math.round(pDone / pTotal * 100) : 0;
    var mTotal = mrs.length;
    var mApproved = mrs.filter(function(m) { return m.status === 'approved'; }).length;
    var lPending = leaves.filter(function(l) { return l.status === 'pending'; }).length;
    var bToday = breakdowns.filter(function(b) { var d = new Date(b.date || b.createdAt); var t = new Date(); return d.toDateString() === t.toDateString(); }).length;

    var html =
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px;">' +
            '<div class="card" style="text-align:center;padding:14px;"><div style="font-size:24px;font-weight:700;color:#1a73e8;">' + deptUsers.length + '</div><div style="font-size:11px;color:#888;">Team Members</div></div>' +
            '<div class="card" style="text-align:center;padding:14px;"><div style="font-size:24px;font-weight:700;color:#34a853;">' + tDone + '/' + tTotal + '</div><div style="font-size:11px;color:#888;">Tasks (' + tRate + '%)</div></div>' +
            '<div class="card" style="text-align:center;padding:14px;"><div style="font-size:24px;font-weight:700;color:#fbbc04;">' + pDone + '/' + pTotal + '</div><div style="font-size:11px;color:#888;">Problems (' + pRate + '%)</div></div>' +
            '<div class="card" style="text-align:center;padding:14px;"><div style="font-size:24px;font-weight:700;color:#ea4335;">' + mApproved + '/' + mTotal + '</div><div style="font-size:11px;color:#888;">Materials Approved</div></div>' +
            '<div class="card" style="text-align:center;padding:14px;"><div style="font-size:24px;font-weight:700;color:#7b1fa2;">' + lPending + '</div><div style="font-size:11px;color:#888;">Pending Leaves</div></div>' +
            '<div class="card" style="text-align:center;padding:14px;"><div style="font-size:24px;font-weight:700;color:#00bcd4;">' + bToday + '</div><div style="font-size:11px;color:#888;">Today Breakdowns</div></div>' +
        '</div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">' +
        '<div class="card"><div class="card-header"><h3>\uD83D\uDCCA Task Status</h3></div><div style="height:180px;"><canvas id="hodTaskChart"></canvas></div></div>' +
        '<div class="card"><div class="card-header"><h3>\uD83D\uDD04 Problem Status</h3></div><div style="height:180px;"><canvas id="hodProbChart"></canvas></div></div>' +
    '</div>';

    html += '<div class="card"><div class="card-header"><h3>\uD83D\uDC65 Team Members</h3></div><div class="table-responsive"><table><thead><tr><th>Name</th><th>Role</th><th>Tasks</th><th>Problems</th><th>Status</th></tr></thead><tbody>';
    deptUsers.forEach(function(u) {
        if (u.role === 'admin' || u.isSuperAdmin) return;
        var ut = tasks.filter(function(t) { return t.assignedTo === u.fullName; });
        var utDone = ut.filter(function(t) { return t.status === 'completed'; }).length;
        var up = problems.filter(function(p) { return p.assignedTo === u.fullName || p.createdBy === u.fullName; });
        var upDone = up.filter(function(p) { return p.status === 'resolved'; }).length;
        var avgTat = '-';
        var doneTasks = ut.filter(function(t) { return t.completedAt; });
        if (doneTasks.length) {
            var totalHrs = 0;
            doneTasks.forEach(function(t) { if (t.createdAt && t.completedAt) totalHrs += (new Date(t.completedAt) - new Date(t.createdAt)) / 3600000; });
            avgTat = doneTasks.length > 0 ? Math.round(totalHrs / doneTasks.length) + 'h avg' : '-';
        }
        html += '<tr><td><strong>' + u.fullName + '</strong></td><td><span class="badge ' + APP.getRoleBadge(u.role) + '">' + u.role + '</span></td><td>' + utDone + '/' + ut.length + '</td><td>' + upDone + '/' + up.length + '</td><td><span style="font-size:11px;color:#888;">TAT: ' + avgTat + '</span></td></tr>';
    });
    html += '</tbody></table></div></div>';

    el.innerHTML = html;

    setTimeout(function() {
        var taskSt = { 'Pending': 0, 'In Progress': 0, 'Completed': 0 };
        tasks.forEach(function(t) {
            if (t.status === 'pending') taskSt['Pending']++;
            else if (t.status === 'in-progress') taskSt['In Progress']++;
            else if (t.status === 'completed') taskSt['Completed']++;
        });
        var tLabels = Object.keys(taskSt);
        var tData = tLabels.map(function(k) { return taskSt[k]; });
        try {
            var c1 = new Chart(document.getElementById('hodTaskChart').getContext('2d'), {
                type: 'doughnut', data: { labels: tLabels, datasets: [{ data: tData, backgroundColor: ['#fbbc04','#1a73e8','#34a853'], borderColor: '#fff', borderWidth: 1 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
            });
            _hodCharts.push(c1);
        } catch(e) {}
        var probSt = { 'Open': 0, 'Resolved': 0 };
        problems.forEach(function(p) { if (p.status === 'resolved') probSt['Resolved']++; else probSt['Open']++; });
        var pLabels = Object.keys(probSt);
        var pData = pLabels.map(function(k) { return probSt[k]; });
        try {
            var c2 = new Chart(document.getElementById('hodProbChart').getContext('2d'), {
                type: 'doughnut', data: { labels: pLabels, datasets: [{ data: pData, backgroundColor: ['#ea4335','#34a853'], borderColor: '#fff', borderWidth: 1 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
            });
            _hodCharts.push(c2);
        } catch(e) {}
    }, 100);
}

/* ─── PROBLEMS TAB ─── */

function renderHodProblems() {
    var el = document.getElementById('hodContent');
    if (!el) return;
    var user = AUTH.currentUser();
    var isAdmin = user.role === 'admin' || user.isSuperAdmin;
    var problems = filterByDept(DB.get('problems'));
    var deptUsers = getDeptUsers();

    var html =
        '<div style="margin-bottom:10px;"><button class="btn btn-primary" onclick="showHodProblemForm()">+ Report Problem</button></div>' +
        '<div class="card"><div class="table-responsive"><table><thead><tr><th>Title</th><th>Area</th><th>Reported By</th><th>Priority</th><th>TAT</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    if (!problems.length) {
        html += '<tr><td colspan="7" class="empty-state">No problems reported</td></tr>';
    } else {
        problems.slice().reverse().forEach(function(p) {
            var tat = computeTAT(p.createdAt, p.resolvedAt);
            var tatCol = getTATColor(tat);
            html += '<tr>' +
                '<td><strong>' + p.title + '</strong></td>' +
                '<td>' + (p.area || '-') + '</td>' +
                '<td>' + (p.createdBy || '-') + '</td>' +
                '<td><span class="badge ' + (p.priority === 'high' ? 'badge-danger' : p.priority === 'medium' ? 'badge-warning' : 'badge-info') + '">' + (p.priority || 'normal') + '</span></td>' +
                '<td><span style="color:var(--' + tatCol + ');font-weight:600;">' + tat + '</span></td>' +
                '<td>' + APP.getStatusBadge(p.status || 'open') + '</td>' +
                '<td>' +
                    (p.status !== 'resolved' ? '<button class="btn btn-sm btn-success" onclick="resolveHodProblem(\'' + p.id + '\')">Resolve</button> ' : '') +
                    (isAdmin || p.createdBy === user.fullName ? '<button class="btn btn-sm btn-danger" onclick="deleteHodProblem(\'' + p.id + '\')">Del</button>' : '') +
                '</td></tr>';
        });
    }
    html += '</tbody></table></div></div>';
    el.innerHTML = html;
}

function showHodProblemForm(data) {
    data = data || {};
    var user = AUTH.currentUser();
    var deptUsers = getDeptUsers();
    var memberOpts = deptUsers.filter(function(u) { return u.role !== 'admin'; }).map(function(u) { return '<option value="' + u.fullName + '" ' + (data.assignedTo === u.fullName ? 'selected' : '') + '>' + u.fullName + '</option>'; }).join('');
    openFormModal('Report Problem',
        '<div class="form-group"><label>Title *</label><input type="text" id="hpTitle" class="form-control" value="' + (data.title || '') + '"></div>' +
        '<div class="form-group"><label>Area</label><input type="text" id="hpArea" class="form-control" value="' + (data.area || '') + '"></div>' +
        '<div class="form-group"><label>Assign To</label><select id="hpAssigned" class="form-control"><option value="">Select</option>' + memberOpts + '</select></div>' +
        '<div class="form-group"><label>Priority</label><select id="hpPriority" class="form-control">' +
            '<option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option>' +
        '</select></div>' +
        '<div class="form-group"><label>Description</label><textarea id="hpDesc" class="form-control" rows="3">' + (data.description || '') + '</textarea></div>',
        'saveHodProblem(\'' + (data.id || '') + '\')'
    );
}

function saveHodProblem(editId) {
    var title = document.getElementById('hpTitle').value.trim();
    if (!title) { APP.notify('Enter title', 'error'); return false; }
    var user = AUTH.currentUser();
    var data = {
        title: title,
        area: document.getElementById('hpArea').value.trim(),
        assignedTo: document.getElementById('hpAssigned').value,
        priority: document.getElementById('hpPriority').value,
        description: document.getElementById('hpDesc').value.trim(),
        department: user.department || '',
        createdBy: user.fullName,
        createdAt: new Date().toISOString(),
        status: 'open'
    };
    if (editId) {
        data.id = editId;
        DB.update('problems', editId, data);
        APP.notify('Problem updated', 'success');
    } else {
        DB.add('problems', data);
        APP.notify('Problem reported', 'success');
    }
    renderHodProblems();
    return true;
}

function resolveHodProblem(id) {
    if (!confirm('Mark as resolved?')) return;
    DB.update('problems', id, { status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy: AUTH.currentUser().fullName });
    APP.notify('Problem resolved', 'success');
    renderHodProblems();
}

function deleteHodProblem(id) {
    if (!confirm('Delete this problem?')) return;
    DB.delete('problems', id);
    APP.notify('Problem deleted', 'success');
    renderHodProblems();
}

/* ─── TASKS TAB ─── */

function renderHodTasks() {
    var el = document.getElementById('hodContent');
    if (!el) return;
    var user = AUTH.currentUser();
    var isAdmin = user.role === 'admin' || user.isSuperAdmin;
    var tasks = filterByDept(DB.get('tasks'));
    var deptUsers = getDeptUsers();

    var html =
        '<div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button class="btn btn-primary" onclick="showHodTaskForm()">+ Assign Task</button>' +
        '</div>' +
        '<div class="card"><div class="table-responsive"><table><thead><tr><th>Title</th><th>Assigned To</th><th>Priority</th><th>Deadline</th><th>TAT</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    if (!tasks.length) {
        html += '<tr><td colspan="7" class="empty-state">No tasks</td></tr>';
    } else {
        tasks.slice().reverse().forEach(function(t) {
            var tat = computeTAT(t.createdAt, t.completedAt);
            var tatCol = getTATColor(tat);
            html += '<tr>' +
                '<td><strong>' + t.title + '</strong></td>' +
                '<td>' + (t.assignedTo || '-') + '</td>' +
                '<td><span class="badge ' + (t.priority === 'high' ? 'badge-danger' : t.priority === 'medium' ? 'badge-warning' : 'badge-info') + '">' + (t.priority || 'normal') + '</span></td>' +
                '<td>' + (t.deadline ? APP.formatDate(t.deadline) : '-') + '</td>' +
                '<td><span style="color:var(--' + tatCol + ');font-weight:600;">' + tat + '</span></td>' +
                '<td>' + APP.getStatusBadge(t.status || 'pending') + '</td>' +
                '<td>' +
                    (t.status !== 'completed' ? '<button class="btn btn-sm btn-primary" onclick="editHodTask(\'' + t.id + '\')">Edit</button> ' : '') +
                    '<button class="btn btn-sm btn-danger" onclick="deleteHodTask(\'' + t.id + '\')">Del</button>' +
                '</td></tr>';
        });
    }
    html += '</tbody></table></div></div>';
    el.innerHTML = html;
}

function showHodTaskForm(data) {
    data = data || {};
    var deptUsers = getDeptUsers();
    var memberOpts = deptUsers.filter(function(u) { return u.role !== 'admin'; }).map(function(u) { return '<option value="' + u.fullName + '" ' + (data.assignedTo === u.fullName ? 'selected' : '') + '>' + u.fullName + '</option>'; }).join('');
    openFormModal(data.id ? 'Edit Task' : 'Assign Task',
        '<div class="form-group"><label>Title *</label><input type="text" id="htTitle" class="form-control" value="' + (data.title || '') + '"></div>' +
        '<div class="form-group"><label>Assigned To</label><select id="htAssigned" class="form-control"><option value="">Select</option>' + memberOpts + '</select></div>' +
        '<div class="form-group"><label>Priority</label><select id="htPriority" class="form-control">' +
            '<option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option>' +
        '</select></div>' +
        '<div class="form-group"><label>Deadline</label><input type="date" id="htDeadline" class="form-control" value="' + (data.deadline || '') + '"></div>' +
        '<div class="form-group"><label>Description</label><textarea id="htDesc" class="form-control" rows="3">' + (data.description || '') + '</textarea></div>',
        'saveHodTask(\'' + (data.id || '') + '\')'
    );
}

function saveHodTask(editId) {
    var title = document.getElementById('htTitle').value.trim();
    if (!title) { APP.notify('Enter title', 'error'); return false; }
    var user = AUTH.currentUser();
    var data = {
        title: title,
        assignedTo: document.getElementById('htAssigned').value,
        priority: document.getElementById('htPriority').value,
        deadline: document.getElementById('htDeadline').value,
        description: document.getElementById('htDesc').value.trim(),
        department: user.department || '',
        createdBy: user.fullName,
        createdAt: new Date().toISOString(),
        status: 'pending'
    };
    if (editId) {
        data.id = editId;
        DB.update('tasks', editId, data);
        APP.notify('Task updated', 'success');
    } else {
        DB.add('tasks', data);
        APP.notify('Task assigned', 'success');
    }
    renderHodTasks();
    return true;
}

function editHodTask(id) {
    var task = DB.getById('tasks', id);
    if (task) showHodTaskForm(task);
}

function deleteHodTask(id) {
    if (!confirm('Delete this task?')) return;
    DB.delete('tasks', id);
    APP.notify('Task deleted', 'success');
    renderHodTasks();
}

/* ─── MATERIAL REQUESTS TAB ─── */

function renderHodMaterials() {
    var el = document.getElementById('hodContent');
    if (!el) return;
    var user = AUTH.currentUser();
    var mrs = filterByDept(DB.get('material_requests'));

    var html =
        '<div style="margin-bottom:10px;"><button class="btn btn-primary" onclick="showHodMrForm()">+ New Request</button></div>' +
        '<div class="card"><div class="table-responsive"><table><thead><tr><th>Title</th><th>Requested By</th><th>Urgency</th><th>HOD Status</th><th>Store Status</th><th>TAT</th><th>Actions</th></tr></thead><tbody>';
    if (!mrs.length) {
        html += '<tr><td colspan="7" class="empty-state">No material requests</td></tr>';
    } else {
        mrs.slice().reverse().forEach(function(m) {
            var tat = computeTAT(m.createdAt, m.storeApprovedAt || m.updatedAt);
            var tatCol = getTATColor(tat);
            var hodStatus = m.hodStatus || (m.status === 'approved' ? 'Approved' : m.status === 'rejected' ? 'Rejected' : 'Pending');
            var storeStatus = m.storeStatus || (m.status === 'store_approved' ? 'Approved' : m.status === 'store_rejected' ? 'Rejected' : 'Pending');
            html += '<tr>' +
                '<td><strong>' + m.title + '</strong></td>' +
                '<td>' + (m.requestedBy || '-') + '</td>' +
                '<td><span class="badge ' + (m.urgency === 'urgent' ? 'badge-danger' : 'badge-warning') + '">' + (m.urgency || 'normal') + '</span></td>' +
                '<td>' + APP.getStatusBadge(hodStatus) + '</td>' +
                '<td>' + APP.getStatusBadge(storeStatus) + '</td>' +
                '<td><span style="color:var(--' + tatCol + ');font-weight:600;">' + tat + '</span></td>' +
                '<td>' +
                    (m.hodStatus !== 'approved' && m.hodStatus !== 'rejected' ? '<button class="btn btn-sm btn-success" onclick="approveHodMr(\'' + m.id + '\')">Approve</button> ' : '') +
                    (m.hodStatus !== 'approved' && m.hodStatus !== 'rejected' ? '<button class="btn btn-sm btn-warning" onclick="rejectHodMr(\'' + m.id + '\')">Reject</button> ' : '') +
                '</td></tr>';
        });
    }
    html += '</tbody></table></div></div>';
    el.innerHTML = html;
}

function showHodMrForm(data) {
    data = data || {};
    openFormModal('New Material Request',
        '<div class="form-group"><label>Title *</label><input type="text" id="hmTitle" class="form-control" value="' + (data.title || '') + '"></div>' +
        '<div class="form-group"><label>Description</label><textarea id="hmDesc" class="form-control" rows="3">' + (data.description || '') + '</textarea></div>' +
        '<div class="form-group"><label>Urgency</label><select id="hmUrgency" class="form-control">' +
            '<option value="normal">Normal</option><option value="urgent">Urgent</option>' +
        '</select></div>',
        'saveHodMr(\'' + (data.id || '') + '\')'
    );
}

function saveHodMr(editId) {
    var title = document.getElementById('hmTitle').value.trim();
    if (!title) { APP.notify('Enter title', 'error'); return false; }
    var user = AUTH.currentUser();
    var data = {
        title: title,
        description: document.getElementById('hmDesc').value.trim(),
        urgency: document.getElementById('hmUrgency').value,
        requestedBy: user.fullName,
        department: user.department || '',
        hodStatus: 'pending',
        storeStatus: 'pending',
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    if (editId) {
        DB.update('material_requests', editId, data);
        APP.notify('Request updated', 'success');
    } else {
        DB.add('material_requests', data);
        APP.notify('Request created', 'success');
    }
    renderHodMaterials();
    return true;
}

function approveHodMr(id) {
    if (!confirm('Approve this request?')) return;
    DB.update('material_requests', id, { hodStatus: 'approved', status: 'hod_approved', approvedBy: AUTH.currentUser().fullName, approvedAt: new Date().toISOString() });
    APP.notify('Request approved, sent to store', 'success');
    renderHodMaterials();
}

function rejectHodMr(id) {
    if (!confirm('Reject this request?')) return;
    DB.update('material_requests', id, { hodStatus: 'rejected', status: 'hod_rejected' });
    APP.notify('Request rejected', 'info');
    renderHodMaterials();
}

/* ─── CHECKLIST TAB ─── */

function renderHodChecklist() {
    var el = document.getElementById('hodContent');
    if (!el) return;
    var user = AUTH.currentUser();
    var allCls = filterByDept(DB.get('checklists'));
    var deptUsers = getDeptUsers();

    var html =
        '<div style="margin-bottom:10px;"><button class="btn btn-primary" onclick="showHodClForm()">+ New Checklist</button></div>' +
        '<div class="card"><div class="table-responsive"><table><thead><tr><th>Title</th><th>Assigned To</th><th>Items</th><th>Done</th><th>Status</th><th>TAT</th><th>Actions</th></tr></thead><tbody>';
    if (!allCls.length) {
        html += '<tr><td colspan="7" class="empty-state">No checklists</td></tr>';
    } else {
        allCls.slice().reverse().forEach(function(c) {
            var items = c.items || [];
            var done = items.filter(function(i) { return i.status && i.status !== 'pending'; }).length;
            var tat = computeTAT(c.createdAt, c.completedAt);
            var tatCol = getTATColor(tat);
            html += '<tr>' +
                '<td><strong>' + c.title + '</strong></td>' +
                '<td>' + (c.assignedTo || '-') + '</td>' +
                '<td>' + items.length + '</td>' +
                '<td>' + done + '</td>' +
                '<td>' + APP.getStatusBadge(c.status || 'pending') + '</td>' +
                '<td><span style="color:var(--' + tatCol + ');font-weight:600;">' + tat + '</span></td>' +
                '<td><button class="btn btn-sm btn-danger" onclick="deleteHodCl(\'' + c.id + '\')">Del</button></td></tr>';
        });
    }
    html += '</tbody></table></div></div>';
    el.innerHTML = html;
}

function showHodClForm(data) {
    data = data || {};
    var deptUsers = getDeptUsers();
    var memberOpts = deptUsers.filter(function(u) { return u.role !== 'admin'; }).map(function(u) { return '<option value="' + u.fullName + '" ' + (data.assignedTo === u.fullName ? 'selected' : '') + '>' + u.fullName + '</option>'; }).join('');
    openFormModal('New Checklist',
        '<div class="form-group"><label>Title *</label><input type="text" id="hcTitle" class="form-control" value="' + (data.title || '') + '"></div>' +
        '<div class="form-group"><label>Assigned To</label><select id="hcAssigned" class="form-control"><option value="">Select</option>' + memberOpts + '</select></div>' +
        '<div class="form-group"><label>Floor</label><input type="text" id="hcFloor" class="form-control" value="' + (data.floor || '') + '"></div>' +
        '<div class="form-group"><label>Items (comma-separated)</label><input type="text" id="hcItems" class="form-control" placeholder="Clean windows, Mop floor, ..." value="' + ((data.items || []).map(function(i) { return i.text || i; }).join(', ')) + '"></div>',
        'saveHodCl(\'' + (data.id || '') + '\')'
    );
}

function saveHodCl(editId) {
    var title = document.getElementById('hcTitle').value.trim();
    if (!title) { APP.notify('Enter title', 'error'); return false; }
    var user = AUTH.currentUser();
    var itemsStr = document.getElementById('hcItems').value;
    var items = itemsStr.split(',').map(function(s) { return s.trim(); }).filter(Boolean).map(function(s) { return { text: s, status: 'pending' }; });
    var data = {
        title: title,
        assignedTo: document.getElementById('hcAssigned').value,
        floor: document.getElementById('hcFloor').value.trim(),
        items: items,
        department: user.department || '',
        createdBy: user.fullName,
        createdAt: new Date().toISOString(),
        status: 'pending'
    };
    if (editId) {
        DB.update('checklists', editId, data);
        APP.notify('Checklist updated', 'success');
    } else {
        DB.add('checklists', data);
        APP.notify('Checklist created', 'success');
    }
    renderHodChecklist();
    return true;
}

function deleteHodCl(id) {
    if (!confirm('Delete this checklist?')) return;
    DB.delete('checklists', id);
    APP.notify('Checklist deleted', 'success');
    renderHodChecklist();
}

/* ─── DAILY BREAKDOWN TAB ─── */

function renderHodBreakdown() {
    var el = document.getElementById('hodContent');
    if (!el) return;
    var user = AUTH.currentUser();
    var breakdowns = filterByDept(DB.get('daily_breakdown'));
    var deptUsers = getDeptUsers();

    var html =
        '<div style="margin-bottom:10px;"><button class="btn btn-primary" onclick="showHodBdForm()">+ Report Breakdown</button></div>' +
        '<div class="card"><div class="table-responsive"><table><thead><tr><th>Title</th><th>Area</th><th>Reported By</th><th>Date</th><th>TAT</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    if (!breakdowns.length) {
        html += '<tr><td colspan="7" class="empty-state">No breakdowns reported</td></tr>';
    } else {
        breakdowns.slice().reverse().forEach(function(b) {
            var tat = computeTAT(b.createdAt, b.resolvedAt);
            var tatCol = getTATColor(tat);
            html += '<tr>' +
                '<td><strong>' + b.title + '</strong></td>' +
                '<td>' + (b.area || '-') + '</td>' +
                '<td>' + (b.reportedBy || '-') + '</td>' +
                '<td>' + (b.date ? APP.formatDate(b.date) : '-') + '</td>' +
                '<td><span style="color:var(--' + tatCol + ');font-weight:600;">' + tat + '</span></td>' +
                '<td>' + APP.getStatusBadge(b.status || 'open') + '</td>' +
                '<td>' +
                    (b.status !== 'resolved' ? '<button class="btn btn-sm btn-success" onclick="resolveHodBd(\'' + b.id + '\')">Resolve</button> ' : '') +
                    '<button class="btn btn-sm btn-danger" onclick="deleteHodBd(\'' + b.id + '\')">Del</button>' +
                '</td></tr>';
        });
    }
    html += '</tbody></table></div></div>';
    el.innerHTML = html;
}

function showHodBdForm(data) {
    data = data || {};
    var deptUsers = getDeptUsers();
    var memberOpts = deptUsers.filter(function(u) { return u.role !== 'admin'; }).map(function(u) { return '<option value="' + u.fullName + '" ' + (data.assignedTo === u.fullName ? 'selected' : '') + '>' + u.fullName + '</option>'; }).join('');
    openFormModal('Report Breakdown',
        '<div class="form-group"><label>Title *</label><input type="text" id="hbTitle" class="form-control" value="' + (data.title || '') + '"></div>' +
        '<div class="form-group"><label>Area</label><input type="text" id="hbArea" class="form-control" value="' + (data.area || '') + '"></div>' +
        '<div class="form-group"><label>Assigned To</label><select id="hbAssigned" class="form-control"><option value="">Select</option>' + memberOpts + '</select></div>' +
        '<div class="form-group"><label>Date</label><input type="date" id="hbDate" class="form-control" value="' + (data.date || new Date().toISOString().split('T')[0]) + '"></div>' +
        '<div class="form-group"><label>Description</label><textarea id="hbDesc" class="form-control" rows="3">' + (data.description || '') + '</textarea></div>',
        'saveHodBd(\'' + (data.id || '') + '\')'
    );
}

function saveHodBd(editId) {
    var title = document.getElementById('hbTitle').value.trim();
    if (!title) { APP.notify('Enter title', 'error'); return false; }
    var user = AUTH.currentUser();
    var data = {
        title: title,
        area: document.getElementById('hbArea').value.trim(),
        assignedTo: document.getElementById('hbAssigned').value,
        date: document.getElementById('hbDate').value,
        description: document.getElementById('hbDesc').value.trim(),
        department: user.department || '',
        reportedBy: user.fullName,
        createdAt: new Date().toISOString(),
        status: 'open'
    };
    if (editId) {
        DB.update('daily_breakdown', editId, data);
        APP.notify('Breakdown updated', 'success');
    } else {
        DB.add('daily_breakdown', data);
        APP.notify('Breakdown reported', 'success');
    }
    renderHodBreakdown();
    return true;
}

function resolveHodBd(id) {
    if (!confirm('Mark as resolved?')) return;
    DB.update('daily_breakdown', id, { status: 'resolved', resolvedAt: new Date().toISOString() });
    APP.notify('Breakdown resolved', 'success');
    renderHodBreakdown();
}

function deleteHodBd(id) {
    if (!confirm('Delete this breakdown?')) return;
    DB.delete('daily_breakdown', id);
    APP.notify('Breakdown deleted', 'success');
    renderHodBreakdown();
}

/* ─── FREQUENT MAINTENANCE IDENTIFIER ─── */

function renderHodMaintenance() {
    var el = document.getElementById('hodContent');
    if (!el) return;
    var problems = filterByDept(DB.get('problems'));
    var breakdowns = filterByDept(DB.get('daily_breakdown'));

    var freqMap = {};
    problems.concat(breakdowns).forEach(function(item) {
        var key = (item.title || '').toLowerCase().trim();
        if (!key) return;
        if (!freqMap[key]) freqMap[key] = { title: item.title, count: 0, lastDate: '', status: '' };
        freqMap[key].count++;
        var d = item.resolvedAt || item.createdAt || item.date;
        if (d && d > freqMap[key].lastDate) freqMap[key].lastDate = d;
        if (item.status === 'open' || item.status === 'pending') freqMap[key].status = 'Open';
    });

    var sorted = Object.keys(freqMap).map(function(k) { return freqMap[k]; }).sort(function(a, b) { return b.count - a.count; });

    var html =
        '<div class="card"><div class="card-header"><h3>\uD83D\uDD04 Frequent Maintenance Issues</h3></div>' +
        '<div class="table-responsive"><table><thead><tr><th>#</th><th>Issue</th><th>Occurrences</th><th>Last Occurrence</th><th>Status</th></tr></thead><tbody>';
    if (!sorted.length) {
        html += '<tr><td colspan="5" class="empty-state">No maintenance data</td></tr>';
    } else {
        sorted.slice(0, 30).forEach(function(f, i) {
            html += '<tr>' +
                '<td>' + (i + 1) + '</td>' +
                '<td><strong>' + f.title + '</strong></td>' +
                '<td><span class="badge ' + (f.count >= 5 ? 'badge-danger' : f.count >= 3 ? 'badge-warning' : 'badge-info') + '">' + f.count + 'x</span></td>' +
                '<td>' + (f.lastDate ? APP.formatDate(f.lastDate) : '-') + '</td>' +
                '<td>' + (f.status === 'Open' ? '<span class="badge badge-warning">Open</span>' : '<span class="badge badge-success">Resolved</span>') + '</td>' +
            '</tr>';
        });
    }
    html += '</tbody></table></div></div>';
    el.innerHTML = html;
}

/* ─── LEAVE APPROVALS TAB ─── */

function renderHodLeave() {
    var el = document.getElementById('hodContent');
    if (!el) return;
    var leaves = filterByDept(DB.get('leave_requests'));

    var html =
        '<div style="margin-bottom:10px;"><button class="btn btn-primary" onclick="showHodLeaveForm()">+ Request Leave</button></div>' +
        '<div class="card"><div class="table-responsive"><table><thead><tr><th>Employee</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    if (!leaves.length) {
        html += '<tr><td colspan="6" class="empty-state">No leave requests</td></tr>';
    } else {
        leaves.slice().reverse().forEach(function(l) {
            html += '<tr>' +
                '<td><strong>' + (l.employeeName || '-') + '</strong></td>' +
                '<td>' + (l.fromDate ? APP.formatDate(l.fromDate) : '-') + '</td>' +
                '<td>' + (l.toDate ? APP.formatDate(l.toDate) : '-') + '</td>' +
                '<td>' + (l.reason || '-') + '</td>' +
                '<td>' + APP.getStatusBadge(l.status || 'pending') + '</td>' +
                '<td>' +
                    (l.status === 'pending' ? '<button class="btn btn-sm btn-success" onclick="approveHodLeave(\'' + l.id + '\')">Approve</button> ' : '') +
                    (l.status === 'pending' ? '<button class="btn btn-sm btn-warning" onclick="rejectHodLeave(\'' + l.id + '\')">Reject</button> ' : '') +
                    '<button class="btn btn-sm btn-danger" onclick="deleteHodLeave(\'' + l.id + '\')">Del</button>' +
                '</td></tr>';
        });
    }
    html += '</tbody></table></div></div>';
    el.innerHTML = html;
}

function showHodLeaveForm(data) {
    data = data || {};
    var user = AUTH.currentUser();
    openFormModal('Request Leave',
        '<div class="form-group"><label>From Date *</label><input type="date" id="hlFrom" class="form-control" value="' + (data.fromDate || '') + '"></div>' +
        '<div class="form-group"><label>To Date *</label><input type="date" id="hlTo" class="form-control" value="' + (data.toDate || '') + '"></div>' +
        '<div class="form-group"><label>Reason *</label><textarea id="hlReason" class="form-control" rows="3">' + (data.reason || '') + '</textarea></div>',
        'saveHodLeave(\'' + (data.id || '') + '\')'
    );
}

function saveHodLeave(editId) {
    var from = document.getElementById('hlFrom').value;
    var to = document.getElementById('hlTo').value;
    var reason = document.getElementById('hlReason').value.trim();
    if (!from || !to || !reason) { APP.notify('Fill all fields', 'error'); return false; }
    var user = AUTH.currentUser();
    var data = {
        employeeName: user.fullName,
        employeeId: user.id,
        fromDate: from,
        toDate: to,
        reason: reason,
        department: user.department || '',
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    if (editId) {
        DB.update('leave_requests', editId, data);
        APP.notify('Leave updated', 'success');
    } else {
        DB.add('leave_requests', data);
        APP.notify('Leave requested', 'success');
    }
    renderHodLeave();
    return true;
}

function approveHodLeave(id) {
    if (!confirm('Approve this leave?')) return;
    DB.update('leave_requests', id, { status: 'approved', approvedBy: AUTH.currentUser().fullName, approvedAt: new Date().toISOString() });
    APP.notify('Leave approved', 'success');
    renderHodLeave();
}

function rejectHodLeave(id) {
    if (!confirm('Reject this leave?')) return;
    DB.update('leave_requests', id, { status: 'rejected' });
    APP.notify('Leave rejected', 'info');
    renderHodLeave();
}

function deleteHodLeave(id) {
    if (!confirm('Delete this leave request?')) return;
    DB.delete('leave_requests', id);
    APP.notify('Leave deleted', 'success');
    renderHodLeave();
}

/* ─── DAILY MATERIAL USE TAB ─── */

function renderHodDailyMat() {
    var el = document.getElementById('hodContent');
    if (!el) return;
    var user = AUTH.currentUser();
    var dept = user.department || '';
    var materials = getDeptMaterials(dept);
    var usage = filterByDept(DB.get('daily_material_usage'));
    var today = new Date().toISOString().split('T')[0];
    var todayUsage = usage.filter(function(u) { return u.date === today; });

    var html =
        '<div style="margin-bottom:10px;"><button class="btn btn-primary" onclick="showHodDmuForm()">+ Add Today\'s Usage</button></div>' +
        '<div class="card"><div class="card-header"><h3>\uD83D\uDCC5 Today\'s Material Usage (' + today + ')</h3></div>' +
        '<div class="table-responsive"><table><thead><tr><th>Material</th><th>Quantity Used</th><th>Used By</th><th>Notes</th></tr></thead><tbody>';
    if (!todayUsage.length) {
        html += '<tr><td colspan="4" class="empty-state">No usage recorded today</td></tr>';
    } else {
        todayUsage.forEach(function(u) {
            html += '<tr><td><strong>' + u.materialName + '</strong></td><td>' + (u.quantity || '0') + '</td><td>' + (u.usedBy || '-') + '</td><td>' + (u.notes || '-') + '</td></tr>';
        });
    }
    html += '</tbody></table></div></div>';

    html += '<div class="card" style="margin-top:16px;"><div class="card-header"><h3>\uD83D\uDCCB Usage History</h3></div>' +
        '<div class="table-responsive"><table><thead><tr><th>Date</th><th>Material</th><th>Quantity</th><th>Used By</th><th>Notes</th></tr></thead><tbody>';
    var recent = usage.slice().reverse().slice(0, 50);
    if (!recent.length) {
        html += '<tr><td colspan="5" class="empty-state">No usage history</td></tr>';
    } else {
        recent.forEach(function(u) {
            html += '<tr><td>' + (u.date ? APP.formatDate(u.date) : '-') + '</td><td><strong>' + u.materialName + '</strong></td><td>' + (u.quantity || '0') + '</td><td>' + (u.usedBy || '-') + '</td><td>' + (u.notes || '-') + '</td></tr>';
        });
    }
    html += '</tbody></table></div></div>';

    el.innerHTML = html;
}

function showHodDmuForm() {
    var user = AUTH.currentUser();
    var dept = user.department || '';
    var materials = getDeptMaterials(dept);
    var matOpts = materials.map(function(m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
    var today = new Date().toISOString().split('T')[0];
    openFormModal('Add Daily Material Usage',
        '<div class="form-group"><label>Date</label><input type="date" id="hdDate" class="form-control" value="' + today + '"></div>' +
        '<div class="form-group"><label>Material *</label><select id="hdMaterial" class="form-control">' + matOpts + '</select></div>' +
        '<div class="form-group"><label>Other Material</label><input type="text" id="hdOtherMat" class="form-control" placeholder="Type if not in list"></div>' +
        '<div class="form-group"><label>Quantity Used *</label><input type="number" id="hdQty" class="form-control" min="0" step="0.01" value="0"></div>' +
        '<div class="form-group"><label>Notes</label><textarea id="hdNotes" class="form-control" rows="2"></textarea></div>',
        'saveHodDmu()'
    );
}

function saveHodDmu() {
    var user = AUTH.currentUser();
    var mat = document.getElementById('hdMaterial').value;
    var otherMat = document.getElementById('hdOtherMat').value.trim();
    var qty = parseFloat(document.getElementById('hdQty').value) || 0;
    if (!qty) { APP.notify('Enter quantity', 'error'); return false; }
    var materialName = otherMat || mat;
    DB.add('daily_material_usage', {
        date: document.getElementById('hdDate').value,
        materialName: materialName,
        quantity: qty,
        usedBy: user.fullName,
        department: user.department || '',
        notes: document.getElementById('hdNotes').value.trim(),
        createdAt: new Date().toISOString()
    });
    APP.notify('Usage recorded', 'success');
    renderHodDailyMat();
    return true;
}

/* ─── SUB INVENTORY TAB (Facility only) ─── */

function renderHodSubInv() {
    var el = document.getElementById('hodContent');
    if (!el) return;
    var subInv = filterByDept(DB.get('sub_inventory'));
    var floors = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'];

    var html =
        '<div style="margin-bottom:10px;"><button class="btn btn-primary" onclick="showHodSiForm()">+ Add Item</button></div>' +
        '<div class="card"><div class="table-responsive"><table><thead><tr><th>Item</th><th>Floor</th><th>Quantity</th><th>Unit</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    if (!subInv.length) {
        html += '<tr><td colspan="6" class="empty-state">No sub-inventory items</td></tr>';
    } else {
        subInv.slice().reverse().forEach(function(s) {
            html += '<tr>' +
                '<td><strong>' + s.itemName + '</strong></td>' +
                '<td>' + (s.floor || '-') + '</td>' +
                '<td>' + (s.quantity || '0') + '</td>' +
                '<td>' + (s.unit || 'pcs') + '</td>' +
                '<td><span class="badge ' + (parseFloat(s.quantity) <= 0 ? 'badge-danger' : parseFloat(s.quantity) < 5 ? 'badge-warning' : 'badge-success') + '">' + (parseFloat(s.quantity) <= 0 ? 'Out of Stock' : parseFloat(s.quantity) < 5 ? 'Low Stock' : 'In Stock') + '</span></td>' +
                '<td><button class="btn btn-sm btn-primary" onclick="editHodSi(\'' + s.id + '\')">Edit</button> <button class="btn btn-sm btn-danger" onclick="deleteHodSi(\'' + s.id + '\')">Del</button></td></tr>';
        });
    }
    html += '</tbody></table></div></div>';
    el.innerHTML = html;
}

function showHodSiForm(data) {
    data = data || {};
    var floors = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'];
    var floorOpts = floors.map(function(f) { return '<option value="' + f + '" ' + (data.floor === f ? 'selected' : '') + '>' + f + '</option>'; }).join('');
    openFormModal(data.id ? 'Edit Item' : 'Add Sub Inventory Item',
        '<div class="form-group"><label>Item Name *</label><input type="text" id="hsName" class="form-control" value="' + (data.itemName || '') + '"></div>' +
        '<div class="form-group"><label>Floor</label><select id="hsFloor" class="form-control">' + floorOpts + '</select></div>' +
        '<div class="form-group"><label>Quantity</label><input type="number" id="hsQty" class="form-control" min="0" step="0.01" value="' + (data.quantity || '0') + '"></div>' +
        '<div class="form-group"><label>Unit</label><input type="text" id="hsUnit" class="form-control" value="' + (data.unit || 'pcs') + '"></div>',
        'saveHodSi(\'' + (data.id || '') + '\')'
    );
}

function saveHodSi(editId) {
    var name = document.getElementById('hsName').value.trim();
    if (!name) { APP.notify('Enter item name', 'error'); return false; }
    var user = AUTH.currentUser();
    var data = {
        itemName: name,
        floor: document.getElementById('hsFloor').value,
        quantity: parseFloat(document.getElementById('hsQty').value) || 0,
        unit: document.getElementById('hsUnit').value.trim() || 'pcs',
        department: user.department || ''
    };
    if (editId) {
        DB.update('sub_inventory', editId, data);
        APP.notify('Item updated', 'success');
    } else {
        data.createdAt = new Date().toISOString();
        DB.add('sub_inventory', data);
        APP.notify('Item added', 'success');
    }
    renderHodSubInv();
    return true;
}

function editHodSi(id) {
    var item = DB.getById('sub_inventory', id);
    if (item) showHodSiForm(item);
}

function deleteHodSi(id) {
    if (!confirm('Delete this item?')) return;
    DB.delete('sub_inventory', id);
    APP.notify('Item deleted', 'success');
    renderHodSubInv();
}

/* ─── REPORTS TAB ─── */

var _hodReportData = null;

function renderHodReports() {
    var el = document.getElementById('hodContent');
    if (!el) return;
    var user = AUTH.currentUser();
    var dept = user.department || '';
    var today = new Date().toISOString().split('T')[0];
    var firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    var html =
        '<div style="margin-bottom:12px;"><h3 style="font-size:16px;font-weight:600;">\uD83D\uDCCA ' + dept + ' Department Report</h3></div>' +
        '<div class="card" style="margin-bottom:16px;">' +
            '<div class="card-header"><h3>Filter Options</h3></div>' +
            '<div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;padding:12px 16px;">' +
                '<div class="form-group" style="min-width:180px;"><label>From Date</label><input type="date" id="hrFrom" class="form-control" value="' + firstDay + '"></div>' +
                '<div class="form-group" style="min-width:180px;"><label>To Date</label><input type="date" id="hrTo" class="form-control" value="' + today + '"></div>' +
                '<button class="btn btn-primary" onclick="generateHodReport()">Generate</button>' +
            '</div>' +
        '</div>' +
        '<div id="hodReportResult"></div>';

    el.innerHTML = html;
    generateHodReport();
}

function getHodReportData() {
    var user = AUTH.currentUser();
    var from = document.getElementById('hrFrom') ? document.getElementById('hrFrom').value : '';
    var to = document.getElementById('hrTo') ? document.getElementById('hrTo').value : '';
    var dept = user.department || '';
    var dateOk = function(d) {
        if (!d) return true;
        try { var dt = new Date(d); if (isNaN(dt.getTime())) return true; if (from && dt < new Date(from)) return false; if (to) { var end = new Date(to); end.setHours(23,59,59,999); if (dt > end) return false; } return true; } catch(e) { return true; }
    };

    var users = DB.get('users') || [];
    var deptUsers = users.filter(function(u) { return u.department === dept && u.role !== 'admin' && !u.isSuperAdmin; });
    var allTasks = (DB.get('tasks') || []).filter(function(t) { return t.department === dept && dateOk(t.createdAt); });
    var allProblems = (DB.get('problems') || []).filter(function(p) { return (p.department === dept || p.area === dept) && dateOk(p.createdAt); });
    var allMrs = (DB.get('material_requests') || []).filter(function(m) { return m.department === dept && dateOk(m.createdAt); });
    var allCls = (DB.get('checklists') || []).filter(function(c) { return c.department === dept && dateOk(c.createdAt); });
    var allBds = (DB.get('daily_breakdown') || []).filter(function(b) { return b.department === dept && dateOk(b.createdAt); });
    var allLeaves = (DB.get('leave_requests') || []).filter(function(l) { return l.department === dept && dateOk(l.createdAt); });
    var allMatUsage = (DB.get('daily_material_usage') || []).filter(function(m) { return m.department === dept && dateOk(m.date); });
    var allSubInv = (DB.get('sub_inventory') || []).filter(function(s) { return s.department === dept; });

    var tTotal = allTasks.length, tDone = allTasks.filter(function(t) { return t.status === 'completed'; }).length;
    var tRate = tTotal > 0 ? Math.round(tDone / tTotal * 100) : 0;
    var pTotal = allProblems.length, pDone = allProblems.filter(function(p) { return p.status === 'resolved'; }).length;
    var pRate = pTotal > 0 ? Math.round(pDone / pTotal * 100) : 0;
    var mTotal = allMrs.length, mApproved = allMrs.filter(function(m) { return m.hodStatus === 'approved' || m.status === 'hod_approved'; }).length;
    var lTotal = allLeaves.length, lApproved = allLeaves.filter(function(l) { return l.status === 'approved'; }).length;
    var bTotal = allBds.length, bResolved = allBds.filter(function(b) { return b.status === 'resolved'; }).length;

    return {
        dept: dept, from: from, to: to,
        users: deptUsers,
        tasks: allTasks, problems: allProblems, mrs: allMrs, checklists: allCls,
        breakdowns: allBds, leaves: allLeaves, matUsage: allMatUsage, subInv: allSubInv,
        tTotal: tTotal, tDone: tDone, tRate: tRate,
        pTotal: pTotal, pDone: pDone, pRate: pRate,
        mTotal: mTotal, mApproved: mApproved,
        lTotal: lTotal, lApproved: lApproved,
        bTotal: bTotal, bResolved: bResolved
    };
}

function generateHodReport() {
    var el = document.getElementById('hodReportResult');
    if (!el) return;
    var data = getHodReportData();
    _hodReportData = data;

    var html =
        '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">' +
            '<button class="btn btn-success" onclick="exportHodReportExcel()">\u2B07 Excel</button>' +
            '<button class="btn btn-info" onclick="printHodReport()">\uD83D\uDDA8 PDF</button>' +
            '<button class="btn btn-success" onclick="shareHodReportWhatsApp()" style="background:#25D366;">\uD83D\uDCAC WhatsApp</button>' +
            '<button class="btn btn-primary" onclick="shareHodReportEmail()">\u2709 Email</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px;">' +
            '<div class="card" style="text-align:center;padding:12px;"><div style="font-size:22px;font-weight:700;color:#1a73e8;">' + data.tTotal + '</div><div style="font-size:11px;color:#888;">Tasks (' + data.tDone + ' done, ' + data.tRate + '%)</div></div>' +
            '<div class="card" style="text-align:center;padding:12px;"><div style="font-size:22px;font-weight:700;color:#ea4335;">' + data.pTotal + '</div><div style="font-size:11px;color:#888;">Problems (' + data.pDone + ' resolved, ' + data.pRate + '%)</div></div>' +
            '<div class="card" style="text-align:center;padding:12px;"><div style="font-size:22px;font-weight:700;color:#fbbc04;">' + data.mTotal + '</div><div style="font-size:11px;color:#888;">Materials (' + data.mApproved + ' approved)</div></div>' +
            '<div class="card" style="text-align:center;padding:12px;"><div style="font-size:22px;font-weight:700;color:#34a853;">' + data.bTotal + '</div><div style="font-size:11px;color:#888;">Breakdowns (' + data.bResolved + ' resolved)</div></div>' +
            '<div class="card" style="text-align:center;padding:12px;"><div style="font-size:22px;font-weight:700;color:#7b1fa2;">' + data.lTotal + '</div><div style="font-size:11px;color:#888;">Leaves (' + data.lApproved + ' approved)</div></div>' +
            '<div class="card" style="text-align:center;padding:12px;"><div style="font-size:22px;font-weight:700;color:#00bcd4;">' + data.users.length + '</div><div style="font-size:11px;color:#888;">Team Members</div></div>' +
        '</div>';

    html += '<div class="card" style="margin-bottom:12px;"><div class="card-header"><h3>\u2705 Tasks (' + data.tTotal + ')</h3></div>' +
        '<div class="table-responsive" style="max-height:200px;overflow-y:auto;"><table><thead><tr><th>Title</th><th>Assigned To</th><th>Priority</th><th>TAT</th><th>Status</th></tr></thead><tbody>';
    data.tasks.slice().reverse().slice(0, 20).forEach(function(t) {
        html += '<tr><td>' + t.title + '</td><td>' + (t.assignedTo || '-') + '</td><td>' + (t.priority || '-') + '</td><td>' + computeTAT(t.createdAt, t.completedAt) + '</td><td>' + APP.getStatusBadge(t.status || 'pending') + '</td></tr>';
    });
    if (!data.tasks.length) html += '<tr><td colspan="5" class="empty-state">No tasks</td></tr>';
    html += '</tbody></table></div></div>';

    html += '<div class="card" style="margin-bottom:12px;"><div class="card-header"><h3>\uD83D\uDD27 Problems (' + data.pTotal + ')</h3></div>' +
        '<div class="table-responsive" style="max-height:200px;overflow-y:auto;"><table><thead><tr><th>Title</th><th>Area</th><th>Priority</th><th>TAT</th><th>Status</th></tr></thead><tbody>';
    data.problems.slice().reverse().slice(0, 20).forEach(function(p) {
        html += '<tr><td>' + p.title + '</td><td>' + (p.area || '-') + '</td><td>' + (p.priority || '-') + '</td><td>' + computeTAT(p.createdAt, p.resolvedAt) + '</td><td>' + APP.getStatusBadge(p.status || 'open') + '</td></tr>';
    });
    if (!data.problems.length) html += '<tr><td colspan="5" class="empty-state">No problems</td></tr>';
    html += '</tbody></table></div></div>';

    html += '<div class="card" style="margin-bottom:12px;"><div class="card-header"><h3>\uD83D\uDCCB Material Requests (' + data.mTotal + ')</h3></div>' +
        '<div class="table-responsive" style="max-height:200px;overflow-y:auto;"><table><thead><tr><th>Title</th><th>Requested By</th><th>HOD Status</th><th>Store Status</th></tr></thead><tbody>';
    data.mrs.slice().reverse().slice(0, 20).forEach(function(m) {
        var hs = m.hodStatus || (m.status === 'approved' ? 'Approved' : 'Pending');
        var ss = m.storeStatus || (m.status === 'store_approved' ? 'Approved' : 'Pending');
        html += '<tr><td>' + m.title + '</td><td>' + (m.requestedBy || '-') + '</td><td>' + APP.getStatusBadge(hs) + '</td><td>' + APP.getStatusBadge(ss) + '</td></tr>';
    });
    if (!data.mrs.length) html += '<tr><td colspan="4" class="empty-state">No requests</td></tr>';
    html += '</tbody></table></div></div>';

    el.innerHTML = html;
}

function exportHodReportExcel() {
    try {
        if (typeof XLSX === 'undefined' || !XLSX.utils) { APP.notify('Excel library not loaded', 'error'); return; }
        var data = _hodReportData || getHodReportData();
        var wb = XLSX.utils.book_new();
        var f = function(v) { return v || '-'; };

        // Summary sheet
        var sumCols = ['Metric', 'Value'];
        var sumRows = [
            ['Department', data.dept], ['Period', data.from + ' to ' + data.to], ['Generated', new Date().toLocaleString()], ['', ''],
            ['Team Members', data.users.length], ['', ''],
            ['Total Tasks', data.tTotal], ['Tasks Completed', data.tDone], ['Task Completion Rate', data.tRate + '%'], ['', ''],
            ['Total Problems', data.pTotal], ['Problems Resolved', data.pDone], ['Problem Resolution Rate', data.pRate + '%'], ['', ''],
            ['Material Requests', data.mTotal], ['Approved', data.mApproved], ['', ''],
            ['Breakdowns Reported', data.bTotal], ['Breakdowns Resolved', data.bResolved], ['', ''],
            ['Leave Requests', data.lTotal], ['Leaves Approved', data.lApproved]
        ];
        var ws1 = XLSX.utils.aoa_to_sheet([sumCols].concat(sumRows));
        XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

        // Tasks sheet
        if (data.tasks.length) {
            var tCols = ['Title', 'Assigned To', 'Priority', 'Deadline', 'TAT', 'Status', 'Created'];
            var tRows = data.tasks.map(function(t) {
                return [f(t.title), f(t.assignedTo), f(t.priority), t.deadline ? APP.formatDate(t.deadline) : '-', computeTAT(t.createdAt, t.completedAt), f(t.status), APP.formatDate(t.createdAt)];
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([tCols].concat(tRows)), 'Tasks');
        }

        // Problems sheet
        if (data.problems.length) {
            var pCols = ['Title', 'Area', 'Priority', 'TAT', 'Status', 'Created'];
            var pRows = data.problems.map(function(p) {
                return [f(p.title), f(p.area), f(p.priority), computeTAT(p.createdAt, p.resolvedAt), f(p.status || 'open'), APP.formatDate(p.createdAt)];
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([pCols].concat(pRows)), 'Problems');
        }

        // Material Requests sheet
        if (data.mrs.length) {
            var mCols = ['Title', 'Requested By', 'HOD Status', 'Store Status', 'Created'];
            var mRows = data.mrs.map(function(m) {
                var hs = m.hodStatus || (m.status === 'approved' ? 'Approved' : 'Pending');
                var ss = m.storeStatus || (m.status === 'store_approved' ? 'Approved' : 'Pending');
                return [f(m.title), f(m.requestedBy || '-'), hs, ss, APP.formatDate(m.createdAt)];
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([mCols].concat(mRows)), 'Material Requests');
        }

        // Breakdowns sheet
        if (data.breakdowns.length) {
            var bCols = ['Title', 'Area', 'Reported By', 'TAT', 'Status', 'Date'];
            var bRows = data.breakdowns.map(function(b) {
                return [f(b.title), f(b.area), f(b.reportedBy), computeTAT(b.createdAt, b.resolvedAt), f(b.status || 'open'), b.date ? APP.formatDate(b.date) : '-'];
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([bCols].concat(bRows)), 'Breakdowns');
        }

        var wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        var url = URL.createObjectURL(new Blob([wbout], { type: 'application/octet-stream' }));
        var link = document.createElement('a');
        link.href = url;
        link.download = data.dept + '_Report_' + new Date().toISOString().split('T')[0] + '.xlsx';
        document.body.appendChild(link); link.click();
        setTimeout(function() { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
        APP.notify('Excel report downloaded', 'success');
    } catch (e) { console.error(e); APP.notify('Export failed', 'error'); }
}

function printHodReport() {
    var data = _hodReportData || getHodReportData();
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + data.dept + ' Report</title>';
    html += '<style>' +
        '*{box-sizing:border-box;}body{font-family:"Segoe UI",Arial,sans-serif;margin:30px;color:#222;}' +
        'h1{font-size:24px;color:#1a73e8;}h2{font-size:16px;margin:20px 0 8px;color:#333;border-left:4px solid #1a73e8;padding-left:10px;}' +
        'table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:11px;}' +
        'th{background:#1a73e8;color:#fff;padding:8px 10px;text-align:left;}' +
        'td{border:1px solid #ddd;padding:6px 10px;}tr:nth-child(even){background:#f8f9fa;}' +
        '.card{display:inline-block;margin:8px;padding:14px;background:#f0f4ff;border-radius:8px;text-align:center;min-width:110px;}' +
        '.num{font-size:24px;font-weight:700;color:#1a73e8;}.lbl{font-size:11px;color:#888;}' +
        '@media print{body{margin:15mm;}th{background:#1a73e8!important;color:#fff!important;-webkit-print-color-adjust:exact;}}' +
        '</style></head><body>';
    html += '<h1>' + data.dept + ' Department Report</h1>';
    html += '<div style="font-size:12px;color:#888;margin-bottom:16px;">Period: ' + data.from + ' to ' + data.to + ' | Generated: ' + new Date().toLocaleString() + '</div>';
    html += '<div style="text-align:center;">' +
        '<div class="card"><div class="num">' + data.tTotal + '</div><div class="lbl">Tasks (' + data.tRate + '%)</div></div>' +
        '<div class="card"><div class="num">' + data.pTotal + '</div><div class="lbl">Problems (' + data.pRate + '%)</div></div>' +
        '<div class="card"><div class="num">' + data.mTotal + '</div><div class="lbl">Materials</div></div>' +
        '<div class="card"><div class="num">' + data.bTotal + '</div><div class="lbl">Breakdowns</div></div>' +
        '<div class="card"><div class="num">' + data.users.length + '</div><div class="lbl">Team</div></div>' +
    '</div>';

    function printTable(title, cols, rows) {
        if (!rows.length) return;
        html += '<h2>' + title + ' (' + rows.length + ')</h2><table><thead><tr>' + cols.map(function(c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>';
        rows.slice(0, 50).forEach(function(r) { html += '<tr>' + r.map(function(c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; });
        html += '</tbody></table>';
    }

    printTable('Tasks', ['Title','Assigned To','Priority','TAT','Status'], data.tasks.map(function(t) { return [t.title, t.assignedTo || '-', t.priority || '-', computeTAT(t.createdAt, t.completedAt), t.status || 'pending']; }));
    printTable('Problems', ['Title','Area','Priority','TAT','Status'], data.problems.map(function(p) { return [p.title, p.area || '-', p.priority || '-', computeTAT(p.createdAt, p.resolvedAt), p.status || 'open']; }));
    printTable('Material Requests', ['Title','Requested By','HOD Status','Store Status'], data.mrs.map(function(m) { return [m.title, m.requestedBy || '-', m.hodStatus || 'Pending', m.storeStatus || 'Pending']; }));
    printTable('Breakdowns', ['Title','Area','Reported By','Status'], data.breakdowns.map(function(b) { return [b.title, b.area || '-', b.reportedBy || '-', b.status || 'open']; }));

    html += '<div style="text-align:center;font-size:10px;color:#aaa;margin-top:30px;border-top:1px solid #eee;padding-top:10px;">HMS ' + data.dept + ' Report — Confidential</div></body></html>';

    var w = window.open('_blank');
    if (!w) { APP.notify('Please allow popups', 'error'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(function() { w.print(); }, 500);
}

function shareHodReportWhatsApp() {
    var data = _hodReportData || getHodReportData();
    var text = '*' + data.dept + ' Department Report*';
    text += '\nPeriod: ' + data.from + ' to ' + data.to;
    text += '\n\n*Summary*';
    text += '\n- Team Members: ' + data.users.length;
    text += '\n- Tasks: ' + data.tDone + '/' + data.tTotal + ' (' + data.tRate + '%)';
    text += '\n- Problems: ' + data.pDone + '/' + data.pTotal + ' (' + data.pRate + '%)';
    text += '\n- Materials Approved: ' + data.mApproved + '/' + data.mTotal;
    text += '\n- Breakdowns Resolved: ' + data.bResolved + '/' + data.bTotal;
    text += '\n- Leaves Approved: ' + data.lApproved + '/' + data.lTotal;
    text += '\n\n*Recent Tasks*';
    data.tasks.slice(-5).reverse().forEach(function(t) { text += '\n- ' + t.title + ' (' + t.status + ')'; });
    text += '\n\n*Recent Problems*';
    data.problems.slice(-5).reverse().forEach(function(p) { text += '\n- ' + p.title + ' (' + (p.status || 'open') + ')'; });
    text += '\n\nGenerated: ' + new Date().toLocaleString();
    text += '\nDownload full report from HMS dashboard.';
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

function shareHodReportEmail() {
    var data = _hodReportData || getHodReportData();
    var subject = data.dept + ' Department Report - ' + data.from + ' to ' + data.to;
    var body = data.dept + ' Department Report\n';
    body += 'Period: ' + data.from + ' to ' + data.to + '\n';
    body += 'Generated: ' + new Date().toLocaleString() + '\n\n';
    body += 'SUMMARY\n';
    body += '- Team Members: ' + data.users.length + '\n';
    body += '- Tasks: ' + data.tDone + '/' + data.tTotal + ' (' + data.tRate + '%)\n';
    body += '- Problems: ' + data.pDone + '/' + data.pTotal + ' (' + data.pRate + '%)\n';
    body += '- Materials Approved: ' + data.mApproved + '/' + data.mTotal + '\n';
    body += '- Breakdowns Resolved: ' + data.bResolved + '/' + data.bTotal + '\n';
    body += '- Leaves Approved: ' + data.lApproved + '/' + data.lTotal + '\n\n';
    body += '--- TASKS ---\n';
    data.tasks.slice(-10).reverse().forEach(function(t) { body += t.title + ' | ' + (t.assignedTo || '-') + ' | ' + (t.status || '-') + '\n'; });
    body += '\n--- PROBLEMS ---\n';
    data.problems.slice(-10).reverse().forEach(function(p) { body += p.title + ' | ' + (p.area || '-') + ' | ' + (p.status || 'open') + '\n'; });
    body += '\nDownload full Excel report from HMS dashboard.';
    window.open('mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body), '_blank');
}

/* ─── SELF AUDIT TAB ─── */

var AUDIT_ITEMS = [
    'Daily work log reviewed',
    'Team tasks reviewed and updated',
    'Pending problems reviewed',
    'Material requests processed',
    'Team attendance checked',
    'Safety inspection completed',
    'Equipment status verified',
    'Department cleanliness checked',
    'Staff performance noted',
    'Daily report submitted to admin'
];

function renderHodAudit() {
    var el = document.getElementById('hodContent');
    if (!el) return;
    var user = AUTH.currentUser();
    var today = new Date().toISOString().split('T')[0];
    var audits = DB.get('hod_audit') || [];
    var todayAudit = audits.filter(function(a) { return a.date === today && a.hodId === user.id; });
    var existing = todayAudit.length > 0 ? todayAudit[0] : null;

    var html =
        '<div style="margin-bottom:12px;">' +
            '<h3 style="font-size:16px;font-weight:600;">\uD83D\uDCCB Self Audit - ' + APP.formatDate(today) + '</h3>' +
        '</div>' +
        '<div class="card" style="margin-bottom:16px;">' +
            '<div class="card-header"><h3>\u2705 Daily Self Checklist</h3></div>' +
            '<div style="padding:12px 16px;">';
    if (existing && existing.submitted) {
        var doneCount = (existing.items || []).filter(function(i) { return i.done; }).length;
        var totalItems = (existing.items || []).length;
        var pct = totalItems > 0 ? Math.round(doneCount / totalItems * 100) : 0;
        html += '<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">' +
            '<span style="font-size:14px;font-weight:600;color:#34a853;">\u2705 Completed for today (' + doneCount + '/' + totalItems + ')</span>' +
            '<span style="font-size:13px;color:#888;">Submitted at: ' + (existing.submittedAt ? APP.formatDateTime(existing.submittedAt) : '-') + '</span>' +
        '</div>' +
        '<div class="progress-bar" style="height:20px;margin-bottom:12px;"><div class="progress-fill green" style="width:' + pct + '%;line-height:20px;font-size:11px;color:#fff;text-align:center;">' + pct + '%</div></div>';
    } else {
        html += '<div style="margin-bottom:12px;color:#ea4335;font-size:13px;">Today\'s audit not yet completed</div>';
    }
    html += '<div id="hodAuditItems">';
    var items = (existing && existing.items) || AUDIT_ITEMS.map(function(label) { return { label: label, done: false }; });
    items.forEach(function(item, i) {
        var checked = item.done ? 'checked' : '';
        var disabled = existing && existing.submitted ? 'disabled' : '';
        html += '<label data-aindex="' + i + '" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f0f0f0;cursor:pointer;">' +
            '<input type="checkbox" ' + checked + ' ' + disabled + ' onchange="toggleAuditItem(' + i + ',this.checked)" style="width:18px;height:18px;">' +
            '<span style="font-size:13px;' + (item.done ? 'text-decoration:line-through;color:#888;' : '') + '">' + item.label + '</span>' +
            (!disabled ? '<span style="margin-left:auto;color:#ea4335;cursor:pointer;font-size:16px;font-weight:600;" onclick="removeAuditItem(' + i + ')">\u00d7</span>' : '') +
        '</label>';
    });
    html += '</div>' +
        (!(existing && existing.submitted) ? '<div style="margin-top:8px;"><button class="btn btn-sm btn-outline" onclick="addAuditItem()">+ Add Item</button></div>' : '');

    html += '<div class="form-group" style="margin-top:12px;"><label>Work Notes / Comments</label>' +
        '<textarea id="auditNotes" class="form-control" rows="3" ' + (existing && existing.submitted ? 'disabled' : '') + '>' + (existing ? (existing.notes || '') : '') + '</textarea></div>';

    html += '<div style="margin-top:12px;display:flex;gap:8px;">' +
        (existing && existing.submitted
            ? '<button class="btn btn-warning" onclick="resetHodAudit()">\u270F Reset &amp; Re-do</button>'
            : '<button class="btn btn-success" onclick="submitHodAudit()">\u2705 Submit Audit</button>') +
        '</div></div></div>';

    // Audit History
    var userAudits = audits.filter(function(a) { return a.hodId === user.id; }).slice().reverse();
    html += '<div class="card"><div class="card-header"><h3>\uD83D\uDCCA Audit History</h3></div>' +
        '<div class="table-responsive"><table><thead><tr><th>Date</th><th>Items Done</th><th>Progress</th><th>Submitted At</th><th>Actions</th></tr></thead><tbody>';
    if (!userAudits.length) {
        html += '<tr><td colspan="5" class="empty-state">No audits recorded</td></tr>';
    } else {
        userAudits.forEach(function(a) {
            var done = (a.items || []).filter(function(i) { return i.done; }).length;
            var total = (a.items || []).length;
            var pct = total > 0 ? Math.round(done / total * 100) : 0;
            var pctColor = pct >= 80 ? 'green' : (pct >= 50 ? 'yellow' : 'red');
            html += '<tr>' +
                '<td>' + APP.formatDate(a.date) + '</td>' +
                '<td>' + done + '/' + total + '</td>' +
                '<td><div class="progress-bar" style="width:80px;display:inline-block;"><div class="progress-fill ' + pctColor + '" style="width:' + pct + '%;"></div></div> <span style="font-size:10px;">' + pct + '%</span></td>' +
                '<td>' + (a.submittedAt ? APP.formatDateTime(a.submittedAt) : '-') + '</td>' +
                '<td><button class="btn btn-sm btn-info" onclick="viewHodAuditDetail(\'' + a.id + '\')">View</button>' +
                ' <button class="btn btn-sm btn-danger" onclick="deleteHodAudit(\'' + a.id + '\')">Del</button></td></tr>';
        });
    }
    html += '</tbody></table></div></div>';

    el.innerHTML = html;
}

function getAuditItems() {
    var labels = document.querySelectorAll('#hodAuditItems label');
    var checkboxes = document.querySelectorAll('#hodAuditItems input[type="checkbox"]');
    var items = [];
    checkboxes.forEach(function(cb, i) {
        var labelEl = labels[i];
        var span = labelEl ? labelEl.querySelector('span') : null;
        items.push({ label: span ? span.textContent : 'Item ' + (i + 1), done: cb.checked });
    });
    return items;
}

function saveAuditDraft(items) {
    var user = AUTH.currentUser();
    var today = new Date().toISOString().split('T')[0];
    var audits = DB.get('hod_audit') || [];
    var existing = audits.filter(function(a) { return a.date === today && a.hodId === user.id && !a.submitted; });
    if (existing.length > 0) {
        existing[0].items = items;
        existing[0].notes = document.getElementById('auditNotes') ? document.getElementById('auditNotes').value : '';
        DB.set('hod_audit', audits);
    } else {
        audits.push({
            id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
            hodId: user.id,
            hodName: user.fullName,
            department: user.department || '',
            date: today,
            items: items,
            notes: document.getElementById('auditNotes') ? document.getElementById('auditNotes').value : '',
            submitted: false,
            submittedAt: null
        });
        DB.set('hod_audit', audits);
    }
}

function toggleAuditItem(index, checked) {
    var labelsEl = document.querySelectorAll('#hodAuditItems label span');
    var checkboxes = document.querySelectorAll('#hodAuditItems input[type="checkbox"]');
    if (checkboxes[index]) {
        checkboxes[index].checked = checked;
        var span = labelsEl[index];
        if (span) {
            span.style.textDecoration = checked ? 'line-through' : 'none';
            span.style.color = checked ? '#888' : '#222';
        }
    }
    saveAuditDraft(getAuditItems());
}

function addAuditItem() {
    var label = prompt('Enter audit item text:');
    if (!label || !label.trim()) return;
    label = label.trim();
    var items = getAuditItems();
    items.push({ label: label, done: false });
    saveAuditDraft(items);
    renderHodAudit();
}

function removeAuditItem(index) {
    if (!confirm('Remove this audit item?')) return;
    var items = getAuditItems();
    if (items.length <= 1) {
        APP.notify('Cannot remove the last item', 'error');
        return;
    }
    items.splice(index, 1);
    saveAuditDraft(items);
    renderHodAudit();
}

function submitHodAudit() {
    var user = AUTH.currentUser();
    var today = new Date().toISOString().split('T')[0];
    var notes = document.getElementById('auditNotes') ? document.getElementById('auditNotes').value.trim() : '';
    var items = getAuditItems();
    var doneCount = items.filter(function(i) { return i.done; }).length;
    if (doneCount === 0) {
        APP.notify('Check at least one item', 'error');
        return;
    }
    var audits = DB.get('hod_audit') || [];
    var existing = audits.filter(function(a) { return a.date === today && a.hodId === user.id; });
    if (existing.length > 0) {
        existing[0].items = items;
        existing[0].notes = notes;
        existing[0].submitted = true;
        existing[0].submittedAt = new Date().toISOString();
    } else {
        audits.push({
            id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
            hodId: user.id,
            hodName: user.fullName,
            department: user.department || '',
            date: today,
            items: items,
            notes: notes,
            submitted: true,
            submittedAt: new Date().toISOString()
        });
    }
    DB.set('hod_audit', audits);
    APP.notify('Audit submitted successfully', 'success');
    renderHodAudit();
}

function resetHodAudit() {
    if (!confirm('Reset today\'s audit to default items?')) return;
    var user = AUTH.currentUser();
    var today = new Date().toISOString().split('T')[0];
    var audits = DB.get('hod_audit') || [];
    var existing = audits.filter(function(a) { return a.date === today && a.hodId === user.id; });
    if (existing.length > 0) {
        existing[0].items = AUDIT_ITEMS.map(function(l) { return { label: l, done: false }; });
        existing[0].notes = '';
        existing[0].submitted = false;
        existing[0].submittedAt = null;
        DB.set('hod_audit', audits);
    }
    APP.notify('Audit reset to defaults', 'info');
    renderHodAudit();
}

function viewHodAuditDetail(id) {
    var audits = DB.get('hod_audit') || [];
    var audit = audits.find(function(a) { return a.id === id; });
    if (!audit) return;
    var items = audit.items || [];
    var done = items.filter(function(i) { return i.done; }).length;
    var html = '<div style="padding:12px;">' +
        '<div style="margin-bottom:12px;"><strong>Date:</strong> ' + APP.formatDate(audit.date) + '<br>' +
        '<strong>HOD:</strong> ' + (audit.hodName || '-') + '<br>' +
        '<strong>Department:</strong> ' + (audit.department || '-') + '<br>' +
        '<strong>Submitted:</strong> ' + (audit.submittedAt ? APP.formatDateTime(audit.submittedAt) : '-') + '<br>' +
        '<strong>Completion:</strong> ' + done + '/' + items.length + '</div>' +
        '<div class="table-responsive"><table><thead><tr><th>#</th><th>Item</th><th>Status</th></tr></thead><tbody>';
    items.forEach(function(item, i) {
        html += '<tr><td>' + (i + 1) + '</td><td>' + item.label + '</td><td>' + (item.done ? '<span class="badge badge-success">Done</span>' : '<span class="badge badge-warning">Pending</span>') + '</td></tr>';
    });
    html += '</tbody></table></div>' +
        (audit.notes ? '<div style="margin-top:12px;"><strong>Notes:</strong><p style="color:#555;">' + audit.notes + '</p></div>' : '') +
        '</div>';
    openFormModal('Audit Detail - ' + APP.formatDate(audit.date), html, null);
}

function deleteHodAudit(id) {
    if (!confirm('Delete this audit record?')) return;
    var audits = (DB.get('hod_audit') || []).filter(function(a) { return a.id !== id; });
    DB.set('hod_audit', audits);
    APP.notify('Audit deleted', 'success');
    renderHodAudit();
}

/* ─── Admin view: show all HOD audits ─── */

function renderAllHodAudits(container) {
    if (!container) {
        var content = document.getElementById('pageContent');
        if (!content) return;
        container = content;
    }
    var audits = DB.get('hod_audit') || [];
    var depts = DB.get('departments') || [];
    var today = new Date().toISOString().split('T')[0];
    var todayAudits = audits.filter(function(a) { return a.date === today; });

    var html = '<div style="margin-bottom:12px;"><h2 style="font-size:18px;font-weight:700;">\uD83D\uDCCA HOD Self Audits</h2></div>';

    // Today's status cards
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:16px;">' +
        '<div class="card" style="text-align:center;padding:14px;"><div style="font-size:24px;font-weight:700;color:#1a73e8;">' + audits.length + '</div><div style="font-size:11px;color:#888;">Total Audits</div></div>' +
        '<div class="card" style="text-align:center;padding:14px;"><div style="font-size:24px;font-weight:700;color:#34a853;">' + todayAudits.length + '</div><div style="font-size:11px;color:#888;">Today Submitted</div></div>' +
        '<div class="card" style="text-align:center;padding:14px;"><div style="font-size:24px;font-weight:700;color:#ea4335;">' + (depts.length - todayAudits.length) + '</div><div style="font-size:11px;color:#888;">Pending Today</div></div>' +
    '</div>';

    // Per-department summary
    html += '<div class="card" style="margin-bottom:16px;"><div class="card-header"><h3>\uD83D\uDCCA Today\'s Status by Department</h3></div>' +
        '<div class="table-responsive"><table><thead><tr><th>Department</th><th>HOD</th><th>Status</th><th>Progress</th><th>Submitted At</th></tr></thead><tbody>';
    depts.forEach(function(d) {
        if (d.active === false) return;
        var deptAudit = todayAudits.filter(function(a) { return a.department === d.name; });
        if (deptAudit.length > 0) {
            deptAudit.forEach(function(a) {
                var done = (a.items || []).filter(function(i) { return i.done; }).length;
                var total = (a.items || []).length;
                var pct = total > 0 ? Math.round(done / total * 100) : 0;
                var pctColor = pct >= 80 ? 'green' : (pct >= 50 ? 'yellow' : 'red');
                html += '<tr><td><strong>' + d.name + '</strong></td><td>' + (a.hodName || '-') + '</td>' +
                    '<td><span class="badge badge-success">Submitted</span></td>' +
                    '<td><div class="progress-bar" style="width:80px;display:inline-block;"><div class="progress-fill ' + pctColor + '" style="width:' + pct + '%;"></div></div> ' + pct + '%</td>' +
                    '<td>' + (a.submittedAt ? APP.formatDateTime(a.submittedAt) : '-') + '</td></tr>';
            });
        } else {
            html += '<tr><td><strong>' + d.name + '</strong></td><td>-</td><td><span class="badge badge-warning">Pending</span></td><td>-</td><td>-</td></tr>';
        }
    });
    html += '</tbody></table></div></div>';

    // All audit history
    html += '<div class="card"><div class="card-header"><h3>\uD83D\uDCCB All Audit History</h3></div>' +
        '<div class="table-responsive"><table><thead><tr><th>Date</th><th>HOD</th><th>Department</th><th>Items Done</th><th>Progress</th><th>Actions</th></tr></thead><tbody>';
    if (!audits.length) {
        html += '<tr><td colspan="6" class="empty-state">No audits found</td></tr>';
    } else {
        audits.slice().reverse().forEach(function(a) {
            var done = (a.items || []).filter(function(i) { return i.done; }).length;
            var total = (a.items || []).length;
            var pct = total > 0 ? Math.round(done / total * 100) : 0;
            html += '<tr><td>' + APP.formatDate(a.date) + '</td><td>' + (a.hodName || '-') + '</td><td>' + (a.department || '-') + '</td>' +
                '<td>' + done + '/' + total + '</td>' +
                '<td><div class="progress-bar" style="width:60px;display:inline-block;"><div class="progress-fill ' + (pct >= 80 ? 'green' : pct >= 50 ? 'yellow' : 'red') + '" style="width:' + pct + '%;"></div></div> ' + pct + '%</td>' +
                '<td><button class="btn btn-sm btn-info" onclick="viewHodAuditDetail(\'' + a.id + '\')">View</button></td></tr>';
        });
    }
    html += '</tbody></table></div></div>';

    if (container) container.innerHTML = html;
}
