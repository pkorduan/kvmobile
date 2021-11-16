config = {
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
  localBackupPath: 'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/',
  projZone: 33,
  logLevel: 4, // 0 off, 1 error, 2 waring, 3 info, 4 debug, 5 all
  debug: true,
  kvwmapServerId: 1,
  kvwmapServerName: 'kvwmap',

/*
  // GDI-Service
  markerStyles: {
    '0': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
    '1': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
    '2': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
    '3': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" }
  },
  mapSettings : {
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
      label: 'ORKa offline',
      online: false,
      type: 'cordova',
      url: 'https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png',
      params: {
        maxZoom: 12,
        attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV',
        folder: 'kvmobile_tiles_osm',
        name:   'example',
        debug:   false
      }
    }, {
      label: 'Topo online',
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
      label: 'Luftbilder',
      online: true,
      type: 'tile',
      url: 'https://www.geodaten-mv.de/dienste/dop_wmts/wmts/mv_dop/ETRS89UTM33/{z}/{x}/{y}.png',
      params: {
        attribution: "Geoportal-MV DOP WMST"
      }
    }, {
      label: 'Luftbilder WMTS',
      online: true,
      type: 'wmts',
      url: 'https://www.geodaten-mv.de/dienste/dop_wmts/wmts/mv_dop/ETRS89UTM33/{z}/{x}/{y}.png',
      params: {
        layer: "Digitale Orthophotos",
        style: "default",
        tilematrixSet: "ETRS89UTM33",
        format: "image/png",
        attributation: "<a href=\"http://www.laiv-mv.de\">LaiV</a>"
      }
    }
  ]
*/
  // LK-MSE
  markerStyles: {
    '0': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#00c0c0" },
    '1': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
    '2': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
    '3': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#f73446" }
  },
  mapSettings : {
    newPosSelect: 1,
    minZoom: 8,
    maxZoom: 18,
    startZoom: 8,
    west: 4511882,
    south: 5890766,
    east: 4624797,
    north: 5989038,
    startCenterLat: 53.57307,
    startCenterLon: 12.99956
  },
  kvwmapServerUrl: 'https://geoport-lk-mse.de/kvwmap',
  kvwmapServerLoginName: 'paul_mobil',
  kvwmapServerPasswort: '',
  backgroundLayerSettings: [
    {
      label: 'ORKa offline',
      online: false,
      type: 'cordova',
      url: 'https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png',
      params: {
        maxZoom: 12,
        attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV',
        folder: 'kvmobile_tiles_osm',
        name:   'example',
        debug:   false
      }
    }, {
      label: 'Topo online',
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
    }
  ]

/*
  // LK-EE
  mapSettings : {
    newPosSelect: 1,
    minZoom: 8,
    maxZoom: 18,
    startZoom: 8,
    west: 331592,
    south: 5677145,
    east: 461195,
    north: 5767560,
    startCenterLat: 51.6128,
    startCenterLon: 13.4658
  },
  kvwmapServerUrl: 'https://geoportal.lkee.de/kvwmap',
  kvwmapServerLoginName: 'korduanpeter',
  kvwmapServerPasswort: '',
  backgroundLayerSettings: [
    {
      label: 'Hintergrundkarte online',
      online: true,
      type: 'tile',
      url : 'https://isk.geobasis-bb.de/mapproxy/dop20c_wmts/service?service=WMTS&request=GetTile&version=1.0.0&layer=bebb_dop20c&style=default&format=image/png&TileMatrixSet=grid_25833&TileMatrix={z}&TileRow={x}&TileCol={y}',
      params: {
        attribution: "LGB WMTS DOP20c"
      }
    }, {
      label: 'Hintergrundkarte online',
      online: true,
      type: 'wms',
      url: 'https://isk.geobasis-bb.de/ows/dop20c_wms',
      params: {
        layers: 'bebb_dop20c',
        format: 'image/png',
        transparent: true,
        attribution: "LGB WMS DOP20"
      }
    }
  ]
*/
/*
  // LK-VG
  mapSettings: {
    newPosSelect: 1,
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
}