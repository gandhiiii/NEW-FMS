const ROOM_CATEGORIES = ['Super Deluxe', 'Deluxe Special', 'Semi Special', 'Twin', 'Triple'];
const BED_LABELS = ['A', 'B', 'C'];
function getRooms() {
    return DB.get('rooms');
}

function saveRooms(rooms) {
    DB.set('rooms', rooms);
}

function getBedsByRoom(roomNo) {
    var rooms = getRooms();
    for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].roomNo === roomNo) return rooms[i].beds || ['A'];
    }
    return ['A'];
}

function getOccupiedBeds(roomNo) {
    var adms = DB.get('admissions') || [];
    var occupied = [];
    for (var i = 0; i < adms.length; i++) {
        if (adms[i].roomNo === roomNo && adms[i].status === 'admitted') {
            occupied.push(adms[i].bedId || 'A');
        }
    }
    return occupied;
}

function getRoomStatus(roomNo) {
    var overrides = DB.get('roomStatus') || [];
    var override = null;
    for (var i = 0; i < overrides.length; i++) {
        if (overrides[i].roomNo === roomNo) { override = overrides[i]; break; }
    }
    var occupiedBeds = getOccupiedBeds(roomNo);
    var totalBeds = getBedsByRoom(roomNo);
    var isOccupied = occupiedBeds.length > 0;
    if (override && override.status === 'maintenance') return { status: 'maintenance', data: override, occupiedBeds: occupiedBeds, totalBeds: totalBeds.length };
    if (override && override.status === 'cleaning') return { status: 'cleaning', data: override, occupiedBeds: occupiedBeds, totalBeds: totalBeds.length };
    if (isOccupied) return { status: 'occupied', occupiedBeds: occupiedBeds, totalBeds: totalBeds.length };
    return { status: 'available', occupiedBeds: [], totalBeds: totalBeds.length };
}

function getRoomDetails(roomNo) {
    var rooms = getRooms();
    var roomInfo = null;
    for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].roomNo === roomNo) { roomInfo = rooms[i]; break; }
    }
    var result = { roomNo: roomNo, status: 'available', patient: null, checklists: [], complaints: [], problems: [], maintenance: null, category: roomInfo ? roomInfo.category : '', beds: roomInfo ? roomInfo.beds : ['A'], occupiedBeds: [] };
    var admissions = DB.get('admissions');
    var patients = [];
    for (var j = 0; j < admissions.length; j++) {
        if (admissions[j].roomNo === roomNo && admissions[j].status === 'admitted') {
            patients.push(admissions[j]);
        }
    }
    result.patients = patients;
    result.occupiedBeds = patients.map(function(p) { return p.bedId || 'A'; });
    result.status = patients.length > 0 ? 'occupied' : 'available';
    var overrides = DB.get('roomStatus') || [];
    var ov = null;
    for (var k = 0; k < overrides.length; k++) {
        if (overrides[k].roomNo === roomNo) { ov = overrides[k]; break; }
    }
    if (ov) result.status = ov.status;
    if (ov && ov.status === 'maintenance') result.maintenance = ov;
    result.checklists = (DB.get('roomchecklists') || []).filter(function(c) { return c.roomNo === roomNo; }).slice().reverse();
    result.complaints = (DB.get('complaints') || []).filter(function(c) { return c.roomNo === roomNo; }).slice().reverse();
    result.problems = (DB.get('problems') || []).filter(function(p) { return p.roomNo === roomNo; }).slice().reverse();
    return result;
}

function renderAdmissions(container) {
    container.innerHTML = `
        <div class="flex-between mb-4" id="admTopBar">
            <div class="search-box" id="admSearchBox">
                <input type="text" class="form-control" id="admSearch" placeholder="Search patients..." oninput="renderAdmList()">
            </div>
            <button class="btn btn-primary" onclick="showAdmForm()">+ New Admission</button>
        </div>

        <div id="admStats" class="grid-4 mb-4"></div>

        <div class="tabs" style="margin-bottom:16px;">
            <button class="tab-btn ${admFilter === 'all' ? 'active' : ''}" onclick="switchAdmFilter('all',this)">All</button>
            <button class="tab-btn ${admFilter === 'admitted' ? 'active' : ''}" onclick="switchAdmFilter('admitted',this)">Admitted</button>
            <button class="tab-btn ${admFilter === 'discharged' ? 'active' : ''}" onclick="switchAdmFilter('discharged',this)">Discharged</button>
            <button class="tab-btn ${admFilter === 'rooms' ? 'active' : ''}" onclick="switchAdmFilter('rooms',this)">🏥 Rooms</button>
        </div>

        <div id="admContent"></div>
    `;
    renderAdmContent();
}

function renderAdmContent() {
    var topBar = document.getElementById('admTopBar');
    var searchBox = document.getElementById('admSearchBox');
    var stats = document.getElementById('admStats');
    var content = document.getElementById('admContent');
    if (!content) return;
    if (admFilter === 'rooms') {
        if (topBar) topBar.style.justifyContent = 'flex-end';
        if (searchBox) searchBox.style.display = 'none';
        if (stats) stats.style.display = 'none';
        content.innerHTML = '<div id="roomViewContainer"></div><div style="margin-top:12px;text-align:right;"><button class="btn btn-sm btn-secondary" onclick="showRoomManagement()">⚙️ Manage Rooms</button></div>';
        renderRoomView();
    } else {
        if (topBar) topBar.style.justifyContent = '';
        if (searchBox) searchBox.style.display = '';
        if (stats) stats.style.display = '';
        content.innerHTML = renderAdmListView();
        renderAdmList();
    }
}

