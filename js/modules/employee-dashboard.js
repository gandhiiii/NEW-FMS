function renderEmployeeDashboard(container) {
    try {
        var user = AUTH.currentUser();
        var allTasks = DB.get('tasks') || [];
        var allComplaints = DB.get('complaints') || [];
        var allRequests = DB.get('material_requests') || [];
        var allSuggestions = DB.get('suggestions') || [];
        var allChecklists = DB.get('checklists') || [];

        var myTasks = [];
        for (var i = 0; i < allTasks.length; i++) {
            var t = allTasks[i];
            if (t && t.assignedTo === user.username) myTasks.push(t);
        }
        var myComplaints = [];
        for (var i = 0; i < allComplaints.length; i++) {
            var c = allComplaints[i];
            if (c && c.createdBy === user.username) myComplaints.push(c);
        }
        var myRequests = [];
        for (var i = 0; i < allRequests.length; i++) {
            var r = allRequests[i];
            if (r && r.createdBy === user.username) myRequests.push(r);
        }
        var mySuggestions = [];
        for (var i = 0; i < allSuggestions.length; i++) {
            var s = allSuggestions[i];
            if (s && s.createdBy === user.username) mySuggestions.push(s);
        }
        var myChecklists = [];
        for (var i = 0; i < allChecklists.length; i++) {
            var cl = allChecklists[i];
            if (cl && (cl.assignedTo === user.username || cl.assignedTo === 'common')) myChecklists.push(cl);
        }

        var pendingTasks = 0;
        var openComplaints = 0;
        var pendingRequests = 0;
        for (var i = 0; i < myTasks.length; i++) { if (myTasks[i].status !== 'completed') pendingTasks++; }
        for (var i = 0; i < myComplaints.length; i++) { if (myComplaints[i].status !== 'resolved') openComplaints++; }
        for (var i = 0; i < myRequests.length; i++) { if (myRequests[i].status === 'pending') pendingRequests++; }

        container.innerHTML = ''
            + '<div class="flex-between mb-4"><h3 style="font-size:20px;font-weight:600;">Welcome, ' + user.fullName + '</h3></div>'

            + '<div class="grid-4 mb-4">'
            + '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:28px;font-weight:700;">' + pendingTasks + '</div><div style="font-size:13px;color:var(--gray);">Pending Tasks</div></div>'
            + '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:28px;font-weight:700;">' + openComplaints + '</div><div style="font-size:13px;color:var(--gray);">Open Complaints</div></div>'
            + '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:28px;font-weight:700;">' + pendingRequests + '</div><div style="font-size:13px;color:var(--gray);">Pending Requests</div></div>'
            + '<div class="card" style="text-align:center;padding:16px;"><div style="font-size:28px;font-weight:700;">' + mySuggestions.length + '</div><div style="font-size:13px;color:var(--gray);">Suggestions</div></div>'
            + '</div>'

            + '<div class="grid-2" style="gap:16px;">'

            + '<div class="card"><div class="card-header"><h3>My Tasks</h3></div><div id="empDashTasks" style="padding:12px;"></div></div>'
            + '<div class="card"><div class="card-header"><h3>My Complaints</h3></div><div id="empDashComplaints" style="padding:12px;"></div></div>'
            + '<div class="card"><div class="card-header"><h3>My Material Requests</h3></div><div id="empDashRequests" style="padding:12px;"></div></div>'
            + '<div class="card"><div class="card-header"><h3>My Checklists</h3></div><div id="empDashChecklists" style="padding:12px;"></div></div>'

            + '</div>'

            + '<div class="grid-4 mt-4" style="gap:8px;margin-top:16px;">'
            + '<button class="btn btn-primary" onclick="Router.navigate(\'complaints\')">Report Complaint</button>'
            + '<button class="btn btn-info" style="background:var(--info);color:#fff;" onclick="Router.navigate(\'material-requests\')">New Request</button>'
            + '<button class="btn btn-success" onclick="Router.navigate(\'suggestions\')">Submit Suggestion</button>'
            + '<button class="btn btn-secondary" onclick="Router.navigate(\'tasks\')">View Tasks</button>'
            + '</div>';

        renderEmpDashTasks(myTasks);
        renderEmpDashComplaints(myComplaints);
        renderEmpDashRequests(myRequests);
        renderEmpDashChecklists(myChecklists);

    } catch (e) {
        console.warn('renderEmployeeDashboard error:', e);
        container.innerHTML = '<div class="card"><div class="empty-state">Error loading dashboard</div></div>';
    }
}

