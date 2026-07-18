var probFilter = 'all';

var CATEGORY_DEPT_MAP = {
    'Electrical': 'Maintenance',
    'Plumbing': 'Maintenance',
    'Equipment': 'Maintenance',
    'Infrastructure': 'Maintenance',
    'IT System': 'IT',
    'Medical': 'Medical',
    'Security': 'Security',
    'Other': ''
};

var CATEGORIES = Object.keys(CATEGORY_DEPT_MAP);

function renderProblems(container) {
    var user = AUTH.currentUser();
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="probSearch" placeholder="Search problems..." oninput="renderProbList()">
            </div>
            <div>
                <button class="btn btn-primary" onclick="showProbForm()">+ Report Problem</button>
            </div>
        </div>
        <div class="tabs">
            <button class="tab-btn active" onclick="switchProbTab('all',this)">All</button>
            <button class="tab-btn" onclick="switchProbTab('open',this)">Open</button>
            <button class="tab-btn" onclick="switchProbTab('assigned',this)">Assigned</button>
            <button class="tab-btn" onclick="switchProbTab('resolved',this)">Resolved</button>
        </div>
        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead><tr>
                        <th>ID</th><th>Title</th><th>Category</th><th>Reported By</th>
                        <th>Date</th><th>Priority</th><th>Status</th><th>Actions</th>
                    </tr></thead>
                    <tbody id="probTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderProbList();
}

function switchProbTab(filter, btn) {
    probFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    renderProbList();
}

function renderProbList() {
    var user = AUTH.currentUser();
    var problems = DB.get('problems') || [];
    var search = (document.getElementById('probSearch') ? document.getElementById('probSearch').value : '').toLowerCase();
    var filtered = problems.filter(function(p) {
        if (user.role === 'admin') return true;
        if (user.role === 'hod') {
            var mappedDept = CATEGORY_DEPT_MAP[p.category] || p.category;
            return mappedDept === user.department || p.createdBy === user.fullName;
        }
        return p.createdBy === user.fullName || p.assignedTo === user.fullName;
    });
    filtered = filtered.filter(function(p) {
        return (p.title || '').toLowerCase().indexOf(search) >= 0 ||
               (p.category || '').toLowerCase().indexOf(search) >= 0 ||
               (p.reportedBy || p.createdBy || '').toLowerCase().indexOf(search) >= 0;
    });
    if (probFilter !== 'all') filtered = filtered.filter(function(p) { return p.status === probFilter; });

    var tbody = document.getElementById('probTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.slice().reverse().map(function(p) {
        var canResolve = user.role === 'admin' || user.role === 'hod';
        var canDelete = user.role === 'admin' || p.createdBy === user.fullName;
        return '<tr>' +
            '<td><strong>#' + (p.id ? p.id.slice(-6) : '') + '</strong></td>' +
            '<td>' + (p.title || '') + '</td>' +
            '<td><span class="badge badge-info">' + (p.category || '-') + '</span></td>' +
            '<td>' + (p.reportedBy || p.createdBy || '-') + '</td>' +
            '<td>' + APP.formatDate(p.createdAt) + '</td>' +
            '<td><span class="badge ' + (p.priority === 'high' ? 'badge-danger' : p.priority === 'medium' ? 'badge-warning' : 'badge-info') + '">' + (p.priority || 'normal') + '</span></td>' +
            '<td><span class="badge ' + APP.getStatusBadge(p.status) + '">' + (p.status || 'open') + '</span></td>' +
            '<td>' +
                '<button class="btn btn-sm btn-primary" onclick="viewProb(\'' + p.id + '\')">View</button> ' +
                (p.status !== 'resolved' && canResolve ? '<button class="btn btn-sm btn-success" onclick="resolveProb(\'' + p.id + '\')">Resolve</button> ' : '') +
                (canDelete ? '<button class="btn btn-sm btn-danger" onclick="deleteProb(\'' + p.id + '\')">Del</button>' : '') +
            '</td></tr>';
    }).join('') || '<tr><td colspan="8" class="empty-state">No problems found</td></tr>';
}

function showProbForm() {
    var catOpts = CATEGORIES.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
    var user = AUTH.currentUser();
    var deptUsers = (DB.get('users') || []).filter(function(u) { return u.department === user.department && u.role !== 'admin' && !u.isSuperAdmin; });
    var memberOpts = deptUsers.map(function(u) { return '<option value="' + u.fullName + '">' + u.fullName + '</option>'; }).join('');
    var form = '<form id="probForm">' +
        '<div class="grid-2">' +
            '<div class="form-group"><label>Problem Title *</label><input type="text" name="title" class="form-control" required></div>' +
            '<div class="form-group"><label>Category *</label><select name="category" class="form-control" required onchange="autoSetProbDept()">' +
                '<option value="">Select</option>' + catOpts +
            '</select></div>' +
            '<div class="form-group"><label>Priority</label><select name="priority" class="form-control">' +
                '<option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option>' +
            '</select></div>' +
            '<div class="form-group"><label>Reported By *</label><input type="text" name="reportedBy" class="form-control" value="' + user.fullName + '" required></div>' +
            '<div class="form-group"><label>Department (auto-set)</label><input type="text" name="department" id="probDeptInput" class="form-control" readonly style="background:#f5f5f5;"></div>' +
            '<div class="form-group"><label>Location</label><input type="text" name="location" class="form-control"></div>' +
        '</div>' +
        '<div class="form-group"><label>Assign To (within dept)</label><select name="assignedTo" class="form-control"><option value="">Select</option>' + memberOpts + '</select></div>' +
        '<div class="form-group"><label>Description *</label><textarea name="description" class="form-control" rows="3" required></textarea></div>' +
    '</form>';
    openFormModal('Report Problem', form, 'saveProb()');
}

