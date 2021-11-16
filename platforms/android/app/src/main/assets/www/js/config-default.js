configurations = [
  {
    name: 'Standard',
    dbname: 'kvmobile',
    /*
    * Beispiele für Pfade in denen Bilder gespeichert werden
    * file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/
    * file:///storage/BA82-4AA9/Android/data/de.gdiservice.kvmobile/cache/
    * emulated/0 wird als default in den Einstellungen gesetzt
    * der Nutzer kann die Angabe unter Einstellungen setzen
    * wenn das erste Foto gespeichert wird mit dem Camera Plugin, wird
    * der verwendete Pfad ermittelt und die Einstellung überschrieben.
    */
    //  localImgPath: 'file:///storage/' + 'BAB2-4AA9' + '/Android/data/de.gdiservice.kvmobile/cache/',
    localImgPath:    'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/',
    localTilePath:   'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/',
    localBackupPath: 'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/Backups/',
    projZone: 33,
    logLevel: 4, // 0 off, 1 error, 2 waring, 3 info, 4 debug, 5 all
    debug: true,
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: 'kvwmap',
    markerStyles: {
      '0': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      '1': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      '2': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      '3': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" }
    },

  /*
    // LK-MSE
    mapSettings: {
      newPosSelect: 2,
      minZoom: 8,
      maxZoom: 18,
      startZoom: 8,
      west: 311109,
      south: 5894500,
      east: 428034,
      north: 5990606,
      startCenterLat: 53.50467,
      startCenterLon: 12.96181
    },
    kvwmapServerUrl: 'https://geoport-lk-mse.de/supergis',
    kvwmapServerLoginName: 'paulmobil',
    kvwmapServerPasswort: '',
    backgroundLayerOnline: {
      type: 'tile',
      url: 'https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png',
      params: {
        attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.'
      }
    }
  */
  /*
    // LK-VG
    mapSettings: {
      newPosSelect: 2,
      minZoom: 8,
      maxZoom: 18,
      startZoom: 8,
      west: 339600,
      south: 5894500,
      east: 492200,
      north: 6016500,
      startCenterLat: 53.78441,
      startCenterLon: 13.81898
    },
    kvwmapServerUrl: 'https://geoportal-vg.de/kvwmap_test',
    kvwmapServerLoginName: 'kvmobile',
    kvwmapServerPasswort: '',
    backgroundLayerOnline: {
      type: 'tile',
      url: 'https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png',
      params: {
        attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.'
      }
    }
  */
    // LK-EE
    mapSettings: {
      newPosSelect: 1,
      minZoom: 7,
      maxZoom: 18,
      startZoom: 8,
      west: 13.04961,
      south: 51.353,
      east: 13.89345,
      north: 51.90666,
      startCenterLat: 51.6128,
      startCenterLon: 13.4658
    },
    kvwmapServerUrl: 'https://geoportal.lkee.de/',
    kvwmapServerLoginName: '',
    kvwmapServerPasswort: '',
    backgroundLayerSettings: [
    /*    {
        label: 'Luftbilder offline',
        online: false,
        type: 'tile',
        url : 'https://isk.geobasis-bb.de/mapproxy/dop20c_wmts/service?service=WMTS&request=GetTile&version=1.0.0&layer=bebb_dop20c&style=default&format=image/png&TileMatrixSet=grid_25833&TileMatrix={z}&TileRow={x}&TileCol={y}',
        params: {
          attribution: "LGB WMTS DOP20c"
        }
      },*/
      {
        label: 'Luftbilder online',
        online: true,
        type: 'wms',
        url: 'https://isk.geobasis-bb.de/ows/dop20c_wms',
        params: {
          layers: 'bebb_dop20c',
          format: 'image/png',
          transparent: true,
          attribution: "LGB WMS DOP20"
        }
      },
      {
        label: 'Vektorkacheln offline',
        online: true,
        type: 'vectortile',
        url: //'https://api.mapbox.com/styles/v1/pkorduan/ckrg05q6c4x7n17nr0kjbe6j9.html?fresh=true&title=view&access_token=pk.eyJ1IjoicGtvcmR1YW4iLCJhIjoiY2lxbm54b2Q4MDAzaGkzbWFodWtka2NsaCJ9.SiUN3rvZ1pbyOyZ3xQh-Hg#{z}/{x}/{y}',
        'http://gdi-service.de:8080/data/v3/{z}/{x}/{y}.pbf',
        style: 'teststyle.json',
        interactiv: false,
        params: {
          minZoom: 7,
          maxZoom: 14,
          west: 13.04961,
          south: 51.353,
          east: 13.89345,
          north: 51.90666,
          rendererFactory: L.canvas.tile, // replace with L.svg.tile if needed
          getFeatureId: function(f) {
            return f.properties.osm_id;
          },
          vectorTileLayerStyles: {
            // A plain set of L.Path options.
            landuse: {
              weight: 0,
              fillColor: '#9bc2c4',
              fillOpacity: 1,
              fill: true
            },
            // A function for styling features dynamically, depending on their
            // properties and the map's zoom level
            admin: function(properties, zoom) {
              var level = properties.admin_level;
              var weight = 1;
              if (level == 2) {
                weight = 2;
              }
              return {
                weight: weight,
                color: '#cf52d3',
                dashArray: '2, 6',
                fillOpacity: 0
              }
            },
            // A function for styling features dynamically, depending on their
            // properties, the map's zoom level, and the layer's geometry
            // dimension (point, line, polygon)
            water: function(properties, zoom, geometryDimension) {
              if (geometryDimension === 1) {   // point
                return ({
                        radius: 5,
                        color: '#cf52d3',
                });
              }

              if (geometryDimension === 2) {   // line
                return ({
                    weight: 1,
                    color: '#cf52d3',
                    dashArray: '2, 6',
                    fillOpacity: 0
                });
              }

              if (geometryDimension === 3) {   // polygon
                return ({
                    weight: 1,
                    fillColor: '#9bc2c4',
                    fillOpacity: 1,
                    fill: true
                });
              }
            },
            // An 'icon' option means that a L.Icon will be used
            place: {
              //icon: new L.Icon.Default()
            },
            road: [],
          },
          maxNativeZoom: 14,
          attribution: "OSM TileServer GL GDI-Service"
        }
      }
    ]
  }, // Default
  {
    name: 'LK-ROS',
    dbname: 'kvmobile',
    localImgPath:    'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/',
    localTilePath:   'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/',
    localBackupPath: 'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/Backups/',
    projZone: 33,
    logLevel: 4,
    debug: true,
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: 'kvwmap',
    markerStyles: {
      '0': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      '1': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      '2': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      '3': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" }
    },
    mapSettings: {
      newPosSelect: 1,
      minZoom: 8,
      maxZoom: 18,
      startZoom: 8,
      west: 274300,
      south: 5936055,
      east: 360500,
      north: 6023976,
      startCenterLat: 53.095876,
      startCenterLon: 12.20896
    },
    kvwmapServerUrl: 'https://gdi-service.de/kvwmap_pet_dev',
    kvwmapServerLoginName: 'korduan',
    kvwmapServerPasswort: '',
    backgroundLayerSettings: [
      {
        label: 'Hintergrundkarte offline',
        online: false,
        type: 'tile',
        url: 'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/orka-tiles-vg/{z}/{x}/{y}.png',
        params: {
          attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.'
        }
      }, {
        label: 'Hintergrundkarte online',
        online: true,
        type: 'tile',
        url: 'https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png',
        params: {
          attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.'
        }
      }, {
        label: 'Luftbild online',
        online: true,
        type: 'wms',
        url: 'https://www.geodaten-mv.de/dienste/adv_dop',
        params: {
          layers: 'mv_dop',
          format: 'image/png',
          attribution: "Geoportal-MV DOP WMS"
        }
      }, {
        label: 'Luftbildkacheln online',
        online: true,
        type: 'tile',
        url: 'https://www.geodaten-mv.de/dienste/dop_wmts/wmts/mv_dop/ETRS89UTM33/{z}/{x}/{y}.png',
        params: {
          attribution: "Geoportal-MV DOP WMST"
        }
      }
    ]
  }, // LK-ROS
  {
    name: 'LK-VG',
    dbname: 'kvmobile',
    localImgPath:    'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/',
    localTilePath:   'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/',
    localBackupPath: 'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/Backups/',
    projZone: 33,
    logLevel: 4, // 0 off, 1 error, 2 waring, 3 info, 4 debug, 5 all
    debug: true,
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: 'kvwmap',
    markerStyles: {
      '0': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      '1': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      '2': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      '3': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" }
    },
    mapSettings: {
      newPosSelect: 2,
      minZoom: 8,
      maxZoom: 18,
      startZoom: 8,
      west: 339600,
      south: 5894500,
      east: 492200,
      north: 6016500,
      startCenterLat: 53.78441,
      startCenterLon: 13.81898
    },
    kvwmapServerUrl: 'https://geoportal-vg.de/kvwmap_test',
    kvwmapServerLoginName: 'kvmobile',
    kvwmapServerPasswort: '',
    backgroundLayerSettings: [
      {
        label: 'Hintergrundkarte offline',
        online: false,
        type: 'tile',
        url: 'https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png',
        params: {
        attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.'
        }
      }
    ]
  }, // LK-VG
  {
    name: 'LK-EE',
    version: '1.7.3',
    dbname: 'kvmobile',
    localImgPath:    'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/',
    localTilePath:   'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/',
    localBackupPath: 'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/Backups/',
    projZone: 33,
    logLevel: 4, // 0 off, 1 error, 2 waring, 3 info, 4 debug, 5 all
    debug: true,
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: 'kvwmap',
    markerStyles: {
      '0': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      '1': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      '2': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      '3': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" }
    },
    mapSettings: {
      newPosSelect: 1,
      minZoom: 9,
      maxZoom: 18,
      startZoom: 8,
      west: 13.04961,
      south: 51.353,
      east: 13.89345,
      north: 51.90666,
      startCenterLat: 51.6128,
      startCenterLon: 13.4658
    },
    kvwmapServerUrl: 'https://geoportal.lkee.de/',
    kvwmapServerLoginName: '',
    kvwmapServerPasswort: '',
    backgroundLayerSettings: [
      {
        label: 'Luftbilder online',
        online: true,
        type: 'wms',
        url: 'https://isk.geobasis-bb.de/ows/dop20c_wms',
        params: {
          layers: 'bebb_dop20c',
          format: 'image/png',
          transparent: true,
          attribution: "LGB WMS DOP20"
        }
      },
      {
        label: 'Vektorkacheln offline',
        online: true,
        type: 'vectortile',
        url: //'https://api.mapbox.com/styles/v1/pkorduan/ckrg05q6c4x7n17nr0kjbe6j9.html?fresh=true&title=view&access_token=pk.eyJ1IjoicGtvcmR1YW4iLCJhIjoiY2lxbm54b2Q4MDAzaGkzbWFodWtka2NsaCJ9.SiUN3rvZ1pbyOyZ3xQh-Hg#{z}/{x}/{y}',
        'http://gdi-service.de:8080/data/v3/{z}/{x}/{y}.pbf',
        style: 'teststyle.json',
        interactiv: false,
        params: {
          minZoom: 7,
          maxZoom: 14,
          west: 13.04961,
          south: 51.353,
          east: 13.89345,
          north: 51.90666,
          rendererFactory: L.canvas.tile, // replace with L.svg.tile if needed
          getFeatureId: function(f) {
            return f.properties.osm_id;
          },
          vectorTileLayerStyles: {
            // A plain set of L.Path options.
            landuse: {
              weight: 0,
              fillColor: '#9bc2c4',
              fillOpacity: 1,
              fill: true
            },
            // A function for styling features dynamically, depending on their
            // properties and the map's zoom level
            admin: function(properties, zoom) {
              var level = properties.admin_level;
              var weight = 1;
              if (level == 2) {
                weight = 2;
              }
              return {
                weight: weight,
                color: '#cf52d3',
                dashArray: '2, 6',
                fillOpacity: 0
              }
            },
            // A function for styling features dynamically, depending on their
            // properties, the map's zoom level, and the layer's geometry
            // dimension (point, line, polygon)
            water: function(properties, zoom, geometryDimension) {
              if (geometryDimension === 1) {   // point
                return ({
                        radius: 5,
                        color: '#cf52d3',
                });
              }

              if (geometryDimension === 2) {   // line
                return ({
                    weight: 1,
                    color: '#cf52d3',
                    dashArray: '2, 6',
                    fillOpacity: 0
                });
              }

              if (geometryDimension === 3) {   // polygon
                return ({
                    weight: 1,
                    fillColor: '#9bc2c4',
                    fillOpacity: 1,
                    fill: true
                });
              }
            },
            // An 'icon' option means that a L.Icon will be used
            place: {
              //icon: new L.Icon.Default()
            },
            road: [],
          },
          maxNativeZoom: 14,
          attribution: "OSM TileServer GL GDI-Service"
        }
      }
    ]
  }, // LK-EE
  {
    name: 'LK-MSE',
    dbname: 'kvmobile',
    localImgPath:    'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/',
    localTilePath:   'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/',
    localBackupPath: 'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/Backups/',
    projZone: 33,
    logLevel: 4,
    debug: true,
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: 'kvwmap',
    markerStyles: {
      '0': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      '1': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      '2': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      '3': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" }
    },
    mapSettings: {
      newPosSelect: 2,
      minZoom: 8,
      maxZoom: 18,
      startZoom: 8,
      west: 311109,
      south: 5894500,
      east: 428034,
      north: 5990606,
      startCenterLat: 53.50467,
      startCenterLon: 12.96181
    },
    kvwmapServerUrl: 'https://geoport-lk-mse.de/supergis',
    kvwmapServerLoginName: 'paulmobil',
    kvwmapServerPasswort: '',
    backgroundLayerSettings: [
      {
        label: 'Hintergrundkarte offline',
        online: false,
        type: 'tile',
        url: 'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/orka-tiles-vg/{z}/{x}/{y}.png',
        params: {
          attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.'
        }
      },
      {
        label: 'Hintergrundkarte online',
        online: true,
        type: 'tile',
        url: 'https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png',
        params: {
          attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.'
        }
      },
      {
        label: 'Luftbild online',
        online: true,
        type: 'wms',
        url: 'https://www.geodaten-mv.de/dienste/adv_dop',
        params: {
          layers: 'mv_dop',
          format: 'image/png',
          attribution: "Geoportal-MV DOP WMS"
        }
      },
      {
        label: 'Luftbildkacheln online',
        online: true,
        type: 'tile',
        url: 'https://www.geodaten-mv.de/dienste/dop_wmts/wmts/mv_dop/ETRS89UTM33/{z}/{x}/{y}.png',
        params: {
          attribution: "Geoportal-MV DOP WMST"
        }
      }
    ]
  }  // LK-MSE
]