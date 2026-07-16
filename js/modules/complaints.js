function renderComplaints(container) {
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="compSearch" placeholder="Search complaints..." oninput="renderCompList()">
            </div>
            <button class="btn btn-primary" onclick="showCompForm()">+ New Complaint</button>
        </div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchCompTab('all',this)">All</button>
            <button class="tab-btn" onclick="switchCompTab('open',this)">Open</button>
            <button class="tab-btn" onclick="switchCompTab('in-progress',this)">In Progress</button>
            <button class="tab-btn" onclick="switchCompTab('resolved',this)">Resolved</button>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead><tr>
                        <th>ID</th><th>Patient Name</th><th>Room/Ward</th><th>Category</th>
                        <th>Date</th><th>Priority</th><th>Status</th><th>Actions</th>
                    </tr></thead>
                    <tbody id="compTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderCompList();
}

let compFilter = 'all';

function switchCompTab(filter, btn) {
    compFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCompList();
}

function renderCompList() {
    const user = AUTH.currentUser();
    const complaints = DB.get('complaints');
    const search = (document.getElementById('compSearch')?.value || '').toLowerCase();
    let filtered = complaints.filter(c => {
        if (user.role === 'admin') return true;
        if (user.role === 'hod') return c.department === user.department;
        return c.createdBy === user.username;
    });
    filtered = filtered.filter(c =>
        c.patientName.toLowerCase().includes(search) ||
        c.category.toLowerCase().includes(search) ||
        c.roomNo.toLowerCase().includes(search)
    );
    if (compFilter !== 'all') filtered = filtered.filter(c => c.status === compFilter);

    const tbody = document.getElementById('compTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.slice().reverse().map(c => `
        <tr>
            <td><strong>#${c.id.slice(-6)}</strong></td>
            <td>${c.patientName}</td>
            <td>${c.roomNo || '-'}</td>
            <td>${c.category}</td>
            <td>${APP.formatDate(c.createdAt)}</td>
            <td><span class="badge ${c.priority === 'high' ? 'badge-danger' : c.priority === 'medium' ? 'badge-warning' : 'badge-info'}">${c.priority}</span></td>
            <td><span class="badge ${APP.getStatusBadge(c.status)}">${c.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewComp('${c.id}')">View</button>
                <button class="btn btn-sm btn-success" onclick="resolveComp('${c.id}')">Resolve</button>
                <button class="btn btn-sm btn-danger" onclick="deleteComp('${c.id}')">Del</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="8" class="empty-state">No complaints</td></tr>';
}

function showCompForm() {
    const user = AUTH.currentUser();
    const form = `
        <form id="compForm">
            <div class="grid-2">
                <div class="form-group">
                    <label>Patient Name *</label>
                    <input type="text" name="patientName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Room / Ward No</label>
                    <input type="text" name="roomNo" class="form-control">
                </div>
                <div class="form-group">
                    <label>Category *</label>
                    <select name="category" class="form-control" required>
                        <option value="">Select</option>
                        <option value="Food">Food</option>
                        <option value="Cleanliness">Cleanliness</option>
                        <option value="Staff Behavior">Staff Behavior</option>
                        <option value="Medical Care">Medical Care</option>
                        <option value="Facilities">Facilities</option>
                        <option value="Billing">Billing</option>
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
            </div>
            <div class="form-group" ${user.role === 'admin' || user.role === 'hod' ? '' : 'style="display:none;"'}>
                <label>Department</label>
                ${deptDropdown('department', user.department)}
            </div>
            <div class="form-group">
                <label>Complaint Details *</label>
                <textarea name="description" class="form-control" rows="3" required></textarea>
            </div>
        </form>
    `;
    openFormModal('New Complaint', form, `saveComp()`);
}

function saveComp() {
    const data = getFormData('compForm');
    if (!data.patientName || !data.category || !data.description) {
        APP.notify('Please fill required fields', 'error'); return;
    }
    const user = AUTH.currentUser();
    data.status = 'open';
    data.createdBy = user.username;
    data.createdByName = user.fullName;
    data.department = data.department || user.department || '';
    data.actionTaken = '';
    data.resolvedBy = '';
    data.resolvedAt = '';
    DB.add('complaints', data);
    APP.notify('Complaint registered', 'success');
    renderCompList();
}

function viewComp(id) {
    const c = DB.getById('complaints', id);
    if (!c) return;
    showModal(`
        <div class="modal-header">
            <h3>#${c.id.slice(-6)} - ${c.patientName}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="grid-2">
            <div><strong>Category:</strong> ${c.category}</div>
            <div><strong>Room:</strong> ${c.roomNo || '-'}</div>
            <div><strong>Priority:</strong> <span class="badge ${c.priority === 'high' ? 'badge-danger' : c.priority === 'medium' ? 'badge-warning' : 'badge-info'}">${c.priority}</span></div>
            <div><strong>Status:</strong> <span class="badge ${APP.getStatusBadge(c.status)}">${c.status}</span></div>
            <div><strong>Date:</strong> ${APP.formatDateTime(c.createdAt)}</div>
            <div><strong>Resolved:</strong> ${c.resolvedAt ? APP.formatDateTime(c.resolvedAt) : '-'}</div>
        </div>
        <div class="mt-4"><strong>Complaint:</strong><br>${c.description}</div>
        ${c.actionTaken ? `<div class="mt-4"><strong>Action Taken:</strong><br>${c.actionTaken}</div>` : ''}
        ${c.status !== 'resolved' ? `
            <div class="mt-4">
                <h4>Take Action</h4>
                <textarea id="actionText" class="form-control" rows="2" placeholder="Action taken..."></textarea>
                <button class="btn btn-success mt-2" onclick="resolveCompDirect('${id}')">Mark Resolved</button>
            </div>
        ` : ''}
    `);
}

function resolveComp(id) {
    const c = DB.getById('complaints', id);
    if (!c || c.status === 'resolved') { APP.notify('Already resolved', 'info'); return; }
    const action = prompt('Action taken:');
    if (!action) return;
    const user = AUTH.currentUser();
    DB.update('complaints', id, {
        status: 'resolved',
        actionTaken: action,
        resolvedBy: user.fullName,
        resolvedAt: new Date().toISOString()
    });
    APP.notify('Complaint resolved', 'success');
    renderCompList();
}

function resolveCompDirect(id) {
    const action = document.getElementById('actionText')?.value;
    if (!action) { APP.notify('Please describe action taken', 'error'); return; }
    const user = AUTH.currentUser();
    DB.update('complaints', id, {
        status: 'resolved',
        actionTaken: action,
        resolvedBy: user.fullName,
        resolvedAt: new Date().toISOString()
    });
    APP.notify('Complaint resolved', 'success');
    document.querySelector('.modal.active')?.remove();
    renderCompList();
}

function deleteComp(id) {
    confirmAction('Delete this complaint?', () => {
        DB.delete('complaints', id);
        APP.notify('Complaint deleted', 'success');
        renderCompList();
    });
}