var admFilter = 'all';

function switchAdmFilter(filter, btn) {
    admFilter = filter;
    var btns = document.querySelectorAll('.tabs .tab-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    btn.classList.add('active');
    renderAdmContent();
}

function renderAdmListView() {
    return '<div class="card"><div class="table-responsive"><table><thead><tr><th>Patient Name</th><th>ID</th><th>Room/Bed</th><th>Doctor</th><th>Admitted</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody id="admTableBody"></tbody></table></div></div>';
}

function renderAdmList() {
    var admissions = DB.get('admissions');
    var search = (document.getElementById('admSearch') ? document.getElementById('admSearch').value : '').toLowerCase();
    var filtered = [];
    for (var i = 0; i < admissions.length; i++) {
        var a = admissions[i];
        if (a.patientName.toLowerCase().indexOf(search) > -1 || (a.patientId || '').toLowerCase().indexOf(search) > -1 || a.roomNo.toLowerCase().indexOf(search) > -1 || (a.doctorName || '').toLowerCase().indexOf(search) > -1) {
            if (admFilter === 'all' || a.status === admFilter) filtered.push(a);
        }
    }

    var total = admissions.length;
    var admitted = 0;
    var discharged = 0;
    for (var s = 0; s < admissions.length; s++) {
        if (admissions[s].status === 'admitted') admitted++;
        else if (admissions[s].status === 'discharged') discharged++;
    }

    var statsEl = document.getElementById('admStats');
    if (statsEl) {
        var avgStay = 0;
        if (admitted > 0) {
            var sum = 0;
            for (var d = 0; d < admissions.length; d++) {
                if (admissions[d].status === 'admitted') sum += APP.daysBetween(admissions[d].admissionDate, new Date().toISOString());
            }
            avgStay = (sum / admitted).toFixed(1);
        }
        statsEl.innerHTML = '<div class="stat-card" style="border-left-color:var(--primary)"><div class="stat-value">' + total + '</div><div class="stat-label">Total Patients</div></div><div class="stat-card" style="border-left-color:var(--info)"><div class="stat-value">' + admitted + '</div><div class="stat-label">Currently Admitted</div></div><div class="stat-card" style="border-left-color:var(--success)"><div class="stat-value">' + discharged + '</div><div class="stat-label">Discharged</div></div><div class="stat-card" style="border-left-color:var(--warning)"><div class="stat-value">' + avgStay + '</div><div class="stat-label">Avg Stay (days)</div></div>';
    }

    var tbody = document.getElementById('admTableBody');
    if (!tbody) return;
    var rows = '';
    for (var r = filtered.length - 1; r >= 0; r--) {
        var adm = filtered[r];
        var bedLabel = adm.bedId ? ' (' + adm.bedId + ')' : '';
        rows += '<tr><td><strong>' + adm.patientName + '</strong></td><td>' + (adm.patientId || '#' + adm.id.slice(-6)) + '</td><td>' + adm.roomNo + bedLabel + '</td><td>' + (adm.doctorName || '-') + '</td><td>' + APP.formatDate(adm.admissionDate) + '</td><td><span class="badge ' + (adm.type === 'emergency' ? 'badge-danger' : adm.type === 'icu' ? 'badge-warning' : 'badge-info') + '">' + adm.type + '</span></td><td><span class="badge ' + APP.getStatusBadge(adm.status) + '">' + adm.status + '</span></td><td><button class="btn btn-sm btn-primary" onclick="viewAdm(\'' + adm.id + '\')">View</button>' + (adm.status === 'admitted' ? '<button class="btn btn-sm btn-warning" onclick="showDischargeForm(\'' + adm.id + '\')">Discharge</button>' : '') + '<button class="btn btn-sm btn-danger" onclick="deleteAdm(\'' + adm.id + '\')">Del</button></td></tr>';
    }
    tbody.innerHTML = rows || '<tr><td colspan="8" class="empty-state">No admissions</td></tr>';
}

/* ═══════════════════════════════════════
   ROOM MANAGEMENT
   ═══════════════════════════════════════ */

function showRoomManagement() {
    var rooms = getRooms();
    var catOpts = '';
    for (var c = 0; c < ROOM_CATEGORIES.length; c++) {
        catOpts += '<option value="' + ROOM_CATEGORIES[c] + '">' + ROOM_CATEGORIES[c] + '</option>';
    }
    var listHtml = '';
    for (var i = 0; i < rooms.length; i++) {
        var rm = rooms[i];
        listHtml += '<tr><td>' + rm.roomNo + '</td><td>' + rm.floor + '</td><td><span class="badge badge-info">' + rm.category + '</span></td><td>' + (rm.beds || ['A']).join(', ') + '</td><td><button class="btn btn-sm btn-danger" onclick="deleteRoom(\'' + rm.id + '\')">🗑️</button></td></tr>';
    }
    showModal(`
        <div class="modal-header"><h3>⚙️ Room Management</h3><button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button></div>
        <div style="padding:4px 0;">
            <div class="card" style="padding:12px;margin-bottom:12px;">
                <h4 style="margin:0 0 8px 0;font-size:14px;">➕ Add Room</h4>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:8px;align-items:end;">
                    <div class="form-group" style="margin:0;">
                        <label>Room No *</label>
                        <input type="text" id="newRoomNo" class="form-control" placeholder="e.g. 701">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Floor</label>
                        <input type="number" id="newRoomFloor" class="form-control" value="7" min="1" max="20">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Category</label>
                        <select id="newRoomCategory" class="form-control">` + catOpts + `</select>
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Beds</label>
                        <div style="display:flex;gap:4px;">
                            <label style="font-size:13px;display:flex;align-items:center;gap:2px;"><input type="checkbox" class="bed-cb" value="A" checked> A</label>
                            <label style="font-size:13px;display:flex;align-items:center;gap:2px;"><input type="checkbox" class="bed-cb" value="B" checked> B</label>
                            <label style="font-size:13px;display:flex;align-items:center;gap:2px;"><input type="checkbox" class="bed-cb" value="C" checked> C</label>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="addRoom()">+ Add</button>
                </div>
            </div>
            <div class="card" style="padding:12px;">
                <div class="flex-between" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <h4 style="margin:0;font-size:14px;">📋 Room List</h4>
                    <button class="btn btn-sm btn-danger" onclick="removeAllRooms()">🗑️ Remove All Rooms</button>
                </div>
                <div class="table-responsive" style="max-height:300px;overflow-y:auto;">
                    <table><thead><tr><th>Room</th><th>Floor</th><th>Category</th><th>Beds</th><th>Action</th></tr></thead><tbody>` + listHtml + `</tbody></table>
                </div>
            </div>
        </div>
    `, true);
}

function addRoom() {
    var roomNo = document.getElementById('newRoomNo').value.trim();
    var floor = parseInt(document.getElementById('newRoomFloor').value) || 1;
    var category = document.getElementById('newRoomCategory').value;
    var bedCbs = document.querySelectorAll('.bed-cb:checked');
    var beds = [];
    for (var i = 0; i < bedCbs.length; i++) beds.push(bedCbs[i].value);
    if (!roomNo) { APP.notify('Please enter room number', 'error'); return; }
    if (beds.length === 0) { APP.notify('Select at least one bed', 'error'); return; }
    var rooms = getRooms();
    for (var r = 0; r < rooms.length; r++) {
        if (rooms[r].roomNo === roomNo) { APP.notify('Room ' + roomNo + ' already exists', 'error'); return; }
    }
    rooms.push({ id: 'room_' + roomNo + '_' + Date.now(), roomNo: roomNo, floor: floor, category: category, beds: beds });
    saveRooms(rooms);
    renderRoomManagementList();
    renderRoomView();
    APP.notify('Room ' + roomNo + ' added', 'success');
}

function deleteRoom(id) {
    confirmAction('Delete this room? All room data will be removed.', function() {
        var rooms = getRooms();
        var updated = [];
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].id !== id) updated.push(rooms[i]);
        }
        saveRooms(updated);
        renderRoomManagementList();
        renderRoomView();
        APP.notify('Room deleted', 'success');
    });
}

