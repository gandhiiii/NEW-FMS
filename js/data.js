const DB = {
    _channel: typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hms_sync') : null,
    _listeners: [],

    on(event, fn) {
        this._listeners.push({ event, fn });
    },
    _emit(event, data) {
        this._listeners.filter(l => l.event === event).forEach(l => l.fn(data));
        if (this._channel) {
            try { this._channel.postMessage({ event, data, timestamp: Date.now() }); } catch(e) {}
        }
    },

    get(key) {
        try {
            var raw = localStorage.getItem('hms_' + key);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        try {
            var raw = sessionStorage.getItem('hms_' + key);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    },
    set(key, data) {
        var json = JSON.stringify(data);
        try { localStorage.setItem('hms_' + key, json); } catch (e) { console.warn('localStorage set error:', e); }
        try { sessionStorage.setItem('hms_' + key, json); } catch (e) { console.warn('sessionStorage set error:', e); }
    },
    add(key, item) {
        const items = this.get(key);
        item.id = Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        item.createdAt = new Date().toISOString();
        items.push(item);
        this.set(key, items);
        this._emit('change', { store: key, action: 'add', id: item.id });
        return item;
    },
    update(key, id, updates) {
        const items = this.get(key);
        const idx = items.findIndex(i => i.id === id);
        if (idx > -1) {
            items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
            this.set(key, items);
            this._emit('change', { store: key, action: 'update', id });
            return items[idx];
        }
        return null;
    },
    delete(key, id) {
        const items = this.get(key).filter(i => i.id !== id);
        this.set(key, items);
        this._emit('change', { store: key, action: 'delete', id });
    },
    getById(key, id) {
        return this.get(key).find(i => i.id === id) || null;
    }
};

const DEFAULT_ADMIN = {
    id: 'admin_super',
    username: 'admin',
    password: 'admin123',
    fullName: 'Super Admin',
    email: 'admin@hospital.com',
    phone: '9876543210',
    role: 'admin',
    department: 'Administration',
    isSuperAdmin: true,
    permissions: ['all']
};

const AUTH = {
    _sid() {
        try {
            let p = new URLSearchParams(window.location.search);
            let s = p.get('sid');
            if (s && localStorage.getItem('hms_sid_' + s)) return s;
        } catch (e) {}
        try {
            let t = sessionStorage.getItem('hms_t');
            if (t && localStorage.getItem(t)) return t.replace('hms_u_', '');
        } catch (e) {}
        return null;
    },
    init() {
        try {
            let users = DB.get('users');
            if (!Array.isArray(users) || users.length === 0) {
                const admin = { ...DEFAULT_ADMIN, createdAt: new Date().toISOString() };
                DB.set('users', [admin]);
            } else {
                const hasAdmin = users.some(u => u.isSuperAdmin || u.username === 'admin');
                if (!hasAdmin) {
                    const admin = { ...DEFAULT_ADMIN, createdAt: new Date().toISOString() };
                    users.push(admin);
                    DB.set('users', users);
                }
            }
            if (!localStorage.getItem('hms_resetTokens') || typeof DB.get('resetTokens')?.length === 'undefined') {
                DB.set('resetTokens', []);
            }
        } catch (e) {
            console.warn('AUTH.init error:', e);
        }
    },
    login(username, password) {
        try {
            let users = DB.get('users');
            if (!Array.isArray(users) || users.length === 0) {
                const admin = { ...DEFAULT_ADMIN, createdAt: new Date().toISOString() };
                DB.set('users', [admin]);
                users = [admin];
            }
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                let sid = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
                try {
                    localStorage.setItem('hms_currentUser', JSON.stringify(user));
                    localStorage.setItem('hms_loginTime', new Date().toISOString());
                    localStorage.setItem('hms_sid_' + sid, JSON.stringify(user));
                    try { sessionStorage.setItem('hms_t', sid); } catch (e) {}
                } catch (e) { /* storage unavailable */ }
                return { success: true, user, sid };
            }
            return { success: false, message: 'Invalid username or password' };
        } catch (e) {
            return { success: false, message: 'Login error: ' + e.message };
        }
    },
    logout() {
        try {
            let sid = this._sid();
            if (sid) localStorage.removeItem('hms_sid_' + sid);
        } catch (e) {}
        localStorage.removeItem('hms_currentUser');
        localStorage.removeItem('hms_loginTime');
    },
    currentUser() {
        try {
            let sid = this._sid();
            if (sid) {
                let d = localStorage.getItem('hms_sid_' + sid);
                if (d) return JSON.parse(d);
            }
        } catch (e) {}
        try {
            let p = new URLSearchParams(window.location.search);
            let s = p.get('sid');
            if (s) {
                let d = localStorage.getItem('hms_sid_' + s);
                if (d) return JSON.parse(d);
            }
        } catch (e) {}
        try {
            let d = localStorage.getItem('hms_currentUser');
            if (d) return JSON.parse(d);
        } catch (e) {}
        return null;
    },
    isLoggedIn() {
        return !!this.currentUser();
    },
    requestReset(identifier) {
        const users = DB.get('users');
        const user = users.find(u => u.username === identifier || u.email === identifier || u.phone === identifier);
        if (!user) return { success: false, message: 'User not found' };
        const token = Date.now().toString(36) + Math.random().toString(36).substr(2, 8).toUpperCase();
        const tokens = DB.get('resetTokens');
        tokens.push({
            token,
            userId: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            expires: new Date(Date.now() + 3600000).toISOString(),
            used: false
        });
        DB.set('resetTokens', tokens);

        const resetLink = `${window.location.origin}${window.location.pathname}?reset=${token}`;
        const msg = `Reset link sent!\nLink: ${resetLink}\n(Would send to ${user.email} and SMS to ${user.phone})`;
        return { success: true, message: msg, token, user };
    },
    verifyResetToken(token) {
        const tokens = DB.get('resetTokens');
        const t = tokens.find(tk => tk.token === token && !tk.used && new Date(tk.expires) > new Date());
        return t || null;
    },
    resetPassword(token, newPassword) {
        const tokens = DB.get('resetTokens');
        const t = tokens.find(tk => tk.token === token && !tk.used && new Date(tk.expires) > new Date());
        if (!t) return { success: false, message: 'Invalid or expired token' };
        DB.update('users', t.userId, { password: newPassword });
        t.used = true;
        DB.set('resetTokens', tokens);
        return { success: true, message: 'Password reset successful!' };
    },
    hasPermission(user, permission) {
        if (!user) return false;
        if (user.isSuperAdmin || user.permissions.includes('all')) return true;
        return user.permissions.includes(permission);
    },
    canAccess(permission) {
        const user = this.currentUser();
        return this.hasPermission(user, permission);
    }
};

const FLOOR_ITEMS = [
    { floor: 'Shared (B3-7F)', items: [
        { name: 'Fire doors B-3 to 7th floor', unit: '' },
        { name: 'Plumbing duct doors B-3 to 7th floor', unit: '' },
        { name: 'Electrical duct doors B-3 to 7th floor', unit: '' },
        { name: 'IT duct doors B-3 to 7th floor', unit: '' },
        { name: 'Lift panel duct doors B-3 to 7th floor', unit: '' },
        { name: 'HVAC duct doors B-3 to 7th floor', unit: '' },
        { name: 'Patient lift inside', unit: '' },
        { name: 'Patient lift outside', unit: '' },
        { name: 'Fire lift', unit: '' },
        { name: 'Doctor lift', unit: '' },
    ]},
    { floor: 'DG Set / LT / UPS', items: [
        { name: 'DG set', unit: '' },
        { name: 'LT Panel and its room', unit: '' },
        { name: 'UPS Room', unit: '' },
        { name: 'UPS battery percentage', unit: '%' },
        { name: 'UPS incoming power voltage', unit: 'V' },
        { name: 'UPS outgoing power voltage', unit: 'V' },
    ]},
    { floor: 'Laundry', items: [
        { name: 'Washing machine', unit: '' },
        { name: 'Drying machine', unit: '' },
        { name: 'Pressing machine', unit: '' },
        { name: 'Air compressor', unit: 'bar' },
        { name: 'Laundry machine panel', unit: '' },
        { name: 'Laundry area fan', unit: '' },
        { name: 'Laundry area light', unit: '' },
        { name: 'Laundry area exhaust fan', unit: '' },
        { name: 'Laundry metal shed', unit: '' },
        { name: 'Laundry windows', unit: '' },
        { name: 'Laundry drainage', unit: '' },
    ]},
    { floor: 'Terrace', items: [
        { name: 'HVAC unit', unit: '' },
        { name: 'AHU unit', unit: '' },
        { name: 'Outdoor unit', unit: '' },
        { name: 'AC panel', unit: '' },
        { name: 'Bathroom exhaust fan', unit: '' },
        { name: 'Canteen exhaust fan', unit: '' },
        { name: 'Camera alignment', unit: '' },
        { name: 'Overhead water tank', unit: '' },
        { name: 'STP tank', unit: '' },
        { name: 'Raw water tank', unit: '' },
        { name: 'Fire tank', unit: '' },
        { name: 'RO system', unit: '' },
        { name: 'RO water tank', unit: '' },
        { name: 'Rain water drainage', unit: '' },
        { name: 'Solar panel cleaning status', unit: '%' },
        { name: 'Solar panel unit production', unit: 'kW' },
        { name: 'Plumbing line and valves', unit: '' },
        { name: 'Lift fresh air system', unit: '' },
        { name: 'Terrace lights', unit: '' },
    ]},
    { floor: 'Staircase', items: [
        { name: 'Staircase lights', unit: '' },
        { name: 'Glass and grab bar', unit: '' },
        { name: 'Fire extinguisher', unit: '' },
        { name: 'Windows', unit: '' },
        { name: 'Camera alignment', unit: '' },
        { name: 'Speaker', unit: '' },
        { name: 'Fire detector sensor', unit: '' },
        { name: 'Fire sprinkler', unit: '' },
    ]},
    { floor: 'Ground to 6th Floor (Common)', items: [
        { name: 'Wooden doors', unit: '' },
        { name: 'Door handles', unit: '' },
        { name: 'Door stoppers', unit: '' },
        { name: 'Door closers', unit: '' },
        { name: 'Door locks', unit: '' },
        { name: 'HVAC filter cleaning', unit: '' },
        { name: 'HVAC cooling', unit: '°C' },
        { name: 'Light and fan', unit: '' },
        { name: 'Geyser', unit: '' },
        { name: 'Nurse calling system', unit: '' },
        { name: 'Camera alignment and working', unit: '' },
        { name: 'All computers', unit: '' },
        { name: 'All furniture and chairs', unit: '' },
        { name: 'Civil/paint condition', unit: '' },
        { name: 'Plumbing condition', unit: '' },
        { name: 'WiFi router', unit: '' },
        { name: 'Speakers', unit: '' },
        { name: 'Fire alarm', unit: '' },
        { name: 'Fire sprinkler', unit: '' },
        { name: 'Fire detectors', unit: '' },
    ]},
    { floor: 'Basement-3 to Basement-1', items: [
        { name: 'Parking lift hydraulic fluid', unit: '' },
        { name: 'Parking lift alignment', unit: '' },
        { name: 'Fresh air fan', unit: '' },
        { name: 'Exhaust fan', unit: '' },
        { name: 'Lights and fan', unit: '' },
        { name: 'Fire alarm', unit: '' },
        { name: 'Fire sprinkler', unit: '' },
        { name: 'Fire detectors', unit: '' },
        { name: 'WiFi router and speakers', unit: '' },
        { name: 'Drainage', unit: '' },
        { name: 'Store room doors and locks', unit: '' },
        { name: 'Camera alignment', unit: '' },
        { name: 'Locker room, locker, light, fan, camera (B2)', unit: '' },
        { name: 'Store room light, fan, access point (B3)', unit: '' },
        { name: 'Fire system pumps (B2)', unit: '' },
        { name: 'MGPS station vacuum pumps (B1)', unit: '' },
        { name: 'MGPS air filters and tank (B1)', unit: '' },
        { name: 'MGPS air compressor fluid and filters (B1)', unit: '' },
        { name: 'LT panel room light and exhaust fan (B1)', unit: '' },
        { name: 'UPS room (B1)', unit: '' },
    ]},
    { floor: 'Ground Floor', items: [
        { name: 'Basement parking entrance', unit: '' },
        { name: 'Medical gas station', unit: '' },
        { name: 'Medical gas station lights', unit: '' },
        { name: 'Two-wheeler parking', unit: '' },
        { name: 'Canteen air washer', unit: '' },
        { name: 'Canteen TFA', unit: '' },
        { name: 'Canteen fridge-1', unit: '°C' },
        { name: 'Canteen fridge-2', unit: '°C' },
        { name: 'Canteen fridge-3', unit: '°C' },
        { name: 'Canteen deep freezer-1', unit: '°C' },
        { name: 'Canteen Bain Marie counter-1', unit: '°C' },
        { name: 'Canteen Bain Marie counter-2', unit: '°C' },
        { name: 'Medical fridge-1', unit: '°C' },
        { name: 'Medical fridge-2', unit: '°C' },
        { name: 'Physiotherapy area', unit: '' },
        { name: 'Reception', unit: '' },
        { name: 'Main entrance', unit: '' },
        { name: 'Bathroom (Male)', unit: '' },
        { name: 'Bathroom (Female)', unit: '' },
        { name: 'Staff bathroom', unit: '' },
        { name: 'Janitor closet', unit: '' },
        { name: 'Drinking water and cooler', unit: '' },
    ]},
    { floor: 'First Floor', items: [
        { name: 'MRI console room', unit: '' },
        { name: 'MRI technical room', unit: '' },
        { name: 'MRI UPS room', unit: '' },
        { name: 'MRI chiller room', unit: '°C' },
        { name: 'Open MRI', unit: '' },
        { name: 'CT scan console room', unit: '' },
        { name: 'CT scan technical room', unit: '' },
        { name: 'Xray room', unit: '' },
        { name: 'Sonography room', unit: '' },
        { name: 'Dexa scan room', unit: '' },
        { name: 'Admin office', unit: '' },
        { name: 'Marketing', unit: '' },
        { name: 'Discharge counter', unit: '' },
        { name: 'Admission counter', unit: '' },
        { name: 'Call center', unit: '' },
        { name: 'RCA/MD room', unit: '' },
        { name: 'Bathroom (Male)', unit: '' },
        { name: 'Bathroom (Female)', unit: '' },
        { name: 'Staff bathroom', unit: '' },
        { name: 'Janitor closet', unit: '' },
        { name: 'Drinking water and cooler', unit: '' },
    ]},
    { floor: 'Second Floor', items: [
        { name: 'PG-1 OPD room', unit: '' },
        { name: 'PG-2 OPD room', unit: '' },
        { name: 'Physician room', unit: '' },
        { name: 'Physician testing room', unit: '' },
        { name: 'OPD-1 to OPD-13', unit: '' },
        { name: 'Research room', unit: '' },
        { name: 'Minor OT', unit: '' },
        { name: 'Blood collection room', unit: '' },
        { name: 'Reception', unit: '' },
        { name: 'Doctor zero room 1', unit: '' },
        { name: 'Doctor zero room 2', unit: '' },
        { name: 'Doctor bathroom', unit: '' },
        { name: 'Bathroom (Male)', unit: '' },
        { name: 'Bathroom (Female)', unit: '' },
        { name: 'Staff bathroom', unit: '' },
        { name: 'OPD TV', unit: '' },
        { name: 'Waiting TV', unit: '' },
        { name: 'Research room fridge-1', unit: '°C' },
        { name: 'Research room fridge-2', unit: '°C' },
    ]},
    { floor: 'Third Floor', items: [
        { name: 'HDU', unit: '' },
        { name: 'HDU dirty room', unit: '' },
        { name: 'HDU clean room', unit: '' },
        { name: 'PREOP room', unit: '' },
        { name: 'CSSD dirty room', unit: '' },
        { name: 'CSSD clean room', unit: '' },
        { name: 'CSSD implant storage', unit: '' },
        { name: 'OT-1', unit: '' },
        { name: 'OT-2', unit: '' },
        { name: 'OT-3', unit: '' },
        { name: 'OT-4', unit: '' },
        { name: 'OT-5', unit: '' },
        { name: 'OT-6', unit: '' },
        { name: 'Doctor room', unit: '' },
        { name: 'Doctor room TV', unit: '' },
        { name: 'Nursing staff room', unit: '' },
        { name: 'Nursing staff bathroom', unit: '' },
        { name: 'Janitor closet', unit: '' },
        { name: 'Doctors bathroom', unit: '' },
        { name: 'Changing room', unit: '' },
        { name: 'Lockers area', unit: '' },
        { name: 'Dumbwaiter room', unit: '' },
        { name: 'Biowaste room', unit: '' },
    ]},
    { floor: 'Fourth Floor', items: [
        { name: 'Patient room 2', unit: '' },
        { name: 'Patient room 3', unit: '' },
        { name: 'Patient room 4', unit: '' },
        { name: 'Patient room 5', unit: '' },
        { name: 'Patient room 6', unit: '' },
        { name: 'Patient room 7', unit: '' },
        { name: 'Patient room 8', unit: '' },
        { name: 'Patient room 9', unit: '' },
        { name: 'Patient room 10', unit: '' },
        { name: 'Patient room 11', unit: '' },
        { name: 'Patient room 12', unit: '' },
        { name: 'Patient room 13', unit: '' },
        { name: 'Patient room 14', unit: '' },
        { name: 'Patient room 15', unit: '' },
        { name: 'Patient room 16', unit: '' },
        { name: 'Patient room 17', unit: '' },
        { name: 'Staff bathroom (geyser, light, tap, flush)', unit: '' },
        { name: 'Janitor closet (1)', unit: '' },
        { name: 'Nursing room', unit: '' },
        { name: 'Reception', unit: '' },
        { name: 'Biowaste collection space', unit: '' },
        { name: 'Doctors lift space', unit: '' },
        { name: 'Linen storage rack space', unit: '' },
        { name: 'Janitor closet (2)', unit: '' },
        { name: 'Store room', unit: '' },
    ]},
    { floor: 'Fifth Floor', items: [
        { name: 'Patient room 2', unit: '' },
        { name: 'Patient room 3', unit: '' },
        { name: 'Patient room 4', unit: '' },
        { name: 'Patient room 5', unit: '' },
        { name: 'Patient room 6', unit: '' },
        { name: 'Patient room 7', unit: '' },
        { name: 'Patient room 8', unit: '' },
        { name: 'Patient room 9', unit: '' },
        { name: 'Patient room 10', unit: '' },
        { name: 'Patient room 11', unit: '' },
        { name: 'Patient room 12', unit: '' },
        { name: 'Patient room 13', unit: '' },
        { name: 'Patient room 14', unit: '' },
        { name: 'Patient room 15', unit: '' },
        { name: 'Patient room 16', unit: '' },
        { name: 'Patient room 17', unit: '' },
        { name: 'Staff bathroom (geyser, light, tap, flush)', unit: '' },
        { name: 'Janitor closet (1)', unit: '' },
        { name: 'Nursing room', unit: '' },
        { name: 'Reception', unit: '' },
        { name: 'Biowaste collection space', unit: '' },
        { name: 'Doctors lift space', unit: '' },
        { name: 'Linen storage rack space', unit: '' },
        { name: 'Janitor closet (2)', unit: '' },
        { name: 'Store room', unit: '' },
    ]},
    { floor: 'Sixth Floor', items: [
        { name: 'Patient room 2', unit: '' },
        { name: 'Patient room 3', unit: '' },
        { name: 'Patient room 4', unit: '' },
        { name: 'Patient room 5', unit: '' },
        { name: 'Patient room 6', unit: '' },
        { name: 'Patient room 7', unit: '' },
        { name: 'Patient room 8', unit: '' },
        { name: 'Patient room 9', unit: '' },
        { name: 'Patient room 10', unit: '' },
        { name: 'Patient room 11', unit: '' },
        { name: 'Patient room 12', unit: '' },
        { name: 'Patient room 13', unit: '' },
        { name: 'Patient room 14', unit: '' },
        { name: 'Patient room 15', unit: '' },
        { name: 'Patient room 16', unit: '' },
        { name: 'Patient room 17', unit: '' },
        { name: 'Staff bathroom (geyser, light, tap, flush)', unit: '' },
        { name: 'Janitor closet (1)', unit: '' },
        { name: 'Nursing room (light, fan)', unit: '' },
        { name: 'Reception', unit: '' },
        { name: 'Biowaste collection space', unit: '' },
        { name: 'Doctors lift space', unit: '' },
        { name: 'Linen storage rack space', unit: '' },
        { name: 'Janitor closet (2)', unit: '' },
        { name: 'Store room', unit: '' },
    ]},
];

APP_SYNC = {
    init() {
        // Listen for storage events from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith('hms_')) {
                this._flash();
                this._refresh();
            }
        });
        // Listen for BroadcastChannel messages (other tabs)
        if (DB._channel) {
            DB._channel.onmessage = (e) => {
                if (e.data && e.data.event === 'change') {
                    this._flash();
                    this._refresh();
                }
            };
        }
        window.addEventListener('beforeunload', () => this._cleanup());
    },
    _debounceTimer: null,
    _flash() {
        const el = document.getElementById('liveIndicator');
        if (el) {
            el.style.background = 'rgba(66,133,244,0.2)';
            el.style.borderColor = 'var(--info)';
            setTimeout(() => {
                el.style.background = 'rgba(52,168,83,0.1)';
                el.style.borderColor = 'rgba(52,168,83,0.3)';
            }, 400);
        }
    },
    _cleanup() {
        if (DB._channel) { try { DB._channel.close(); } catch(e) {} }
    },
    _refresh() {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            const mod = APP.currentModule;
            if (mod && window['refresh' + mod.charAt(0).toUpperCase() + mod.slice(1)]) {
                const fn = window['refresh' + mod.charAt(0).toUpperCase() + mod.slice(1)];
                if (typeof fn === 'function') fn();
            } else if (mod && APP.refreshCurrent) {
                APP.refreshCurrent();
            }
        }, 200);
    }
};

