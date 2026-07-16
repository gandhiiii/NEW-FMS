const SYNC = {
    _db: null,
    _rtdb: null,
    _ready: false,
    _unsub: null,
    _initPromise: null,

    async init() {
        if (this._initPromise) return this._initPromise;
        this._initPromise = this._init();
        return this._initPromise;
    },

    async _status(msg, type) {
        for (let i = 0; i < 50; i++) {
            const el = document.getElementById('liveIndicator');
            if (el) {
                if (type === 'error') {
                    el.innerHTML = '<span style="color:#ea4335">&#9679; SYNC ERR</span>';
                    el.style.color = '#ea4335';
                    el.style.borderColor = '#ea4335';
                    el.style.background = '#ea433510';
                } else if (type === 'ok') {
                    el.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#34a853;display:inline-block;animation:pulse 1.5s infinite;"></span> SYNC';
                    el.style.color = '#34a853';
                    el.style.borderColor = '#34a85344';
                    el.style.background = '#34a8531a';
                } else {
                    el.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#fbbc04;display:inline-block;"></span> SYNC...';
                    el.style.color = '#fbbc04';
                    el.style.borderColor = '#fbbc04';
                    el.style.background = '#fbbc041a';
                }
                return;
            }
            if (i === 0) console.log('SYNC: waiting for liveIndicator...');
            await new Promise(r => setTimeout(r, 100));
        }
        console.warn('SYNC: liveIndicator not found after 5s');
    },

    async _init() {
        try {
            if (typeof firebase === 'undefined' || typeof firebase.firestore === 'undefined' || typeof firebase.database === 'undefined') {
                this._status('SDK missing', 'error');
                return;
            }
            this._status('Connecting...', 'busy');
            firebase.initializeApp(FIREBASE_CONFIG);
            this._db = firebase.firestore();
            this._rtdb = firebase.database();
            await this._db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
            this._patchDB();
            this._ready = true;
            const syncOk = await this._syncFromServer();
            if (syncOk) {
                this._listen();
                this._status('Connected', 'ok');
                if (APP && APP.refreshCurrent) APP.refreshCurrent();
                this._startPolling();
                this._onVisibility();
            }
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
        const payload = { items: data, updatedAt: Date.now() };
        await Promise.all([
            this._db.collection('hms_data').doc(key).set(payload).catch(e => console.warn('FS write err:', key, e)),
            this._rtdb.ref('hms_data/' + key).set(payload).catch(e => console.warn('RTDB write err:', key, e))
        ]);
    },

    _applyRemoteData(key, items) {
        const localRaw = localStorage.getItem('hms_' + key);
        const serverStr = JSON.stringify(items);
        if (localRaw !== serverStr) {
            localStorage.setItem('hms_' + key, serverStr);
            return true;
        }
        return false;
    },

    _refreshUI() {
        clearTimeout(this._flashDebounce);
        this._flashDebounce = setTimeout(() => {
            this._flash();
            if (APP && APP.refreshCurrent) {
                clearTimeout(SYNC._refreshDebounce);
                SYNC._refreshDebounce = setTimeout(() => APP.refreshCurrent(), 200);
            }
        }, 50);
    },

    async _syncFromServer() {
        const pushLocal = () => {
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
            return Promise.all(promises);
        };

        try {
            const snapshot = await this._db.collection('hms_data').get();
            if (snapshot.empty) {
                await pushLocal();
            } else {
                let changed = false;
                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (d && d.items) {
                        if (this._applyRemoteData(doc.id, d.items)) changed = true;
                    }
                });
                if (changed) this._refreshUI();
            }
            return true;
        } catch (e) {
            try {
                const snap = await this._rtdb.ref('hms_data').once('value');
                const data = snap.val();
                if (data) {
                    let changed = false;
                    Object.keys(data).forEach(key => {
                        const d = data[key];
                        if (d && d.items) {
                            if (this._applyRemoteData(key, d.items)) changed = true;
                        }
                    });
                    if (changed) this._refreshUI();
                } else {
                    await pushLocal();
                }
                return true;
            } catch (e2) {
                this._status('Sync err', 'error');
                console.warn('Both Firebase sync failed:', e, e2);
                return false;
            }
        }
    },

    _listen() {
        this._unsub = this._db.collection('hms_data').onSnapshot(snapshot => {
            let changed = false;
            snapshot.docChanges().forEach(change => {
                if (change.type === 'modified' || change.type === 'added') {
                    const d = change.doc.data();
                    if (d && d.items) {
                        if (this._applyRemoteData(change.doc.id, d.items)) changed = true;
                    }
                }
            });
            if (changed) this._refreshUI();
        }, err => console.warn('FS listener:', err));

        this._rtdb.ref('hms_data').on('child_changed', snap => {
            const d = snap.val();
            if (d && d.items) {
                if (this._applyRemoteData(snap.key, d.items)) this._refreshUI();
            }
        }, err => console.warn('RTDB changed:', err));

        this._rtdb.ref('hms_data').on('child_added', snap => {
            const d = snap.val();
            if (d && d.items) {
                if (localStorage.getItem('hms_' + snap.key) === null) {
                    this._applyRemoteData(snap.key, d.items);
                    this._refreshUI();
                }
            }
        }, err => console.warn('RTDB added:', err));
    },

    _flash() {
        const el = document.getElementById('liveIndicator');
        if (!el) return;
        el.style.background = '#4285f41a';
        el.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#4285f4;display:inline-block;animation:pulse 0.5s infinite;"></span> SYNCED';
        setTimeout(() => this._status('Connected', 'ok'), 1000);
    },

    async reSync() {
        this._status('Syncing...', 'busy');
        const ok = await this._syncFromServer();
        if (ok) {
            this._status('Connected', 'ok');
            if (APP && APP.refreshCurrent) APP.refreshCurrent();
        }
    },

    _onVisibility() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this._ready) {
                this._status('Reconnecting...', 'busy');
                setTimeout(() => this.reSync(), 300);
            }
        });
    },

    _startPolling() {
        setInterval(() => {
            if (!this._ready) return;
            this._db.collection('hms_data').get().then(snapshot => {
                let changed = false;
                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (d && d.items) {
                        if (this._applyRemoteData(doc.id, d.items)) changed = true;
                    }
                });
                if (changed) this._refreshUI();
            }).catch(e => console.warn('FS poll err:', e));
        }, 15000);
    }
};
