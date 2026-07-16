function renderSuggestions(container) {
    var user = AUTH.currentUser();
    container.innerHTML = ''
        + '<div class="flex-between mb-4">'
        + '<div class="search-box">'
        + '<input type="text" class="form-control" id="sugSearch" placeholder="Search suggestions..." oninput="renderSugList()">'
        + '</div>'
        + '<div style="display:flex;gap:6px;align-items:center;">'
        + '<span id="sugCount" style="font-size:13px;color:var(--gray);">0 suggestions</span>'
        + '<button class="btn btn-primary" onclick="showSugForm()">+ New Suggestion</button>'
        + '</div></div>'
        + '<div id="sugView"></div>';
    renderSugList();
}

function renderSugList() {
    try {
        var user = AUTH.currentUser();
        var all = DB.get('suggestions') || [];
        var search = (document.getElementById('sugSearch')?.value || '').toLowerCase();

        var list = [];
        for (var i = 0; i < all.length; i++) {
            var s = all[i];
            if (!s) continue;
            if (user.role !== 'admin') {
                if (s.createdBy !== user.username) continue;
            }
            if (search && (s.title || '').toLowerCase().indexOf(search) < 0 && (s.description || '').toLowerCase().indexOf(search) < 0) continue;
            list.push(s);
        }

        document.getElementById('sugCount').textContent = all.length + ' suggestions';

        if (list.length === 0) {
            document.getElementById('sugView').innerHTML = '<div class="card"><div class="empty-state">No suggestions found</div></div>';
            return;
        }

        var html = '<div class="card"><div class="table-responsive"><table><thead><tr>'
            + '<th>Title</th><th>Description</th><th>Department</th><th>Date</th><th>Actions</th>'
            + '</tr></thead><tbody>';

        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            var isOwner = s.createdBy === user.username;
            html += '<tr>'
                + '<td><strong>' + (s.title || '') + '</strong></td>'
                + '<td style="font-size:13px;max-width:300px;word-break:break-word;">' + (s.description || '').replace(/</g,'&lt;').replace(/\n/g,'<br>') + '</td>'
                + '<td>' + (s.department || '-') + '</td>'
                + '<td>' + APP.formatDate(s.createdAt) + '</td>'
                + '<td>'
                + (isOwner ? '<button class="btn btn-sm btn-danger" onclick="deleteSug(\'' + s.id + '\')">Del</button>' : '')
                + '</td></tr>';
        }

        html += '</tbody></table></div></div>';
        document.getElementById('sugView').innerHTML = html;
    } catch (e) {
        console.warn('renderSugList error:', e);
    }
}

function showSugForm() {
    var user = AUTH.currentUser();
    var depts = DB.get('departments') || [];
    var deptOpts = '';
    for (var i = 0; i < depts.length; i++) {
        var d = depts[i];
        if (!d || d.active === false) continue;
        var sel = d.name === user.department ? 'selected' : '';
        deptOpts += '<option value="' + d.name.replace(/"/g,'&quot;') + '" ' + sel + '>' + d.name + '</option>';
    }

    var html = '<form id="sugForm">'
        + '<div class="form-group"><label>Title *</label><input type="text" name="title" class="form-control" required></div>'
        + '<div class="form-group"><label>Department</label>'
        + '<select name="department" class="form-control">' + deptOpts + '</select></div>'
        + '<div class="form-group"><label>Description *</label><textarea name="description" class="form-control" rows="4" required></textarea></div>'
        + '</form>';

    openFormModal('New Suggestion', html, 'saveSug()');
    document.getElementById('sugForm').addEventListener('submit', function(e) { e.preventDefault(); saveSug(); });
}

function saveSug() {
    var form = document.getElementById('sugForm');
    if (!form) return false;
    var title = (form.querySelector('[name="title"]')?.value || '').trim();
    var description = (form.querySelector('[name="description"]')?.value || '').trim();
    var department = form.querySelector('[name="department"]')?.value || '';

    if (!title || !description) { APP.notify('Fill title and description', 'error'); return false; }

    var user = AUTH.currentUser();
    DB.add('suggestions', {
        title: title,
        description: description,
        department: department || user.department || '',
        createdBy: user.username,
        createdByName: user.fullName
    });
    APP.notify('Suggestion submitted', 'success');
    renderSugList();
    return true;
}

function deleteSug(id) {
    confirmAction('Delete this suggestion?', function() {
        DB.delete('suggestions', id);
        renderSugList();
    });
}
