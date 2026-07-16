const Router = {
    currentModule: 'dashboard',
    init() {
        const user = AUTH.currentUser();
        if (!user) { window.location.href = 'index.html'; return; }
        this.renderHeader();
        this.renderSidebar();
        const startModule = user.role === 'ambulance_employee' ? 'ambulance' : user.role === 'employee' ? 'employee-dashboard' : 'dashboard';
        this.navigate(startModule);
        document.getElementById('menuToggle').onclick = () => {
            document.getElementById('sidebar').classList.toggle('open');
        };
    },
    renderHeader() {
        const user = AUTH.currentUser();
        const header = document.getElementById('mainHeader');
        if (!header) return;
        header.innerHTML = `
            <div class="header-left">
                <button id="menuToggle" class="menu-toggle">&#9776;</button>
                <h3 id="pageTitle" style="font-size:18px;font-weight:600;">Dashboard</h3>
            </div>
            <div class="header-right">
                <span id="liveIndicator" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--success);padding:3px 8px;border-radius:12px;background:rgba(52,168,83,0.1);border:1px solid rgba(52,168,83,0.3);"><span style="width:7px;height:7px;border-radius:50%;background:var(--success);animation:pulse 1.5s infinite;"></span>LIVE</span>
                <span style="font-size:13px;color:var(--gray);">${user.role.toUpperCase()}</span>
                <div class="header-user" onclick="Router.showProfile()">
                    <div class="avatar">${user.fullName.charAt(0)}</div>
                    <span style="font-size:14px;">${user.fullName}</span>
                </div>
                <button class="btn btn-sm btn-danger" onclick="Router.logout()">Logout</button>
            </div>
        `;
    },
    renderSidebar() {
        const user = AUTH.currentUser();
        const nav = document.getElementById('sidebarNav');
        if (!nav) return;
        const items = [
            { id: 'dashboard', label: 'Dashboard', icon: '📊', permission: 'dashboard' },
            { id: 'users', label: 'User Management', icon: '👥', permission: 'users' },
            { id: 'departments', label: 'Departments', icon: '🏢', permission: 'departments' },
            { id: 'feature-rights', label: 'Feature Rights', icon: '🔐', permission: 'departments' },
            { id: 'inventory', label: 'Inventory', icon: '📦', permission: 'inventory' },
            { id: 'gate-security', label: 'Gate Security', icon: '🛡️', permission: 'gate-security' },
            { id: 'phase2', label: 'Phase 2 Infra', icon: '🏗️', permission: 'projects' },
            { id: 'projects', label: 'Projects', icon: '📋', permission: 'projects' },
            { id: 'ambulance', label: 'Ambulance', icon: '🚑', permission: 'ambulance' },
            { id: 'problems', label: 'Problems & Solutions', icon: '🔧', permission: 'problems' },
            { id: 'tasks', label: 'Tasks', icon: '✅', permission: 'tasks' },
            { id: 'complaints', label: 'Complaints', icon: '📝', permission: 'complaints' },
            { id: 'room-checklist', label: 'Room Checklist', icon: '🧹', permission: 'room-checklist' },
            { id: 'admissions', label: 'Admissions', icon: '🏥', permission: 'admissions' },
            { id: 'lost-found', label: 'Lost & Found', icon: '🔍', permission: 'lost-found' },
            { id: 'admin-checklists', label: 'Admin Checklists', icon: '🔖', permission: 'admin-checklists' },
            { id: 'material-requests', label: 'Material Requests', icon: '📦', permission: 'material-requests' },
            { id: 'suggestions', label: 'Suggestions', icon: '💡', permission: 'suggestions' },
            { id: 'employee-dashboard', label: 'My Dashboard', icon: '📊', permission: 'employee-dashboard' },
            { id: 'checklists', label: 'Checklists', icon: '✅', permission: 'checklists' }
        ];
        let html = '';
        items.forEach(item => {
            if (AUTH.hasPermission(user, item.permission)) {
                html += `<div class="nav-item" onclick="Router.navigate('${item.id}')" data-module="${item.id}">
                    <span>${item.icon}</span> <span>${item.label}</span>
                </div>`;
            }
        });
        nav.innerHTML = html;
    },
    navigate(module) {
        var u = AUTH.currentUser();
        if (module === 'dashboard' && u && u.role === 'employee') module = 'employee-dashboard';
        APP.currentModule = module;
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-module="${module}"]`);
        if (navItem) navItem.classList.add('active');
        document.getElementById('sidebar').classList.remove('open');
        const titles = {
            dashboard: 'Dashboard', users: 'User Management', departments: 'Departments', 'feature-rights': 'Feature Rights',
            inventory: 'Inventory Management',             'gate-security': 'Gate Security',
            phase2: 'Phase 2 Infra & Development',
            projects: 'Projects & Plans', ambulance: 'Ambulance Tracking',
            problems: 'Problems & Solutions', tasks: 'Task Management',
            complaints: 'Complaints', 'room-checklist': 'Room Checklist',
            admissions: 'Admissions & Discharges', 'lost-found': 'Lost & Found',
            'admin-checklists': 'Admin Checklists', checklists: 'Checklists',
            'material-requests': 'Material Requests', suggestions: 'Suggestions',
            'employee-dashboard': 'My Dashboard'
        };
        document.getElementById('pageTitle').textContent = titles[module] || module;
        const content = document.getElementById('pageContent');
        if (!content) return;

        const renderers = {
            dashboard: renderDashboard,
            users: renderUsers,
            departments: renderDepartments,
            'feature-rights': renderFeatureRights,
            inventory: renderInventory,
            'gate-security': renderGateSecurity,
            phase2: renderPhase2,
            projects: renderProjects,
            ambulance: renderAmbulance,
            problems: renderProblems,
            tasks: renderTasks,
            complaints: renderComplaints,
            'room-checklist': renderRoomChecklist,
            admissions: renderAdmissions,
            'lost-found': renderLostFound,
            'admin-checklists': renderAdminChecklists,
            checklists: renderChecklists,
            'material-requests': renderMaterialRequests,
            suggestions: renderSuggestions,
            'employee-dashboard': renderEmployeeDashboard
        };
        if (renderers[module]) {
            content.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div>Loading...</div>';
            setTimeout(() => renderers[module](content), 100);
        }
    },
    showProfile() {
        const user = AUTH.currentUser();
        if (!user) return;
        const html = `
            <div class="modal active" id="profileModal">
                <div class="modal-content" style="max-width:400px;">
                    <div class="modal-header">
                        <h3>My Profile</h3>
                        <button class="modal-close" onclick="document.getElementById('profileModal').remove()">&times;</button>
                    </div>
                    <div style="text-align:center;margin-bottom:16px;">
                        <div style="width:64px;height:64px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;margin:0 auto 8px;">${user.fullName.charAt(0)}</div>
                        <h3>${user.fullName}</h3>
                        <span class="badge ${APP.getRoleBadge(user.role)}">${user.role.toUpperCase()}</span>
                    </div>
                    <div class="grid-2">
                        <div><strong>Username:</strong><br>${user.username}</div>
                        <div><strong>Email:</strong><br>${user.email}</div>
                        <div><strong>Phone:</strong><br>${user.phone}</div>
                        <div><strong>Department:</strong><br>${user.department || '-'}</div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="document.getElementById('profileModal').remove()">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            AUTH.logout();
            window.location.href = 'index.html';
        }
    }
};

