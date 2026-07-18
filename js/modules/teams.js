var teamTab = 'teams';

function renderTeams(container) {
    var user = AUTH.currentUser();
    var isAdmin = user.role === 'admin' || user.isSuperAdmin;
    var isHod = user.role === 'hod' || isAdmin;
    container.innerHTML =
        '<div class="flex-between mb-4"><h2 style="font-size:18px;font-weight:700;">\uD83D\uDC65 Teams</h2></div>' +
        '<div class="tabs">' +
            '<button class="tab-btn active" onclick="switchTeamTab(\'teams\',this)">Teams</button>' +
            '<button class="tab-btn" onclick="switchTeamTab(\'members\',this)">Members</button>' +
            '<button class="tab-btn" onclick="switchTeamTab(\'tasks\',this)">Tasks</button>' +
        '</div>' +
        '<div id="teamContent"></div>';
    renderTeamList();
}

function switchTeamTab(tab, btn) {
    teamTab = tab;
    document.querySelectorAll('.tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    if (tab === 'teams') renderTeamList();
    else if (tab === 'members') renderMemberList();
    else if (tab === 'tasks') renderTeamTaskList();
}

function getMyTeams() {
    var user = AUTH.currentUser();
    var all = DB.get('teams') || [];
    if (user.role === 'admin' || user.isSuperAdmin) return all;
    if (user.role === 'hod') return all.filter(function(t) { return t.department === user.department; });
    return all.filter(function(t) { return t.members && t.members.some(function(m) { return m.userId === user.id; }); });
}

function renderTeamList() {
    var el = document.getElementById('teamContent');
    if (!el) return;
    var user = AUTH.currentUser();
    var isAdmin = user.role === 'admin' || user.isSuperAdmin;
    var isHod = user.role === 'hod' || isAdmin;
    var teams = getMyTeams();
    var html =
        '<div style="margin-bottom:12px;">' +
            (isHod ? '<button class="btn btn-primary" onclick="showTeamForm()">+ New Team</button>' : '') +
        '</div>' +
        '<div class="card"><div class="table-responsive"><table><thead><tr>' +
            '<th>Team Name</th><th>Department</th><th>HOD</th><th>Members</th>' +
            (isHod ? '<th>Actions</th>' : '') +
        '</tr></thead><tbody>';
    if (!teams.length) {
        html += '<tr><td colspan="5" class="empty-state">No teams found</td></tr>';
    } else {
        teams.forEach(function(t) {
            var members = t.members || [];
            html += '<tr>' +
                '<td><strong>' + t.name + '</strong></td>' +
                '<td>' + (t.department || '-') + '</td>' +
                '<td>' + (t.hodName || '-') + '</td>' +
                '<td>' + members.length + '</td>' +
                (isHod ? '<td>' +
                    '<button class="btn btn-sm btn-primary" onclick="editTeam(\'' + t.id + '\')">Edit</button> ' +
                    '<button class="btn btn-sm btn-danger" onclick="deleteTeam(\'' + t.id + '\')">Del</button>' +
                '</td>' : '') +
            '</tr>';
        });
    }
    html += '</tbody></table></div></div>';
    el.innerHTML = html;
}

function showTeamForm(data) {
    data = data || {};
    var user = AUTH.currentUser();
    var depts = DB.get('departments') || [];
    var hodUsers = (DB.get('users') || []).filter(function(u) { return u.role === 'hod' || u.role === 'admin'; });
    var deptOpts = depts.map(function(d) { return '<option value="' + d.name + '" ' + (data.department === d.name ? 'selected' : '') + '>' + d.name + '</option>'; }).join('');
    var hodOpts = hodUsers.map(function(u) { return '<option value="' + u.id + '" ' + (data.hodId === u.id ? 'selected' : '') + '>' + u.fullName + ' (' + (u.department || '-') + ')</option>'; }).join('');
    var title = data.id ? 'Edit Team' : 'New Team';
    openFormModal(title,
        '<div class="form-group"><label>Team Name</label><input type="text" id="teamName" class="form-control" value="' + (data.name || '') + '"></div>' +
        '<div class="form-group"><label>Department</label><select id="teamDept" class="form-control">' + deptOpts + '</select></div>' +
        '<div class="form-group"><label>HOD</label><select id="teamHod" class="form-control">' + hodOpts + '</select></div>',
        'saveTeam(\'' + (data.id || '') + '\')'
    );
}

async function saveTeam(editId) {
    var name = document.getElementById('teamName').value.trim();
    var dept = document.getElementById('teamDept').value;
    var hodId = document.getElementById('teamHod').value;
    if (!name) { APP.notify('Enter team name', 'error'); return false; }
    if (!dept) { APP.notify('Select department', 'error'); return false; }
    if (!hodId) { APP.notify('Select HOD', 'error'); return false; }
    var hodUser = (DB.get('users') || []).find(function(u) { return u.id === hodId; });
    var teams = DB.get('teams') || [];
    if (editId) {
        var idx = teams.findIndex(function(t) { return t.id === editId; });
        if (idx > -1) {
            teams[idx].name = name;
            teams[idx].department = dept;
            teams[idx].hodId = hodId;
            teams[idx].hodName = hodUser ? hodUser.fullName : '';
            teams[idx].updatedAt = new Date().toISOString();
            DB.set('teams', teams);
            APP.notify('Team updated', 'success');
        }
    } else {
        DB.add('teams', { name: name, department: dept, hodId: hodId, hodName: hodUser ? hodUser.fullName : '', members: [] });
        APP.notify('Team created', 'success');
    }
    if (typeof SYNC !== 'undefined' && SYNC._ready && typeof SYNC._flush === 'function') {
        await SYNC._flush('teams').catch(function() {});
    }
    renderTeamList();
    return true;
}

function editTeam(id) {
    var teams = DB.get('teams') || [];
    var team = teams.find(function(t) { return t.id === id; });
    if (team) showTeamForm(team);
}

async function deleteTeam(id) {
    if (!confirm('Delete this team?')) return;
    var teams = (DB.get('teams') || []).filter(function(t) { return t.id !== id; });
    DB.set('teams', teams);
    APP.notify('Team deleted', 'success');
    if (typeof SYNC !== 'undefined' && SYNC._ready && typeof SYNC._flush === 'function') {
        await SYNC._flush('teams').catch(function() {});
    }
    renderTeamList();
}

function renderMemberList() {
    var el = document.getElementById('teamContent');
    if (!el) return;
    var user = AUTH.currentUser();
    var isAdmin = user.role === 'admin' || user.isSuperAdmin;
    var isHod = user.role === 'hod' || isAdmin;
    var teams = getMyTeams();
    var html = '';
    if (!teams.length) {
        html = '<div class="empty-state">No teams available. Create a team first.</div>';
        el.innerHTML = html;
        return;
    }
    teams.forEach(function(t) {
        var members = t.members || [];
        html += '<div class="card" style="margin-top:12px;">' +
            '<div class="card-header"><h3>' + t.name + ' <span style="font-size:13px;color:var(--gray);font-weight:400;">(' + members.length + ' members)</span></h3>' +
            (isHod ? '<button class="btn btn-sm btn-primary" onclick="showAddMember(\'' + t.id + '\')">+ Add Member</button>' : '') +
            '</div>';
        if (!members.length) {
            html += '<div class="empty-state">No members yet</div>';
        } else {
            html += '<div class="table-responsive"><table><thead><tr><th>Name</th><th>Role</th>' + (isHod ? '<th>Actions</th>' : '') + '</tr></thead><tbody>';
            members.forEach(function(m) {
                html += '<tr><td>' + m.fullName + '</td><td>' + m.role + '</td>' +
                    (isHod ? '<td><button class="btn btn-sm btn-danger" onclick="removeMember(\'' + t.id + '\',\'' + m.userId + '\')">Remove</button></td>' : '') +
                '</tr>';
            });
            html += '</tbody></table></div>';
        }
        html += '</div>';
    });
    el.innerHTML = html;
}

function showAddMember(teamId) {
    var team = (DB.get('teams') || []).find(function(t) { return t.id === teamId; });
    if (!team) return;
    var existing = (team.members || []).map(function(m) { return m.userId; });
    var available = (DB.get('users') || []).filter(function(u) {
        return !u.isSuperAdmin && !existing.includes(u.id) && (!team.department || u.department === team.department);
    });
    if (!available.length) {
        APP.notify('No available employees in ' + team.department, 'error');
        return;
    }
    var opts = available.map(function(u) { return '<option value="' + u.id + '">' + u.fullName + ' (' + (u.role || '') + ')</option>'; }).join('');
    openFormModal('Add Members to ' + team.name,
        '<div class="form-group"><label>Select Employees (hold Ctrl to pick multiple)</label><select id="newMemberId" class="form-control" multiple style="height:180px;">' + opts + '</select></div>',
        'addMember(\'' + teamId + '\')'
    );
}

async function addMember(teamId) {
    var sel = document.getElementById('newMemberId');
    if (!sel) { APP.notify('Select at least one member', 'error'); return false; }
    var selected = [];
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].selected) selected.push(sel.options[i].value);
    }
    if (!selected.length) { APP.notify('Select at least one member', 'error'); return false; }
    var teams = DB.get('teams') || [];
    var team = teams.find(function(t) { return t.id === teamId; });
    if (!team) return false;
    if (!team.members) team.members = [];
    var count = 0;
    for (var j = 0; j < selected.length; j++) {
        var userId = selected[j];
        if (team.members.some(function(m) { return m.userId === userId; })) continue;
        var user = (DB.get('users') || []).find(function(u) { return u.id === userId; });
        if (!user) continue;
        team.members.push({ userId: userId, fullName: user.fullName, role: user.role || 'employee', addedAt: new Date().toISOString() });
        count++;
    }
    if (count === 0) { APP.notify('Members already exist or not found', 'error'); return false; }
    DB.set('teams', teams);
    APP.notify(count + ' member(s) added', 'success');
    if (typeof SYNC !== 'undefined' && SYNC._ready && typeof SYNC._flush === 'function') {
        await SYNC._flush('teams').catch(function() {});
    }
    renderMemberList();
    return true;
}

