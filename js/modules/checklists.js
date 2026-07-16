const CL_STATUSES = ['ok', 'fault', 'na', 'problem'];
const CL_UNITS = ['', 'V', '°C', '%', 'bar', 'A', 'kW', 'L/min', 'psi', 'ppm', 'mm', 'Hz', 'kWh'];

function renderChecklists(container) {
    const user = AUTH.currentUser();
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="clSearch" placeholder="Search checklists..." oninput="renderClList()">
            </div>
            <div>
                ${user.role === 'admin' || user.isSuperAdmin ? `<button class="btn btn-primary" onclick="showClForm()">+ New Checklist</button>` : ''}
            </div>
        </div>
        <div class="tabs">
            <button class="tab-btn active" onclick="switchClTab('all',this)">All</button>
            <button class="tab-btn" onclick="switchClTab('my',this)">${user.role === 'admin' || user.isSuperAdmin ? 'Assigned by Me' : 'My Checklists'}</button>
            <button class="tab-btn" onclick="switchClTab('common',this)">Common</button>
            <button class="tab-btn" onclick="switchClTab('completed',this)">Completed</button>
        </div>
        <div id="clGrid" class="grid-2"></div>
    `;
    renderClList();
}

let clFilter = 'all';

function switchClTab(filter, btn) {
    clFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderClList();
}

function statusColor(s) {
    const m = { ok: '#28a745', fault: '#dc3545', na: '#6c757d', problem: '#fd7e14', pending: '#e9ecef' };
    return m[s] || '#e9ecef';
}
function statusText(s) {
    return s ? s.toUpperCase() : 'PENDING';
}

function renderClList() {
    const user = AUTH.currentUser();
    const allChecklists = DB.get('checklists');
    const search = (document.getElementById('clSearch')?.value || '').toLowerCase();

    let scopeFiltered = allChecklists.filter(c => {
        if (user.role === 'admin' || user.isSuperAdmin) return true;
        if (user.role === 'hod') return c.department === user.department || c.assignedBy === user.fullName;
        return c.assignedTo === user.fullName || c.assignedTo === 'common';
    });

    let filtered = scopeFiltered;
    if (clFilter === 'my') {
        if (user.role === 'admin' || user.isSuperAdmin) {
            filtered = scopeFiltered.filter(c => c.assignedBy === user.fullName);
        } else {
            filtered = scopeFiltered.filter(c => c.assignedTo === user.fullName);
        }
    } else if (clFilter === 'common') {
        filtered = scopeFiltered.filter(c => c.assignedTo === 'common');
    } else if (clFilter === 'completed') {
        filtered = scopeFiltered.filter(c => c.status === 'completed');
    }
    if (search) {
        filtered = filtered.filter(c => c.title.toLowerCase().includes(search) || (c.assignedTo || '').toLowerCase().includes(search));
    }
    const grid = document.getElementById('clGrid');
    if (!grid) return;
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No checklists found</div>';
        return;
    }
    const isAdmin = user.role === 'admin' || user.isSuperAdmin;
    const canEdit = (c) => isAdmin || c.assignedBy === user.fullName;
    const isAssignee = (c) => c.assignedTo === user.fullName || c.assignedTo === 'common';

    grid.innerHTML = filtered.slice().reverse().map(c => {
        const items = c.items || [];
        const total = items.length;
        const done = items.filter(i => i.status && i.status !== 'pending').length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const barColor = pct === 100 ? 'green' : pct > 50 ? 'yellow' : 'red';
        return `<div class="card" style="${c.status === 'completed' ? 'opacity:0.7;' : ''}">
            <div class="flex-between" style="margin-bottom:8px;">
                <div>
                    <strong style="font-size:15px;">${c.title}</strong>
                    <span style="font-size:12px;color:var(--gray);display:block;">
                        ${c.assignedTo === 'common' ? '👥 Common' : '👤 ' + c.assignedTo}
                        ${c.floor ? ' | 📍 ' + c.floor : ''}
                        ${c.deadline ? ' | Due: ' + APP.formatDate(c.deadline) : ''}
                        ${c.deadline && APP.daysBetween(new Date().toISOString(), c.deadline) < 0 && c.status !== 'completed' ? ' ⚠️ Overdue' : ''}
                    </span>
                </div>
                <div style="text-align:right;">
                    <span class="badge ${c.status === 'completed' ? 'badge-success' : 'badge-info'}">${c.status}</span>
                    <div style="font-size:11px;color:var(--gray);margin-top:2px;">by ${c.assignedBy}</div>
                </div>
            </div>
            <div class="progress-bar" style="margin-bottom:8px;">
                <div class="progress-fill ${barColor}" style="width:${pct}%"></div>
            </div>
            <div style="font-size:12px;color:var(--gray);margin-bottom:8px;">${done}/${total} done (${pct}%)</div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                ${items.map((item, idx) => {
                    const st = item.status || 'pending';
                    return `<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:4px;background:${st === 'pending' ? 'var(--bg)' : '#f0faf0'};font-size:13px;">
                        <span style="display:inline-block;width:70px;text-align:center;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;color:white;background:${statusColor(st)};">${statusText(st)}</span>
                        <span style="flex:1;">${item.task}</span>
                        ${item.unit ? '<span style="font-size:11px;color:var(--gray);background:var(--bg);padding:1px 6px;border-radius:4px;border:1px solid #ddd;">' + item.unit + '</span>' : ''}
                        ${isAssignee(c) && c.status !== 'completed' ? `
                            <select class="form-control" style="width:auto;padding:2px 4px;font-size:12px;" onchange="updateClItemStatus('${c.id}',${idx},this.value)">
                                <option value="">Set</option>
                                ${CL_STATUSES.map(s => '<option value="' + s + '">' + s.toUpperCase() + '</option>').join('')}
                            </select>
                        ` : ''}
                    </div>`;
                }).join('')}
            </div>
            ${c.description ? '<div style="font-size:12px;color:var(--gray);margin-top:6px;padding:4px 8px;background:var(--bg);border-radius:4px;">📝 ' + c.description + '</div>' : ''}
            ${canEdit(c) ? '<div style="margin-top:8px;display:flex;gap:4px;">' +
                '<button class="btn btn-sm btn-primary" onclick="editCl(\'' + c.id + '\')">Edit</button>' +
                (c.status !== 'completed' ? '<button class="btn btn-sm btn-success" onclick="completeCl(\'' + c.id + '\')">Mark Complete</button>' : '') +
                '<button class="btn btn-sm btn-danger" onclick="deleteCl(\'' + c.id + '\')">Del</button>' +
            '</div>' : ''}
        </div>`;
    }).join('');
}

function showClForm(cl) {
    const user = AUTH.currentUser();
    let users = DB.get('users').filter(u => !u.isSuperAdmin);
    const floors = DB.get('floorItems');
    const existingItems = cl?.items || [];
    const isEdit = !!cl;
    if (user.role === 'hod') {
        users = users.filter(u => u.department === user.department && u.role !== 'admin');
        if (cl) users = users.concat(DB.get('users').filter(u => u.fullName === cl.assignedTo));
    }
    const depts = DB.get('departments');
    const form = `
        <form id="clForm">
            <input type="hidden" name="id" value="${cl?.id || ''}">
            <div class="grid-2">
                <div class="form-group">
                    <label>Checklist Title *</label>
                    <input type="text" name="title" class="form-control" value="${cl?.title || ''}" required placeholder="e.g. Morning Round">
                </div>
                <div class="form-group" ${user.role === 'hod' ? 'style="display:none;"' : ''}>
                    <label>Department</label>
                    <select name="department" class="form-control">
                        <option value="">All Departments</option>
                        ${depts.map(d => '<option value="' + d.name + '" ' + (cl?.department === d.name || (user.role === 'hod' && d.name === user.department) ? 'selected' : '') + '>' + d.name + '</option>').join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Assign To *</label>
                    <select name="assignedTo" class="form-control" required>
                        <option value="common" ${cl?.assignedTo === 'common' ? 'selected' : ''}>👥 Common (Everyone)</option>
                        <optgroup label="Employees">
                            ${users.map(u => '<option value="' + u.fullName + '" ' + (cl?.assignedTo === u.fullName ? 'selected' : '') + '>' + u.fullName + ' (' + u.role.replace('_',' ') + ')</option>').join('')}
                        </optgroup>
                    </select>
                </div>
                <div class="form-group">
                    <label>Floor / Area</label>
                    <select name="floor" class="form-control" onchange="loadFloorItems(this)" ${isEdit ? 'disabled' : ''}>
                        <option value="">Select floor to load items...</option>
                        ${floors.map(f => '<option value="' + f.floor + '" ' + (cl?.floor === f.floor ? 'selected' : '') + '>' + f.floor + ' (' + f.items.length + ' items)</option>').join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Deadline</label>
                    <input type="date" name="deadline" class="form-control" value="${cl?.deadline ? cl.deadline.split('T')[0] : ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Description (optional)</label>
                <textarea name="description" class="form-control" rows="2">${cl?.description || ''}</textarea>
            </div>
            <div class="form-group" style="${isEdit ? '' : 'display:none;'}" id="clStatusGroup">
                <label>Status</label>
                <select name="status" class="form-control">
                    <option value="active" ${cl?.status !== 'completed' ? 'selected' : ''}>Active</option>
                    <option value="completed" ${cl?.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
            <div class="form-group">
                <div class="flex-between" style="margin-bottom:8px;">
                    <label style="font-weight:600;">Checklist Items</label>
                    <button type="button" class="btn btn-sm btn-primary" onclick="addClItem()">+ Add Item</button>
                </div>
                <p style="font-size:12px;color:var(--gray);margin-bottom:8px;">Each item can have a unit (V, °C, %, bar, etc.) and will be filled with OK/Fault/NA/Problem by the assigned employee.</p>
                <div id="clItemsContainer">
                    ${existingItems.map((item, i) => renderClItemRow(i, item.task, item.unit)).join('')}
                </div>
            </div>
        </form>
    `;
    openFormModal(isEdit ? 'Edit Checklist' : 'New Checklist', form, 'saveCl()', true);
}

function renderClItemRow(idx, task, unit) {
    return '<div class="cl-item-row" style="display:flex;gap:6px;margin-bottom:6px;align-items:center;">' +
        '<input type="text" class="form-control" name="cl_item_' + idx + '" value="' + (task || '') + '" placeholder="Item description" style="flex:1;">' +
        '<select name="cl_unit_' + idx + '" class="form-control" style="width:80px;font-size:12px;">' +
        CL_UNITS.map(u => '<option value="' + u + '" ' + (unit === u ? 'selected' : '') + '>' + (u || 'none') + '</option>').join('') +
        '</select>' +
        '<button type="button" class="btn btn-sm btn-danger" onclick="removeClItem(this)" ' + (idx === 0 ? 'disabled' : '') + '>✕</button>' +
    '</div>';
}

function loadFloorItems(select) {
    const floorName = select.value;
    if (!floorName) return;
    const floors = DB.get('floorItems');
    const floor = floors.find(f => f.floor === floorName);
    if (!floor) return;
    const container = document.getElementById('clItemsContainer');
    if (!container) return;
    container.innerHTML = floor.items.map((item, i) => renderClItemRow(i, item.name, item.unit)).join('');
}

function addClItem() {
    const container = document.getElementById('clItemsContainer');
    if (!container) return;
    const idx = container.children.length;
    const row = document.createElement('div');
    row.className = 'cl-item-row';
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;';
    row.innerHTML = '<input type="text" class="form-control" name="cl_item_' + idx + '" value="" placeholder="Item description" style="flex:1;">' +
        '<select name="cl_unit_' + idx + '" class="form-control" style="width:80px;font-size:12px;">' +
        CL_UNITS.map(u => '<option value="' + u + '">' + (u || 'none') + '</option>').join('') +
        '</select>' +
        '<button type="button" class="btn btn-sm btn-danger" onclick="removeClItem(this)">✕</button>';
    container.appendChild(row);
}

function removeClItem(btn) {
    const container = document.getElementById('clItemsContainer');
    if (container.children.length <= 1) return;
    btn.closest('.cl-item-row').remove();
    const rows = container.querySelectorAll('.cl-item-row');
    rows.forEach((row, i) => {
        const inp = row.querySelector('input');
        const sel = row.querySelector('select');
        if (inp) inp.name = 'cl_item_' + i;
        if (sel) sel.name = 'cl_unit_' + i;
    });
}

function saveCl() {
    const user = AUTH.currentUser();
    const form = document.getElementById('clForm');
    const id = form.querySelector('[name="id"]')?.value;
    const title = form.querySelector('[name="title"]')?.value;
    const assignedTo = form.querySelector('[name="assignedTo"]')?.value;
    const floor = form.querySelector('[name="floor"]')?.value;
    const deadline = form.querySelector('[name="deadline"]')?.value;
    const status = form.querySelector('[name="status"]')?.value || 'active';
    const description = form.querySelector('[name="description"]')?.value;
    const department = form.querySelector('[name="department"]')?.value || user.department || '';
    if (!title || !assignedTo) { APP.notify('Title and assignment required', 'error'); return; }
    const items = [];
    const rows = form.querySelectorAll('.cl-item-row');
    rows.forEach((row, i) => {
        const task = row.querySelector('[name^="cl_item_"]')?.value?.trim();
        const unit = row.querySelector('[name^="cl_unit_"]')?.value || '';
        if (task) items.push({ task, unit, status: 'pending' });
    });
    if (items.length === 0) { APP.notify('Add at least one checklist item', 'error'); return; }
    if (id) {
        const existing = DB.getById('checklists', id);
        const statusMap = {};
        (existing?.items || []).forEach(item => { statusMap[item.task] = item.status; });
        items.forEach(item => {
            if (statusMap[item.task] !== undefined) item.status = statusMap[item.task];
        });
        DB.update('checklists', id, { title, assignedTo, floor, deadline, description, items, status, department });
        APP.notify('Checklist updated', 'success');
    } else {
        DB.add('checklists', {
            title, assignedTo, floor: floor || '', deadline: deadline || '', description: description || '',
            department, items, status: 'active', assignedBy: user.fullName
        });
        APP.notify('Checklist created and assigned', 'success');
    }
    renderClList();
}

function editCl(id) {
    const cl = DB.getById('checklists', id);
    if (cl) showClForm(cl);
}

function deleteCl(id) {
    confirmAction('Delete this checklist?', () => {
        DB.delete('checklists', id);
        APP.notify('Checklist deleted', 'success');
        renderClList();
    });
}

function updateClItemStatus(id, idx, value) {
    if (!value) return;
    const cl = DB.getById('checklists', id);
    if (!cl || !cl.items[idx]) return;
    cl.items[idx].status = value;
    cl.items[idx].updatedAt = new Date().toISOString();
    cl.items[idx].updatedBy = AUTH.currentUser()?.fullName || '';
    const allDone = cl.items.every(i => i.status && i.status !== 'pending');
    if (allDone && cl.status !== 'completed') {
        cl.status = 'completed';
        cl.completedAt = new Date().toISOString();
    }
    DB.update('checklists', id, { items: cl.items, status: cl.status, completedAt: cl.completedAt });
    APP.notify('Item set to ' + value.toUpperCase(), 'success');
    renderClList();
}

function completeCl(id) {
    const cl = DB.getById('checklists', id);
    if (!cl) return;
    const items = (cl.items || []).map(i => ({ ...i, status: i.status || 'ok' }));
    DB.update('checklists', id, { items, status: 'completed', completedAt: new Date().toISOString() });
    APP.notify('Checklist marked complete', 'success');
    renderClList();
}
