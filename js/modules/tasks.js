function renderTasks(container) {
    var user = AUTH.currentUser();
    var isMgmt = user.role === 'admin' || user.role === 'hod' || user.isSuperAdmin;
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="taskSearch" placeholder="Search tasks..." oninput="renderTaskList()">
            </div>
            <div>
                <button class="btn btn-primary" onclick="showTaskForm()">+ Assign Task</button>
                ${isMgmt ? '<button class="btn btn-success" onclick="exportTaskReport()">⬇ Excel Report</button>' : ''}
                ${isMgmt ? '<button class="btn btn-info" onclick="printTaskReport()">🖨 PDF Report</button>' : ''}
                ${isMgmt ? '<button class="btn btn-success" onclick="shareTaskWhatsApp()" style="background:#25D366;">📱 WhatsApp</button>' : ''}
                ${isMgmt ? '<button class="btn btn-primary" onclick="shareTaskEmail()">✉ Email</button>' : ''}
            </div>
        </div>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchTaskTab('all',this)">All</button>
            <button class="tab-btn" onclick="switchTaskTab('pending',this)">Pending</button>
            <button class="tab-btn" onclick="switchTaskTab('in-progress',this)">In Progress</button>
            <button class="tab-btn" onclick="switchTaskTab('completed',this)">Completed</button>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead><tr>
                        <th>Title</th><th>Assigned To</th><th>Department</th>
                        <th>Deadline</th><th>Priority</th><th>Status</th><th>Actions</th>
                    </tr></thead>
                    <tbody id="taskTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderTaskList();
}

let taskFilter = 'all';

function switchTaskTab(filter, btn) {
    taskFilter = filter;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTaskList();
}