async function removeMember(teamId, userId) {
    if (!confirm('Remove this member?')) return;
    var teams = DB.get('teams') || [];
    var team = teams.find(function(t) { return t.id === teamId; });
    if (!team) return;
    team.members = (team.members || []).filter(function(m) { return m.userId !== userId; });
    var tasks = DB.get('team_tasks') || [];
    DB.set('team_tasks', tasks.filter(function(t) { return !(t.teamId === teamId && t.assignedTo === userId); }));
    DB.set('teams', teams);
    APP.notify('Member removed', 'success');
    if (typeof SYNC !== 'undefined' && SYNC._ready && typeof SYNC._flush === 'function') {
        await SYNC._flush('teams').catch(function() {});
        await SYNC._flush('team_tasks').catch(function() {});
    }
    renderMemberList();
}

function renderTeamTaskList() {
    var el = document.getElementById('teamContent');
    if (!el) return;
    var user = AUTH.currentUser();
    var isAdmin = user.role === 'admin' || user.isSuperAdmin;
    var isHod = user.role === 'hod' || isAdmin;
    var teams = getMyTeams();
    var allTasks = DB.get('team_tasks') || [];
    var filtered = allTasks.filter(function(t) {
        if (isAdmin) return true;
        if (isHod) return teams.some(function(tm) { return tm.id === t.teamId; });
        return t.assignedTo === user.id;
    });
    var search = (document.getElementById('taskSearch') ? document.getElementById('taskSearch').value : '').toLowerCase();
    if (search) filtered = filtered.filter(function(t) { return t.title.toLowerCase().includes(search) || (t.assignedToName || '').toLowerCase().includes(search); });
    var html =
        '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">' +
            '<input type="text" id="taskSearch" class="form-control" placeholder="Search tasks..." style="max-width:300px;" oninput="renderTeamTaskList()">' +
            (isHod ? '<button class="btn btn-primary" onclick="showTeamTaskForm()">+ New Task</button>' : '') +
        '</div>' +
        '<div class="card"><div class="table-responsive"><table><thead><tr>' +
            '<th>Title</th><th>Team</th><th>Assigned To</th><th>Priority</th><th>Deadline</th><th>Progress</th><th>Status</th>' +
            (isHod ? '<th>Actions</th>' : '') +
        '</tr></thead><tbody>';
    if (!filtered.length) {
        html += '<tr><td colspan="' + (isHod ? '8' : '7') + '" class="empty-state">No tasks found</td></tr>';
    } else {
        filtered.slice().reverse().forEach(function(t) {
            var progress = parseInt(t.progress) || 0;
            var pctClass = progress >= 100 ? 'green' : (progress >= 50 ? 'yellow' : 'red');
            html += '<tr>' +
                '<td><strong>' + t.title + '</strong></td>' +
                '<td>' + (t.teamName || '-') + '</td>' +
                '<td>' + (t.assignedToName || '-') + '</td>' +
                '<td><span class="badge ' + (t.priority === 'high' ? 'badge-danger' : t.priority === 'medium' ? 'badge-warning' : 'badge-info') + '">' + (t.priority || 'normal') + '</span></td>' +
                '<td>' + (t.deadline ? APP.formatDate(t.deadline) : '-') + '</td>' +
                '<td style="min-width:120px;"><div class="progress-bar" style="height:14px;"><div class="progress-fill ' + pctClass + '" style="width:' + progress + '%;line-height:14px;font-size:10px;color:#fff;text-align:center;">' + progress + '%</div></div></td>' +
                '<td>' + APP.getStatusBadge(t.status || 'pending') + '</td>' +
                (isHod ? '<td>' +
                    (t.status !== 'completed' ? '<button class="btn btn-sm btn-primary" onclick="editTeamTask(\'' + t.id + '\')">Edit</button> ' : '') +
                    '<button class="btn btn-sm btn-danger" onclick="deleteTeamTask(\'' + t.id + '\')">Del</button>' +
                '</td>' : '') +
            '</tr>';
        });
    }
    html += '</tbody></table></div></div>';
    el.innerHTML = html;
}