function removeAllRooms() {
    var rooms = getRooms();
    if (!rooms || rooms.length === 0) { APP.notify('No rooms to remove', 'info'); return; }
    confirmAction('Remove ALL ' + rooms.length + ' rooms? This cannot be undone.', function() {
        saveRooms([]);
        renderRoomManagementList();
        renderRoomView();
        APP.notify('All rooms removed', 'success');
    });
}

function renderRoomManagementList() {
    var rooms = getRooms();
    var tbody = document.querySelector('.modal.active tbody');
    if (!tbody) return;
    var html = '';
    for (var i = 0; i < rooms.length; i++) {
        var rm = rooms[i];
        html += '<tr><td>' + rm.roomNo + '</td><td>' + rm.floor + '</td><td><span class="badge badge-info">' + rm.category + '</span></td><td>' + (rm.beds || ['A']).join(', ') + '</td><td><button class="btn btn-sm btn-danger" onclick="deleteRoom(\'' + rm.id + '\')">🗑️</button></td></tr>';
    }
    tbody.innerHTML = html || '<tr><td colspan="5" class="empty-state">No rooms</td></tr>';
}

function confirmDeleteRoom(id, roomNo) {
    var adms = DB.get('admissions') || [];
    var hasPatients = false;
    for (var i = 0; i < adms.length; i++) {
        if (adms[i].roomNo === roomNo && adms[i].status === 'admitted') { hasPatients = true; break; }
    }
    var msg = 'Remove Room ' + roomNo + '?';
    if (hasPatients) msg += ' This room has admitted patients — they will be affected.';
    confirmAction(msg, function() {
        var rooms = getRooms();
        var updated = [];
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].id !== id) updated.push(rooms[i]);
        }
        saveRooms(updated);
        renderRoomView();
        APP.notify('Room ' + roomNo + ' removed', 'success');
    });
}

/* ═══════════════════════════════════════
   ROOM VIEW
   ═══════════════════════════════════════ */

function renderRoomViewHtml() {
    return '<div id="roomViewContainer"></div>';
}

