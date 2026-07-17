const REPORT_CATEGORIES = [
    { id: 'users', label: 'Users' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'checklists', label: 'Checklists' },
    { id: 'complaints', label: 'Complaints' },
    { id: 'admissions', label: 'Admissions' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'gate-security', label: 'Gate Security' },
    { id: 'ambulance', label: 'Ambulance Vehicles' },
    { id: 'ambulance_trips', label: 'Ambulance Trips' },
    { id: 'problems', label: 'Problems & Solutions' },
    { id: 'projects', label: 'Projects' },
    { id: 'material_requests', label: 'Material Requests' },
    { id: 'suggestions', label: 'Suggestions' },
    { id: 'lostfound', label: 'Lost & Found' },
    { id: 'phase2_materials', label: 'Phase 2 Infra - Materials' },
    { id: 'phase2_tasks', label: 'Phase 2 Infra - Tasks' },
    { id: 'work_reports', label: 'Work Progress / Reports' }
];

const REPORT_COLLECTIONS = {
    users: 'users',
    tasks: 'tasks',
    checklists: 'checklists',
    complaints: 'complaints',
    admissions: 'admissions',
    inventory: 'inventory',
    'gate-security': 'gatesecurity',
    ambulance: 'ambulance',
    ambulance_trips: 'ambulance_trips',
    problems: 'problems',
    projects: 'projects',
    material_requests: 'material_requests',
    suggestions: 'suggestions',
    lostfound: 'lostfound',
    phase2_materials: 'phase2',
    phase2_tasks: 'phase2Tasks',
    work_reports: 'reports'
};

function renderReports(container) {
    const user = AUTH.currentUser();
    const isAdmin = user.role === 'admin' || user.isSuperAdmin;
    if (!isAdmin) {
        container.innerHTML = '<div class="empty-state">Access restricted to admin only</div>';
        return;
    }
    container.innerHTML = `
        <div class="flex-between mb-4">
            <h2 style="font-size:18px;font-weight:700;">📊 Reports</h2>
        </div>
        <div class="card">
            <div class="card-header"><h3>Filter Options</h3></div>
            <div class="grid-3">
                <div class="form-group">
                    <label>Report Type</label>
                    <select id="rptType" class="form-control" onchange="updateReportFilters()">
                        <option value="overall">Common (Overall)</option>
                        <option value="department">Department-wise</option>
                        <option value="individual">Individual (Employee-wise)</option>
                        <option value="category">Category-wise</option>
                    </select>
                </div>
                <div class="form-group" id="rptDeptGroup" style="display:none;">
                    <label>Department</label>
                    <select id="rptDept" class="form-control">
                        <option value="">All Departments</option>
                        ${(DB.get('departments') || []).map(d => '<option value="' + d.name + '">' + d.name + '</option>').join('')}
                    </select>
                </div>
                <div class="form-group" id="rptEmpGroup" style="display:none;">
                    <label>Employee</label>
                    <select id="rptEmp" class="form-control">
                        <option value="">All Employees</option>
                        ${(DB.get('users') || []).filter(u => !u.isSuperAdmin).map(u => '<option value="' + u.fullName + '">' + u.fullName + ' (' + (u.role || '').replace('_',' ') + ')</option>').join('')}
                    </select>
                </div>
                <div class="form-group" id="rptCatGroup" style="display:none;">
                    <label>Category</label>
                    <select id="rptCategory" class="form-control">
                        ${REPORT_CATEGORIES.map(c => '<option value="' + c.id + '">' + c.label + '</option>').join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>From Date</label>
                    <input type="date" id="rptFrom" class="form-control">
                </div>
                <div class="form-group">
                    <label>To Date</label>
                    <input type="date" id="rptTo" class="form-control">
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;">
                <button class="btn btn-primary" onclick="generateReport()">Generate Report</button>
                <button class="btn btn-success" onclick="exportExcel()" id="rptExportBtn" disabled>Export Excel</button>
                <button class="btn btn-info" onclick="printReport()" id="rptPrintBtn" disabled>Print PDF</button>
            </div>
        </div>
        <div id="rptResult"></div>
    `;
}

let _lastReportData = null;
let _lastReportTitle = '';

function updateReportFilters() {
    const type = document.getElementById('rptType').value;
    document.getElementById('rptDeptGroup').style.display = type === 'department' || type === 'individual' ? 'block' : 'none';
    document.getElementById('rptEmpGroup').style.display = type === 'individual' ? 'block' : 'none';
    document.getElementById('rptCatGroup').style.display = type === 'category' ? 'block' : 'none';
}

function getFilteredData() {
    const type = document.getElementById('rptType').value;
    const dept = document.getElementById('rptDept')?.value || '';
    const emp = document.getElementById('rptEmp')?.value || '';
    const cat = document.getElementById('rptCategory')?.value || '';
    const from = document.getElementById('rptFrom').value;
    const to = document.getElementById('rptTo').value;

    const users = DB.get('users') || [];
    const employees = users.filter(u => !u.isSuperAdmin);

    const result = { type, dept, emp, cat, from, to, sections: [], users, employees };
    return result;
}