function autoSetProbDept() {
    var cat = document.querySelector('[name="category"]') ? document.querySelector('[name="category"]').value : '';
    var deptInput = document.getElementById('probDeptInput');
    if (deptInput) {
        deptInput.value = CATEGORY_DEPT_MAP[cat] || '';
    }
}

function saveProb() {
    var user = AUTH.currentUser();
    var data = getFormData('probForm');
    if (!data.title || !data.category || !data.reportedBy || !data.description) {
        APP.notify('Please fill required fields', 'error'); return;
    }
    var routedDept = CATEGORY_DEPT_MAP[data.category] || user.department || '';
    data.status = 'open';
    data.createdBy = user.fullName;
    data.department = routedDept;
    data.solution = '';
    data.resolvedBy = '';
    data.resolvedAt = '';
    data.assignedTo = data.assignedTo || '';
    DB.add('problems', data);
    APP.notify('Problem reported — routed to ' + (routedDept || 'General'), 'success');
    renderProbList();
}

function viewProb(id) {
    var p = DB.getById('problems', id);
    if (!p) return;
    var mappedDept = CATEGORY_DEPT_MAP[p.category] || p.department || '-';
    showModal(
        '<div class="modal-header"><h3>#' + (p.id ? p.id.slice(-6) : '') + ' - ' + (p.title || '') + '</h3>' +
        '<button class="modal-close" onclick="this.closest(\'.modal\').remove()">&times;</button></div>' +
        '<div class="grid-2">' +
            '<div><strong>Category:</strong> ' + (p.category || '-') + '</div>' +
            '<div><strong>Routed Dept:</strong> ' + mappedDept + '</div>' +
            '<div><strong>Priority:</strong> <span class="badge ' + (p.priority === 'high' ? 'badge-danger' : p.priority === 'medium' ? 'badge-warning' : 'badge-info') + '">' + (p.priority || 'normal') + '</span></div>' +
            '<div><strong>Reported By:</strong> ' + (p.reportedBy || p.createdBy || '-') + '</div>' +
            '<div><strong>Location:</strong> ' + (p.location || '-') + '</div>' +
            '<div><strong>Assigned To:</strong> ' + (p.assignedTo || '-') + '</div>' +
            '<div><strong>Status:</strong> <span class="badge ' + APP.getStatusBadge(p.status) + '">' + (p.status || 'open') + '</span></div>' +
            '<div><strong>Date:</strong> ' + APP.formatDateTime(p.createdAt) + '</div>' +
        '</div>' +
        '<div class="mt-4"><strong>Description:</strong><br>' + (p.description || '') + '</div>' +
        (p.solution ? '<div class="mt-4"><strong>Solution:</strong><br>' + p.solution + '<br><span style="font-size:11px;color:#888;">by ' + (p.resolvedBy || '-') + ' at ' + APP.formatDateTime(p.resolvedAt) + '</span></div>' : '') +
        (p.status !== 'resolved' ? '<div class="mt-4"><h4>Add Solution</h4><div class="form-group"><textarea id="solutionText" class="form-control" rows="2" placeholder="Describe the solution..."></textarea></div>' +
        '<button class="btn btn-success" onclick="resolveProbDirect(\'' + id + '\')">Mark Resolved</button></div>' : '')
    );
}

function resolveProb(id) {
    var p = DB.getById('problems', id);
    if (!p || p.status === 'resolved') { APP.notify('Already resolved', 'info'); return; }
    var user = AUTH.currentUser();
    var solution = prompt('Enter solution details:');
    if (!solution) return;
    DB.update('problems', id, {
        status: 'resolved',
        solution: solution,
        resolvedBy: user.fullName,
        resolvedAt: new Date().toISOString()
    });
    APP.notify('Problem resolved', 'success');
    renderProbList();
}

function resolveProbDirect(id) {
    var solution = document.getElementById('solutionText') ? document.getElementById('solutionText').value : '';
    if (!solution) { APP.notify('Please enter solution details', 'error'); return; }
    var user = AUTH.currentUser();
    DB.update('problems', id, {
        status: 'resolved',
        solution: solution,
        resolvedBy: user.fullName,
        resolvedAt: new Date().toISOString()
    });
    APP.notify('Problem resolved', 'success');
    var m = document.querySelector('.modal.active');
    if (m) m.remove();
    renderProbList();
}

function deleteProb(id) {
    if (!confirm('Delete this problem?')) return;
    DB.delete('problems', id);
    APP.notify('Problem deleted', 'success');
    renderProbList();
}