function showTeamTaskForm(data) {
    data = data || {};
    var user = AUTH.currentUser();
    var teams = getMyTeams();
    if (!teams.length) { APP.notify('Create a team first', 'error'); return; }
    var teamOpts = teams.map(function(t) {
        return '<option value="' + t.id + '" ' + (data.teamId === t.id ? 'selected' : '') + '>' + t.name + '</option>';
    }).join('');
    var selectedTeam = teams.find(function(t) { return t.id === (data.teamId || teams[0].id); }) || teams[0];
    var members = selectedTeam.members || [];
    var memberOpts = members.map(function(m) {
        return '<option value="' + m.userId + '" ' + (data.assignedTo === m.userId ? 'selected' : '') + '>' + m.fullName + '</option>';
    }).join('');
    var title = data.id ? 'Edit Task' : 'New Team Task';
    openFormModal(title,
        '<div class="form-group"><label>Team</label><select id="ttTeam" class="form-control" onchange="updateTTMembers()">' + teamOpts + '</select></div>' +
        '<div class="form-group"><label>Assign To</label><select id="ttMember" class="form-control">' + (memberOpts || '<option value="">No members</option>') + '</select></div>' +
        '<div class="form-group"><label>Task Title</label><input type="text" id="ttTitle" class="form-control" value="' + (data.title || '') + '"></div>' +
        '<div class="form-group"><label>Description</label><textarea id="ttDesc" class="form-control">' + (data.description || '') + '</textarea></div>' +
        '<div class="form-group"><label>Priority</label><select id="ttPriority" class="form-control">' +
            '<option value="low" ' + (data.priority === 'low' ? 'selected' : '') + '>Low</option>' +
            '<option value="medium" ' + (data.priority === 'medium' ? 'selected' : '') + '>Medium</option>' +
            '<option value="high" ' + (data.priority === 'high' ? 'selected' : '') + '>High</option>' +
        '</select></div>' +
        '<div class="form-group"><label>Deadline</label><input type="date" id="ttDeadline" class="form-control" value="' + (data.deadline || '') + '"></div>' +
        '<div class="form-group"><label>Progress (%)</label><input type="number" id="ttProgress" class="form-control" min="0" max="100" value="' + (data.progress || 0) + '"></div>',
        'saveTeamTask(\'' + (data.id || '') + '\')'
    );
}