function generateReport() {
    const ctx = getFilteredData();
    const container = document.getElementById('rptResult');
    if (!container) return;

    if (ctx.type === 'overall') {
        ctx.sections = buildOverallReport(ctx);
    } else if (ctx.type === 'department') {
        ctx.sections = buildDeptReport(ctx);
    } else if (ctx.type === 'individual') {
        ctx.sections = buildIndividualReport(ctx);
    } else if (ctx.type === 'category') {
        ctx.sections = buildCategoryReport(ctx);
    }

    _lastReportData = ctx;
    _lastReportTitle = 'HMS Report - ' + ctx.type.charAt(0).toUpperCase() + ctx.type.slice(1);

    renderReportResult(container, ctx);
    document.getElementById('rptExportBtn').disabled = false;
    document.getElementById('rptPrintBtn').disabled = false;
}

function dateFilter(item, from, to) {
    if (!from && !to) return true;
    const d = new Date(item.createdAt || item.admissionDate || item.date || '');
    if (isNaN(d.getTime())) return true;
    if (from && d < new Date(from)) return false;
    if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
    }
    return true;
}

/* ─── KPI Helpers ─── */

function buildOverallKPISection(ctx) {
    const { from, to } = ctx;
    const admissions = (DB.get('admissions') || []).filter(i => dateFilter(i, from, to));
    const tasks = (DB.get('tasks') || []).filter(i => dateFilter(i, from, to));
    const complaints = (DB.get('complaints') || []).filter(i => dateFilter(i, from, to));
    const problems = (DB.get('problems') || []).filter(i => dateFilter(i, from, to));
    const inventory = DB.get('inventory') || [];
    const gate = (DB.get('gatesecurity') || []).filter(i => dateFilter(i, from, to));
    const ambulance = DB.get('ambulance') || [];
    const projects = DB.get('projects') || [];
    const trips = (DB.get('ambulance_trips') || []).filter(i => dateFilter(i, from, to));
    const users = DB.get('users') || [];
    const employees = users.filter(u => !u.isSuperAdmin);
    const checklists = (DB.get('checklists') || []).filter(i => dateFilter(i, from, to));

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const taskRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
    const resolvedComplaints = complaints.filter(c => c.status === 'resolved').length;
    const compRate = complaints.length > 0 ? Math.round((resolvedComplaints / complaints.length) * 100) : 0;
    const resolvedProblems = problems.filter(p => p.status === 'resolved').length;
    const probRate = problems.length > 0 ? Math.round((resolvedProblems / problems.length) * 100) : 0;
    const activeAdmissions = admissions.filter(a => a.status === 'admitted').length;
    const discharged = admissions.filter(a => a.status === 'discharged').length;
    const avgStay = discharged > 0 ? Math.round(admissions.filter(a => a.status === 'discharged' && a.dischargeDate)
        .reduce((sum, a) => sum + APP.daysBetween(a.admissionDate, a.dischargeDate), 0) / discharged) : 0;
    const lowStock = inventory.filter(i => parseInt(i.quantity) < 10).length;
    const totalBudget = projects.reduce((s, p) => s + (parseFloat(p.budget) || 0), 0);
    const totalSpent = projects.reduce((s, p) => s + (parseFloat(p.spent) || 0), 0);
    const budgetUtil = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const totalFare = trips.reduce((s, t) => s + (parseFloat(t.fare) || 0), 0);
    const totalKm = trips.reduce((s, t) => s + (parseFloat(t.kilometers) || 0), 0);
    const clDone = checklists.filter(c => c.status === 'completed').length;
    const clRate = checklists.length > 0 ? Math.round((clDone / checklists.length) * 100) : 0;

    const rows = [
        ['Total Users', users.length, ''],
        ['Employees', employees.length, ''],
        ['Total Departments', (DB.get('departments') || []).length, ''],
        ['Task Completion Rate', taskRate + '%', completedTasks + '/' + tasks.length + ' completed'],
        ['Complaint Resolution Rate', compRate + '%', resolvedComplaints + '/' + complaints.length + ' resolved'],
        ['Problem Resolution Rate', probRate + '%', resolvedProblems + '/' + problems.length + ' resolved'],
        ['Checklist Completion Rate', clRate + '%', clDone + '/' + checklists.length + ' completed'],
        ['Active Admissions', activeAdmissions, ''],
        ['Discharged Patients', discharged, ''],
        ['Avg Stay (days)', avgStay, ''],
        ['Low Stock Items', lowStock, '(< 10 qty)'],
        ['Budget Utilization', budgetUtil + '%', '₹' + totalSpent + ' / ₹' + totalBudget],
        ['Total Ambulance Trips', trips.length, totalKm + ' km'],
        ['Total Fare Collected', '₹' + totalFare, ''],
        ['Gate Entries', gate.length, gate.filter(g => g.status === 'approved').length + ' approved'],
        ['Ambulances On Duty', ambulance.filter(a => a.status === 'on-duty').length, '/' + ambulance.length + ' total']
    ].filter(r => r[1] !== 0);

    return {
        title: 'Key Performance Indicators',
        cols: ['Metric', 'Value', 'Details'],
        rows
    };
}

