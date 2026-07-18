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
    { id: 'work_reports', label: 'Work Progress / Reports' },
    { id: 'team_tasks', label: 'Team Tasks' },
    { id: 'departments', label: 'Departments' },
    { id: 'room_checklists', label: 'Room Checklists' },
    { id: 'admin_checklists', label: 'Admin Checklists' },
    { id: 'admin_audits', label: 'Admin Audits' }
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
    work_reports: 'reports',
    team_tasks: 'team_tasks',
    departments: 'departments',
    room_checklists: 'roomchecklists',
    admin_checklists: 'adminChecklist',
    admin_audits: 'adminAudits'
};

function renderReports(container) {
    const user = AUTH.currentUser();
    const isAdmin = user.role === 'admin' || user.isSuperAdmin;
    if (!isAdmin) {
        container.innerHTML = '<div class="empty-state">Access restricted to admin only</div>';
        return;
    }
    var now = new Date();
    var firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    var today = now.toISOString().split('T')[0];
    container.innerHTML = `
        <div class="flex-between mb-4">
            <h2 style="font-size:18px;font-weight:700;">📊 Reports</h2>
            <div>
                <button class="btn btn-success" onclick="exportExcel()" id="rptExportBtn" disabled>⬇ Excel</button>
                <button class="btn btn-info" onclick="printReport()" id="rptPrintBtn" disabled>🖨 PDF</button>
                <button class="btn btn-success" onclick="shareReportViaWhatsApp()" id="rptWhatsAppBtn" disabled style="background:#25D366;">📱 WhatsApp</button>
                <button class="btn btn-primary" onclick="shareReportViaEmail()" id="rptEmailBtn" disabled>✉ Email</button>
            </div>
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
                    <input type="date" id="rptFrom" class="form-control" value="` + firstDay + `">
                </div>
                <div class="form-group">
                    <label>To Date</label>
                    <input type="date" id="rptTo" class="form-control" value="` + today + `">
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;">
                <button class="btn btn-primary" onclick="generateReport()">Generate Report</button>
            </div>
        </div>
        <div id="rptResult"></div>
    `;
    setTimeout(generateReport, 200);
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
    if (!ctx.from) ctx.from = document.getElementById('rptFrom') ? document.getElementById('rptFrom').value : '';
    if (!ctx.to) ctx.to = document.getElementById('rptTo') ? document.getElementById('rptTo').value : '';

    renderReportResult(container, ctx);
    ['rptExportBtn','rptPrintBtn','rptWhatsAppBtn','rptEmailBtn'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.disabled = false;
    });
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

    var rows = [
        ['Tasks', tDone + '/' + tasks.length, tRate + '%'],
        ['Checklists', clDone + '/' + checklists.length, clRate + '%'],
        ['Complaints', cDone + '/' + complaints.length, cRate + '%'],
        ['Problems Solved', pDone + '/' + problems.length, pRate + '%'],
        ['Material Requests Approved', rApproved + '/' + requests.length, rRate + '%'],
        ['Suggestions', suggestions.length, '']
    ];

    return {
        title: empName + ' — KPIs',
        cols: ['Category', 'Done/Total', 'Rate'],
        rows: rows
    };
}

/* ─── Budget Section Helper ─── */

function buildBudgetSection() {
    try {
        var cfg = DB.get('budgetConfig');
        if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return null;
        var tb = parseFloat(cfg.totalBudget) || 0;
        if (!tb) return null;
        var me = 0, mc = 0, af = 0, ps = 0;
        (DB.get('inventory_receipts') || []).forEach(function(r) { me += parseFloat(r.total) || 0; });
        (DB.get('problems') || []).forEach(function(p) { mc += parseFloat(p.maintenanceCost || p.cost || 0) || 0; });
        (DB.get('ambulance_trips') || []).forEach(function(t) { af += parseFloat(t.fare) || 0; });
        (DB.get('projects') || []).forEach(function(p) { ps += parseFloat(p.spent) || 0; });
        var te = me + mc + af + ps;
        return {
            title: 'Budget Overview',
            total: 1,
            cols: ['Metric', 'Amount (₹)'],
            rows: [
                ['Total Budget', '₹' + tb.toLocaleString()],
                ['Material Purchase', '₹' + me.toLocaleString()],
                ['Maintenance Cost', '₹' + mc.toLocaleString()],
                ['Ambulance Fare', '₹' + af.toLocaleString()],
                ['Project Spent', '₹' + ps.toLocaleString()],
                ['Total Expense', '₹' + te.toLocaleString()],
                ['Remaining', '₹' + Math.max(0, tb - te).toLocaleString()],
                ['Utilization', (tb > 0 ? Math.round((te / tb) * 100) : 0) + '%']
            ]
        };
    } catch (e) { return null; }
}

