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
  markerStyles: {
    '0': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
    '1': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
    '2': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
    '3': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" }
  },

  // LK-MSE
  mapSettings: {
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
  kvwmapServerLoginName: 'peter.korduan',
  kvwmapServerPasswort: '',
  backgroundLayerOnline: {
    type: 'tile',
    url: 'https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png',
    params: {
      attribution: 'Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.'
    }
  }
}