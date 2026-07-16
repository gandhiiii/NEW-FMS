function renderTasks(container) {
    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="taskSearch" placeholder="Search tasks..." oninput="renderTaskList()">
            </div>
            <button class="btn btn-primary" onclick="showTaskForm()">+ Assign Task</button>
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
    tbody.innerHTML = filtered.slice().reverse().map(t => `
        <tr>
            <td><strong>${t.title}</strong></td>
            <td>${t.assignedTo}</td>
            <td>${t.department || '-'}</td>
            <td>${t.deadline ? APP.formatDate(t.deadline) : '-'}
                ${t.deadline && t.status !== 'completed' && APP.daysBetween(new Date().toISOString(), t.deadline) < 0 ? ' ⚠️ Overdue' : ''}
            </td>
            <td><span class="badge ${t.priority === 'high' ? 'badge-danger' : t.priority === 'medium' ? 'badge-warning' : 'badge-info'}">${t.priority}</span></td>
            <td><span class="badge ${APP.getStatusBadge(t.status)}">${t.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editTask('${t.id}')">Edit</button>
                <button class="btn btn-sm btn-success" onclick="updateTaskStatus('${t.id}')">Next</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTask('${t.id}')">Del</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" class="empty-state">No tasks assigned</td></tr>';
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

function updateTaskStatus(id) {
    const task = DB.getById('tasks', id);
    if (!task) return;
    const statusFlow = { 'pending': 'in-progress', 'in-progress': 'completed', 'completed': 'pending' };
    const newStatus = statusFlow[task.status] || 'pending';
    DB.update('tasks', id, { status: newStatus });
    APP.notify(`Task status: ${newStatus}`, 'info');
    renderTaskList();
}
