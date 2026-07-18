var qpTab = 'all';

function getQuarters() {
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    var q = Math.floor(m / 3) + 1;
    var result = [];
    for (var i = -2; i <= 2; i++) {
        var t = q + i;
        var ty = y;
        while (t < 1) { t += 4; ty--; }
        while (t > 4) { t -= 4; ty++; }
        result.push('Q' + t + ' ' + ty);
    }
    return result;
}

function renderQuarterlyPriorities(container) {
    var u = AUTH.currentUser();
    var isAdmin = u.role === 'admin' || u.isSuperAdmin;
    var isHod = u.role === 'hod';
    var canManage = isAdmin || isHod;
    container.innerHTML =
        '<div class="flex-between mb-4"><h2 style="font-size:18px;font-weight:700;">\uD83D\uDCC5 Quarterly Priorities</h2></div>' +
        '<div class="tabs">' +
            (canManage ? '<button class="tab-btn active" onclick="switchQpTab(\'all\',this)">All Q-Priorities</button>' : '') +
            '<button class="tab-btn' + (!canManage ? ' active' : '') + '" onclick="switchQpTab(\'mine\',this)">My Q-Priorities</button>' +
        '</div>' +
        '<div id="qpContent"></div>';
    if (canManage) renderQpAll();
    else renderQpMine();
}