function updateTTMembers() {
    var teamId = document.getElementById('ttTeam').value;
    var team = (DB.get('teams') || []).find(function(t) { return t.id === teamId; });
    var members = (team && team.members) || [];
    var sel = document.getElementById('ttMember');
    if (sel) sel.innerHTML = members.length ? members.map(function(m) { return '<option value="' + m.userId + '">' + m.fullName + '</option>'; }).join('') : '<option value="">No members</option>';
}

function saveTeamTask(editId) {
    var teamId = document.getElementById('ttTeam').value;
    var assignedTo = document.getElementById('ttMember').value;
    var title = document.getElementById('ttTitle').value.trim();
    var desc = document.getElementById('ttDesc').value.trim();
    var priority = document.getElementById('ttPriority').value;
    var deadline = document.getElementById('ttDeadline').value;
    var progress = parseInt(document.getElementById('ttProgress').value) || 0;
    if (!teamId || !assignedTo || !title) { APP.notify('Fill team, member, and title', 'error'); return false; }
    var team = (DB.get('teams') || []).find(function(t) { return t.id === teamId; });
    if (!team) return false;
    var member = (team.members || []).find(function(m) { return m.userId === assignedTo; });
    var tasks = DB.get('team_tasks') || [];
    if (editId) {
        var idx = tasks.findIndex(function(t) { return t.id === editId; });
        if (idx > -1) {
            tasks[idx].title = title;
            tasks[idx].description = desc;
            tasks[idx].priority = priority;
            tasks[idx].deadline = deadline;
            tasks[idx].progress = progress;
            if (progress >= 100) tasks[idx].status = 'completed';
            else if (progress > 0) tasks[idx].status = 'in-progress';
            else tasks[idx].status = 'pending';
            tasks[idx].updatedAt = new Date().toISOString();
            DB.set('team_tasks', tasks);
            APP.notify('Task updated', 'success');
        }
    } else {
        DB.add('team_tasks', {
            teamId: teamId, teamName: team.name,
            title: title, description: desc,
            assignedTo: assignedTo, assignedToName: member ? member.fullName : '',
            priority: priority, deadline: deadline, progress: progress || 0,
            status: progress >= 100 ? 'completed' : (progress > 0 ? 'in-progress' : 'pending'),
            department: team.department, hodId: team.hodId
        });
        APP.notify('Task created', 'success');
    }
    renderTeamTaskList();
    return true;
}

function editTeamTask(id) {
    var tasks = DB.get('team_tasks') || [];
    var task = tasks.find(function(t) { return t.id === id; });
    if (task) showTeamTaskForm(task);
}

function deleteTeamTask(id) {
    if (!confirm('Delete this task?')) return;
    var tasks = (DB.get('team_tasks') || []).filter(function(t) { return t.id !== id; });
    DB.set('team_tasks', tasks);
    APP.notify('Task deleted', 'success');
    renderTeamTaskList();
}