/* ─── Employee Summary Helper ─── */

function buildEmployeeSummarySection(ctx) {
    try {
        var users = (DB.get('users') || []).filter(function(u) { return !u.isSuperAdmin; });
        var rows = [];
        users.forEach(function(u) {
            var kpi = buildEmpKPISection(u.fullName, ctx);
            if (!kpi || !kpi.rows || !kpi.rows.length) return;
            var rates = [];
            kpi.rows.forEach(function(r) {
                if (r[2] && r[2].toString().includes('%')) rates.push(r[0] + ': ' + r[2]);
            });
            rows.push([u.fullName, u.department || '-', rates.join(' | ') || '-']);
        });
        if (!rows.length) return null;
        return {
            title: 'Employee Summary',
            total: rows.length,
            cols: ['Employee', 'Department', 'KPI Rates'],
            rows: rows
        };
    } catch (e) { return null; }
}

/* ─── Overall Report ─── */

function buildOverallReport(ctx) {
    const { from, to } = ctx;
    const sections = [];

    const kpiSection = buildOverallKPISection(ctx);
    if (kpiSection) sections.push(kpiSection);

    var bdgSec = buildBudgetSection();
    if (bdgSec) sections.push(bdgSec);

    var empSec = buildEmployeeSummarySection(ctx);
    if (empSec) sections.push(empSec);

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

    var bdgSec = buildBudgetSection();
    if (bdgSec) sections.push(bdgSec);

    var empSec = buildEmployeeSummarySection(ctx);
    if (empSec) sections.push(empSec);

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

    var bdgSec = buildBudgetSection();
    if (bdgSec) sections.push(bdgSec);

    var empSec = buildEmployeeSummarySection(ctx);
    if (empSec) sections.push(empSec);

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
        work_reports: ['Title', 'Category', 'Created By', 'Sent To', 'Status', 'Date'],
        team_tasks: ['Title', 'Team', 'Assigned To', 'Priority', 'Progress', 'Status', 'Deadline'],
        departments: ['Name', 'Active', 'Employees', 'Head', 'Description'],
        room_checklists: ['Room No', 'Floor', 'Status', 'Assigned To', 'Date'],
        admin_checklists: ['Text', 'Status', 'Created By', 'Date'],
        admin_audits: ['Title', 'Area', 'Assigned To', 'Status', 'Deadline', 'Date']
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
        work_reports: items.map(i => [f(i.title), f(i.category || '-'), f(i.createdByName || i.createdBy || '-'), f(i.sentTo || '-'), f(i.status || '-'), d(i)]),
        team_tasks: items.map(i => [f(i.title), f(i.teamName || '-'), f(i.assignedToName || '-'), f(i.priority || 'normal'), (i.progress || 0) + '%', f(i.status), f(i.deadline ? APP.formatDate(i.deadline) : '-')]),
        departments: items.map(function(i) { var deptUsers = (DB.get('users') || []).filter(function(u) { return u.department === i.name; }); return [f(i.name), f(i.active !== false ? 'Active' : 'Inactive'), deptUsers.length, f(i.head || '-'), f(i.description || '-')]; }),
        room_checklists: items.map(i => [f(i.roomNo || i.roomNumber), f(i.floor || '-'), f(i.status || 'pending'), f(i.assignedTo || '-'), d(i)]),
        admin_checklists: items.map(i => [f(i.text || i.title), f(i.done ? 'Completed' : 'Pending'), f(i.createdBy || '-'), d(i)]),
        admin_audits: items.map(i => [f(i.title), f(i.area || '-'), f(i.assignedTo || '-'), f(i.status || 'pending'), f(i.deadline ? APP.formatDate(i.deadline) : '-'), d(i)])
    };
    return all[catId] || items.map(i => [f(i.title || i.name || i.fullName || i.patientName || i.itemName), f(i.status), d(i)]);
}