function buildEmpKPISection(empName, ctx) {
    const { from, to } = ctx;
    const tasks = (DB.get('tasks') || []).filter(i => dateFilter(i, from, to) && i.assignedTo === empName);
    const checklists = (DB.get('checklists') || []).filter(i => dateFilter(i, from, to) && i.assignedTo === empName);
    const complaints = (DB.get('complaints') || []).filter(i => dateFilter(i, from, to) && (i.patientName === empName || i.resolvedBy === empName));
    const problems = (DB.get('problems') || []).filter(i => dateFilter(i, from, to) && i.createdBy === empName);
    const requests = (DB.get('material_requests') || []).filter(i => dateFilter(i, from, to) && i.requestedBy === empName);
    const suggestions = (DB.get('suggestions') || []).filter(i => dateFilter(i, from, to) && i.createdBy === empName);

    const done = t => t.status === 'completed' || t.status === 'resolved';
    const tDone = tasks.filter(done).length;
    const tRate = tasks.length > 0 ? Math.round((tDone / tasks.length) * 100) : 0;
    const clDone = checklists.filter(done).length;
    const clRate = checklists.length > 0 ? Math.round((clDone / checklists.length) * 100) : 0;
    const cDone = complaints.filter(done).length;
    const cRate = complaints.length > 0 ? Math.round((cDone / complaints.length) * 100) : 0;
    const pDone = problems.filter(done).length;
    const pRate = problems.length > 0 ? Math.round((pDone / problems.length) * 100) : 0;
    const rApproved = requests.filter(r => r.status === 'approved').length;
    const rRate = requests.length > 0 ? Math.round((rApproved / requests.length) * 100) : 0;

    const rows = [
        ['Tasks', tDone + '/' + tasks.length, tRate + '%'],
        ['Checklists', clDone + '/' + checklists.length, clRate + '%'],
        ['Complaints', cDone + '/' + complaints.length, cRate + '%'],
        ['Problems Solved', pDone + '/' + problems.length, pRate + '%'],
        ['Material Requests Approved', rApproved + '/' + requests.length, rRate + '%'],
        ['Suggestions', suggestions.length, '']
    ].filter(r => parseInt(r[1].split('/')[1] || r[1]) > 0);

    return rows.length > 0 ? {
        title: empName + ' — KPIs',
        cols: ['Category', 'Done/Total', 'Rate'],
        rows
    } : null;
}

/* ─── Overall Report ─── */

function buildOverallReport(ctx) {
    const { from, to } = ctx;
    const sections = [];

    const kpiSection = buildOverallKPISection(ctx);
    if (kpiSection) sections.push(kpiSection);

    REPORT_CATEGORIES.forEach(cat => {
        const items = (DB.get(REPORT_COLLECTIONS[cat.id]) || []).filter(i => dateFilter(i, from, to));
        if (items.length === 0) return;
        sections.push({
            title: cat.label,
            total: items.length,
            items: items.slice(0, 50),
            cols: getColumns(cat.id),
            rows: getRows(cat.id, items)
        });
    });

    return sections;
}

/* ─── Department Report ─── */

function buildDeptReport(ctx) {
    const { from, to, dept } = ctx;
    const depts = dept ? [{ name: dept }] : (DB.get('departments') || []).filter(d => d.active !== false);
    const sections = [];

    depts.forEach(d => {
        const deptName = d.name;
        const deptUsers = (DB.get('users') || []).filter(u => u.department === deptName);
        const empNames = deptUsers.map(u => u.fullName);
        let totalItems = 0;
        const detail = [];

        REPORT_CATEGORIES.forEach(cat => {
            let items = (DB.get(REPORT_COLLECTIONS[cat.id]) || []).filter(i => dateFilter(i, from, to));
            if (cat.id === 'users') {
                items = items.filter(u => u.department === deptName);
            } else if (['tasks', 'checklists', 'material_requests'].includes(cat.id)) {
                items = items.filter(i => i.department === deptName || empNames.includes(i.assignedTo));
            } else if (['complaints', 'admissions', 'gate-security', 'problems', 'suggestions'].includes(cat.id)) {
                items = items.filter(i => i.department === deptName || i.category === deptName || i.roomNo?.startsWith(deptName));
            } else if (cat.id === 'inventory') {
                items = items.filter(i => i.department === deptName);
            }
            if (items.length > 0) {
                totalItems += items.length;
                detail.push({ category: cat.label, count: items.length });
            }
        });

        if (detail.length > 0) {
            sections.push({
                title: deptName,
                total: totalItems,
                detail,
                deptUsers: deptUsers.length
            });
        }
    });

    return sections;
}

/* ─── Individual Report ─── */

