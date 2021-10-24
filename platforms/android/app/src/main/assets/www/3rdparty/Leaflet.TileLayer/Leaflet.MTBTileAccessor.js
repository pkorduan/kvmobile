var MTBTilesAccessor = /** @class */ (function () {
    function MTBTilesAccessor(dbName, dbLocation, urlPattern) {
        this._urlPattern = /.*\d+\/\d+\/\d+\..*/;
        this._urlPattern = urlPattern || this._urlPattern;
        this._dbName = dbName;
        this._dbLocation = dbLocation;
        this._openDB();
        this._register();
    }
    MTBTilesAccessor.prototype._openDB = function () {
        try {
          console.log('Open vector tiles Database: %s', config.localTilePath + 'tiles.mbtiles');
          this._db = window.sqlitePlugin.openDatabase({
                 name: config.localTilePath + 'tiles.mbtiles',
                 location: 'default',
                 androidDatabaseImplementation: 2
               },
               function (db) {
                 kvm.log('Lokale Datenbank geöffnet.', 3);
                 kvm.startApplication();
               },
               function (error) {
                 console.log('Open database ERROR: ' + JSON.stringify(error));
               }
             );
        }
        catch (ex) {
            console.error(ex);
        }
    };
    MTBTilesAccessor.prototype.getCoord = function (url) {
        var sA = url.split(/[\/.]/);
        console.info(sA);
        var coord = [];
        coord[0] = sA[sA.length - 4];
        coord[1] = sA[sA.length - 3];
        coord[2] = sA[sA.length - 2];
        return coord;
    };
    MTBTilesAccessor.prototype._register = function () {
        if (window.fetch) {
            const fetch = window.fetch;
            window.fetch = function (request, config) {
                var _this = this;
                console.info('fetch request', request);
                if (request instanceof String) {
                    if (request.match(this._urlP)) {
                        return new Promise(function (resolve, reject) {
                            try {
                                var param_1 = _this._getKoord(request);
                                var sql_1 = 'SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?';
                                _this.database.transaction(function (tx) {
                                    tx.executeSql(sql_1, param_1, function (tx, resultSet) {
                                        var _a;
                                        if (((_a = resultSet === null || resultSet === void 0 ? void 0 : resultSet.rows) === null || _a === void 0 ? void 0 : _a.length) === 1) {
                                            var d = resultSet.rows.item[0].tile_data;
                                            var init = { "status": 200, "statusText": "ok" };
                                            var res = new Response(d, init);
                                            console.log('fetch von db: %o %o', request, res);
                                            resolve(res);
                                        }
                                        else {
                                            fetch(request, config).then(function (v) { return resolve(v); });
                                        }
                                    }, function (tx, err) {
                                        reject({ tx: tx, err: err });
                                    });
                                });
                            }
                            catch (err) {
                                reject({ err: err });
                            }
                        });
                    }
                    else {
                        return fetch(request, config);
                    }
                }
                else {
                    return fetch(request, config);
                }
            };
        }
    };
    return MTBTilesAccessor;
}());
windows.MTBTilesAccessor = windows.MTBTilesAccessor;