/* ─── Chart Helpers ─── */

const RPT_COLORS = ['#1a73e8','#34a853','#fbbc04','#ea4335','#4285f4','#7b1fa2','#00bcd4','#e91e63','#ff5722','#607d8b'];

function rptPctPlugin(pctArr) {
    return {
        id: 'rptPctLabel',
        afterDraw: function(chart) {
            var ctx = chart.ctx;
            chart.data.datasets.forEach(function(ds, i) {
                var meta = chart.getDatasetMeta(i);
                meta.data.forEach(function(el, j) {
                    var pct = pctArr && pctArr[j];
                    if (!pct || pct < 3) return;
                    var pos = el.tooltipPosition();
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(pct + '%', pos.x, pos.y);
                });
            });
        }
    };
}

function chartConfig(type, labels, data, label, isPct, pcts) {
    const isBar = type === 'bar';
    var cfg = {
        type,
        data: { labels, datasets: [{ label, data, backgroundColor: isBar ? RPT_COLORS.slice(0,labels.length) : RPT_COLORS, borderColor: '#fff', borderWidth: 1 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: !isBar, position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: function(ti) {
                            var raw = ti.raw;
                            var total = ti.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                            var pct = total > 0 ? Math.round((raw / total) * 100) : 0;
                            return ti.label + ': ' + raw + ' (' + pct + '%)';
                        }
                    }
                }
            },
            scales: isBar ? { y: { beginAtZero: true, max: isPct ? 100 : undefined, grid: { color: '#eee' }, ticks: { font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 9 } } } } : {}
        }
    };
    if (!isBar && pcts && pcts.length) {
        if (!cfg.plugins) cfg.plugins = {};
        cfg.plugins.legend.labels.generateLabels = function(chart) {
            var orig = Chart.defaults.plugins.legend.labels.generateLabels(chart);
            orig.forEach(function(o, i) {
                o.text = o.text + ' (' + pcts[i] + '%)';
            });
            return orig;
        };
    }
    return cfg;
}