function renderRoomView() {
    var el = document.getElementById('roomViewContainer');
    if (!el) return;
    var rooms = getRooms();
    var overrides = (DB.get('roomStatus') || []).slice();
    var admissions = (DB.get('admissions') || []).slice();

    var floors = {};
    for (var i = 0; i < rooms.length; i++) {
        var rm = rooms[i];
        if (!floors[rm.floor]) floors[rm.floor] = { label: rm.floor + 'th Floor', rooms: [] };
        floors[rm.floor].rooms.push(rm);
    }
    var floorKeys = Object.keys(floors).sort(function(a, b) { return parseInt(a) - parseInt(b); });

    var html = '';
    for (var f = 0; f < floorKeys.length; f++) {
        var floorKey = floorKeys[f];
        var floorData = floors[floorKey];
        html += '<div class="card" style="margin-bottom:16px;">';
        html += '<div class="card-header"><h3>' + floorData.label + ' (' + floorData.rooms.length + ' rooms)</h3></div>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;padding:12px;">';

        for (var r = 0; r < floorData.rooms.length; r++) {
            var rm = floorData.rooms[r];
            var roomNo = rm.roomNo;
            var ov = null;
            for (var o = 0; o < overrides.length; o++) {
                if (overrides[o].roomNo === roomNo) { ov = overrides[o]; break; }
            }
            var occupiedBeds = [];
            for (var a = 0; a < admissions.length; a++) {
                if (admissions[a].roomNo === roomNo && admissions[a].status === 'admitted') {
                    occupiedBeds.push(admissions[a].bedId || 'A');
                }
            }
            var totalBeds = rm.beds || ['A'];
            var availableBeds = [];
            for (var b = 0; b < totalBeds.length; b++) {
                var bed = totalBeds[b];
                var taken = false;
                for (var oc = 0; oc < occupiedBeds.length; oc++) {
                    if (occupiedBeds[oc] === bed) { taken = true; break; }
                }
                if (!taken) availableBeds.push(bed);
            }

            var status = 'available';
            var bg = '#e8f5e9';
            var label = 'Available';
            if (occupiedBeds.length > 0 && occupiedBeds.length < totalBeds.length) { status = 'partial'; bg = '#fff3e0'; label = occupiedBeds.length + '/' + totalBeds.length + ' occupied'; }
            else if (occupiedBeds.length >= totalBeds.length) { status = 'full'; bg = '#fff8e1'; label = 'Full'; }
            if (ov && ov.status === 'cleaning') { status = 'cleaning'; bg = '#e3f2fd'; label = 'Cleaning'; }
            if (ov && ov.status === 'maintenance') { status = 'maintenance'; bg = '#ffebee'; label = 'Maintenance'; }

            var borderColor = '#66bb6a';
            if (status === 'partial') borderColor = '#ff9800';
            else if (status === 'full') borderColor = '#fdd835';
            else if (status === 'cleaning') borderColor = '#42a5f5';
            else if (status === 'maintenance') borderColor = '#ef5350';

            var textColor = '#2e7d32';
            if (status === 'partial') textColor = '#e65100';
            else if (status === 'full') textColor = '#f57f17';
            else if (status === 'cleaning') textColor = '#1565c0';
            else if (status === 'maintenance') textColor = '#c62828';

            var bedHtml = '';
            for (var bd = 0; bd < totalBeds.length; bd++) {
                var bedLabel = totalBeds[bd];
                var bedTaken = false;
                for (var oc2 = 0; oc2 < occupiedBeds.length; oc2++) {
                    if (occupiedBeds[oc2] === bedLabel) { bedTaken = true; break; }
                }
                var bedColor = bedTaken ? '#e53935' : '#43a047';
                bedHtml += '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:' + bedColor + ';color:#fff;font-size:10px;font-weight:700;text-align:center;line-height:18px;margin-right:2px;" title="Bed ' + bedLabel + ': ' + (bedTaken ? 'Occupied' : 'Available') + '">' + bedLabel + '</span>';
            }

            var catColor = '#78909c';
            html += '<div class="room-card" data-room="' + roomNo + '" onclick="showRoomDetail(\'' + roomNo + '\')"';
            html += ' style="background:' + bg + ';border-radius:10px;padding:12px;cursor:pointer;border:2px solid ' + borderColor + ';position:relative;">';
            html += '<span onclick="event.stopPropagation();confirmDeleteRoom(\'' + rm.id + '\',\'' + roomNo + '\')" style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.15);color:#666;font-size:12px;font-weight:700;text-align:center;line-height:20px;cursor:pointer;display:none;" class="room-del-btn" title="Remove room">&times;</span>';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">';
            html += '<div style="font-size:20px;font-weight:700;">' + roomNo + '</div>';
            html += '<span style="font-size:10px;color:' + catColor + ';background:#eceff1;padding:2px 6px;border-radius:4px;">' + rm.category + '</span>';
            html += '</div>';
            html += '<div style="font-size:12px;font-weight:600;color:' + textColor + ';margin-bottom:4px;">' + label + '</div>';
            html += '<div style="margin-bottom:2px;">' + bedHtml + '</div>';
            if (ov && ov.maintenanceReason) {
                html += '<div style="font-size:10px;color:#c62828;margin-top:2px;">' + ov.maintenanceReason.substring(0, 20).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>';
            }
            html += '</div>';
        }
        html += '</div></div>';
    }
    el.innerHTML = html || '<div style="text-align:center;padding:40px;color:var(--gray);">No rooms configured. <button class="btn btn-primary" onclick="showRoomManagement()">Add Rooms</button></div>';
}