function buildIndividualReport(ctx) {
    const { from, to, dept, emp } = ctx;
    let employees = ctx.employees;
    if (dept) employees = employees.filter(u => u.department === dept);
    if (emp) employees = employees.filter(u => u.fullName === emp);
    const sections = [];

    employees.forEach(e => {
        const empName = e.fullName;
        let totalItems = 0;
        const detail = [];

        const kpiSec = buildEmpKPISection(empName, ctx);
        if (kpiSec) {
            sections.push({
                title: empName + ' (' + (e.role || '').replace('_', ' ') + ')',
                type: 'individual',
                kpiSection: kpiSec
            });
        }
    });

    return sections;
}

/* ─── Category Report ─── */

function buildCategoryReport(ctx) {
    const { from, to, cat } = ctx;
    const sections = [];

    const cats = cat ? REPORT_CATEGORIES.filter(c => c.id === cat) : REPORT_CATEGORIES;
    cats.forEach(catItem => {
        const items = (DB.get(REPORT_COLLECTIONS[catItem.id]) || []).filter(i => dateFilter(i, from, to));
        if (items.length === 0 && cat) {
            sections.push({ title: catItem.label, total: 0, items: [], cols: [], rows: [], empty: true });
            return;
        }
        if (items.length === 0) return;
        sections.push({
            title: catItem.label,
            total: items.length,
            items: items.slice(0, 100),
            cols: getColumns(catItem.id),
            rows: getRows(catItem.id, items)
        });
    });

    return sections;
}

/* ─── Column/Rows helpers ─── */

function getColumns(catId) {
    const all = {
        users: ['Full Name', 'Username', 'Role', 'Department', 'Email', 'Phone'],
        tasks: ['Title', 'Assigned To', 'Department', 'Status', 'Deadline', 'Created'],
        checklists: ['Title', 'Assigned To', 'Floor', 'Items', 'Done', 'Status', 'Deadline'],
        complaints: ['Patient', 'Category', 'Room', 'Status', 'Created', 'Resolved By'],
        admissions: ['Patient', 'Type', 'Room', 'Doctor', 'Status', 'Admitted', 'Discharged'],
        inventory: ['Item', 'Category', 'Qty', 'Price', 'Department', 'Expiry'],
        'gate-security': ['Item', 'Vendor', 'Direction', 'Qty', 'Status', 'Date'],
        ambulance_trips: ['Patient', 'Vehicle', 'From', 'To', 'KM', 'Fare', 'Date'],
        problems: ['Title', 'Area', 'Status', 'Priority', 'Created', 'Resolved'],
        projects: ['Title', 'Department', 'Budget', 'Status', 'Start', 'Deadline'],
        material_requests: ['Title', 'Requested By', 'Department', 'Status', 'Urgency', 'Created'],
        suggestions: ['Title', 'Created By', 'Department', 'Status', 'Created'],
        lostfound: ['Item', 'Category', 'Status', 'Location', 'Date', 'Reported By'],
        ambulance: ['Vehicle No', 'Driver', 'Status', 'Speed', 'Last Updated'],
        phase2_materials: ['Material', 'Direction', 'Quantity', 'Unit', 'Vehicle', 'Supplier', 'Date'],
        phase2_tasks: ['Title', 'Assigned To', 'Status', 'Progress', 'Start', 'Deadline'],
        work_reports: ['Title', 'Category', 'Created By', 'Sent To', 'Status', 'Date']
    };
    return all[catId] || ['Name', 'Status', 'Date'];
}

function getStatusCounts(items) {
    const st = {};
    items.forEach(i => { const s = i.status || 'N/A'; st[s] = (st[s] || 0) + 1; });
    return st;
}