function renderChart(canvasId, type, labels, data, label, isPct, pcts) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    try {
        return new Chart(el.getContext('2d'), chartConfig(type, labels, data, label, isPct, pcts));
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
        var isKpi = sec.title === 'Key Performance Indicators' || sec.title === 'Budget Overview' || sec.title === 'Employee Summary';
        html += '<div class="card" style="margin-top:16px;">';
        html += '<div class="card-header"><h3>' + sec.title + ' <span style="font-size:13px;color:var(--gray);font-weight:400;">(' + (sec.total || sec.rows.length) + ' records)</span></h3></div>';
        html += '<div class="table-responsive" style="max-height:' + (isKpi ? 'none' : '300px') + ';overflow-y:auto;">';
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
                html += '<div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">';
                html += '<div style="height:200px;"><canvas id="rptPieChart"></canvas></div>';
                html += '<div style="height:200px;"><canvas id="rptDoughnutChart"></canvas></div>';
                html += '<div style="height:200px;"><canvas id="rptCatBarChart"></canvas></div>';
                html += '</div>';
            }
        } else if (si > 0 && sec.rows.length >= 3 && !isKpi) {
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
                var total = catData.reduce(function(a, b) { return a + b; }, 0);
                var catPcts = catData.map(function(d) { return total > 0 ? Math.round(d / total * 100) : 0; });
                var c2 = renderChart('rptPieChart','pie',catLabels,catData,'Records',false,catPcts);
                if (c2) _reportCharts.push(c2);
                var c3 = renderChart('rptDoughnutChart','doughnut',catLabels,catData,'Records',false,catPcts);
                if (c3) _reportCharts.push(c3);
                (function(cd, cl) {
                    var el = document.getElementById('rptCatBarChart');
                    if (el) {
                        try {
                            var bc = new Chart(el.getContext('2d'), {
                                type: 'bar',
                                data: { labels: cl, datasets: [{ label: 'Records', data: cd, backgroundColor: RPT_COLORS.slice(0, cl.length), borderColor: '#fff', borderWidth: 1 }] },
                                options: {
                                    responsive: true, maintainAspectRatio: false,
                                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ti) { return ti.label + ': ' + ti.raw; } } } },
                                    scales: { y: { beginAtZero: true, grid: { color: '#eee' }, ticks: { font: { size: 9 } } }, x: { grid: { display: false }, ticks: { font: { size: 8 }, maxRotation: 45 } } }
                                }
                            });
                            _reportCharts.push(bc);
                        } catch(e) {}
                    }
                })(catData, catLabels);
            }
        }
        sections.forEach((sec, si) => {
            if (si > 0 && sec.rows.length >= 3 && sec.title !== 'Budget Overview' && sec.title !== 'Employee Summary') {
                const stData = {};
                sec.rows.forEach(r => { const s = r[3] || r[1] || ''; stData[s] = (stData[s] || 0) + 1; });
                const keys = Object.keys(stData);
                if (keys.length >= 2 && keys.length <= 10) {
                    var total = keys.reduce(function(a, k) { return a + stData[k]; }, 0);
                    var pcts = keys.map(function(k) { return total > 0 ? Math.round(stData[k] / total * 100) : 0; });
                    var c = renderChart('rptCatChart_' + si,'doughnut',keys,keys.map(k => stData[k]),'Status',false,pcts);
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
    var deptSections = sections.filter(function(s) { return s.detail; });
    var otherSections = sections.filter(function(s) { return !s.detail; });
    var html = '';
    otherSections.forEach(function(sec) {
        if (!sec.cols || !sec.rows) return;
        html += '<div class="card" style="margin-top:16px;"><div class="card-header"><h3>' + sec.title + '</h3></div>';
        html += '<div class="table-responsive"><table><thead><tr>' + sec.cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead>';
        html += '<tbody>' + sec.rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div></div>';
    });
    html += '<div class="card" style="margin-top:16px;"><div class="card-header"><h3>Department-wise Summary</h3></div>';
    var deptLabels = deptSections.map(function(s) { return s.title; });
    var deptData = deptSections.map(function(s) { return s.total; });
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:12px;">';
    html += '<div style="height:220px;"><canvas id="rptDeptPieChart"></canvas></div>';
    html += '<div style="height:220px;"><canvas id="rptDeptChart"></canvas></div>';
    html += '</div>';
    html += '<div class="table-responsive"><table><thead><tr><th>Department</th><th>Employees</th><th>Total Records</th><th>% Share</th><th>Progress</th><th>Breakdown</th></tr></thead><tbody>';
    var grandTotal = 0;
    deptSections.forEach(function(sec) {
        grandTotal += sec.total;
    });
    deptSections.forEach(function(sec) {
        var pct = grandTotal > 0 ? Math.round(sec.total / grandTotal * 100) : 0;
        var pctColor = pct > 30 ? 'red' : (pct > 15 ? 'yellow' : 'green');
        html += '<tr><td><strong>' + sec.title + '</strong></td><td>' + (sec.deptUsers || 0) + '</td><td>' + sec.total + '</td><td>' + pct + '%</td><td><div class="progress-bar" style="width:80px;display:inline-block;"><div class="progress-fill ' + pctColor + '" style="width:' + pct + '%;"></div></div></td><td style="font-size:12px;">' + (sec.detail || []).map(function(d) { return d.category + ': ' + d.count; }).join(' | ') + '</td></tr>';
    });
    html += '<tr style="background:var(--bg);font-weight:600;"><td>Total</td><td></td><td>' + grandTotal + '</td><td>100%</td><td></td><td></td></tr>';
    html += '</tbody></table></div></div>';
    container.innerHTML = html;
    setTimeout(function() {
        if (deptSections.length >= 2) {
            var total = deptData.reduce(function(a, b) { return a + b; }, 0);
            var pcts = deptData.map(function(d) { return total > 0 ? Math.round(d / total * 100) : 0; });
            var c1 = renderChart('rptDeptChart','bar',deptLabels,deptData,'Total Records',false);
            if (c1) _reportCharts.push(c1);
            (function(lbls, dta) {
                var el = document.getElementById('rptDeptPieChart');
                if (el) {
                    try {
                        var total2 = dta.reduce(function(a, b) { return a + b; }, 0);
                        var pcts2 = dta.map(function(d) { return total2 > 0 ? Math.round(d / total2 * 100) : 0; });
                        var pie = new Chart(el.getContext('2d'), {
                            type: 'doughnut',
                            data: { labels: lbls, datasets: [{ data: dta, backgroundColor: RPT_COLORS.slice(0, lbls.length), borderColor: '#fff', borderWidth: 1 }] },
                            options: {
                                responsive: true, maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 6, font: { size: 10 }, generateLabels: function(chart) { var orig = Chart.defaults.plugins.legend.labels.generateLabels(chart); orig.forEach(function(o, i) { o.text = o.text + ' (' + pcts2[i] + '%)'; }); return orig; } } },
                                    tooltip: { callbacks: { label: function(ti) { var raw = ti.raw; var t = ti.dataset.data.reduce(function(a, b) { return a + b; }, 0); var p = t > 0 ? Math.round(raw / t * 100) : 0; return ti.label + ': ' + raw + ' (' + p + '%)'; } } }
                                }
                            }
                        });
                        _reportCharts.push(pie);
                    } catch(e) {}
                }
            })(deptLabels, deptData);
        }
    }, 100);
}