function showRoomDetail(roomNo) {
    var data = getRoomDetails(roomNo);
    var rooms = getRooms();
    var roomInfo = null;
    for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].roomNo === roomNo) { roomInfo = rooms[i]; break; }
    }

    var statusColors = { available: '#66bb6a', occupied: '#fdd835', cleaning: '#42a5f5', maintenance: '#ef5350' };
    var statusBgs = { available: '#e8f5e9', occupied: '#fff8e1', cleaning: '#e3f2fd', maintenance: '#ffebee' };
    var statusLabels = { available: 'Available', occupied: 'Occupied', cleaning: 'Under Cleaning', maintenance: 'Under Maintenance' };

    var inventoryItems = (DB.get('inventory') || []).filter(function(i) { return i.location && i.location.indexOf(roomNo) > -1; });

    var setStatusBtn = function(s, label, color) {
        return '<button class="btn btn-sm ' + color + '" onclick="setRoomStatus(\'' + roomNo + '\',\'' + s + '\');document.querySelector(\'.modal.active\')?.remove()">' + label + '</button>';
    };

    var patientHtml = '';
    if (data.patients && data.patients.length > 0) {
        for (var p = 0; p < data.patients.length; p++) {
            var pat = data.patients[p];
            var bedLabel = pat.bedId || 'A';
            patientHtml += '<div class="card" style="margin-bottom:8px;padding:12px;background:' + statusBgs.occupied + ';border-left:3px solid ' + statusColors.occupied + ';">';
            patientHtml += '<h4 style="margin:0 0 8px 0;font-size:14px;">🧑 Patient (Bed ' + bedLabel + ')</h4>';
            patientHtml += '<div class="grid-2" style="font-size:13px;">';
            patientHtml += '<div><strong>Name:</strong> ' + pat.patientName + '</div>';
            patientHtml += '<div><strong>IP ID:</strong> ' + (pat.patientId || '#' + pat.id.slice(-6)) + '</div>';
            patientHtml += '<div><strong>Doctor:</strong> ' + (pat.doctorName || '-') + '</div>';
            patientHtml += '<div><strong>Department:</strong> ' + (pat.department || '-') + '</div>';
            patientHtml += '<div><strong>Admitted:</strong> ' + APP.formatDate(pat.admissionDate) + '</div>';
            patientHtml += '<div><strong>Type:</strong> <span class="badge ' + (pat.type === 'emergency' ? 'badge-danger' : pat.type === 'icu' ? 'badge-warning' : 'badge-info') + '">' + pat.type + '</span></div>';
            patientHtml += '</div>';
            if (pat.phone) patientHtml += '<div style="font-size:13px;margin-top:4px;"><strong>Phone:</strong> ' + pat.phone + '</div>';
            if (pat.diagnosis) patientHtml += '<div style="font-size:13px;margin-top:4px;"><strong>Diagnosis:</strong> ' + pat.diagnosis + '</div>';
            patientHtml += '</div>';
        }
    }

    var bedStatusHtml = '';
    if (roomInfo && roomInfo.beds) {
        bedStatusHtml = '<div style="display:flex;gap:8px;margin-bottom:12px;">';
        for (var bd = 0; bd < roomInfo.beds.length; bd++) {
            var bed = roomInfo.beds[bd];
            var taken = false;
            for (var oc = 0; oc < data.occupiedBeds.length; oc++) {
                if (data.occupiedBeds[oc] === bed) { taken = true; break; }
            }
            var bdBg = taken ? '#ffebee' : '#e8f5e9';
            var bdColor = taken ? '#c62828' : '#2e7d32';
            bedStatusHtml += '<div style="flex:1;text-align:center;padding:8px;border-radius:6px;background:' + bdBg + ';border:1px solid ' + bdColor + ';">';
            bedStatusHtml += '<div style="font-size:16px;font-weight:700;color:' + bdColor + ';">' + bed + '</div>';
            bedStatusHtml += '<div style="font-size:11px;color:' + bdColor + ';">' + (taken ? 'Occupied' : 'Available') + '</div>';
            bedStatusHtml += '</div>';
        }
        bedStatusHtml += '</div>';
    }

    showModal(`
        <div class="modal-header">
            <h3>🏥 Room ` + roomNo + ` <span style="font-size:12px;color:#78909c;font-weight:400;">` + (roomInfo ? roomInfo.category : '') + `</span></h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div style="padding:4px 0;">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;padding:10px 14px;border-radius:8px;background:` + statusBgs[data.status] + `;border-left:4px solid ` + statusColors[data.status] + `;">
                <div>
                    <div style="font-weight:700;font-size:16px;color:` + statusColors[data.status] + `;">` + statusLabels[data.status] + `</div>
                    <div style="font-size:12px;color:var(--gray);">` + (data.maintenance ? data.maintenance.maintenanceReason : 'No issues reported') + `</div>
                </div>
            </div>

            ` + bedStatusHtml + `

            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
                ` + (data.status !== 'occupied' ? setStatusBtn('occupied', '🟡 Mark Occupied', 'btn-warning') : '') + `
                ` + (data.status !== 'cleaning' ? setStatusBtn('cleaning', '🔵 Set Cleaning', 'btn-info') : '') + `
                ` + (data.status !== 'maintenance' ? '<button class="btn btn-sm btn-danger" onclick="showSetMaintenance(\'' + roomNo + '\')">🔴 Set Maintenance</button>' : '') + `
                ` + (data.status !== 'available' ? setStatusBtn('available', '🟢 Set Available', 'btn-success') : '') + `
            </div>

            ` + patientHtml + `

            <div class="card" style="margin-bottom:12px;padding:12px;">
                <h4 style="margin:0 0 8px 0;font-size:14px;">📋 Recent Checklists (` + data.checklists.length + `)</h4>
                ` + (data.checklists.length === 0 ? '<div style="font-size:12px;color:var(--gray);">No checklists for this room</div>' : data.checklists.slice(0, 3).map(function(cl) {
                    var items = cl.items || {};
                    var ok = 0;
                    var keys = Object.keys(items);
                    for (var kv = 0; kv < keys.length; kv++) { if (items[keys[kv]] === true) ok++; }
                    var pct = keys.length > 0 ? Math.round(ok / keys.length * 100) : 0;
                    return '<div style="display:flex;gap:8px;align-items:center;font-size:12px;padding:4px 0;border-bottom:1px solid var(--light-gray);"><span class="badge ' + (cl.type === 'pre-admission' ? 'badge-info' : 'badge-warning') + '">' + cl.type + '</span><span>' + APP.formatDate(cl.createdAt) + '</span><span style="flex:1;font-size:11px;">by ' + (cl.checkedBy || '-') + '</span><span style="font-weight:600;">' + ok + '/' + keys.length + ' (' + pct + '%)</span></div>';
                }).join('') + (data.checklists.length > 3 ? '<div style="font-size:11px;color:var(--primary);margin-top:4px;">+' + (data.checklists.length - 3) + ' more</div>' : '')) + `
            </div>

            <div class="card" style="margin-bottom:12px;padding:12px;">
                <h4 style="margin:0 0 8px 0;font-size:14px;">⚠️ Complaints (` + data.complaints.length + `)</h4>
                ` + (data.complaints.length === 0 ? '<div style="font-size:12px;color:var(--gray);">No complaints</div>' : data.complaints.map(function(c) {
                    return '<div style="display:flex;gap:6px;align-items:center;font-size:12px;padding:3px 0;border-bottom:1px solid var(--light-gray);"><span class="badge ' + APP.getStatusBadge(c.status) + '">' + c.status + '</span><span style="flex:1;">' + c.category + ' - ' + c.patientName + '</span><span style="color:var(--gray);font-size:11px;">' + APP.formatDate(c.createdAt) + '</span></div>';
                }).join('')) + `
            </div>

            <div class="card" style="margin-bottom:12px;padding:12px;">
                <h4 style="margin:0 0 8px 0;font-size:14px;">🔧 Problems / Maintenance (` + data.problems.length + `)</h4>
                ` + (data.problems.length === 0 ? '<div style="font-size:12px;color:var(--gray);">No problems reported</div>' : data.problems.map(function(p) {
                    return '<div style="display:flex;gap:6px;align-items:center;font-size:12px;padding:3px 0;border-bottom:1px solid var(--light-gray);"><span class="badge ' + APP.getStatusBadge(p.status) + '">' + p.status + '</span><span style="flex:1;">' + (p.title || p.description || '-') + '</span><span style="color:var(--gray);font-size:11px;">' + APP.formatDate(p.createdAt) + '</span></div>';
                }).join('')) + `
            </div>

            <div class="card" style="padding:12px;">
                <h4 style="margin:0 0 8px 0;font-size:14px;">📦 Installed Equipment (` + inventoryItems.length + `)</h4>
                ` + (inventoryItems.length === 0 ? '<div style="font-size:12px;color:var(--gray);">No equipment assigned to this room</div>' : '<div class="table-responsive"><table><thead><tr><th>Item</th><th>Category</th><th>Lifecycle</th><th>Warranty</th></tr></thead><tbody>' + inventoryItems.map(function(i) {
                    var lc = (i.purchaseDate && i.expiryDate) ? APP.lifecyclePercent(i.purchaseDate, i.expiryDate) : 0;
                    var lcColor = APP.lifecycleColor(lc);
                    var warCol = i.warrantyDate ? (APP.daysBetween(new Date().toISOString(), i.warrantyDate) > 0 ? 'var(--success)' : 'var(--danger)') : 'var(--gray)';
                    return '<tr><td><strong>' + i.name + '</strong></td><td>' + i.category + '</td><td><div class="progress-bar" style="width:60px;height:12px;"><div class="progress-fill ' + lcColor + '" style="width:' + lc + '%;"></div></div><span style="font-size:10px;">' + lc + '%</span></td><td style="color:' + warCol + ';font-size:12px;">' + (i.warrantyDate ? APP.formatDate(i.warrantyDate) : '-') + '</td></tr>';
                }).join('') + '</tbody></table></div>') + `
            </div>
        </div>
    `, true);
}

