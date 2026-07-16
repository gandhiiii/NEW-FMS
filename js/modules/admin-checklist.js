function renderAdminChecklists(container) {
    const user = AUTH.currentUser();
    container.innerHTML = `
        <div class="flex-between mb-4">
            <h2 style="font-size:18px;font-weight:700;">Admin Checklists</h2>
        </div>
        <div class="tabs">
            <button class="tab-btn active" onclick="switchChecklistTab('tasks',this)">📋 My Tasks</button>
            <button class="tab-btn" onclick="switchChecklistTab('audits',this)">🔍 Compliance Audits</button>
            <button class="tab-btn" onclick="switchChecklistTab('oversight',this)">👁️ All Checklists</button>
        </div>
        <div id="admContent"></div>
    `;
    renderAdmTasks();
}

let admTab = 'tasks';

function switchChecklistTab(tab, btn) {
    admTab = tab;
    document.querySelectorAll('#pageContent .tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (tab === 'tasks') renderAdmTasks();
    else if (tab === 'audits') renderAdmAudits();
    else if (tab === 'oversight') renderAdmOversight();
}

/* ─── Tab 1: My Tasks (Personal Admin Todo) ─── */

function renderAdmTasks() {
    const user = AUTH.currentUser();
    const all = DB.get('adminChecklist') || [];
    const items = all.filter(i => i.createdBy === user.fullName);
    const content = document.getElementById('admContent');
    if (!content) return;
    content.innerHTML = `
        <div class="card" style="margin-bottom:16px;">
            <div class="card-header"><h3>➕ New Task</h3></div>
            <div style="display:flex;gap:8px;">
                <input type="text" id="admTaskInput" class="form-control" placeholder="Enter a task..." style="flex:1;">
                <button class="btn btn-primary" onclick="addAdmTask()">Add</button>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h3>📋 My Tasks (${items.filter(i => !i.done).length} pending)</h3></div>
            <div id="admTaskList">${renderAdmTaskItems(items)}</div>
        </div>
    `;
}

function renderAdmTaskItems(items) {
    if (items.length === 0) return '<div class="empty-state">No tasks yet</div>';
    return items.slice().reverse().map(i => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border);${i.done ? 'opacity:0.5;' : ''}">
            <input type="checkbox" ${i.done ? 'checked' : ''} onchange="toggleAdmTask('${i.id}')" style="width:18px;height:18px;">
            <span style="flex:1;font-size:14px;${i.done ? 'text-decoration:line-through;color:var(--gray);' : ''}">${i.text}</span>
            <span style="font-size:11px;color:var(--gray);">${APP.formatDate(i.createdAt)}</span>
            <button class="btn btn-sm btn-danger" onclick="deleteAdmTask('${i.id}')">✕</button>
        </div>
    `).join('');
}

function addAdmTask() {
    const input = document.getElementById('admTaskInput');
    const text = input?.value?.trim();
    if (!text) { APP.notify('Enter a task', 'error'); return; }
    const user = AUTH.currentUser();
    DB.add('adminChecklist', { text, done: false, createdBy: user.fullName });
    APP.notify('Task added', 'success');
    input.value = '';
    renderAdmTasks();
}

function toggleAdmTask(id) {
    const item = DB.getById('adminChecklist', id);
    if (!item) return;
    DB.update('adminChecklist', id, { done: !item.done });
    renderAdmTasks();
}

function deleteAdmTask(id) {
    confirmAction('Delete this task?', () => {
        DB.delete('adminChecklist', id);
        APP.notify('Task deleted', 'success');
        renderAdmTasks();
    });
}

/* ─── Tab 2: Compliance Audits ─── */

function renderAdmAudits() {
    const user = AUTH.currentUser();
    const audits = DB.get('adminAudits') || [];
    const content = document.getElementById('admContent');
    if (!content) return;
    content.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="auditSearch" placeholder="Search audits..." oninput="renderAuditList()">
            </div>
            <button class="btn btn-primary" onclick="showAuditForm()">+ New Audit</button>
        </div>
        <div id="auditGrid" class="grid-2"></div>
    `;
    renderAuditList();
}

let AUDIT_STATUSES = ['planned', 'in-progress', 'completed'];

function renderAuditList() {
    const audits = DB.get('adminAudits') || [];
    const search = (document.getElementById('auditSearch')?.value || '').toLowerCase();
    const filtered = search ? audits.filter(a => a.title.toLowerCase().includes(search) || a.assignedTo?.toLowerCase().includes(search)) : audits;
    const grid = document.getElementById('auditGrid');
    if (!grid) return;
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No compliance audits found</div>';
        return;
    }
    grid.innerHTML = filtered.slice().reverse().map(a => {
        const items = a.items || [];
        const total = items.length;
        const done = items.filter(i => i.status === 'ok' || i.status === 'na').length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return `<div class="card">
            <div class="flex-between" style="margin-bottom:8px;">
                <div>
                    <strong style="font-size:15px;">${a.title}</strong>
                    <span style="font-size:12px;color:var(--gray);display:block;">
                        👤 ${a.assignedTo || 'Unassigned'} | 📍 ${a.area || 'N/A'}
                        ${a.deadline ? ' | Due: ' + APP.formatDate(a.deadline) : ''}
                    </span>
                </div>
                <span class="badge ${a.status === 'completed' ? 'badge-success' : a.status === 'in-progress' ? 'badge-info' : 'badge-warning'}">${a.status}</span>
            </div>
            <div class="progress-bar" style="margin-bottom:8px;">
                <div class="progress-fill ${pct === 100 ? 'green' : pct > 50 ? 'yellow' : 'red'}" style="width:${pct}%"></div>
            </div>
            <div style="font-size:12px;color:var(--gray);margin-bottom:8px;">${done}/${total} items (${pct}%)</div>
            <div style="display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto;">
                ${items.map((item, idx) => {
                    const st = item.status || 'pending';
                    const sc = { ok: '#28a745', fault: '#dc3545', na: '#6c757d', problem: '#fd7e14', pending: '#e9ecef' };
                    return `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:6px 8px;border-radius:4px;background:${st === 'pending' ? 'var(--bg)' : '#f0faf0'};font-size:13px;">
                        <span style="flex:1;min-width:80px;">${item.task}</span>
                        ${item.notes ? '<span style="font-size:11px;color:var(--gray);">📝 ' + item.notes + '</span>' : ''}
                        <div class="cl-toggle-group">
                            <button class="cl-toggle-btn ${st === 'ok' ? 'active' : ''}" data-color="ok" onclick="updateAuditItem('${a.id}',${idx},'ok')">OK</button>
                            <button class="cl-toggle-btn ${st === 'fault' ? 'active' : ''}" data-color="fault" onclick="updateAuditItem('${a.id}',${idx},'fault')">FAULT</button>
                            <button class="cl-toggle-btn ${st === 'na' ? 'active' : ''}" data-color="na" onclick="updateAuditItem('${a.id}',${idx},'na')">N/A</button>
                            <button class="cl-toggle-btn ${st === 'problem' ? 'active' : ''}" data-color="problem" onclick="updateAuditItem('${a.id}',${idx},'problem')">PROBLEM</button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
            ${a.notes ? '<div style="font-size:12px;color:var(--gray);margin-top:6px;padding:4px 8px;background:var(--bg);border-radius:4px;">📝 ' + a.notes + '</div>' : ''}
            <div style="margin-top:8px;display:flex;gap:4px;">
                <button class="btn btn-sm btn-primary" onclick="editAudit('${a.id}')">Edit</button>
                ${a.status !== 'completed' ? '<button class="btn btn-sm btn-success" onclick="completeAudit(\'' + a.id + '\')">Complete</button>' : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteAudit('${a.id}')">Del</button>
            </div>
        </div>`;
    }).join('');
}

function showAuditForm(audit) {
    const users = DB.get('users').filter(u => !u.isSuperAdmin);
    const isEdit = !!audit;
    const form = `
        <form id="auditForm">
            <input type="hidden" name="id" value="${audit?.id || ''}">
            <div class="grid-2">
                <div class="form-group">
                    <label>Audit Title *</label>
                    <input type="text" name="title" class="form-control" value="${audit?.title || ''}" required placeholder="e.g. Safety Compliance">
                </div>
                <div class="form-group">
                    <label>Assign To</label>
                    <select name="assignedTo" class="form-control">
                        <option value="">Select...</option>
                        ${users.map(u => '<option value="' + u.fullName + '" ' + (audit?.assignedTo === u.fullName ? 'selected' : '') + '>' + u.fullName + '</option>').join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Area / Department</label>
                    <input type="text" name="area" class="form-control" value="${audit?.area || ''}" placeholder="e.g. Ground Floor">
                </div>
                <div class="form-group">
                    <label>Deadline</label>
                    <input type="date" name="deadline" class="form-control" value="${audit?.deadline ? audit.deadline.split('T')[0] : ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select name="status" class="form-control">
                    ${AUDIT_STATUSES.map(s => '<option value="' + s + '" ' + (audit?.status === s ? 'selected' : '') + '>' + s + '</option>').join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Notes (optional)</label>
                <textarea name="notes" class="form-control" rows="2">${audit?.notes || ''}</textarea>
            </div>
            <div class="form-group">
                <div class="flex-between" style="margin-bottom:8px;">
                    <label style="font-weight:600;">Audit Items</label>
                    <button type="button" class="btn btn-sm btn-primary" onclick="addAuditItem()">+ Add Item</button>
                </div>
                <div id="auditItemsContainer">
                    ${(audit?.items || []).map((item, i) => renderAuditItemRow(i, item.task, item.expected, item.notes)).join('')}
                </div>
            </div>
        </form>
    `;
    openFormModal(isEdit ? 'Edit Audit' : 'New Compliance Audit', form, 'saveAudit()', true);
}

function renderAuditItemRow(idx, task, expected, notes) {
    return '<div class="cl-item-row" style="display:flex;gap:6px;margin-bottom:6px;align-items:center;">' +
        '<input type="text" class="form-control" name="ai_task_' + idx + '" value="' + (task || '') + '" placeholder="Item" style="flex:2;">' +
        '<input type="text" class="form-control" name="ai_expected_' + idx + '" value="' + (expected || '') + '" placeholder="Expected" style="flex:1;">' +
        '<input type="text" class="form-control" name="ai_notes_' + idx + '" value="' + (notes || '') + '" placeholder="Notes" style="flex:1;">' +
        '<button type="button" class="btn btn-sm btn-danger" onclick="removeAuditItem(this)" ' + (idx === 0 ? 'disabled' : '') + '>✕</button>' +
    '</div>';
}

function addAuditItem() {
    const container = document.getElementById('auditItemsContainer');
    if (!container) return;
    const idx = container.children.length;
    const row = document.createElement('div');
    row.className = 'cl-item-row';
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;';
    row.innerHTML = '<input type="text" class="form-control" name="ai_task_' + idx + '" value="" placeholder="Item" style="flex:2;">' +
        '<input type="text" class="form-control" name="ai_expected_' + idx + '" value="" placeholder="Expected" style="flex:1;">' +
        '<input type="text" class="form-control" name="ai_notes_' + idx + '" value="" placeholder="Notes" style="flex:1;">' +
        '<button type="button" class="btn btn-sm btn-danger" onclick="removeAuditItem(this)">✕</button>';
    container.appendChild(row);
}

function removeAuditItem(btn) {
    const container = document.getElementById('auditItemsContainer');
    if (container.children.length <= 1) return;
    btn.closest('.cl-item-row').remove();
    container.querySelectorAll('.cl-item-row').forEach((row, i) => {
        row.querySelectorAll('input').forEach(inp => {
            if (inp.name.startsWith('ai_task_')) inp.name = 'ai_task_' + i;
            else if (inp.name.startsWith('ai_expected_')) inp.name = 'ai_expected_' + i;
            else if (inp.name.startsWith('ai_notes_')) inp.name = 'ai_notes_' + i;
        });
    });
}

function saveAudit() {
    const form = document.getElementById('auditForm');
    const id = form.querySelector('[name="id"]')?.value;
    const title = form.querySelector('[name="title"]')?.value;
    const assignedTo = form.querySelector('[name="assignedTo"]')?.value;
    const area = form.querySelector('[name="area"]')?.value;
    const deadline = form.querySelector('[name="deadline"]')?.value;
    const status = form.querySelector('[name="status"]')?.value || 'planned';
    const notes = form.querySelector('[name="notes"]')?.value;
    if (!title) { APP.notify('Title is required', 'error'); return; }
    const items = [];
    const rows = form.querySelectorAll('.cl-item-row');
    rows.forEach((row, i) => {
        const task = row.querySelector('[name^="ai_task_"]')?.value?.trim();
        const expected = row.querySelector('[name^="ai_expected_"]')?.value?.trim() || '';
        const n = row.querySelector('[name^="ai_notes_"]')?.value?.trim() || '';
        if (task) items.push({ task, expected, notes: n, status: 'pending' });
    });
    if (items.length === 0) { APP.notify('Add at least one audit item', 'error'); return; }
    if (id) {
        const existing = DB.getById('adminAudits', id);
        const statusMap = {};
        (existing?.items || []).forEach(item => { statusMap[item.task] = item.status; });
        items.forEach(item => {
            if (statusMap[item.task] !== undefined) item.status = statusMap[item.task];
        });
        DB.update('adminAudits', id, { title, assignedTo, area, deadline, notes, items, status });
        APP.notify('Audit updated', 'success');
    } else {
        DB.add('adminAudits', { title, assignedTo: assignedTo || '', area: area || '', deadline: deadline || '', notes: notes || '', items, status, createdBy: AUTH.currentUser().fullName });
        APP.notify('Audit created', 'success');
    }
    renderAdmAudits();
}

function editAudit(id) {
    const audit = DB.getById('adminAudits', id);
    if (audit) showAuditForm(audit);
}

function deleteAudit(id) {
    confirmAction('Delete this audit?', () => {
        DB.delete('adminAudits', id);
        APP.notify('Audit deleted', 'success');
        renderAdmAudits();
    });
}

function completeAudit(id) {
    const audit = DB.getById('adminAudits', id);
    if (!audit) return;
    const items = (audit.items || []).map(i => ({ ...i, status: i.status || 'ok' }));
    DB.update('adminAudits', id, { items, status: 'completed', completedAt: new Date().toISOString() });
    APP.notify('Audit completed', 'success');
    renderAdmAudits();
}

function updateAuditItem(id, idx, value) {
    if (!value) return;
    const audit = DB.getById('adminAudits', id);
    if (!audit || !audit.items[idx]) return;
    audit.items[idx].status = value;
    audit.items[idx].updatedAt = new Date().toISOString();
    audit.items[idx].updatedBy = AUTH.currentUser()?.fullName || '';
    const allDone = audit.items.every(i => i.status && i.status !== 'pending');
    if (allDone && audit.status !== 'completed') {
        audit.status = 'completed';
        audit.completedAt = new Date().toISOString();
    }
    DB.update('adminAudits', id, { items: audit.items, status: audit.status, completedAt: audit.completedAt });
    APP.notify('Item set to ' + value.toUpperCase(), 'success');
    renderAuditList();
}

/* ─── Tab 3: All Checklists Oversight ─── */

function renderAdmOversight() {
    const content = document.getElementById('admContent');
    if (!content) return;
    const allChecklists = DB.get('checklists');
    const users = DB.get('users');
    content.innerHTML = `
        <div class="card">
            <div class="card-header"><h3>👁️ All Employee Checklists (${allChecklists.length} total)</h3></div>
            <div class="table-responsive">
                <table>
                    <thead><tr><th>Title</th><th>Assigned To</th><th>Assigned By</th><th>Floor</th><th>Progress</th><th>Status</th><th>Due</th><th>Action</th></tr></thead>
                    <tbody>${renderOversightRows(allChecklists)}</tbody>
                </table>
            </div>
        </div>
        <div class="card" style="margin-top:16px;">
            <div class="card-header"><h3>📊 Summary by Employee</h3></div>
            <div class="table-responsive">
                <table>
                    <thead><tr><th>Employee</th><th>Total</th><th>Active</th><th>Completed</th><th>Overdue</th><th>Completion Rate</th></tr></thead>
                    <tbody>${renderOversightSummary(allChecklists, users)}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderOversightRows(checklists) {
    if (checklists.length === 0) return '<tr><td colspan="8" class="empty-state">No checklists found</td></tr>';
    return checklists.slice().reverse().map(c => {
        const items = c.items || [];
        const total = items.length;
        const done = items.filter(i => i.status && i.status !== 'pending').length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const overdue = c.deadline && APP.daysBetween(new Date().toISOString(), c.deadline) < 0 && c.status !== 'completed';
        return `<tr>
            <td><strong>${c.title}</strong></td>
            <td>${c.assignedTo}</td>
            <td>${c.assignedBy || '-'}</td>
            <td>${c.floor || '-'}</td>
            <td>
                <div class="progress-bar" style="width:80px;display:inline-block;">
                    <div class="progress-fill ${pct === 100 ? 'green' : pct > 50 ? 'yellow' : 'red'}" style="width:${pct}%"></div>
                </div>
                <span style="font-size:11px;margin-left:4px;">${done}/${total}</span>
            </td>
            <td><span class="badge ${c.status === 'completed' ? 'badge-success' : 'badge-info'}">${c.status}${overdue ? ' ⚠️' : ''}</span></td>
            <td style="font-size:12px;">${c.deadline ? APP.formatDate(c.deadline) : '-'}</td>
            <td><button class="btn btn-sm btn-outline" onclick="viewOversightCl('${c.id}')">View</button></td>
        </tr>`;
    }).join('');
}

function renderOversightSummary(checklists, users) {
    const employees = users.filter(u => !u.isSuperAdmin && u.role !== 'admin');
    if (employees.length === 0) return '<tr><td colspan="6" class="empty-state">No employees</td></tr>';
    return employees.map(e => {
        const empCls = checklists.filter(c => c.assignedTo === e.fullName);
        const total = empCls.length;
        const active = empCls.filter(c => c.status !== 'completed').length;
        const completed = empCls.filter(c => c.status === 'completed').length;
        const overdue = empCls.filter(c => c.deadline && APP.daysBetween(new Date().toISOString(), c.deadline) < 0 && c.status !== 'completed').length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return `<tr>
            <td><strong>${e.fullName}</strong></td>
            <td>${total}</td>
            <td>${active}</td>
            <td>${completed}</td>
            <td>${overdue > 0 ? '<span style="color:var(--danger);">⚠️ ' + overdue + '</span>' : '0'}</td>
            <td>
                <div class="progress-bar" style="width:60px;display:inline-block;">
                    <div class="progress-fill ${rate > 70 ? 'green' : rate > 40 ? 'yellow' : 'red'}" style="width:${rate}%"></div>
                </div>
                <span style="font-size:11px;margin-left:4px;">${rate}%</span>
            </td>
        </tr>`;
    }).join('');
}

function viewOversightCl(id) {
    const c = DB.getById('checklists', id);
    if (!c) return;
    const items = c.items || [];
    const total = items.length;
    const done = items.filter(i => i.status && i.status !== 'pending').length;
    const html = `
        <div style="margin-bottom:12px;">
            <p><strong>Title:</strong> ${c.title}</p>
            <p><strong>Assigned To:</strong> ${c.assignedTo}</p>
            <p><strong>Assigned By:</strong> ${c.assignedBy || '-'}</p>
            <p><strong>Floor:</strong> ${c.floor || '-'}</p>
            <p><strong>Status:</strong> ${c.status}</p>
            <p><strong>Progress:</strong> ${done}/${total} (${total > 0 ? Math.round((done/total)*100) : 0}%)</p>
            ${c.deadline ? '<p><strong>Deadline:</strong> ' + APP.formatDate(c.deadline) + '</p>' : ''}
            ${c.description ? '<p><strong>Description:</strong> ' + c.description + '</p>' : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
            ${items.map(item => {
                const st = item.status || 'pending';
                const sc = { ok: '#28a745', fault: '#dc3545', na: '#6c757d', problem: '#fd7e14', pending: '#e9ecef' };
                return '<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:4px;font-size:13px;background:' + (st === 'pending' ? 'var(--bg)' : '#f0faf0') + ';">' +
                    '<span style="display:inline-block;width:70px;text-align:center;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;color:white;background:' + (sc[st] || '#e9ecef') + ';">' + (st || 'PENDING').toUpperCase() + '</span>' +
                    '<span style="flex:1;">' + item.task + '</span>' +
                    (item.unit ? '<span style="font-size:11px;color:var(--gray);">' + item.unit + '</span>' : '') +
                    (item.updatedBy ? '<span style="font-size:11px;color:var(--gray);">by ' + item.updatedBy + '</span>' : '') +
                '</div>';
            }).join('')}
        </div>
    `;
    openFormModal('Checklist: ' + c.title, html, null, false);
}