function getRows(catId, items) {
    const f = v => v || '-';
    const d = v => v ? APP.formatDate(v.createdAt || v.admissionDate || v.date || v) : '-';
    const all = {
        users: items.map(i => [f(i.fullName), f(i.username), f(i.role), f(i.department), f(i.email), f(i.phone)]),
        tasks: items.map(i => [f(i.title), f(i.assignedTo), f(i.department), f(i.status), f(i.deadline ? APP.formatDate(i.deadline) : '-'), d(i)]),
        checklists: items.map(i => [f(i.title), f(i.assignedTo), f(i.floor), (i.items || []).length, (i.items || []).filter(x => x.status && x.status !== 'pending').length, f(i.status), f(i.deadline ? APP.formatDate(i.deadline) : '-')]),
        complaints: items.map(i => [f(i.patientName), f(i.category), f(i.roomNo), f(i.status), d(i), f(i.resolvedBy)]),
        admissions: items.map(i => [f(i.patientName), f(i.type), f(i.roomNo || i.roomNumber), f(i.doctor), f(i.status), f(i.admissionDate ? APP.formatDate(i.admissionDate) : '-'), f(i.dischargeDate ? APP.formatDate(i.dischargeDate) : '-')]),
        inventory: items.map(i => [f(i.name || i.itemName), f(i.category), f(i.quantity), f(i.price), f(i.department), f(i.expiryDate ? APP.formatDate(i.expiryDate) : '-')]),
        'gate-security': items.map(i => [f(i.itemName), f(i.vendor), f(i.direction), f(i.quantity), f(i.status), d(i)]),
        ambulance_trips: items.map(i => [f(i.patientName), f(i.vehicleNo), f(i.fromLocation || i.from), f(i.toLocation || i.to), f(i.kilometers), f(i.fare), d(i)]),
        problems: items.map(i => [f(i.title), f(i.area), f(i.status), f(i.priority), d(i), f(i.resolvedAt ? APP.formatDate(i.resolvedAt) : '-')]),
        projects: items.map(i => [f(i.title), f(i.department), f(i.budget), f(i.status), f(i.startDate ? APP.formatDate(i.startDate) : '-'), f(i.deadline ? APP.formatDate(i.deadline) : '-')]),
        material_requests: items.map(i => [f(i.title), f(i.requestedBy), f(i.department), f(i.status), f(i.urgency), d(i)]),
        suggestions: items.map(i => [f(i.title), f(i.createdBy), f(i.department), f(i.status), d(i)]),
        lostfound: items.map(i => [f(i.itemName || i.name), f(i.category), f(i.status), f(i.location), d(i), f(i.reportedBy)]),
        ambulance: items.map(i => [f(i.vehicleNo), f(i.driverName || i.driver || '-'), f(i.status || '-'), f(i.speed || '0'), f(i.lastUpdated ? APP.formatDateTime(i.lastUpdated) : '-')]),
        phase2_materials: items.map(i => [f(i.materialName || i.name), f(i.direction || '-'), f(i.quantity || '0'), f(i.unit || '-'), f(i.vehicleNo || '-'), f(i.supplier || '-'), d(i)]),
        phase2_tasks: items.map(i => [f(i.title), f(i.assignedTo || '-'), f(i.status || '-'), (i.progress || '0') + '%', f(i.startDate ? APP.formatDate(i.startDate) : '-'), f(i.deadline ? APP.formatDate(i.deadline) : '-')]),
        work_reports: items.map(i => [f(i.title), f(i.category || '-'), f(i.createdByName || i.createdBy || '-'), f(i.sentTo || '-'), f(i.status || '-'), d(i)])
    };
    return all[catId] || items.map(i => [f(i.title || i.name || i.fullName || i.patientName || i.itemName), f(i.status), d(i)]);
}

/* ─── Chart Helpers ─── */

const RPT_COLORS = ['#1a73e8','#34a853','#fbbc04','#ea4335','#4285f4','#7b1fa2','#00bcd4','#e91e63','#ff5722','#607d8b'];

function chartConfig(type, labels, data, label, isPct) {
    const isBar = type === 'bar';
    return {
        type,
        data: { labels, datasets: [{ label, data, backgroundColor: isBar ? RPT_COLORS.slice(0,labels.length) : RPT_COLORS, borderColor: '#fff', borderWidth: 1 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: !isBar, position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } },
            scales: isBar ? { y: { beginAtZero: true, max: isPct ? 100 : undefined, grid: { color: '#eee' } }, x: { grid: { display: false } } } : {}
        }
    };
}

function renderChart(canvasId, type, labels, data, label, isPct) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    try {
        return new Chart(el.getContext('2d'), chartConfig(type, labels, data, label, isPct));
    } catch (e) { return null; }
}

function destroyCharts(arr) {
    (arr || []).forEach(c => { try { c.destroy(); } catch(e) {} });
}

/* ─── Render Results ─── */

function renderReportResult(container, ctx) {
    const { sections, type } = ctx;
    if (sections.length === 0) {
        container.innerHTML = '<div class="empty-state" style="margin-top:16px;">No data found for the selected filters</div>';
        return;
    }

    if (type === 'department') {
        renderDeptResult(container, ctx);
    } else if (type === 'individual') {
        renderIndivResult(container, ctx);
    } else {
        renderTableResult(container, ctx);
    }
}

let _reportCharts = [];

