SyncStatus = {
    load: function (store) {
        this.store = store;
        this.view(this.get());
    },
    view: function (status) {
        $('#syncLastLocalTimestampText').html(status.lastLocalTimestamp);
        $('#syncLastLocalVersionText').html(status.lastLocalVersion);
    },
    get: function () {
        var syncLastLocalTimestamp = this.store.getItem('syncLastLocalTimestamp'), syncLastLocalVersion = this.store.getItem('syncVersion');
        return {
            lastLocalTimestamp: (syncLastLocalTimestamp ? (new Date(syncLastLocalTimestamp)).toLocaleString() : 'noch nie synchronisiert'),
            lastLocalVersion: (syncLastLocalVersion ? syncLastLocalVersion : 'keine')
        };
    }
};
//# sourceMappingURL=syncStatus.js.map