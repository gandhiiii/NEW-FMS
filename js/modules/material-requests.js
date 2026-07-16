function renderMaterialRequests(container) {
    var user = AUTH.currentUser();
    container.innerHTML = ''
        + '<div class="flex-between mb-4">'
        + '<div class="search-box">'
        + '<input type="text" class="form-control" id="matSearch" placeholder="Search requests..." oninput="renderMatList()">'
        + '</div>'
        + '<div style="display:flex;gap:6px;align-items:center;">'
        + '<span id="matCount" style="font-size:13px;color:var(--gray);">0 requests</span>'
        + '<button class="btn btn-primary" onclick="showMatForm()">+ New Request</button>'
        + '</div></div>'
        + '<div id="matView"></div>';
    renderMatList();
}

function renderMatList() {
    try {
        var user = AUTH.currentUser();
        var all = DB.get('material_requests') || [];
        var search = (document.getElementById('matSearch')?.value || '').toLowerCase();

        var requests = [];
        for (var i = 0; i < all.length; i++) {
            var r = all[i];
            if (!r) continue;
            if (user.role === 'admin' || user.role === 'hod') {
                if (r.department && r.department !== user.department && user.role !== 'admin') continue;
            } else {
                if (r.createdBy !== user.username) continue;
            }
            if (search && (r.title || '').toLowerCase().indexOf(search) < 0 && (r.reason || '').toLowerCase().indexOf(search) < 0) continue;
            requests.push(r);
        }

        document.getElementById('matCount').textContent = all.length + ' requests';

        if (requests.length === 0) {
            document.getElementById('matView').innerHTML = '<div class="card"><div class="empty-state">No requests found</div></div>';
            return;
        }

        var html = '<div class="card"><div class="table-responsive"><table><thead><tr>'
            + '<th>Title</th><th>Items</th><th>Department</th><th>Requested By</th><th>Date</th><th>Status</th><th>Actions</th>'
            + '</tr></thead><tbody>';

        for (var i = 0; i < requests.length; i++) {
            var r = requests[i];
            var items = r.items || [];
            var itemStr = '';
            for (var j = 0; j < items.length; j++) {
                itemStr += items[j].name + ' x' + items[j].qty + (items[j].unit || '') + '<br>';
            }

            var statusBadge = 'badge-warning';
            var statusText = 'Pending';
            if (r.status === 'approved') { statusBadge = 'badge-success'; statusText = 'Approved'; }
            else if (r.status === 'rejected') { statusBadge = 'badge-danger'; statusText = 'Rejected'; }

            var canApprove = (user.role === 'admin' || user.role === 'hod') && r.status === 'pending' && (user.role === 'admin' || r.department === user.department);
            var isOwner = r.createdBy === user.username;

            html += '<tr>'
                + '<td><strong>' + (r.title || 'Request') + '</strong></td>'
                + '<td style="font-size:12px;">' + itemStr + '</td>'
                + '<td>' + (r.department || '-') + '</td>'
                + '<td>' + (r.createdBy || '-') + '</td>'
                + '<td>' + APP.formatDate(r.createdAt) + '</td>'
                + '<td><span class="badge ' + statusBadge + '">' + statusText + '</span>'
                + (r.approvedBy ? '<br><span style="font-size:11px;color:var(--gray);">by ' + r.approvedBy + '</span>' : '')
                + '</td>'
                + '<td style="white-space:nowrap;">'
                + (isOwner && r.status === 'pending' ? '<button class="btn btn-sm btn-danger" onclick="deleteMatReq(\'' + r.id + '\')">Del</button> ' : '')
                + (canApprove ? '<button class="btn btn-sm btn-success" onclick="approveMatReq(\'' + r.id + '\')">Approve</button> '
                    + '<button class="btn btn-sm btn-danger" onclick="rejectMatReq(\'' + r.id + '\')">Reject</button>' : '')
                + '</td></tr>';
        }

        html += '</tbody></table></div></div>';
        document.getElementById('matView').innerHTML = html;
    } catch (e) {
        console.warn('renderMatList error:', e);
    }
}