function showModal(html, large) {
    const m = document.createElement('div');
    m.className = 'modal active';
    m.innerHTML = `<div class="modal-content ${large ? 'modal-lg' : ''}">${html}</div>`;
    m.addEventListener('click', (e) => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
    return m;
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.remove());
}

function openFormModal(title, formHtml, onSave, large) {
    const m = showModal(`
        <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div id="modalFormBody">${formHtml}</div>
        <div class="modal-footer">
            <button class="btn btn-danger" onclick="this.closest('.modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="(async()=>{if ((await ${onSave}) !== false) this.closest('.modal').remove()})()">Save</button>
        </div>
    `, large);
    return m;
}

function getFormData(id) {
    const form = document.getElementById(id);
    if (!form) return {};
    const data = {};
    form.querySelectorAll('[name]').forEach(el => { data[el.name] = el.value; });
    return data;
}

function confirmAction(msg, cb) {
    if (confirm(msg)) cb();
}

function deptDropdown(name, selected) {
    const depts = DB.get('departments');
    if (!depts || depts.length === 0) {
        return '<input type="text" name="' + name + '" class="form-control" placeholder="e.g. Cardiology" value="' + (selected || '') + '">';
    }
    return '<select name="' + name + '" class="form-control">' +
        '<option value="">Select Department</option>' +
        depts.map(d => '<option value="' + d.name + '" ' + (selected === d.name ? 'selected' : '') + '>' + d.name + '</option>').join('') +
        '</select>';
}