function renderTableResult(container, ctx) {
    destroyCharts(_reportCharts);
    _reportCharts = [];
    const { sections } = ctx;
    let html = '';
    sections.forEach((sec, si) => {
        if (sec.empty) {
            html += '<div class="card" style="margin-top:16px;"><div class="card-header"><h3>' + sec.title + '</h3></div><div class="empty-state">No data</div></div>';
            return;
        }
        html += '<div class="card" style="margin-top:16px;">';
        html += '<div class="card-header"><h3>' + sec.title + ' <span style="font-size:13px;color:var(--gray);font-weight:400;">(' + (sec.total || sec.rows.length) + ' records)</span></h3></div>';
        html += '<div class="table-responsive" style="max-height:300px;overflow-y:auto;">';
        html += '<table><thead><tr>' + sec.cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead>';
        html += '<tbody>' + sec.rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>';
        html += '</table></div>';
        if (si === 0 && sec.title === 'Key Performance Indicators') {
            const labels = [], data = [];
            sec.rows.forEach(r => { const m = r[1].toString().match(/(\d+)%/); if (m) { labels.push(r[0].replace(' Rate','')); data.push(parseInt(m[1])); } });
            if (data.length) {
                html += '<div style="margin-top:12px;height:220px;"><canvas id="rptKpiChart"></canvas></div>';
            }
            const catData = sections.filter((s,i) => i > 0).map(s => s.total || s.rows.length).filter(v => v > 0);
            const catLabels = sections.filter((s,i) => i > 0).map(s => s.title).filter((_,i) => catData[i]);
            if (catData.length) {
                html += '<div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:16px;">';
                html += '<div style="height:200px;"><canvas id="rptPieChart"></canvas></div>';
                html += '<div style="height:200px;"><canvas id="rptDoughnutChart"></canvas></div>';
                html += '</div>';
            }
        } else if (si > 0 && sec.rows.length >= 3) {
            const stData = {};
            sec.rows.forEach(r => { const s = r[3] || r[1] || ''; stData[s] = (stData[s] || 0) + 1; });
            const keys = Object.keys(stData);
            if (keys.length >= 2 && keys.length <= 10) {
                html += '<div style="margin-top:12px;height:180px;"><canvas id="rptCatChart_' + si + '"></canvas></div>';
            }
        }
        html += '</div>';
    });
    container.innerHTML = html;
    setTimeout(() => {
        const labels = [], data = [];
        const kpiSec = sections[0];
        if (kpiSec && kpiSec.title === 'Key Performance Indicators') {
            kpiSec.rows.forEach(r => { const m = r[1].toString().match(/(\d+)%/); if (m) { labels.push(r[0].replace(' Rate','')); data.push(parseInt(m[1])); } });
            if (data.length) {
                const c1 = renderChart('rptKpiChart','bar',labels,data,'Rate %',true);
                if (c1) _reportCharts.push(c1);
            }
            const catData = sections.filter((s,i) => i > 0).map(s => s.total || s.rows.length).filter(v => v > 0);
            const catLabels = sections.filter((s,i) => i > 0).map(s => s.title).filter((_,i) => catData[i]);
            if (catData.length) {
                const c2 = renderChart('rptPieChart','pie',catLabels,catData,'Records');
                if (c2) _reportCharts.push(c2);
                const c3 = renderChart('rptDoughnutChart','doughnut',catLabels,catData,'Records');
                if (c3) _reportCharts.push(c3);
            }
        }
        sections.forEach((sec, si) => {
            if (si > 0 && sec.rows.length >= 3) {
                const stData = {};
                sec.rows.forEach(r => { const s = r[3] || r[1] || ''; stData[s] = (stData[s] || 0) + 1; });
                const keys = Object.keys(stData);
                if (keys.length >= 2 && keys.length <= 10) {
                    const c = renderChart('rptCatChart_' + si,'doughnut',keys,keys.map(k => stData[k]),'Status');
                    if (c) _reportCharts.push(c);
                }
            }
        });
    }, 100);
}

function renderDeptResult(container, ctx) {
    destroyCharts(_reportCharts);
    _reportCharts = [];
    const { sections } = ctx;
    let html = '<div class="card" style="margin-top:16px;"><div class="card-header"><h3>Department-wise Summary</h3></div>';
    html += '<div class="table-responsive"><table><thead><tr><th>Department</th><th>Employees</th><th>Total Records</th><th>Breakdown</th></tr></thead><tbody>';
    let grandTotal = 0;
    sections.forEach(sec => {
        grandTotal += sec.total;
        html += '<tr><td><strong>' + sec.title + '</strong></td><td>' + (sec.deptUsers || 0) + '</td><td>' + sec.total + '</td><td style="font-size:12px;">' + sec.detail.map(d => d.category + ': ' + d.count).join(' | ') + '</td></tr>';
    });
    html += '<tr style="background:var(--bg);font-weight:600;"><td>Total</td><td></td><td>' + grandTotal + '</td><td></td></tr>';
    html += '</tbody></table></div>';
    if (sections.length >= 2) {
        html += '<div style="margin-top:16px;height:250px;"><canvas id="rptDeptChart"></canvas></div>';
    }
    html += '</div>';
    container.innerHTML = html;
    if (sections.length >= 2) {
        setTimeout(() => {
            const c = renderChart('rptDeptChart','bar',sections.map(s => s.title),sections.map(s => s.total),'Total Records',false);
            if (c) _reportCharts.push(c);
        }, 100);
    }
}

function renderIndivResult(container, ctx) {
    destroyCharts(_reportCharts);
    _reportCharts = [];
    const { sections } = ctx;
    let html = '';
    sections.forEach((sec, si) => {
        html += '<div class="card" style="margin-top:16px;">';
        html += '<div class="card-header"><h3>' + sec.title + '</h3></div>';
        if (sec.kpiSection) {
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">';
            html += '<div class="table-responsive"><table><thead><tr>' + sec.kpiSection.cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead>';
            html += '<tbody>' + sec.kpiSection.rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>';
            html += '</table></div>';
            const hasPct = sec.kpiSection.rows.some(r => r[2] && r[2].toString().includes('%'));
            if (hasPct) {
                html += '<div style="height:200px;"><canvas id="rptEmpChart_' + si + '"></canvas></div>';
            }
            html += '</div>';
        }
        html += '</div>';
    });
    if (!html) html = '<div class="empty-state" style="margin-top:16px;">No data found for the selected filters</div>';
    container.innerHTML = html;
    setTimeout(() => {
        sections.forEach((sec, si) => {
            if (sec.kpiSection) {
                const labels = [], data = [];
                sec.kpiSection.rows.forEach(r => {
                    const m = r[2] && r[2].toString().match(/(\d+)%/);
                    if (m) { labels.push(r[0]); data.push(parseInt(m[1])); }
                });
                if (data.length) {
                    const c = renderChart('rptEmpChart_' + si,'bar',labels,data,'Rate %',true);
                    if (c) _reportCharts.push(c);
                }
            }
        });
    }, 100);
}

