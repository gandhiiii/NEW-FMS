const SYNC = {
    _db: null,
    _ready: false,
    _unsub: null,
    _initPromise: null,

    async init() {
        if (this._initPromise) return this._initPromise;
        this._initPromise = this._init();
        return this._initPromise;
    },

    _status(msg, type) {
        const el = document.getElementById('liveIndicator');
        if (!el) return;
        if (type === 'error') {
            el.innerHTML = '<span style="color:var(--danger)">&#9679; SYNC ERR</span>';
            el.style.background = 'rgba(234,67,53,0.1)';
            el.style.borderColor = 'var(--danger)';
        } else if (type === 'ok') {
            el.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:var(--success);display:inline-block;animation:pulse 1.5s infinite;"></span> SYNC';
            el.style.background = 'rgba(52,168,83,0.1)';
            el.style.borderColor = 'rgba(52,168,83,0.3)';
        } else {
            el.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#fbbc04;display:inline-block;"></span> SYNC...';
            el.style.background = 'rgba(251,188,4,0.1)';
            el.style.borderColor = '#fbbc04';
        }
    },

    async _init() {
        try {
            if (typeof firebase === 'undefined') {
                this._status('SDK missing', 'error');
                return;
            }
            this._status('Connecting...', 'busy');
            firebase.initializeApp(FIREBASE_CONFIG);
            this._db = firebase.firestore();
            await this._db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
            this._patchDB();
            this._ready = true;
            await this._syncFromServer();
            this._listen();
            this._status('Connected', 'ok');
            if (APP && APP.refreshCurrent) APP.refreshCurrent();
            this._startPolling();
        } catch (e) {
            this._status('Init: ' + (e.message || e), 'error');
            console.warn('Firebase init error:', e);
        }
    },

    _patchDB() {
        const _origSet = DB.set.bind(DB);
        const self = this;
        const skipKeys = ['currentUser', 'loginTime', 'resetTokens'];

        DB.set = function (key, data) {
            _origSet(key, data);
            if (self._ready && !skipKeys.includes(key)) {
                self._write(key, data);
            }
        };
    },

    async _write(key, data) {
        try {
            await this._db.collection('hms_data').doc(key).set({ items: data, updatedAt: new Date().toISOString() });
        } catch (e) {
            console.warn('Firebase write error:', key, e);
        }
    },

    async _syncFromServer() {
        try {
            const snapshot = await this._db.collection('hms_data').get();
            if (snapshot.empty) {
                const promises = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('hms_') && !['hms_currentUser', 'hms_loginTime', 'hms_resetTokens'].includes(k)) {
                        try {
                            const data = JSON.parse(localStorage.getItem(k));
                            promises.push(this._write(k.replace('hms_', ''), data));
                        } catch (e) { }
                    }
                }
                await Promise.all(promises);
            } else {
                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (d && d.items) {
                        try { localStorage.setItem('hms_' + doc.id, JSON.stringify(d.items)); } catch (e) { }
                    }
                });
            }
        } catch (e) {
            this._status('Sync: ' + (e.message || e), 'error');
            console.warn('Firebase sync error:', e);
        }
    },

    _listen() {
        this._unsub = this._db.collection('hms_data').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'modified' || change.type === 'added') {
                    const key = change.doc.id;
                    const d = change.doc.data();
                    if (d && d.items) {
                        try {
                            const serverStr = JSON.stringify(d.items);
                            const localRaw = localStorage.getItem('hms_' + key);
                            if (localRaw !== serverStr) {
                                localStorage.setItem('hms_' + key, serverStr);
                                this._flash();
                                if (APP && APP.refreshCurrent) {
                                    clearTimeout(SYNC._debounce);
                                    SYNC._debounce = setTimeout(() => APP.refreshCurrent(), 200);
                                }
                            }
                        } catch (e) { }
                    }
                }
            });
        }, err => {
            this._status('Listener: ' + (err.message || err), 'error');
            console.warn('Firebase listener error:', err);
        });
    },

    _flash() {
        const el = document.getElementById('liveIndicator');
        if (el) {
            el.style.background = 'rgba(66,133,244,0.2)';
            el.style.borderColor = 'var(--info)';
            el.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:var(--info);display:inline-block;animation:pulse 0.5s infinite;"></span> SYNCED';
            setTimeout(() => {
                el.style.background = 'rgba(52,168,83,0.1)';
                el.style.borderColor = 'rgba(52,168,83,0.3)';
                el.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:var(--success);display:inline-block;animation:pulse 1.5s infinite;"></span> SYNC';
            }, 1500);
        }
    },

    _startPolling() {
        setInterval(() => {
            if (!this._ready) return;
            this._db.collection('hms_data').get().then(snapshot => {
                let changed = false;
                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (d && d.items) {
                        const key = doc.id;
                        try {
                            const serverStr = JSON.stringify(d.items);
                            const localRaw = localStorage.getItem('hms_' + key);
                            if (localRaw !== serverStr) {
                                localStorage.setItem('hms_' + key, serverStr);
                                changed = true;
                            }
                        } catch (e) { }
                    }
                });
                if (changed) {
                    this._flash();
                    if (APP && APP.refreshCurrent) APP.refreshCurrent();
                }
            }).catch(() => {});
        }, 15000);
    }
};
