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

function getMatStatusInfo(r) {
    if (r.status === 'fulfilled') return { badge: 'badge-success', text: 'Fulfilled \u2713' };
    if (r.status === 'partial_fulfilled') return { badge: 'badge-warning', text: 'Partial Fulfilled' };
    if (r.status === 'store_approved' || r.status === 'approved') return { badge: 'badge-success', text: 'Store Approved' };
    if (r.status === 'facility_approved') return { badge: 'badge-primary', text: 'Facility Approved' };
    if (r.status === 'hod_approved') return { badge: 'badge-primary', text: 'HOD Approved' };
    if (r.status === 'hod_rejected') return { badge: 'badge-danger', text: 'HOD Rejected' };
    if (r.status === 'facility_rejected') return { badge: 'badge-danger', text: 'Facility Rejected' };
    if (r.status === 'store_rejected' || r.status === 'rejected') return { badge: 'badge-danger', text: 'Rejected' };
    return { badge: 'badge-warning', text: 'Pending' };
}

function renderMatList() {
    try {
        var user = AUTH.currentUser();
        var all = DB.get('material_requests') || [];
        var search = (document.getElementById('matSearch') ? document.getElementById('matSearch').value : '').toLowerCase();

        var requests = [];
        for (var i = 0; i < all.length; i++) {
            var r = all[i];
            if (!r) continue;
            if (user.role === 'admin') {
                // admin sees all
            } else if (user.role === 'hod') {
                if (r.department !== user.department && r.status !== 'pending') continue;
            } else if (user.role === 'storekeeper') {
                if (r.status !== 'facility_approved' && r.status !== 'store_approved' && r.status !== 'hod_approved') continue;
            } else {
                if (r.createdBy !== user.fullName) continue;
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

            var si = getMatStatusInfo(r);
            var isPending = r.status === 'pending' && (!r.hodStatus || r.hodStatus === 'pending');
            var isHodApproved = r.hodStatus === 'approved' || r.status === 'hod_approved';
            var isFacilityApproved = r.facilityStatus === 'approved' || r.status === 'facility_approved';
            var canApproveHod = (user.role === 'admin' || (user.role === 'hod' && r.department === user.department)) && isPending;
            var canApproveFacility = (user.role === 'admin' || user.role === 'hod') && isHodApproved && r.facilityStatus !== 'approved' && r.facilityStatus !== 'rejected';
            var canApproveStore = (user.role === 'admin' || user.role === 'storekeeper') && isFacilityApproved && r.storeStatus !== 'approved';
            var canFulfillStore = (user.role === 'admin' || user.role === 'storekeeper') && r.storeStatus === 'approved' && r.status !== 'fulfilled' && r.status !== 'partial_fulfilled';
            var canCloseCreator = r.createdBy === user.fullName && (r.status === 'store_approved' || r.status === 'approved') && r.fulfilledAt;
            var isOwner = r.createdBy === user.fullName;

            html += '<tr>'
                + '<td><strong>' + (r.title || 'Request') + '</strong></td>'
                + '<td style="font-size:12px;">' + itemStr + '</td>'
                + '<td>' + (r.department || '-') + '</td>'
                + '<td>' + (r.createdBy || '-') + '</td>'
                + '<td>' + APP.formatDate(r.createdAt) + '</td>'
                + '<td><span class="badge ' + si.badge + '">' + si.text + '</span>'
                + (r.approvedBy ? '<br><span style="font-size:11px;color:var(--gray);">HOD: ' + r.approvedBy + '</span>' : '')
                + (r.facilityApprovedBy ? '<br><span style="font-size:11px;color:var(--gray);">Facility: ' + r.facilityApprovedBy + '</span>' : '')
                + (r.storeApprovedBy ? '<br><span style="font-size:11px;color:var(--gray);">Store: ' + r.storeApprovedBy + '</span>' : '')
                + (r.fulfilledBy ? '<br><span style="font-size:11px;color:var(--gray);">Fulfilled: ' + r.fulfilledBy + '</span>' : '')
                + '</td>'
                + '<td style="white-space:nowrap;">'
                + (isOwner && isPending ? '<button class="btn btn-sm btn-danger" onclick="deleteMatReq(\'' + r.id + '\')">Del</button> ' : '')
                + (canApproveHod ? '<button class="btn btn-sm btn-success" onclick="approveMatReq(\'' + r.id + '\',\'hod\')">\u2713 HOD</button> '
                    + '<button class="btn btn-sm btn-danger" onclick="rejectMatReq(\'' + r.id + '\',\'hod\')">\u2717 HOD</button> ' : '')
                + (canApproveFacility ? '<button class="btn btn-sm btn-success" onclick="approveMatReq(\'' + r.id + '\',\'facility\')">\u2713 Facility</button> '
                    + '<button class="btn btn-sm btn-danger" onclick="rejectMatReq(\'' + r.id + '\',\'facility\')">\u2717 Facility</button> ' : '')
                + (canApproveStore ? '<button class="btn btn-sm btn-success" onclick="approveMatReq(\'' + r.id + '\',\'store\')">\u2713 Store</button> '
                    + '<button class="btn btn-sm btn-danger" onclick="rejectMatReq(\'' + r.id + '\',\'store\')">\u2717 Store</button> ' : '')
                + (canFulfillStore ? '<button class="btn btn-sm btn-info" onclick="fulfillMatReq(\'' + r.id + '\')">Fulfill</button> ' : '')
                + (canCloseCreator ? '<button class="btn btn-sm btn-success" onclick="closeMatReq(\'' + r.id + '\')">\u2713 Close</button> ' : '')
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
    var title = (form.querySelector('[name="title"]') ? form.querySelector('[name="title"]').value : '').trim();
    var department = form.querySelector('[name="department"]') ? form.querySelector('[name="department"]').value : '';
    var reason = form.querySelector('[name="reason"]') ? form.querySelector('[name="reason"]').value : '';

    if (!title) { APP.notify('Enter a title', 'error'); return false; }

    var items = [];
    var selRows = document.querySelectorAll('.mat-item-row');
    for (var i = 0; i < selRows.length; i++) {
        var row = selRows[i];
        var name = row.querySelector('.mat-item-select') ? row.querySelector('.mat-item-select').value : '';
        var qty = parseInt(row.querySelector('.mat-item-qty') ? row.querySelector('.mat-item-qty').value : 1) || 1;
        var unit = row.querySelector('.mat-item-unit') ? row.querySelector('.mat-item-unit').value : 'pcs';
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
        hodStatus: 'pending',
        facilityStatus: 'pending',
        storeStatus: 'pending',
        createdBy: user.fullName,
        createdByName: user.fullName,
        approvedBy: '',
        approvedAt: '',
        facilityApprovedBy: '',
        facilityApprovedAt: '',
        storeApprovedBy: '',
        storeApprovedAt: '',
        fulfilledBy: '',
        fulfilledAt: '',
        closedBy: '',
        closedAt: ''
    });
    matCustomItems = [];
    APP.notify('Request submitted — pending HOD approval', 'success');
    renderMatList();
    return true;
}

function deleteMatReq(id) {
    confirmAction('Delete this request?', function() {
        DB.delete('material_requests', id);
        renderMatList();
    });
}

function approveMatReq(id, level) {
    var user = AUTH.currentUser();
    if (level === 'hod') {
        DB.update('material_requests', id, {
            hodStatus: 'approved',
            status: 'hod_approved',
            approvedBy: user.fullName,
            approvedAt: new Date().toISOString()
        });
        APP.notify('HOD approved — sent to Facility HOD', 'success');
    } else if (level === 'facility') {
        DB.update('material_requests', id, {
            facilityStatus: 'approved',
            status: 'facility_approved',
            facilityApprovedBy: user.fullName,
            facilityApprovedAt: new Date().toISOString()
        });
        APP.notify('Facility approved — sent to Store', 'success');
    } else {
        DB.update('material_requests', id, {
            storeStatus: 'approved',
            status: 'store_approved',
            storeApprovedBy: user.fullName,
            storeApprovedAt: new Date().toISOString()
        });
        APP.notify('Store approved — ready for fulfillment', 'success');
    }
    renderMatList();
}

function rejectMatReq(id, level) {
    if (level === 'hod') {
        DB.update('material_requests', id, { hodStatus: 'rejected', status: 'hod_rejected' });
        APP.notify('HOD rejected', 'info');
    } else if (level === 'facility') {
        DB.update('material_requests', id, { facilityStatus: 'rejected', status: 'facility_rejected' });
        APP.notify('Facility rejected', 'info');
    } else {
        DB.update('material_requests', id, { storeStatus: 'rejected', status: 'store_rejected' });
        APP.notify('Store rejected', 'info');
    }
    renderMatList();
}

function fulfillMatReq(id) {
    var user = AUTH.currentUser();
    DB.update('material_requests', id, {
        fulfilledBy: user.fullName,
        fulfilledAt: new Date().toISOString(),
        status: 'store_approved'
    });
    APP.notify('Items fulfilled — awaiting creator confirmation to close', 'success');
    renderMatList();
}

function closeMatReq(id) {
    if (!confirm('Confirm receipt of all items? Select Cancel for partial fulfillment.')) {
        DB.update('material_requests', id, { status: 'partial_fulfilled', closedBy: AUTH.currentUser().fullName, closedAt: new Date().toISOString() });
        APP.notify('Marked as partial fulfilled', 'info');
    } else {
        DB.update('material_requests', id, { status: 'fulfilled', closedBy: AUTH.currentUser().fullName, closedAt: new Date().toISOString() });
        APP.notify('Request fulfilled and closed', 'success');
    }
    renderMatList();
}