function showMatForm() {
    var user = AUTH.currentUser();
    var inventory = DB.get('inventory') || [];

    var itemOpts = '';
    for (var i = 0; i < inventory.length; i++) {
        var inv = inventory[i];
        itemOpts += '<option value="' + inv.name.replace(/"/g,'&quot;') + '" data-unit="' + (inv.unit || 'pcs') + '">' + inv.name + ' (' + (inv.quantity || 0) + ' ' + (inv.unit || 'pcs') + ')</option>';
    }

    var depts = DB.get('departments') || [];
    var deptOpts = '';
    for (var i = 0; i < depts.length; i++) {
        var d = depts[i];
        if (!d || d.active === false) continue;
        var sel = d.name === user.department ? 'selected' : '';
        deptOpts += '<option value="' + d.name.replace(/"/g,'&quot;') + '" ' + sel + '>' + d.name + '</option>';
    }

    var html = '<form id="matForm">'
        + '<div class="form-group"><label>Request Title *</label><input type="text" name="title" class="form-control" required></div>'
        + '<div class="form-group"><label>Department</label>'
        + '<select name="department" class="form-control">' + deptOpts + '</select></div>'
        + '<div class="form-group"><label>Reason / Notes</label><textarea name="reason" class="form-control" rows="2"></textarea></div>'
        + '<div class="form-group"><label>Items Needed</label>'
        + '<div id="matItemsContainer"><div class="mat-item-row" style="display:flex;gap:6px;margin-bottom:4px;">'
        + '<select class="form-control mat-item-select" style="flex:2;">' + itemOpts + '</select>'
        + '<input type="number" class="form-control mat-item-qty" placeholder="Qty" style="width:80px;" min="1" value="1">'
        + '<input type="text" class="form-control mat-item-unit" placeholder="Unit" style="width:70px;" value="pcs">'
        + '<button type="button" class="btn btn-sm btn-success" onclick="addMatItemRow()">+</button>'
        + '</div></div></div>'
        + '<div class="form-group"><label>Custom Item (if not in list)</label>'
        + '<div style="display:flex;gap:6px;"><input type="text" id="matCustomName" class="form-control" placeholder="Item name" style="flex:2;">'
        + '<input type="number" id="matCustomQty" class="form-control" placeholder="Qty" style="width:80px;" min="1" value="1">'
        + '<button type="button" class="btn btn-sm btn-primary" onclick="addMatCustomItem()">Add Custom</button></div></div>'
        + '</form>';

    openFormModal('New Material Request', html, 'saveMatReq()', true);
    document.getElementById('matForm').addEventListener('submit', function(e) { e.preventDefault(); saveMatReq(); });
}

var matCustomItems = [];

function addMatItemRow() {
    var user = AUTH.currentUser();
    var inventory = DB.get('inventory') || [];
    var itemOpts = '';
    for (var i = 0; i < inventory.length; i++) {
        var inv = inventory[i];
        itemOpts += '<option value="' + inv.name.replace(/"/g,'&quot;') + '" data-unit="' + (inv.unit || 'pcs') + '">' + inv.name + '</option>';
    }
    var container = document.getElementById('matItemsContainer');
    var row = document.createElement('div');
    row.className = 'mat-item-row';
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;';
    row.innerHTML = '<select class="form-control mat-item-select" style="flex:2;">' + itemOpts + '</select>'
        + '<input type="number" class="form-control mat-item-qty" placeholder="Qty" style="width:80px;" min="1" value="1">'
        + '<input type="text" class="form-control mat-item-unit" placeholder="Unit" style="width:70px;" value="pcs">'
        + '<button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">x</button>';
    container.appendChild(row);
}

function addMatCustomItem() {
    var name = document.getElementById('matCustomName').value.trim();
    var qty = parseInt(document.getElementById('matCustomQty').value) || 1;
    if (!name) { APP.notify('Enter item name', 'error'); return; }
    matCustomItems.push({ name: name, qty: qty, unit: 'pcs' });
    document.getElementById('matCustomName').value = '';
    document.getElementById('matCustomQty').value = '1';
    APP.notify('Added: ' + name + ' x' + qty, 'success');
}

function saveMatReq() {
    var form = document.getElementById('matForm');
    if (!form) return false;
    var title = (form.querySelector('[name="title"]')?.value || '').trim();
    var department = form.querySelector('[name="department"]')?.value || '';
    var reason = form.querySelector('[name="reason"]')?.value || '';

    if (!title) { APP.notify('Enter a title', 'error'); return false; }

    var items = [];
    var selRows = document.querySelectorAll('.mat-item-row');
    for (var i = 0; i < selRows.length; i++) {
        var row = selRows[i];
        var name = row.querySelector('.mat-item-select')?.value || '';
        var qty = parseInt(row.querySelector('.mat-item-qty')?.value) || 1;
        var unit = row.querySelector('.mat-item-unit')?.value || 'pcs';
        if (name) items.push({ name: name, qty: qty, unit: unit });
    }
    for (var i = 0; i < matCustomItems.length; i++) {
        items.push(matCustomItems[i]);
    }

    if (items.length === 0) { APP.notify('Add at least one item', 'error'); return false; }

    var user = AUTH.currentUser();
    DB.add('material_requests', {
        title: title,
        department: department || user.department || '',
        reason: reason,
        items: items,
        status: 'pending',
        createdBy: user.username,
        createdByName: user.fullName
    });
    matCustomItems = [];
    APP.notify('Request submitted', 'success');
    renderMatList();
    return true;
}

function deleteMatReq(id) {
    confirmAction('Delete this request?', function() {
        DB.delete('material_requests', id);
        renderMatList();
    });
}

function approveMatReq(id) {
    var user = AUTH.currentUser();
    DB.update('material_requests', id, {
        status: 'approved',
        approvedBy: user.fullName,
        approvedAt: new Date().toISOString()
    });
    APP.notify('Request approved', 'success');
    renderMatList();
}

function rejectMatReq(id) {
    var user = AUTH.currentUser();
    DB.update('material_requests', id, {
        status: 'rejected',
        approvedBy: user.fullName,
        approvedAt: new Date().toISOString()
    });
    APP.notify('Request rejected', 'info');
    renderMatList();
}
