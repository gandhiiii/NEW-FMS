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
        { id: 'daily-mat', label: 'Daily Material Use', icon: '📝' }
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
        'sub-inv': renderHodSubInv
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