function renderIndivResult(container, ctx) {
    destroyCharts(_reportCharts);
    _reportCharts = [];
    const { sections } = ctx;
    let html = '';
    var empSummaryHtml = '';
    var empChartsHtml = '';
    sections.forEach((sec, si) => {
        if (sec.kpiSection) {
            var empName = sec.title;
            var labels = [], data = [];
            sec.kpiSection.rows.forEach(function(r) {
                var m = r[2] && r[2].toString().match(/(\d+)%/);
                if (m) { labels.push(r[0]); data.push(parseInt(m[1])); }
            });
            var pctData = data;
            empSummaryHtml += '<tr><td><strong>' + empName + '</strong></td>' +
                sec.kpiSection.rows.map(function(r) { return '<td>' + r[2] + '</td>'; }).join('') +
            '</tr>';
            if (data.length) {
                empChartsHtml += '<div class="card" style="margin-top:12px;">';
                empChartsHtml += '<div class="card-header"><h3>' + empName + ' Performance</h3></div>';
                empChartsHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:12px;">';
                empChartsHtml += '<div style="height:200px;"><canvas id="rptEmpChart_' + si + '"></canvas></div>';
                empChartsHtml += '<div style="height:200px;"><canvas id="rptEmpPie_' + si + '"></canvas></div>';
                empChartsHtml += '</div></div>';
            }
        }
    });
    if (empSummaryHtml) {
        var empKpiCols = ['Employee'];
        if (sections.length && sections[0].kpiSection) {
            sections[0].kpiSection.rows.forEach(function(r) { empKpiCols.push(r[0]); });
        }
        html += '<div class="card" style="margin-top:16px;"><div class="card-header"><h3>Employee Performance Summary</h3></div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:12px;">';
        html += '<div><div class="table-responsive"><table><thead><tr>' + empKpiCols.map(function(c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + empSummaryHtml + '</tbody></table></div></div>';
        html += '<div style="height:220px;"><canvas id="rptPerfDistChart"></canvas></div>';
        html += '</div></div>';
        html += empChartsHtml;
    }
    if (!html) html = '<div class="empty-state" style="margin-top:16px;">No data found for the selected filters</div>';
    container.innerHTML = html;
    setTimeout(() => {
        var perfData = { 'High (80%+)': 0, 'Medium (40-79%)': 0, 'Low (<40%)': 0 };
        sections.forEach(function(sec) {
            if (sec.kpiSection) {
                sec.kpiSection.rows.forEach(function(r) {
                    var m = r[2] && r[2].toString().match(/(\d+)%/);
                    if (m) {
                        var v = parseInt(m[1]);
                        if (v >= 80) perfData['High (80%+)']++;
                        else if (v >= 40) perfData['Medium (40-79%)']++;
                        else perfData['Low (<40%)']++;
                    }
                });
            }
        });
        var perfKeys = Object.keys(perfData).filter(function(k) { return perfData[k] > 0; });
        if (perfKeys.length >= 2) {
            var total = perfKeys.reduce(function(a, k) { return a + perfData[k]; }, 0);
            var pcts = perfKeys.map(function(k) { return total > 0 ? Math.round(perfData[k] / total * 100) : 0; });
            (function(keys, vals) {
                var el = document.getElementById('rptPerfDistChart');
                if (el) {
                    try {
                        var pie = new Chart(el.getContext('2d'), {
                            type: 'doughnut',
                            data: { labels: keys, datasets: [{ data: vals, backgroundColor: ['#34a853', '#fbbc04', '#ea4335'], borderColor: '#fff', borderWidth: 1 }] },
                            options: {
                                responsive: true, maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 6, font: { size: 10 } } },
                                    tooltip: { callbacks: { label: function(ti) { return ti.label + ': ' + ti.raw; } } }
                                }
                            }
                        });
                        _reportCharts.push(pie);
                    } catch(e) {}
                }
            })(perfKeys, perfKeys.map(function(k) { return perfData[k]; }));
        }
        sections.forEach((sec, si) => {
            if (sec.kpiSection) {
                var labels = [], data = [];
                sec.kpiSection.rows.forEach(function(r) {
                    var m = r[2] && r[2].toString().match(/(\d+)%/);
                    if (m) { labels.push(r[0]); data.push(parseInt(m[1])); }
                });
                if (data.length) {
                    var c = renderChart('rptEmpChart_' + si,'bar',labels,data,'Rate %',true);
                    if (c) _reportCharts.push(c);
                    (function(l, d, idx) {
                        var el = document.getElementById('rptEmpPie_' + idx);
                        if (el) {
                            try {
                                var total2 = d.reduce(function(a, b) { return a + b; }, 0);
                                var pcts2 = d.map(function(v) { return total2 > 0 ? Math.round(v / total2 * 100) : 0; });
                                var pie = new Chart(el.getContext('2d'), {
                                    type: 'doughnut',
                                    data: { labels: l, datasets: [{ data: d, backgroundColor: RPT_COLORS.slice(0, l.length), borderColor: '#fff', borderWidth: 1 }] },
                                    options: {
                                        responsive: true, maintainAspectRatio: false,
                                        plugins: {
                                            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 6, font: { size: 10 }, generateLabels: function(chart) { var orig = Chart.defaults.plugins.legend.labels.generateLabels(chart); orig.forEach(function(o, i) { o.text = o.text + ' (' + pcts2[i] + '%)'; }); return orig; } } },
                                            tooltip: { callbacks: { label: function(ti) { var raw = ti.raw; var t = ti.dataset.data.reduce(function(a, b) { return a + b; }, 0); var p = t > 0 ? Math.round(raw / t * 100) : 0; return ti.label + ': ' + raw + ' (' + p + '%)'; } } }
                                        }
                                    }
                                });
                                _reportCharts.push(pie);
                            } catch(e) {}
                        }
                    })(labels, data, si);
                }
            }
        });
    }, 100);
}

