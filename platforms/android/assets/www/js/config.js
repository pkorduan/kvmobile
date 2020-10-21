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
  localBackupPath: 'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/Backups/',
  projZone: 33,
  logLevel: 3, // 0 off, 1 error, 2 waring, 3 info, 4 debug, 5 all
  debug: true,
  kvwmapServerId: 1,
  kvwmapServerName: 'kvwmap',
  markerStyles: {
    '0': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
    '1': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
    '2': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
    '3': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" }
  },

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

/*
  // LK-EE
  mapSettings: {
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
  kvwmapServerUrl: 'https://geoportal.lkee.de',
  kvwmapServerLoginName: '',
  kvwmapServerPasswort: '',
  backgroundLayerOnline: {
    type: 'tile',
    url : 'https://isk.geobasis-bb.de/mapproxy/dop20c_wmts/service?service=WMTS&request=GetTile&version=1.0.0&layer=bebb_dop20c&style=default&format=image/png&TileMatrixSet=grid_25833&TileMatrix={z}&TileRow={x}&TileCol={y}',
    params: {
      attribution: "LGB WMTS DOP20c"
    }
  }
*/
}