function setRoomStatus(roomNo, status) {
    var overrides = DB.get('roomStatus') || [];
    var idx = -1;
    for (var i = 0; i < overrides.length; i++) {
        if (overrides[i].roomNo === roomNo) { idx = i; break; }
    }
    if (status === 'available' || status === 'occupied') {
        if (idx > -1) overrides.splice(idx, 1);
    } else {
        var data = { roomNo: roomNo, status: status, updatedAt: new Date().toISOString() };
        if (idx > -1) { for (var k in data) { overrides[idx][k] = data[k]; } }
        else { overrides.push(data); }
    }
    DB.set('roomStatus', overrides);
    renderRoomView();
    APP.notify('Room status updated', 'success');
}

function showSetMaintenance(roomNo) {
    showModal('<div class="modal-header"><h3>🔴 Set Maintenance — Room ' + roomNo + '</h3><button class="modal-close" onclick="this.closest(\'.modal\').remove()">&times;</button></div><div style="padding:16px;"><div class="form-group"><label>Maintenance Reason *</label><textarea id="maintReason" class="form-control" rows="3" placeholder="Describe the maintenance issue..."></textarea></div><button class="btn btn-danger btn-lg" style="width:100%;margin-top:8px;" onclick="confirmSetMaintenance(\'' + roomNo + '\')">🔴 Confirm Maintenance</button></div>');
}