function renderTaskList() {
    const user = AUTH.currentUser();
    const tasks = DB.get('tasks');
    const search = (document.getElementById('taskSearch')?.value || '').toLowerCase();
    let filtered = tasks.filter(t => {
        if (user.role === 'admin') return true;
        if (user.role === 'hod') return t.department === user.department;
        return t.assignedTo === user.fullName;
    });
    filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(search) ||
        (t.assignedTo || '').toLowerCase().includes(search)
    );
    if (taskFilter !== 'all') filtered = filtered.filter(t => t.status === taskFilter);

    const tbody = document.getElementById('taskTableBody');
    if (!tbody) return;
    var isAdmin = user.role === 'admin' || user.isSuperAdmin;
    var isHod = user.role === 'hod';
    tbody.innerHTML = filtered.slice().reverse().map(t => {
        let actions = '';
        if (isAdmin || isHod) {
            actions = `
                <button class="btn btn-sm btn-primary" onclick="editTask('${t.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTask('${t.id}')">Del</button>
            `;
        } else if (t.assignedTo === user.fullName) {
            if (t.status === 'pending') {
                actions = `<button class="btn btn-sm btn-success" onclick="startTask('${t.id}')">▶ Start</button>`;
            } else if (t.status === 'in-progress') {
                actions = `<button class="btn btn-sm btn-success" onclick="completeTask('${t.id}')">✓ Complete</button>`;
            } else {
                actions = `<span style="font-size:12px;color:var(--gray);">Done</span>`;
            }
        }
        return `<tr>
            <td><strong>${t.title}</strong></td>
            <td>${t.assignedTo}</td>
            <td>${t.department || '-'}</td>
            <td>${t.deadline ? APP.formatDate(t.deadline) : '-'}
                ${t.deadline && t.status !== 'completed' && APP.daysBetween(new Date().toISOString(), t.deadline) < 0 ? ' ⚠️ Overdue' : ''}
            </td>
            <td><span class="badge ${t.priority === 'high' ? 'badge-danger' : t.priority === 'medium' ? 'badge-warning' : 'badge-info'}">${t.priority}</span></td>
            <td><span class="badge ${APP.getStatusBadge(t.status)}">${t.status}</span></td>
            <td>${actions}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="7" class="empty-state">No tasks assigned</td></tr>';
}

function showTaskForm(task) {
    const user = AUTH.currentUser();
    const users = DB.get('users');
    const depts = DB.get('departments');
    let assignableUsers = users.filter(u => u.role !== 'admin');
    if (user.role === 'hod') {
        assignableUsers = assignableUsers.filter(u => u.department === user.department && u.role !== 'admin');
        if (task) assignableUsers = assignableUsers.concat(users.filter(u => u.fullName === task.assignedTo));
    }
    const form = `
        <form id="taskForm">
            <input type="hidden" name="id" value="${task?.id || ''}">
            <div class="grid-2">
                <div class="form-group">
                    <label>Task Title *</label>
                    <input type="text" name="title" class="form-control" value="${task?.title || ''}" required>
                </div>
                <div class="form-group">
                    <label>Assigned To *</label>
                    <select name="assignedTo" class="form-control" required>
                        <option value="">Select Employee</option>
                        ${assignableUsers.map(u =>
                            `<option value="${u.fullName}" ${task?.assignedTo === u.fullName ? 'selected' : ''}>${u.fullName} (${u.role})</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Department</label>
                    <select name="department" class="form-control">
                        <option value="">Select</option>
                        ${depts.map(d => `<option value="${d.name}" ${task?.department === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Deadline</label>
                    <input type="date" name="deadline" class="form-control" value="${task?.deadline ? task.deadline.split('T')[0] : ''}">
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select name="priority" class="form-control">
                        <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${task?.priority === 'medium' || !task ? 'selected' : ''}>Medium</option>
                        <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="status" class="form-control">
                        <option value="pending" ${task?.status === 'pending' || !task ? 'selected' : ''}>Pending</option>
                        <option value="in-progress" ${task?.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${task?.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" class="form-control" rows="3">${task?.description || ''}</textarea>
            </div>
        </form>
    `;
    openFormModal(task ? 'Edit Task' : 'Assign New Task', form, `saveTask()`);
}

function saveTask() {
    const data = getFormData('taskForm');
    if (!data.title || !data.assignedTo) {
        APP.notify('Title and assignee required', 'error'); return;
    }
    if (data.id) {
        DB.update('tasks', data.id, data);
        APP.notify('Task updated', 'success');
    } else {
        DB.add('tasks', data);
        APP.notify('Task assigned successfully', 'success');
    }
    renderTaskList();
}

function editTask(id) {
    const task = DB.getById('tasks', id);
    if (task) showTaskForm(task);
}

function deleteTask(id) {
    confirmAction('Delete this task?', () => {
        DB.delete('tasks', id);
        APP.notify('Task deleted', 'success');
        renderTaskList();
    });
}

function startTask(id) {
    const task = DB.getById('tasks', id);
    if (!task || task.status !== 'pending') return;
    DB.update('tasks', id, { status: 'in-progress', startedAt: new Date().toISOString() });
    APP.notify('Task started — In Progress', 'info');
    renderTaskList();
}

function completeTask(id) {
    const task = DB.getById('tasks', id);
    if (!task || task.status !== 'in-progress') return;
    confirmAction('Mark this task as completed?', () => {
        DB.update('tasks', id, { status: 'completed', completedAt: new Date().toISOString() });
        APP.notify('Task completed', 'success');
        renderTaskList();
    });
}

/* ─── Task Report & Share ─── */

function getTaskReportData() {
    var user = AUTH.currentUser();
    var tasks = DB.get('tasks') || [];
    if (user.role === 'hod') tasks = tasks.filter(function(t) { return t.department === user.department; });
    tasks = tasks.slice().reverse();
    var total = tasks.length;
    var pending = tasks.filter(function(t) { return t.status === 'pending'; }).length;
    var inProgress = tasks.filter(function(t) { return t.status === 'in-progress'; }).length;
    var completed = tasks.filter(function(t) { return t.status === 'completed'; }).length;
    var overdue = tasks.filter(function(t) { return t.status !== 'completed' && t.deadline && new Date(t.deadline) < new Date(); }).length;
    var completionRate = total > 0 ? Math.round(completed / total * 100) : 0;
    return { tasks: tasks, total: total, pending: pending, inProgress: inProgress, completed: completed, overdue: overdue, completionRate: completionRate };
}

function exportTaskReport() {
    try {
        if (typeof XLSX === 'undefined' || !XLSX || !XLSX.utils) {
            APP.notify('Excel library not loaded', 'error');
            return;
        }
        var data = getTaskReportData();
        var wb = XLSX.utils.book_new();
        var f = function(v) { return v || '-'; };

        // Sheet 1: Summary
        var sumCols = ['Metric', 'Value'];
        var sumRows = [
            ['Total Tasks', data.total],
            ['Pending', data.pending],
            ['In Progress', data.inProgress],
            ['Completed', data.completed],
            ['Overdue', data.overdue],
            ['Completion Rate', data.completionRate + '%']
        ];
        var ws1 = XLSX.utils.aoa_to_sheet([sumCols].concat(sumRows));
        XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

        // Sheet 2: All Tasks
        if (data.tasks.length) {
            var tCols = ['Title', 'Assigned To', 'Department', 'Priority', 'Deadline', 'Status', 'Description'];
            var tRows = data.tasks.map(function(t) {
                return [f(t.title), f(t.assignedTo), f(t.department), f(t.priority), t.deadline ? APP.formatDate(t.deadline) : '-', f(t.status), f(t.description)];
            });
            var ws2 = XLSX.utils.aoa_to_sheet([tCols].concat(tRows));
            XLSX.utils.book_append_sheet(wb, ws2, 'All Tasks');
        }

        var wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        var blob = new Blob([wbout], { type: 'application/octet-stream' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'Task_Report_' + new Date().toISOString().split('T')[0] + '.xlsx';
        document.body.appendChild(link);
        link.click();
        setTimeout(function() {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        APP.notify('Task Excel report downloaded', 'success');
    } catch (e) {
        console.error('exportTaskReport error:', e);
        APP.notify('Export failed: ' + e.message, 'error');
    }
}

function printTaskReport() {
    var data = getTaskReportData();
    var user = AUTH.currentUser();
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Task Report</title>';
    html += '<style>';
    html += '*{box-sizing:border-box;}';
    html += 'body{font-family:"Segoe UI",Arial,sans-serif;margin:30px;color:#222;}';
    html += 'h1{font-size:24px;color:#1a73e8;}';
    html += 'h2{font-size:16px;margin:20px 0 8px;color:#333;border-left:4px solid #1a73e8;padding-left:10px;}';
    html += 'table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:11px;}';
    html += 'th{background:#1a73e8;color:#fff;padding:8px 10px;text-align:left;}';
    html += 'td{border:1px solid #ddd;padding:6px 10px;}';
    html += 'tr:nth-child(even){background:#f8f9fa;}';
    html += '.card{display:inline-block;margin:8px;padding:16px;background:#f0f4ff;border-radius:8px;text-align:center;min-width:120px;}';
    html += '.num{font-size:28px;font-weight:700;color:#1a73e8;}';
    html += '.lbl{font-size:11px;color:#888;}';
    html += '@media print{body{margin:15mm;}th{background:#1a73e8!important;color:#fff!important;-webkit-print-color-adjust:exact;}}';
    html += '</style></head><body>';
    html += '<h1>Task Report</h1>';
    html += '<div style="font-size:12px;color:#888;margin-bottom:16px;">Generated: ' + new Date().toLocaleString() + ' | ' + (user.department ? 'Department: ' + user.department : 'All Departments') + '</div>';
    html += '<div style="text-align:center;">';
    html += '<div class="card"><div class="num">' + data.total + '</div><div class="lbl">Total</div></div>';
    html += '<div class="card"><div class="num" style="color:#fbbc04;">' + data.pending + '</div><div class="lbl">Pending</div></div>';
    html += '<div class="card"><div class="num" style="color:#1a73e8;">' + data.inProgress + '</div><div class="lbl">In Progress</div></div>';
    html += '<div class="card"><div class="num" style="color:#34a853;">' + data.completed + '</div><div class="lbl">Completed</div></div>';
    html += '<div class="card"><div class="num" style="color:#ea4335;">' + data.overdue + '</div><div class="lbl">Overdue</div></div>';
    html += '<div class="card"><div class="num" style="color:#7b1fa2;">' + data.completionRate + '%</div><div class="lbl">Rate</div></div>';
    html += '</div>';
    html += '<h2>All Tasks (' + data.tasks.length + ')</h2>';
    html += '<table><thead><tr><th>Title</th><th>Assigned To</th><th>Priority</th><th>Deadline</th><th>Status</th></tr></thead><tbody>';
    data.tasks.forEach(function(t) {
        html += '<tr><td>' + t.title + '</td><td>' + (t.assignedTo || '-') + '</td><td>' + (t.priority || '-') + '</td><td>' + (t.deadline ? APP.formatDate(t.deadline) : '-') + '</td><td>' + (t.status || '-') + '</td></tr>';
    });
    html += '</tbody></table>';
    html += '<div style="text-align:center;font-size:10px;color:#aaa;margin-top:30px;border-top:1px solid #eee;padding-top:10px;">HMS Task Report — Confidential</div>';
    html += '</body></html>';

    var w = window.open('_blank');
    if (!w) { APP.notify('Please allow popups', 'error'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(function() { w.print(); }, 500);
}

function shareTaskWhatsApp() {
    var data = getTaskReportData();
    var text = '*Task Report*';
    text += '\nTotal: ' + data.total + ' | Pending: ' + data.pending + ' | In Progress: ' + data.inProgress;
    text += ' | Completed: ' + data.completed + ' | Overdue: ' + data.overdue;
    text += '\nCompletion Rate: ' + data.completionRate + '%';
    text += '\n\n*Task List:*\n';
    data.tasks.slice(0, 15).forEach(function(t) {
        var d = t.deadline ? APP.formatDate(t.deadline) : '-';
        text += '\n- ' + t.title + ' (' + t.status + ') [' + d + ']';
    });
    if (data.tasks.length > 15) text += '\n... and ' + (data.tasks.length - 15) + ' more tasks';
    text += '\n\nGenerated: ' + new Date().toLocaleString();
    var url = 'https://wa.me/?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
}

function shareTaskEmail() {
    var data = getTaskReportData();
    var subject = 'Task Report - ' + new Date().toISOString().split('T')[0];
    var body = 'Task Report\n';
    body += 'Generated: ' + new Date().toLocaleString() + '\n\n';
    body += 'Summary:\n';
    body += '- Total Tasks: ' + data.total + '\n';
    body += '- Pending: ' + data.pending + '\n';
    body += '- In Progress: ' + data.inProgress + '\n';
    body += '- Completed: ' + data.completed + '\n';
    body += '- Overdue: ' + data.overdue + '\n';
    body += '- Completion Rate: ' + data.completionRate + '%\n\n';
    body += 'Task Details:\n';
    data.tasks.slice(0, 20).forEach(function(t) {
        body += t.title + ' | ' + (t.assignedTo || '-') + ' | ' + (t.status || '-') + ' | ' + (t.deadline ? APP.formatDate(t.deadline) : '-') + '\n';
    });
    if (data.tasks.length > 20) body += '\n... and ' + (data.tasks.length - 20) + ' more tasks';
    body += '\n\nDownload full report from HMS dashboard.';
    window.open('mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body), '_blank');
}
