function renderProblems(container) {
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="probSearch" placeholder="Search problems..." oninput="renderProbList()">
            </div>
            <button class="btn btn-primary" onclick="showProbForm()">+ Report Problem</button>
        </div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchProbTab('all',this)">All</button>
            <button class="tab-btn" onclick="switchProbTab('open',this)">Open</button>
            <button class="tab-btn" onclick="switchProbTab('in-progress',this)">In Progress</button>
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

let probFilter = 'all';

function switchProbTab(filter, btn) {
    probFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProbList();
}

function renderProbList() {
    const user = AUTH.currentUser();
    const problems = DB.get('problems');
    const search = (document.getElementById('probSearch')?.value || '').toLowerCase();
    let filtered = problems.filter(p => {
        if (user.role === 'admin') return true;
        if (user.role === 'hod') return p.department === user.department;
        return p.createdBy === user.username;
    });
    filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search) ||
        (p.reportedBy || '').toLowerCase().includes(search)
    );
    if (probFilter !== 'all') filtered = filtered.filter(p => p.status === probFilter);

    const tbody = document.getElementById('probTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.slice().reverse().map(p => `
        <tr>
            <td><strong>#${p.id.slice(-6)}</strong></td>
            <td>${p.title}</td>
            <td>${p.category}</td>
            <td>${p.reportedBy}</td>
            <td>${APP.formatDate(p.createdAt)}</td>
            <td><span class="badge ${p.priority === 'high' ? 'badge-danger' : p.priority === 'medium' ? 'badge-warning' : 'badge-info'}">${p.priority}</span></td>
            <td><span class="badge ${APP.getStatusBadge(p.status)}">${p.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewProb('${p.id}')">View</button>
                <button class="btn btn-sm btn-success" onclick="resolveProb('${p.id}')">Resolve</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="8" class="empty-state">No problems reported</td></tr>';
}

function showProbForm() {
    const form = `
        <form id="probForm">
            <div class="grid-2">
                <div class="form-group">
                    <label>Problem Title *</label>
                    <input type="text" name="title" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Category *</label>
                    <select name="category" class="form-control" required>
                        <option value="">Select</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Equipment">Equipment</option>
                        <option value="IT System">IT System</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Medical">Medical</option>
                        <option value="Security">Security</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select name="priority" class="form-control">
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Reported By *</label>
                    <input type="text" name="reportedBy" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Department</label>
                    <input type="text" name="department" class="form-control">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" name="location" class="form-control">
                </div>
            </div>
            <div class="form-group">
                <label>Description *</label>
                <textarea name="description" class="form-control" rows="3" required></textarea>
            </div>
        </form>
    `;
    openFormModal('Report Problem', form, `saveProb()`);
}

function saveProb() {
    const user = AUTH.currentUser();
    const data = getFormData('probForm');
    if (!data.title || !data.category || !data.reportedBy || !data.description) {
        APP.notify('Please fill required fields', 'error'); return;
    }
    data.status = 'open';
    data.createdBy = user.username;
    data.createdByName = user.fullName;
    data.department = data.department || user.department || '';
    data.solution = '';
    data.resolvedBy = '';
    data.resolvedAt = '';
    DB.add('problems', data);
    APP.notify('Problem reported', 'success');
    renderProbList();
}

function viewProb(id) {
    const p = DB.getById('problems', id);
    if (!p) return;
    showModal(`
        <div class="modal-header">
            <h3>#${p.id.slice(-6)} - ${p.title}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="grid-2">
            <div><strong>Category:</strong> ${p.category}</div>
            <div><strong>Priority:</strong> <span class="badge ${p.priority === 'high' ? 'badge-danger' : p.priority === 'medium' ? 'badge-warning' : 'badge-info'}">${p.priority}</span></div>
            <div><strong>Reported By:</strong> ${p.reportedBy}</div>
            <div><strong>Department:</strong> ${p.department || '-'}</div>
            <div><strong>Location:</strong> ${p.location || '-'}</div>
            <div><strong>Status:</strong> <span class="badge ${APP.getStatusBadge(p.status)}">${p.status}</span></div>
            <div><strong>Date:</strong> ${APP.formatDateTime(p.createdAt)}</div>
            <div><strong>Resolved:</strong> ${p.resolvedAt ? APP.formatDateTime(p.resolvedAt) : '-'}</div>
        </div>
        <div class="mt-4"><strong>Description:</strong><br>${p.description}</div>
        ${p.solution ? `<div class="mt-4"><strong>Solution:</strong><br>${p.solution}</div>` : ''}
        ${p.resolvedBy ? `<div class="mt-2"><strong>Resolved By:</strong> ${p.resolvedBy}</div>` : ''}
        ${p.status !== 'resolved' ? `
            <div class="mt-4">
                <h4>Add Solution</h4>
                <div class="form-group">
                    <textarea id="solutionText" class="form-control" rows="2" placeholder="Describe the solution..."></textarea>
                </div>
                <button class="btn btn-success" onclick="resolveProbDirect('${id}')">Mark Resolved</button>
            </div>
        ` : ''}
    `);
}

function resolveProb(id) {
    const p = DB.getById('problems', id);
    if (!p || p.status === 'resolved') { APP.notify('Already resolved', 'info'); return; }
    const user = AUTH.currentUser();
    const solution = prompt('Enter solution details:');
    if (!solution) return;
    DB.update('problems', id, {
        status: 'resolved',
        solution,
        resolvedBy: user.fullName,
        resolvedAt: new Date().toISOString()
    });
    APP.notify('Problem resolved', 'success');
    renderProbList();
}

function resolveProbDirect(id) {
    const solution = document.getElementById('solutionText')?.value;
    if (!solution) { APP.notify('Please enter solution details', 'error'); return; }
    const user = AUTH.currentUser();
    DB.update('problems', id, {
        status: 'resolved',
        solution,
        resolvedBy: user.fullName,
        resolvedAt: new Date().toISOString()
    });
    APP.notify('Problem resolved', 'success');
    document.querySelector('.modal.active')?.remove();
    renderProbList();
}