function confirmSetMaintenance(roomNo) {
    var reason = document.getElementById('maintReason') ? document.getElementById('maintReason').value.trim() : '';
    if (!reason) { APP.notify('Please enter maintenance reason', 'error'); return; }
    var overrides = DB.get('roomStatus') || [];
    var idx = -1;
    for (var i = 0; i < overrides.length; i++) {
        if (overrides[i].roomNo === roomNo) { idx = i; break; }
    }
    var data = { roomNo: roomNo, status: 'maintenance', maintenanceReason: reason, updatedAt: new Date().toISOString() };
    if (idx > -1) { for (var k in data) { overrides[idx][k] = data[k]; } }
    else { overrides.push(data); }
    DB.set('roomStatus', overrides);
    renderRoomView();
    APP.notify('Room marked for maintenance', 'warning');
    var modals = document.querySelectorAll('.modal.active');
    if (modals.length > 0) modals[modals.length - 1].remove();
}

function showAdmForm() {
    var rooms = getRooms();
    var roomOpts = '';
    for (var i = 0; i < rooms.length; i++) {
        var rm = rooms[i];
        var occupied = getOccupiedBeds(rm.roomNo);
        var totalBeds = rm.beds || ['A'];
        var avail = totalBeds.length - occupied.length;
        var statusLabel = avail > 0 ? avail + '/' + totalBeds.length + ' free' : 'Full';
        roomOpts += '<option value="' + rm.roomNo + '" data-beds="' + rm.beds.join(',') + '">' + rm.roomNo + ' - ' + rm.category + ' (' + statusLabel + ')</option>';
    }
    if (!roomOpts) roomOpts = '<option value="">No rooms configured</option>';

    var form = '<form id="admForm"><div class="grid-2"><div class="form-group"><label>Patient Name *</label><input type="text" name="patientName" class="form-control" required></div><div class="form-group"><label>Patient ID / Aadhar</label><input type="text" name="patientId" class="form-control"></div><div class="form-group"><label>Age *</label><input type="number" name="age" class="form-control" required></div><div class="form-group"><label>Gender *</label><select name="gender" class="form-control" required><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div><div class="form-group"><label>Contact Phone *</label><input type="text" name="phone" class="form-control" required></div><div class="form-group"><label>Emergency Contact</label><input type="text" name="emergencyContact" class="form-control"></div><div class="form-group"><label>Room *</label><select name="roomNo" id="admRoomSelect" class="form-control" onchange="updateAdmBedOptions()" required>' + roomOpts + '</select></div><div class="form-group"><label>Bed *</label><select name="bedId" id="admBedSelect" class="form-control" required></select></div><div class="form-group"><label>Doctor Name *</label><input type="text" name="doctorName" class="form-control" required></div><div class="form-group"><label>Admission Type *</label><select name="type" class="form-control" required><option value="regular">Regular</option><option value="emergency">Emergency</option><option value="icu">ICU</option></select></div><div class="form-group"><label>Admission Date *</label><input type="date" name="admissionDate" class="form-control" value="' + new Date().toISOString().split('T')[0] + '" required></div></div><div class="form-group"><label>Diagnosis / Reason</label><textarea name="diagnosis" class="form-control" rows="2"></textarea></div><div class="form-group"><label>Notes</label><textarea name="notes" class="form-control" rows="2"></textarea></div></form>';
    openFormModal('New Admission', form, 'saveAdm()');
    setTimeout(function() { updateAdmBedOptions(); }, 50);
}

function updateAdmBedOptions() {
    var roomSelect = document.getElementById('admRoomSelect');
    var bedSelect = document.getElementById('admBedSelect');
    if (!roomSelect || !bedSelect) return;
    var selectedOption = roomSelect.options[roomSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) { bedSelect.innerHTML = '<option value="">Select room first</option>'; return; }
    var beds = (selectedOption.getAttribute('data-beds') || 'A').split(',');
    var roomNo = selectedOption.value;
    var adms = DB.get('admissions') || [];
    var occupied = [];
    for (var i = 0; i < adms.length; i++) {
        if (adms[i].roomNo === roomNo && adms[i].status === 'admitted') {
            occupied.push(adms[i].bedId || 'A');
        }
    }
    var html = '';
    for (var b = 0; b < beds.length; b++) {
        var bed = beds[b].trim();
        if (!bed) continue;
        var taken = false;
        for (var oc = 0; oc < occupied.length; oc++) {
            if (occupied[oc] === bed) { taken = true; break; }
        }
        html += '<option value="' + bed + '" ' + (taken ? 'disabled' : '') + '>' + bed + (taken ? ' (Occupied)' : ' (Available)') + '</option>';
    }
    bedSelect.innerHTML = html || '<option value="">No beds available</option>';
}

function saveAdm() {
    var data = getFormData('admForm');
    if (!data.patientName || !data.age || !data.phone || !data.roomNo || !data.doctorName || !data.bedId) {
        APP.notify('Please fill all required fields', 'error'); return;
    }
    var adms = DB.get('admissions');
    for (var i = 0; i < adms.length; i++) {
        if (adms[i].roomNo === data.roomNo && adms[i].bedId === data.bedId && adms[i].status === 'admitted') {
            APP.notify('Bed ' + data.bedId + ' in Room ' + data.roomNo + ' is already occupied', 'error'); return;
        }
    }
    data.status = 'admitted';
    data.dischargeDate = '';
    data.dischargeSummary = '';
    data.billAmount = '';
    data.paymentStatus = 'pending';
    DB.add('admissions', data);
    var overrides = DB.get('roomStatus') || [];
    DB.set('roomStatus', overrides.filter(function(r) { return r.roomNo !== data.roomNo; }));
    APP.notify('Patient admitted to Room ' + data.roomNo + ' (Bed ' + data.bedId + ')', 'success');
    renderAdmContent();
}