/* ─── Export Excel (multi-sheet XML) ─── */

function escXml(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') v = String(v);
    return String(v)
        .replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD]/g, '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toCell(v) {
    return '<Cell><Data ss:Type="String">' + escXml(v) + '</Data></Cell>';
}

function buildSheetXml(name, cols, rows) {
    name = String(name).replace(/[\[\]*?\/\\:]/g, '').substring(0, 31);
    let xml = '<Worksheet ss:Name="' + escXml(name) + '"><Table>\n';
    if (cols && cols.length) {
        xml += '<Row>' + cols.map(toCell).join('') + '</Row>\n';
    }
    rows.forEach(function(r) {
        if (!r || !r.length) return;
        xml += '<Row>';
        for (var i = 0; i < r.length; i++) {
            xml += toCell(r[i]);
        }
        xml += '</Row>\n';
    });
    xml += '</Table></Worksheet>\n';
    return xml;
}

function excelSheet(name, cols, rows) {
    return buildSheetXml(name, cols, rows);
}

function exportExcel() {
    try {
        if (!_lastReportData) { APP.notify('Generate a report first', 'error'); return; }
        const { sections, type, from, to } = _lastReportData;
        const users = DB.get('users') || [];
        const employees = users.filter(u => !u.isSuperAdmin);
        let sheets = '';
        let sheetCount = 0;

        function addSheet(name, cols, rows) {
            try {
                if (!rows || !rows.length) return;
                const safe = rows.filter(r => r && r.length);
                if (!safe.length) return;
                sheets += excelSheet(name, cols || [], safe);
                sheetCount++;
            } catch (e) { console.warn('Sheet skip [' + name + ']:', e); }
        }

        // ─── Dashboard / KPIs ───
        try {
            const kpiData = buildOverallKPISection({ from, to });
            if (kpiData && kpiData.rows && kpiData.rows.length) {
                addSheet('Dashboard KPIs', kpiData.cols, kpiData.rows);
            }
        } catch (e) { console.warn('KPI sheet error:', e); }

        // ─── Employee Summary ───
        try {
            const empRows = [];
            employees.forEach(e => {
                try {
                    const sec = buildEmpKPISection(e.fullName, { from, to });
                    if (sec && sec.rows) {
                        sec.rows.forEach(r => empRows.push([e.fullName || '', e.department || '', r[0] || '', r[1] || '', r[2] || '']));
                    }
                } catch (ee) {}
            });
            addSheet('Employee Summary', ['Employee','Department','Category','Done/Total','Rate'], empRows);
        } catch (e) { console.warn('Emp summary error:', e); }

        // ─── Admissions & Discharges (split) ───
        try {
            const allAdmissions = (DB.get('admissions') || []).filter(i => dateFilter(i, from, to));
            if (allAdmissions.length) {
                const f = v => v || '-';
                const admRows = allAdmissions.filter(a => a.status === 'admitted').map(a => [f(a.patientName), f(a.type), f(a.roomNo || a.roomNumber), f(a.doctor), f(APP.formatDate(a.admissionDate || a.createdAt)), f(a.status)]);
                addSheet('Admissions', ['Patient','Type','Room','Doctor','Admitted','Status'], admRows);
                const dcRows = allAdmissions.filter(a => a.status === 'discharged').map(a => [f(a.patientName), f(a.type), f(a.roomNo || a.roomNumber), f(a.doctor), f(APP.formatDate(a.admissionDate || a.createdAt)), f(APP.formatDate(a.dischargeDate))]);
                addSheet('Discharges', ['Patient','Type','Room','Doctor','Admitted','Discharged'], dcRows);
            }
        } catch (e) { console.warn('Admission sheet error:', e); }

        // ─── Per-category sheets ───
        REPORT_CATEGORIES.forEach(cat => {
            try {
                if (cat.id === 'admissions') return;
                const collectionKey = REPORT_COLLECTIONS[cat.id];
                const items = (DB.get(collectionKey) || []).filter(i => dateFilter(i, from, to));
                if (!items.length) return;
                const cols = getColumns(cat.id);
                let rows = getRows(cat.id, items);
                const stCount = {};
                items.forEach(i => { const s = i.status || 'N/A'; stCount[s] = (stCount[s] || 0) + 1; });
                if (Object.keys(stCount).length > 1) {
                    rows.push(Array(cols.length).fill(''));
                    rows.push(['--- Status Summary ---']);
                    Object.keys(stCount).forEach(k => {
                        const row = Array(cols.length).fill('');
                        row[0] = k; row[1] = String(stCount[k]);
                        rows.push(row);
                    });
                }
                addSheet(cat.label || cat.id, cols, rows);
            } catch (e) { console.warn('Sheet ' + cat.id + ' error:', e); }
        });

        // ─── Report type specific sheets ───
        try {
            if (type === 'department') {
                const deptData = (DB.get('departments') || []).filter(d => d.active !== false);
                deptData.forEach(d => {
                    try {
                        const dRows = users.filter(u => u.department === d.name).map(u => {
                            const sec = buildEmpKPISection(u.fullName, { from, to });
                            if (!sec || !sec.rows || !sec.rows.length) return null;
                            return [u.fullName || '', u.role || '', sec.rows.map(r => r[2]).join(' | ')];
                        }).filter(Boolean);
                        addSheet(d.name + ' Dept', ['Employee','Role','KPIs'], dRows);
                    } catch (ee) {}
                });
            } else if (type === 'individual') {
                employees.forEach(e => {
                    try {
                        const sec = buildEmpKPISection(e.fullName, { from, to });
                        if (sec && sec.rows && sec.rows.length) {
                            addSheet(e.fullName.replace(/[\/\\*?]/g,' ').substring(0,31), sec.cols, sec.rows);
                        }
                    } catch (ee) {}
                });
            }
        } catch (e) { console.warn('Type-specific sheets error:', e); }

        if (!sheetCount) { APP.notify('No data to export', 'error'); return; }

        var xml = '<?xml version="1.0" encoding="UTF-8"?>\r\n' +
            '<?mso-application progid="Excel.Sheet"?>\r\n' +
            '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\r\n' +
            ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\r\n' +
            ' <DocumentProperties><Title>' + escXml(_lastReportTitle) + '</Title></DocumentProperties>\r\n' +
            sheets +
            '</Workbook>';

        var bom = '\uFEFF';
        var blob = new Blob([bom + xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = _lastReportTitle.replace(/\s+/g, '_') + '.xls';
        document.body.appendChild(link);
        link.click();
        setTimeout(function() {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        APP.notify('Excel downloaded with ' + sheetCount + ' sheets', 'success');
    } catch (e) {
        console.error('Export error:', e);
        APP.notify('Export failed: ' + e.message, 'error');
    }
}

/* ─── Print PDF ─── */

function printReport() {
    if (!_lastReportData) return;
    const { sections, type } = _lastReportData;

    let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + _lastReportTitle + '</title>';
    html += '<style>';
    html += '*{box-sizing:border-box;}';
    html += 'body{font-family:"Segoe UI",Arial,sans-serif;margin:30px;color:#222;}';
    html += 'h1{font-size:24px;margin-bottom:2px;color:#1a73e8;}';
    html += '.sub{font-size:12px;color:#888;margin-bottom:24px;border-bottom:2px solid #1a73e8;padding-bottom:8px;}';
    html += 'h2{font-size:16px;margin:20px 0 8px;color:#333;border-left:4px solid #1a73e8;padding-left:10px;}';
    html += 'table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:11px;}';
    html += 'th{background:#1a73e8;color:#fff;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;}';
    html += 'td{border:1px solid #ddd;padding:6px 10px;}';
    html += 'tr:nth-child(even){background:#f8f9fa;}';
    html += 'tr:hover{background:#e8f0fe;}';
    html += '.footer{text-align:center;font-size:10px;color:#aaa;margin-top:30px;border-top:1px solid #eee;padding-top:10px;}';
    html += '@media print{body{margin:15mm;}h2{page-break-after:avoid;}table{page-break-inside:auto;}tr{page-break-inside:avoid;page-break-after:auto;}th{background:#1a73e8!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}';
    html += '</style></head><body>';
    html += '<h1>' + _lastReportTitle + '</h1>';
    html += '<div class="sub">Generated: ' + new Date().toLocaleString() + ' | ' + sections.length + ' sections</div>';

    sections.forEach(sec => {
        if (sec.empty) {
            html += '<h2>' + sec.title + ' — No data</h2>';
            return;
        }
        html += '<h2>' + sec.title + '</h2>';
        if (type === 'department') {
            html += '<table><thead><tr><th>Category</th><th>Count</th><th>Done</th></tr></thead><tbody>';
            sec.detail.forEach(d => {
                html += '<tr><td>' + d.category + '</td><td>' + (d.count || 0) + '</td><td>' + (d.done || 0) + '</td></tr>';
            });
            html += '</tbody></table>';
        } else if (type === 'individual' && sec.kpiSection) {
            html += '<table><thead><tr>' + sec.kpiSection.cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
            sec.kpiSection.rows.forEach(r => {
                html += '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>';
            });
            html += '</tbody></table>';
        } else {
            html += '<table><thead><tr>' + sec.cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
            sec.rows.forEach(r => {
                html += '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>';
            });
            html += '</tbody></table>';
        }
    });

    html += '<div class="footer">HMS Report — Confidential</div>';
    html += '</body></html>';

    const w = window.open('_blank');
    if (!w) {
        APP.notify('Please allow popups for print preview', 'error');
        return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
}