function switchQpTab(tab, btn) {
    qpTab = tab;
    document.querySelectorAll('.tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    if (tab === 'all') renderQpAll();
    else renderQpMine();
}

function getQpData() {
    return DB.get('quarterly_priorities') || [];
}

function saveQpData(data) {
    DB.set('quarterly_priorities', data);
}

function renderQpAll() {
    var el = document.getElementById('qpContent');
    if (!el) return;
    var u = AUTH.currentUser();
    var isAdmin = u.role === 'admin' || u.isSuperAdmin;
    var isHod = u.role === 'hod';
    var all = getQpData();
    var quarters = getQuarters();
    var users = DB.get('users') || [];

    if (isHod) all = all.filter(function(p) { return p.department === u.department; });

    var selQuarter = (document.getElementById('qpFilterQuarter') && document.getElementById('qpFilterQuarter').value) || '';
    var selMember = (document.getElementById('qpFilterMember') && document.getElementById('qpFilterMember').value) || '';
    var selStatus = (document.getElementById('qpFilterStatus') && document.getElementById('qpFilterStatus').value) || '';

    var filtered = all.slice();
    if (selQuarter) filtered = filtered.filter(function(p) { return p.quarter === selQuarter; });
    if (selMember) filtered = filtered.filter(function(p) { return p.userId === selMember; });
    if (selStatus) filtered = filtered.filter(function(p) { return p.status === selStatus; });

    var memberIds = {};
    all.forEach(function(p) { memberIds[p.userId] = true; });
    var memberOpts = Object.keys(memberIds).map(function(id) {
        var usr = users.find(function(u2) { return u2.id === id; });
        return '<option value="' + id + '">' + (usr ? usr.fullName : id) + '</option>';
    }).join('');

    var html =
        '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">' +
            '<select id="qpFilterQuarter" class="form-control" style="max-width:150px;" onchange="renderQpAll()">' +
                '<option value="">All Quarters</option>' + quarters.map(function(q) { return '<option value="' + q + '" ' + (selQuarter === q ? 'selected' : '') + '>' + q + '</option>'; }).join('') +
            '</select>' +
            '<select id="qpFilterMember" class="form-control" style="max-width:180px;" onchange="renderQpAll()">' +
                '<option value="">All Members</option>' + memberOpts +
            '</select>' +
            '<select id="qpFilterStatus" class="form-control" style="max-width:150px;" onchange="renderQpAll()">' +
                '<option value="">All Status</option>' +
                '<option value="pending" ' + (selStatus === 'pending' ? 'selected' : '') + '>Pending</option>' +
                '<option value="in-progress" ' + (selStatus === 'in-progress' ? 'selected' : '') + '>In Progress</option>' +
                '<option value="completed" ' + (selStatus === 'completed' ? 'selected' : '') + '>Completed</option>' +
            '</select>' +
            '<button class="btn btn-primary" onclick="showQpForm()">+ New Priority</button>' +
        '</div>' +
        '<div class="card"><div class="table-responsive"><table><thead><tr>' +
            '<th>Title</th><th>Assigned To</th><th>Quarter</th><th>Progress</th><th>Status</th><th>Actions</th>' +
        '</tr></thead><tbody>';
    if (!filtered.length) {
        html += '<tr><td colspan="6" class="empty-state">No quarterly priorities found</td></tr>';
    } else {
        filtered.slice().reverse().forEach(function(p) {
            var pctColor = p.progress >= 100 ? 'green' : (p.progress >= 50 ? 'yellow' : 'red');
            var usr = users.find(function(u2) { return u2.id === p.userId; });
            html += '<tr>' +
                '<td><strong>' + p.title + '</strong>' + (p.description ? '<br><span style="font-size:11px;color:#888;">' + p.description + '</span>' : '') + '</td>' +
                '<td>' + (usr ? usr.fullName : p.userName || '-') + '</td>' +
                '<td><span class="badge badge-info">' + p.quarter + '</span></td>' +
                '<td style="min-width:140px;"><div class="progress-bar" style="height:16px;"><div class="progress-fill ' + pctColor + '" style="width:' + p.progress + '%;line-height:16px;font-size:10px;color:#fff;text-align:center;">' + p.progress + '%</div></div></td>' +
                '<td>' + APP.getStatusBadge(p.status) + '</td>' +
                '<td>' +
                    (p.status !== 'completed' ? '<button class="btn btn-sm btn-primary" onclick="editQp(\'' + p.id + '\')">Edit</button> ' : '') +
                    '<button class="btn btn-sm btn-danger" onclick="deleteQp(\'' + p.id + '\')">Del</button>' +
                '</td></tr>';
        });
    }
    html += '</tbody></table></div></div>';

    el.innerHTML = html;
}

function renderQpMine() {
    var el = document.getElementById('qpContent');
    if (!el) return;
    var u = AUTH.currentUser();
    var all = getQpData();
    var mine = all.filter(function(p) { return p.userId === u.id; });
    var quarters = getQuarters();

    var selQuarter = (document.getElementById('qpMineQuarter') && document.getElementById('qpMineQuarter').value) || '';
    var selStatus = (document.getElementById('qpMineStatus') && document.getElementById('qpMineStatus').value) || '';

    var filtered = mine.slice();
    if (selQuarter) filtered = filtered.filter(function(p) { return p.quarter === selQuarter; });
    if (selStatus) filtered = filtered.filter(function(p) { return p.status === selStatus; });

    var html =
        '<div style="margin-bottom:12px;">' +
            '<h3 style="font-size:15px;font-weight:600;">My Quarterly Priorities (' + mine.length + ')</h3>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">' +
            '<select id="qpMineQuarter" class="form-control" style="max-width:150px;" onchange="renderQpMine()">' +
                '<option value="">All Quarters</option>' + quarters.map(function(q) { return '<option value="' + q + '" ' + (selQuarter === q ? 'selected' : '') + '>' + q + '</option>'; }).join('') +
            '</select>' +
            '<select id="qpMineStatus" class="form-control" style="max-width:150px;" onchange="renderQpMine()">' +
                '<option value="">All Status</option>' +
                '<option value="pending" ' + (selStatus === 'pending' ? 'selected' : '') + '>Pending</option>' +
                '<option value="in-progress" ' + (selStatus === 'in-progress' ? 'selected' : '') + '>In Progress</option>' +
                '<option value="completed" ' + (selStatus === 'completed' ? 'selected' : '') + '>Completed</option>' +
            '</select>' +
            '<button class="btn btn-primary" onclick="showQpForm()">+ New Priority</button>' +
        '</div>' +
        '<div class="card"><div class="table-responsive"><table><thead><tr>' +
            '<th>Title</th><th>Quarter</th><th>Progress</th><th>Status</th><th>Assigned By</th><th>Actions</th>' +
        '</tr></thead><tbody>';
    if (!filtered.length) {
        html += '<tr><td colspan="6" class="empty-state">No priorities assigned to you</td></tr>';
    } else {
        filtered.slice().reverse().forEach(function(p) {
            var pctColor = p.progress >= 100 ? 'green' : (p.progress >= 50 ? 'yellow' : 'red');
            html += '<tr>' +
                '<td><strong>' + p.title + '</strong>' + (p.description ? '<br><span style="font-size:11px;color:#888;">' + p.description + '</span>' : '') + '</td>' +
                '<td><span class="badge badge-info">' + p.quarter + '</span></td>' +
                '<td style="min-width:140px;"><div class="progress-bar" style="height:16px;"><div class="progress-fill ' + pctColor + '" style="width:' + p.progress + '%;line-height:16px;font-size:10px;color:#fff;text-align:center;">' + p.progress + '%</div></div></td>' +
                '<td>' + APP.getStatusBadge(p.status) + '</td>' +
                '<td>' + (p.assignedByName || '-') + '</td>' +
                '<td>' +
                    (p.status !== 'completed' ? '<button class="btn btn-sm btn-success" onclick="updateQpProgress(\'' + p.id + '\')">Update Progress</button> ' : '') +
                    '<button class="btn btn-sm btn-info" onclick="viewQp(\'' + p.id + '\')">View</button>' +
                '</td></tr>';
        });
    }
    html += '</tbody></table></div></div>';

    el.innerHTML = html;
}

function showQpForm(data) {
    data = data || {};
    var u = AUTH.currentUser();
    var isAdmin = u.role === 'admin' || u.isSuperAdmin;
    var isHod = u.role === 'hod';
    var canManage = isAdmin || isHod;

    var users = [];
    if (isAdmin) {
        users = DB.get('users') || [];
    } else if (isHod) {
        users = (DB.get('users') || []).filter(function(u2) { return u2.department === u.department || u2.id === u.id; });
    } else {
        users = [u];
    }
    var memberOpts = users
        .filter(function(u2) { return !u2.isSuperAdmin; })
        .map(function(u2) { return '<option value="' + u2.id + '" ' + (data.userId === u2.id ? 'selected' : '') + '>' + u2.fullName + ' (' + (u2.role || '') + ')</option>'; })
        .join('');

    var quarters = getQuarters();
    var quarterOpts = quarters.map(function(q) { return '<option value="' + q + '" ' + (data.quarter === q ? 'selected' : '') + '>' + q + '</option>'; }).join('');

    var title = data.id ? 'Edit Priority' : 'New Quarterly Priority';
    openFormModal(title,
        '<div class="form-group"><label>Title</label><input type="text" id="qpTitle" class="form-control" value="' + (data.title || '') + '"></div>' +
        '<div class="form-group"><label>Description</label><textarea id="qpDesc" class="form-control">' + (data.description || '') + '</textarea></div>' +
        '<div class="form-group"><label>Assign To</label><select id="qpMember" class="form-control">' + memberOpts + '</select></div>' +
        '<div class="form-group"><label>Quarter</label><select id="qpQuarter" class="form-control">' + quarterOpts + '</select></div>' +
        (canManage ? '<div class="form-group"><label>Progress (%)</label><input type="number" id="qpProgress" class="form-control" min="0" max="100" value="' + (data.progress || 0) + '"></div>' : ''),
        'saveQp(\'' + (data.id || '') + '\')'
    );
}

function saveQp(editId) {
    var u = AUTH.currentUser();
    var title = document.getElementById('qpTitle').value.trim();
    var desc = document.getElementById('qpDesc').value.trim();
    var userId = document.getElementById('qpMember').value;
    var quarter = document.getElementById('qpQuarter').value;
    var progressEl = document.getElementById('qpProgress');
    var progress = progressEl ? parseInt(progressEl.value) || 0 : 0;

    if (!title) { APP.notify('Enter a title', 'error'); return false; }
    if (!userId) { APP.notify('Select a member', 'error'); return false; }
    if (!quarter) { APP.notify('Select quarter', 'error'); return false; }

    var status = progress >= 100 ? 'completed' : (progress > 0 ? 'in-progress' : 'pending');
    var usr = (DB.get('users') || []).find(function(u2) { return u2.id === userId; });
    var data = getQpData();

    if (editId) {
        var idx = data.findIndex(function(p) { return p.id === editId; });
        if (idx > -1) {
            data[idx].title = title;
            data[idx].description = desc;
            data[idx].userId = userId;
            data[idx].userName = usr ? usr.fullName : '';
            data[idx].quarter = quarter;
            data[idx].progress = progress;
            data[idx].status = status;
            data[idx].updatedAt = new Date().toISOString();
            if (status === 'completed') data[idx].completedAt = new Date().toISOString();
            saveQpData(data);
            APP.notify('Priority updated', 'success');
        }
    } else {
        data.push({
            userId: userId,
            userName: usr ? usr.fullName : '',
            assignedBy: u.id,
            assignedByName: u.fullName,
            title: title,
            description: desc,
            quarter: quarter,
            year: parseInt(quarter.split(' ')[1]) || new Date().getFullYear(),
            department: usr ? (usr.department || '') : '',
            status: status,
            progress: progress,
            completedAt: status === 'completed' ? new Date().toISOString() : null
        });
        saveQpData(data);
        APP.notify('Priority created', 'success');
    }
    if (qpTab === 'all') renderQpAll();
    else renderQpMine();
    return true;
}

function editQp(id) {
    var data = getQpData().find(function(p) { return p.id === id; });
    if (data) showQpForm(data);
}

function deleteQp(id) {
    if (!confirm('Delete this quarterly priority?')) return;
    var data = getQpData().filter(function(p) { return p.id !== id; });
    saveQpData(data);
    APP.notify('Priority deleted', 'success');
    if (qpTab === 'all') renderQpAll();
    else renderQpMine();
}

function updateQpProgress(id) {
    var data = getQpData();
    var p = data.find(function(item) { return item.id === id; });
    if (!p) return;
    var val = prompt('Update progress (0-100):', p.progress || 0);
    if (val === null) return;
    var progress = parseInt(val);
    if (isNaN(progress) || progress < 0 || progress > 100) { APP.notify('Enter a number between 0-100', 'error'); return; }
    p.progress = progress;
    p.status = progress >= 100 ? 'completed' : (progress > 0 ? 'in-progress' : 'pending');
    p.updatedAt = new Date().toISOString();
    if (p.status === 'completed') p.completedAt = new Date().toISOString();
    saveQpData(data);
    APP.notify('Progress updated to ' + progress + '%', 'success');
    if (qpTab === 'all') renderQpAll();
    else renderQpMine();
}

function viewQp(id) {
    var p = getQpData().find(function(item) { return item.id === id; });
    if (!p) return;
    var users = DB.get('users') || [];
    var usr = users.find(function(u) { return u.id === p.userId; });
    var assigner = users.find(function(u) { return u.id === p.assignedBy; });
    var pctColor = p.progress >= 100 ? 'green' : (p.progress >= 50 ? 'yellow' : 'red');
    var html = '<div style="padding:12px;">' +
        '<h3 style="margin-bottom:8px;">' + p.title + '</h3>' +
        (p.description ? '<p style="color:#555;font-size:13px;margin-bottom:12px;">' + p.description + '</p>' : '') +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:12px;">' +
            '<div><strong>Assigned To:</strong> ' + (usr ? usr.fullName : p.userName || '-') + '</div>' +
            '<div><strong>Quarter:</strong> ' + p.quarter + '</div>' +
            '<div><strong>Assigned By:</strong> ' + (assigner ? assigner.fullName : p.assignedByName || '-') + '</div>' +
            '<div><strong>Status:</strong> ' + APP.getStatusBadge(p.status) + '</div>' +
        '</div>' +
        '<div style="margin-bottom:8px;"><strong>Progress:</strong></div>' +
        '<div class="progress-bar" style="height:22px;"><div class="progress-fill ' + pctColor + '" style="width:' + p.progress + '%;line-height:22px;font-size:12px;color:#fff;text-align:center;font-weight:600;">' + p.progress + '%</div></div>' +
        '<div style="margin-top:12px;font-size:11px;color:#888;">' +
            'Created: ' + APP.formatDateTime(p.createdAt) +
            (p.completedAt ? ' | Completed: ' + APP.formatDateTime(p.completedAt) : '') +
        '</div></div>';
    openFormModal('Priority Detail', html, null);
}