/* ─── Export Excel (SheetJS multi-sheet) ─── */

function exportExcel() {
    try {
        console.log('exportExcel called');
        if (!_lastReportData) { APP.notify('Generate a report first', 'error'); return; }
        if (typeof XLSX === 'undefined' || !XLSX || !XLSX.utils) {
            console.error('XLSX not available');
            APP.notify('Excel library not loaded. Refresh the page.', 'error');
            return;
        }

        const { sections, type, from, to } = _lastReportData;
        const users = DB.get('users') || [];
        const employees = users.filter(u => !u.isSuperAdmin);
        var wb = XLSX.utils.book_new();
        var sheetCount = 0;

        function addSheet(name, cols, rows) {
            try {
                if (!rows || !rows.length) return;
                var safe = rows.filter(function(r) { return r && r.length; });
                if (!safe.length) return;
                name = String(name).replace(/[\[\]*?\/\\:]/g, '').substring(0, 31);
                var data = cols && cols.length ? [cols].concat(safe) : safe;
                var ws = XLSX.utils.aoa_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, name);
                sheetCount++;
            } catch (e) { console.warn('Sheet skip [' + name + ']:', e); }
        }

        // ─── Dashboard / KPIs ───
        try {
            var kpiData = buildOverallKPISection({ from: from, to: to });
            if (kpiData && kpiData.rows && kpiData.rows.length) {
                addSheet('Dashboard KPIs', kpiData.cols, kpiData.rows);
            }
        } catch (e) { console.warn('KPI sheet error:', e); }

        // ─── Employee Summary ───
        try {
            var empRows = [];
            employees.forEach(function(e) {
                try {
                    var sec = buildEmpKPISection(e.fullName, { from: from, to: to });
                    if (sec && sec.rows) {
                        sec.rows.forEach(function(r) { empRows.push([e.fullName || '', e.department || '', r[0] || '', r[1] || '', r[2] || '']); });
                    }
                } catch (ee) {}
            });
            addSheet('Employee Summary', ['Employee','Department','Category','Done/Total','Rate'], empRows);
        } catch (e) { console.warn('Emp summary error:', e); }

        // ─── Admissions & Discharges ───
        try {
            var allAdmissions = (DB.get('admissions') || []).filter(function(i) { return dateFilter(i, from, to); });
            if (allAdmissions.length) {
                var f = function(v) { return v || '-'; };
                var admRows = allAdmissions.filter(function(a) { return a.status === 'admitted'; }).map(function(a) { return [f(a.patientName), f(a.type), f(a.roomNo || a.roomNumber), f(a.doctor), f(APP.formatDate(a.admissionDate || a.createdAt)), f(a.status)]; });
                addSheet('Admissions', ['Patient','Type','Room','Doctor','Admitted','Status'], admRows);
                var dcRows = allAdmissions.filter(function(a) { return a.status === 'discharged'; }).map(function(a) { return [f(a.patientName), f(a.type), f(a.roomNo || a.roomNumber), f(a.doctor), f(APP.formatDate(a.admissionDate || a.createdAt)), f(APP.formatDate(a.dischargeDate))]; });
                addSheet('Discharges', ['Patient','Type','Room','Doctor','Admitted','Discharged'], dcRows);
            }
        } catch (e) { console.warn('Admission sheet error:', e); }

        // ─── Per-category sheets ───
        REPORT_CATEGORIES.forEach(function(cat) {
            try {
                if (cat.id === 'admissions') return;
                var collectionKey = REPORT_COLLECTIONS[cat.id];
                var items = (DB.get(collectionKey) || []).filter(function(i) { return dateFilter(i, from, to); });
                if (!items.length) return;
                var cols = getColumns(cat.id);
                var rows = getRows(cat.id, items);
                var stCount = {};
                items.forEach(function(i) { var s = i.status || 'N/A'; stCount[s] = (stCount[s] || 0) + 1; });
                if (Object.keys(stCount).length > 1) {
                    var empty = [];
                    for (var ei = 0; ei < cols.length; ei++) empty.push('');
                    rows.push(empty);
                    var hdr = ['--- Status Summary ---'];
                    rows.push(hdr);
                    Object.keys(stCount).forEach(function(k) {
                        var row = [];
                        for (var ri = 0; ri < cols.length; ri++) row.push('');
                        row[0] = k; row[1] = String(stCount[k]);
                        rows.push(row);
                    });
                }
                addSheet(cat.label || cat.id, cols, rows);
            } catch (e) { console.warn('Sheet ' + cat.id + ' error:', e); }
        });

        // ─── Budget Overview sheet ───
        try {
            var budgetConfig = DB.get('budgetConfig') || {};
            if (budgetConfig.totalBudget > 0) {
                var totalBudget = parseFloat(budgetConfig.totalBudget) || 0;
                var totalExp = 0, matPurch = 0, maint = 0, ambFare = 0, projSpent = 0;
                var allReceipts = DB.get('inventory_receipts') || [];
                allReceipts.forEach(function(r) { matPurch += parseFloat(r.total) || 0; });
                var allTrips = DB.get('ambulance_trips') || [];
                allTrips.forEach(function(t) { ambFare += parseFloat(t.fare) || 0; });
                var allProblems = DB.get('problems') || [];
                allProblems.forEach(function(p) { maint += parseFloat(p.maintenanceCost || p.cost || 0) || 0; });
                var allProjects = DB.get('projects') || [];
                allProjects.forEach(function(p) { projSpent += parseFloat(p.spent) || 0; });
                totalExp = matPurch + maint + ambFare + projSpent;
                var remaining = totalBudget - totalExp;
                var utilPct = totalBudget > 0 ? Math.round((totalExp / totalBudget) * 100) : 0;

                var bdgCols = ['Metric', 'Amount (₹)'];
                var bdgRows = [
                    ['Fiscal Year', budgetConfig.fiscalYear || '-'],
                    ['Total Budget', totalBudget.toFixed(2)],
                    ['Maintenance Budget', parseFloat(budgetConfig.maintenanceBudget || 0).toFixed(2)],
                    ['Material Purchase Cost', matPurch.toFixed(2)],
                    ['Maintenance Cost', maint.toFixed(2)],
                    ['Ambulance Fare Collected', ambFare.toFixed(2)],
                    ['Project Spent', projSpent.toFixed(2)],
                    ['Total Expense', totalExp.toFixed(2)],
                    ['Remaining Budget', remaining.toFixed(2)],
                    ['Utilization Rate', utilPct + '%']
                ];
                addSheet('Budget Overview', bdgCols, bdgRows);
            }
        } catch (e) { console.warn('Budget sheet error:', e); }

        // ─── Type-specific sheets ───
        try {
            if (type === 'department') {
                var deptData = (DB.get('departments') || []).filter(function(d) { return d.active !== false; });
                deptData.forEach(function(d) {
                    try {
                        var dRows = users.filter(function(u) { return u.department === d.name; }).map(function(u) {
                            var sec = buildEmpKPISection(u.fullName, { from: from, to: to });
                            if (!sec || !sec.rows || !sec.rows.length) return null;
                            return [u.fullName || '', u.role || '', sec.rows.map(function(r) { return r[2]; }).join(' | ')];
                        }).filter(Boolean);
                        addSheet(d.name + ' Dept', ['Employee','Role','KPIs'], dRows);
                    } catch (ee) {}
                });
            } else if (type === 'individual') {
                employees.forEach(function(e) {
                    try {
                        var sec = buildEmpKPISection(e.fullName, { from: from, to: to });
                        if (sec && sec.rows && sec.rows.length) {
                            addSheet(e.fullName.replace(/[\/\\*?]/g,' ').substring(0,31), sec.cols, sec.rows);
                        }
                    } catch (ee) {}
                });
            }
        } catch (e) { console.warn('Type-specific sheets error:', e); }

        if (!sheetCount) { APP.notify('No data to export', 'error'); return; }

        var wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        var blob = new Blob([wbout], { type: 'application/octet-stream' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = _lastReportTitle.replace(/\s+/g, '_') + '.xlsx';
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
        if (type === 'department' && sec.detail) {
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

/* ─── Share Utilities (WhatsApp / Email) ─── */

function shareViaWhatsApp(text) {
    var url = 'https://wa.me/?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
}

function shareViaEmail(subject, body) {
    var url = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    window.open(url, '_blank');
}

function shareReportViaWhatsApp() {
    if (!_lastReportData) { APP.notify('Generate a report first', 'error'); return; }
    var text = '*HMS Report: ' + _lastReportTitle + '*\n';
    text += 'Generated: ' + new Date().toLocaleString() + '\n\n';
    _lastReportData.sections.forEach(function(sec) {
        if (sec.title === 'Key Performance Indicators' || sec.cols) {
            text += '*' + sec.title + '*\n';
            if (sec.rows) {
                sec.rows.slice(0, 8).forEach(function(r) {
                    text += r.join(' | ') + '\n';
                });
            }
            text += '\n';
        }
    });
    text += 'Download full report from HMS dashboard.';
    shareViaWhatsApp(text);
}

function shareReportViaEmail() {
    if (!_lastReportData) { APP.notify('Generate a report first', 'error'); return; }
    var body = 'HMS Report: ' + _lastReportTitle + '\n';
    body += 'Generated: ' + new Date().toLocaleString() + '\n\n';
    _lastReportData.sections.forEach(function(sec) {
        if (sec.title === 'Key Performance Indicators' || sec.cols) {
            body += sec.title + '\n';
            if (sec.rows) {
                sec.rows.slice(0, 10).forEach(function(r) {
                    body += r.join(' | ') + '\n';
                });
            }
            body += '\n---\n';
        }
    });
    body += '\nDownload full report from HMS dashboard.';
    shareViaEmail('HMS Report: ' + _lastReportTitle, body);
}