function viewAdm(id) {
    var a = DB.getById('admissions', id);
    if (!a) return;
    var stayDays = a.status === 'admitted' ? APP.daysBetween(a.admissionDate, new Date().toISOString()) : (a.dischargeDate ? APP.daysBetween(a.admissionDate, a.dischargeDate) : 0);
    var bedLabel = a.bedId ? ' (Bed ' + a.bedId + ')' : '';
    showModal('<div class="modal-header"><h3>' + a.patientName + ' - ' + (a.patientId || '#' + a.id.slice(-6)) + '</h3><button class="modal-close" onclick="this.closest(\'.modal\').remove()">&times;</button></div><div class="grid-2"><div><strong>Age/Gender:</strong> ' + a.age + '/' + a.gender + '</div><div><strong>Phone:</strong> ' + a.phone + '</div><div><strong>Room:</strong> ' + a.roomNo + bedLabel + '</div><div><strong>Department:</strong> ' + (a.department || '-') + '</div><div><strong>Doctor:</strong> ' + a.doctorName + '</div><div><strong>Type:</strong> <span class="badge ' + (a.type === 'emergency' ? 'badge-danger' : a.type === 'icu' ? 'badge-warning' : 'badge-info') + '">' + a.type.toUpperCase() + '</span></div><div><strong>Admitted:</strong> ' + APP.formatDate(a.admissionDate) + '</div><div><strong>Stay:</strong> ' + stayDays + ' days</div><div><strong>Status:</strong> <span class="badge ' + APP.getStatusBadge(a.status) + '">' + a.status.toUpperCase() + '</span></div>' + (a.emergencyContact ? '<div><strong>Emergency Contact:</strong> ' + a.emergencyContact + '</div>' : '') + (a.billAmount ? '<div><strong>Bill:</strong> ₹' + a.billAmount + '</div>' : '') + (a.paymentStatus ? '<div><strong>Payment:</strong> <span class="badge ' + (a.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning') + '">' + a.paymentStatus + '</span></div>' : '') + '</div>' + (a.diagnosis ? '<div class="mt-4"><strong>Diagnosis:</strong><br>' + a.diagnosis + '</div>' : '') + (a.notes ? '<div class="mt-2"><strong>Notes:</strong><br>' + a.notes + '</div>' : '') + (a.dischargeSummary ? '<div class="mt-2"><strong>Discharge Summary:</strong><br>' + a.dischargeSummary + '</div>' : '') + (a.dischargeDate ? '<div class="mt-2"><strong>Discharged:</strong> ' + APP.formatDateTime(a.dischargeDate) + '</div>' : ''));
}

function showDischargeForm(id) {
    var a = DB.getById('admissions', id);
    if (!a) return;
    var stayDays = APP.daysBetween(a.admissionDate, new Date().toISOString());
    var bedLabel = a.bedId ? ' (Bed ' + a.bedId + ')' : '';
    var form = '<form id="dischargeForm"><input type="hidden" name="id" value="' + id + '"><div class="alert alert-info">Discharging <strong>' + a.patientName + '</strong> from Room ' + a.roomNo + bedLabel + ' | Stay: ' + stayDays + ' days</div><div class="grid-2"><div class="form-group"><label>Discharge Date *</label><input type="date" name="dischargeDate" class="form-control" value="' + new Date().toISOString().split('T')[0] + '" required></div><div class="form-group"><label>Bill Amount (₹)</label><input type="number" name="billAmount" class="form-control" value="' + (stayDays * 1000) + '"></div><div class="form-group"><label>Payment Status</label><select name="paymentStatus" class="form-control"><option value="paid">Paid</option><option value="pending">Pending</option><option value="partial">Partial</option></select></div></div><div class="form-group"><label>Discharge Summary *</label><textarea name="dischargeSummary" class="form-control" rows="3" required></textarea></div></form>';
    openFormModal('Discharge Patient', form, 'saveDischarge()');
}

function saveDischarge() {
    var data = getFormData('dischargeForm');
    if (!data.dischargeDate || !data.dischargeSummary) {
        APP.notify('Please fill required fields', 'error'); return;
    }
    var adm = DB.getById('admissions', data.id);
    DB.update('admissions', data.id, { status: 'discharged', dischargeDate: data.dischargeDate, dischargeSummary: data.dischargeSummary, billAmount: data.billAmount, paymentStatus: data.paymentStatus });
    if (adm) {
        var overrides = DB.get('roomStatus') || [];
        var roomData = { roomNo: adm.roomNo, status: 'cleaning', updatedAt: new Date().toISOString() };
        var idx = -1;
        for (var i = 0; i < overrides.length; i++) {
            if (overrides[i].roomNo === adm.roomNo) { idx = i; break; }
        }
        if (idx > -1) overrides[idx] = roomData;
        else overrides.push(roomData);
        DB.set('roomStatus', overrides);
    }
    APP.notify('Patient discharged. Bed freed.', 'success');
    renderAdmContent();
    closeModal();
}

function deleteAdm(id) {
    var adm = DB.getById('admissions', id);
    confirmAction('Delete this admission record?', function() {
        if (adm && adm.status === 'admitted') {
            var overrides = DB.get('roomStatus') || [];
            var roomData = { roomNo: adm.roomNo, status: 'cleaning', updatedAt: new Date().toISOString() };
            var idx = -1;
            for (var i = 0; i < overrides.length; i++) {
                if (overrides[i].roomNo === adm.roomNo) { idx = i; break; }
            }
            if (idx > -1) overrides[idx] = roomData;
            else overrides.push(roomData);
            DB.set('roomStatus', overrides);
        }
        DB.delete('admissions', id);
        renderAdmContent();
    });
}
