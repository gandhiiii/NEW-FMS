function renderUsers(container) {
    var users = DB.get('users');

    container.innerHTML = `
        <div class="flex-between mb-4">
            <div class="search-box">
                <input type="text" class="form-control" id="userSearch" placeholder="Search users..." oninput="renderUsersList()">
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
                <span id="userCount" style="font-size:13px;color:var(--gray);">${users.length} users</span>
                <button class="btn btn-primary" onclick="showUserForm()">+ Add User</button>
                ${AUTH.currentUser()?.isSuperAdmin || AUTH.currentUser()?.role === 'admin' ? '<button class="btn btn-danger" onclick="removeAllEmployees()">🗑️ Remove All</button>' : ''}
            </div>
        </div>
        <div class="card">
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Username</th><th>Full Name</th><th>Email</th><th>Phone</th>
                            <th>Role</th><th>Department</th><th>Permissions</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    renderUsersList();
}

function renderUsersList() {
    try {
        var users = DB.get('users') || [];

        var searchInput = document.getElementById('userSearch');
        var search = '';
        if (searchInput) search = searchInput.value.toLowerCase();

        var rows = '';
        var valid = [];

        for (var i = 0; i < users.length; i++) {
            var u = users[i];
            if (!u || typeof u !== 'object') continue;

            var fullName = typeof u.fullName === 'string' ? u.fullName : '';
            var username = typeof u.username === 'string' ? u.username : '';
            var email = typeof u.email === 'string' ? u.email : '';
            var role = typeof u.role === 'string' ? u.role : 'employee';
            var department = typeof u.department === 'string' ? u.department : '';
            var phone = typeof u.phone === 'string' ? u.phone : '';
            var uid = typeof u.id === 'string' ? u.id : '';
            var isSuperAdmin = !!u.isSuperAdmin;
            var permissions = Array.isArray(u.permissions) ? u.permissions : [];

            var match = fullName.toLowerCase().includes(search) ||
                username.toLowerCase().includes(search) ||
                email.toLowerCase().includes(search) ||
                role.includes(search) ||
                department.toLowerCase().includes(search);

            if (!match) continue;
            valid.push(u);

            var deptFeatures = typeof getDepartmentFeatures === 'function' ? getDepartmentFeatures(department) : [];
            var totalPerms = new Set(deptFeatures.concat(permissions)).size;

            rows += '<tr>'
                + '<td><strong>' + username.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</strong></td>'
                + '<td>' + fullName.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</td>'
                + '<td>' + email.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</td>'
                + '<td>' + phone.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</td>'
                + '<td><span class="badge ' + APP.getRoleBadge(role) + '">' + role.toUpperCase() + '</span></td>'
                + '<td>' + (department || '-') + '</td>'
                + '<td style="font-size:12px;"><span class="badge badge-info">' + totalPerms + ' modules</span>'
                + (deptFeatures.length > 0 ? '<span style="color:var(--gray);display:block;">' + deptFeatures.length + ' from dept</span>' : '')
                + '</td>'
                + '<td><button class="btn btn-sm btn-primary" onclick="editUser(\'' + uid.replace(/'/g,'') + '\')">Edit</button> '
                + '<button class="btn btn-sm btn-danger" onclick="deleteUser(\'' + uid.replace(/'/g,'') + '\')"' + (isSuperAdmin ? ' disabled' : '') + '>Del</button></td>'
                + '</tr>';
        }

        if (valid.length !== users.length) {
            DB.set('users', valid);
        }

        var tbody = document.getElementById('usersTableBody');
        if (tbody) tbody.innerHTML = rows || '<tr><td colspan="8" class="empty-state">No users found</td></tr>';

        var countEl = document.getElementById('userCount');
        if (countEl) countEl.textContent = valid.length + ' users';
    } catch (e) {
        console.warn('renderUsersList error:', e.message, e.stack);
        if (typeof APP !== 'undefined' && APP.notify) APP.notify('Error loading users: ' + e.message, 'error');
        var tbody = document.getElementById('usersTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Error loading users</td></tr>';
    }
}

function showUserForm(user) {
    const depts = DB.get('departments').filter(d => d.active !== false);
    const roles = ['admin', 'hod', 'storekeeper', 'employee', 'ambulance_employee'];
    const isEdit = !!user;

    const userDept = user?.department || '';
    const deptFeatures = getDepartmentFeatures(userDept);
    const userPerms = user?.permissions || [];

    const form = `
        <form id="userForm">
            <input type="hidden" name="id" value="${user?.id || ''}">
            <div class="grid-2">
                <div class="form-group">
                    <label>Username *</label>
                    <input type="text" name="username" class="form-control" value="${user?.username || ''}" ${isEdit ? 'readonly' : ''} required>
                </div>
                <div class="form-group">
                    <label>${isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                    <input type="text" name="password" class="form-control" value="" ${isEdit ? '' : 'required'} placeholder="${isEdit ? 'Leave blank to keep current' : ''}">
                </div>
                <div class="form-group">
                    <label>Full Name *</label>
                    <input type="text" name="fullName" class="form-control" value="${user?.fullName || ''}" required>
                </div>
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" name="email" class="form-control" value="${user?.email || ''}" required>
                </div>
                <div class="form-group">
                    <label>Phone *</label>
                    <input type="text" name="phone" class="form-control" value="${user?.phone || ''}" required>
                </div>
                <div class="form-group">
                    <label>Role *</label>
                    <select name="role" class="form-control" required onchange="onRoleChange(this)">
                        ${roles.map(r => `<option value="${r}" ${user?.role === r ? 'selected' : ''}>${r.replace('_',' ').toUpperCase()}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Department *</label>
                    <select name="department" class="form-control" required onchange="onDeptChange(this)">
                        <option value="">Select Department</option>
                        ${depts.map(d => `<option value="${d.name}" ${userDept === d.name ? 'selected' : ''} data-features='${JSON.stringify(d.features || [])}'>${d.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Permissions</label>
                <div style="font-size:12px;color:var(--gray);margin-bottom:8px;">
                    <span class="badge badge-info">Inherited from department</span> = auto-granted based on department feature rights.
                    <span class="badge badge-success">Extra user rights</span> = manually assigned.
                </div>
                <div class="permission-grid" id="permissionsGrid">
                    ${renderPermissionCheckboxes(deptFeatures, userPerms)}
                </div>
            </div>
        </form>
    `;

    openFormModal(isEdit ? 'Edit User' : 'Add New User', form, `saveUser()`, true);
}

function renderPermissionCheckboxes(deptFeatures, userPerms) {
    const allFeatures = [
        'dashboard', 'users', 'departments', 'inventory', 'gate-security',
        'projects', 'ambulance', 'problems', 'tasks', 'complaints',
        'room-checklist', 'admissions', 'lost-found', 'checklists', 'admin-checklists'
    ];

    const inheritedSet = new Set(deptFeatures || []);
    const userSet = new Set(userPerms || []);

    return allFeatures.map(f => {
        const fromDept = inheritedSet.has(f);
        const checkedByUser = userSet.has(f);
        const checked = fromDept || checkedByUser;
        return `<label class="permission-item" style="${fromDept ? 'background:#e8f0fe;border:1px solid #c2d7f8;' : 'background:var(--bg);'}">
            <input type="checkbox" name="permissions" value="${f}" ${checked ? 'checked' : ''}>
            <span>${f.replace('-', ' ')}</span>
            ${fromDept ? '<span style="font-size:10px;color:var(--primary);margin-left:auto;">dept</span>' : ''}
        </label>`;
    }).join('');
}

function onDeptChange(select) {
    const selectedOption = select.options[select.selectedIndex];
    let deptFeatures = [];
    try {
        deptFeatures = JSON.parse(selectedOption?.getAttribute('data-features') || '[]');
    } catch(e) { deptFeatures = []; }

    const grid = document.getElementById('permissionsGrid');
    if (!grid) return;

    const form = document.getElementById('userForm');
    const currentPerms = Array.from(form.querySelectorAll('[name="permissions"]:checked')).map(cb => cb.value);

    grid.innerHTML = renderPermissionCheckboxes(deptFeatures, currentPerms);
}

function onRoleChange(select) {
    const role = select.value;
    const grid = document.getElementById('permissionsGrid');
    if (!grid) return;
    const allCbs = document.querySelectorAll('[name="permissions"]');
    const rolePerms = {
        hod: ['dashboard','employee-dashboard','material-requests','suggestions','tasks','checklists','complaints','problems'],
        employee: ['employee-dashboard','material-requests','suggestions'],
        storekeeper: ['dashboard','inventory','material-requests','employee-dashboard'],
        ambulance_employee: ['ambulance']
    };
    const perms = rolePerms[role];
    if (perms) {
        allCbs.forEach(cb => cb.checked = perms.indexOf(cb.value) > -1);
    }
    if (!rolePerms[role]) {
        allCbs.forEach(cb => cb.checked = false);
    }
}

function saveUser() {
    const form = document.getElementById('userForm');
    const data = { fullName: '', username: '', password: '', email: '', phone: '', role: 'employee', department: '' };
    form.querySelectorAll('[name]').forEach(el => {
        if (el.name !== 'permissions') data[el.name] = el.value;
    });
    data.permissions = Array.from(form.querySelectorAll('[name="permissions"]:checked')).map(cb => cb.value);

    if (!data.fullName || !data.username || !data.email || !data.phone) {
        APP.notify('Please fill all required fields', 'error'); return false;
    }

    const existing = DB.get('users');
    if (data.id) {
        const updateData = { fullName: data.fullName, email: data.email, phone: data.phone, role: data.role, department: data.department, permissions: data.permissions };
        if (data.password) updateData.password = data.password;
        DB.update('users', data.id, updateData);
        APP.notify('User updated successfully', 'success');
    } else {
        if (!data.password) { APP.notify('Password is required', 'error'); return false; }
        if (existing.find(u => u.username === data.username)) {
            APP.notify('Username already exists', 'error'); return false;
        }
        DB.add('users', {
            username: data.username, password: data.password,
            fullName: data.fullName, email: data.email, phone: data.phone,
            role: data.role, department: data.department, permissions: data.permissions,
            isSuperAdmin: false
        });
        APP.notify('User created successfully! ID & Password: ' + data.username + ' / ' + data.password, 'success');
    }
    var searchInput = document.getElementById('userSearch');
    if (searchInput) searchInput.value = '';
    renderUsersList();
    return true;
}

function editUser(id) {
    const user = DB.getById('users', id);
    if (user) showUserForm(user);
}

function removeAllEmployees() {
    const user = AUTH.currentUser();
    if (!user || (!user.isSuperAdmin && user.role !== 'admin')) {
        APP.notify('Only admins can remove all employees', 'error');
        return;
    }
    const allUsers = DB.get('users');
    const employees = allUsers.filter(u => u.role === 'employee');
    if (employees.length === 0) {
        APP.notify('No employees found', 'info');
        return;
    }
    confirmAction(`Remove ALL ${employees.length} employee(s)? This cannot be undone.`, () => {
        employees.forEach(e => DB.delete('users', e.id));
        APP.notify(`Removed ${employees.length} employee(s)`, 'success');
        renderUsersList();
    });
}

function deleteUser(id) {
    const user = DB.getById('users', id);
    if (!user || user.isSuperAdmin) { APP.notify('Cannot delete super admin', 'error'); return; }
    confirmAction(`Delete user "${user.fullName}"?`, () => {
        DB.delete('users', id);
        APP.notify('User deleted', 'success');
        renderUsersList();
    });
}