function renderEmpDashTasks(tasks) {
    var el = document.getElementById('empDashTasks');
    if (!el) return;
    if (tasks.length === 0) { el.innerHTML = '<div style="color:var(--gray);font-size:13px;">No tasks assigned</div>'; return; }

    var html = '';
    for (var i = 0; i < Math.min(tasks.length, 5); i++) {
        var t = tasks[i];
        var badge = APP.getStatusBadge(t.status);
        var overdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed' ? ' <span style="color:var(--danger);">⚠️</span>' : '';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--light-gray);font-size:13px;">'
            + '<span>' + (t.title || '') + overdue + '</span>'
            + '<span><span class="badge ' + badge + '">' + (t.status || 'pending') + '</span></span>'
            + '</div>';
    }
    if (tasks.length > 5) html += '<div style="text-align:center;padding:4px;font-size:12px;color:var(--gray);">+' + (tasks.length - 5) + ' more</div>';
    el.innerHTML = html;
}

function renderEmpDashComplaints(complaints) {
    var el = document.getElementById('empDashComplaints');
    if (!el) return;
    if (complaints.length === 0) { el.innerHTML = '<div style="color:var(--gray);font-size:13px;">No complaints</div>'; return; }

    var html = '';
    for (var i = 0; i < Math.min(complaints.length, 5); i++) {
        var c = complaints[i];
        var badge = APP.getStatusBadge(c.status);
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--light-gray);font-size:13px;">'
            + '<span>' + (c.patientName || c.category || '') + '</span>'
            + '<span><span class="badge ' + badge + '">' + (c.status || 'open') + '</span></span>'
            + '</div>';
    }
    if (complaints.length > 5) html += '<div style="text-align:center;padding:4px;font-size:12px;color:var(--gray);">+' + (complaints.length - 5) + ' more</div>';
    el.innerHTML = html;
}

function renderEmpDashRequests(requests) {
    var el = document.getElementById('empDashRequests');
    if (!el) return;
    if (requests.length === 0) { el.innerHTML = '<div style="color:var(--gray);font-size:13px;">No requests</div>'; return; }

    var html = '';
    for (var i = 0; i < Math.min(requests.length, 5); i++) {
        var r = requests[i];
        var badge = 'badge-warning';
        if (r.status === 'approved') badge = 'badge-success';
        else if (r.status === 'rejected') badge = 'badge-danger';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--light-gray);font-size:13px;">'
            + '<span>' + (r.title || 'Request') + '</span>'
            + '<span><span class="badge ' + badge + '">' + (r.status || 'pending') + '</span></span>'
            + '</div>';
    }
    if (requests.length > 5) html += '<div style="text-align:center;padding:4px;font-size:12px;color:var(--gray);">+' + (requests.length - 5) + ' more</div>';
    el.innerHTML = html;
}

function renderEmpDashChecklists(checklists) {
    var el = document.getElementById('empDashChecklists');
    if (!el) return;
    if (checklists.length === 0) { el.innerHTML = '<div style="color:var(--gray);font-size:13px;">No checklists assigned</div>'; return; }

    var html = '';
    for (var i = 0; i < Math.min(checklists.length, 5); i++) {
        var cl = checklists[i];
        var badge = APP.getStatusBadge(cl.status || 'pending');
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--light-gray);font-size:13px;">'
            + '<span>' + (cl.title || 'Checklist') + '</span>'
            + '<span><span class="badge ' + badge + '">' + (cl.status || 'pending') + '</span></span>'
            + '</div>';
    }
    if (checklists.length > 5) html += '<div style="text-align:center;padding:4px;font-size:12px;color:var(--gray);">+' + (checklists.length - 5) + ' more</div>';
    el.innerHTML = html;
}