const APP = {
    currentModule: null,
    init() {
        try {
            AUTH.init();
            this.seedData();
            try {
                var _users = DB.get('users') || [];
                var _clean = _users.filter(function(_u) { return _u && typeof _u === 'object' && typeof _u.fullName === 'string' && typeof _u.username === 'string'; });
                if (_clean.length !== _users.length) DB.set('users', _clean);
            } catch (_e) {}
            try {
                var _mr = DB.get('material_requests') || [];
                var _mrClean = _mr.filter(function(_r) { return _r && typeof _r === 'object' && typeof _r.title === 'string'; });
                if (_mrClean.length !== _mr.length) DB.set('material_requests', _mrClean);
            } catch (_e) {}
            try {
                var _sg = DB.get('suggestions') || [];
                var _sgClean = _sg.filter(function(_s) { return _s && typeof _s === 'object' && typeof _s.title === 'string'; });
                if (_sgClean.length !== _sg.length) DB.set('suggestions', _sgClean);
            } catch (_e) {}
            APP_SYNC.init();
        } catch (e) {
            console.warn('APP.init error:', e);
        }
    },
    refreshCurrent() {
        const mod = this.currentModule;
        if (!mod) return;
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
        if (renderers[mod]) {
            renderers[mod](content);
        }
    },
    seedData() {
        try {
            if (!Array.isArray(DB.get('departments')) || DB.get('departments').length === 0) {
                DB.set('departments', []);
            }
            const existingRights = DB.get('featureRights');
            if (!Array.isArray(DB.get('tasks')) || DB.get('tasks').length === 0) {
                DB.set('tasks', []);
            }
            if (!Array.isArray(DB.get('inventory')) || DB.get('inventory').length === 0) {
                DB.set('inventory', []);
            }
            if (!Array.isArray(DB.get('inventory_receipts')) || DB.get('inventory_receipts').length === 0) {
                DB.set('inventory_receipts', []);
            }
            if (!Array.isArray(DB.get('material_requests')) || DB.get('material_requests').length === 0) {
                DB.set('material_requests', []);
            }
            if (!Array.isArray(DB.get('suggestions')) || DB.get('suggestions').length === 0) {
                DB.set('suggestions', []);
            }
            if (!Array.isArray(DB.get('reports')) || DB.get('reports').length === 0) {
                DB.set('reports', []);
            }
            if (!Array.isArray(existingRights) || existingRights.length === 0) {
                const defaultRights = ['dashboard','users','departments','inventory','gate-security',
                    'projects','ambulance','problems','tasks','complaints',
                    'room-checklist','admissions','lost-found','checklists','admin-checklists',
                    'material-requests','suggestions','employee-dashboard'];
                DB.set('featureRights', defaultRights);
            }
            const floors = DB.get('floorItems');
            if (!Array.isArray(floors) || floors.length === 0) {
                DB.set('floorItems', FLOOR_ITEMS);
            }
        } catch (e) {
            console.warn('seedData error:', e);
        }
    },
    notify(message, type) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + (type || 'info');
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    formatDate(d) {
        if (!d) return '-';
        const dt = new Date(d);
        return dt.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    },
    formatDateTime(d) {
        if (!d) return '-';
        const dt = new Date(d);
        return dt.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    daysBetween(d1, d2) {
        const a = new Date(d1), b = new Date(d2);
        return Math.floor((b - a) / (1000 * 60 * 60 * 24));
    },
    lifecyclePercent(start, end) {
        const total = this.daysBetween(start, end);
        const elapsed = this.daysBetween(start, new Date().toISOString());
        if (total <= 0) return 100;
        const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
        return Math.round(pct);
    },
    lifecycleColor(pct) {
        if (pct < 50) return 'green';
        if (pct < 80) return 'yellow';
        return 'red';
    },
    getRoleBadge(role) {
        const colors = { admin: 'badge-danger', hod: 'badge-warning', storekeeper: 'badge-info', employee: 'badge-success', ambulance_employee: 'badge-info' };
        return colors[role] || 'badge-info';
    },
    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    getStatusBadge(status) {
        const map = {
            'active': 'badge-success', 'inactive': 'badge-danger',
            'pending': 'badge-warning', 'approved': 'badge-success', 'rejected': 'badge-danger',
            'completed': 'badge-success', 'in-progress': 'badge-info',
            'discharged': 'badge-success', 'admitted': 'badge-info',
            'resolved': 'badge-success', 'open': 'badge-danger',
            'in': 'badge-info', 'out': 'badge-warning'
        };
        return map[status] || 'badge-info';
    }
};
APP.init();
