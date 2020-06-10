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
  localImgPath: 'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/',
  localTilePath: 'file:///storage/emulated/0/Download/',
  localBackupPath: 'file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/',
  projZone: 33,
  logLevel: 3, // 0 off, 1 error, 2 waring, 3 info, 4 debug
  debug: true,
  kvwmapServerId: 1,
  kvwmapServerName: 'kvwmap',
  markerStyles: {
    '0': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
    '1': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
    '2': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
    '3': { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" }
  },

  // Bei Rostock
/*
  startZoom: 8,
  minZoom: 8,
  maxZoom: 18,
  maxExtent: [274300, 5936054.721, 360500, 6023975.279], 
  startPosition: [12.20896, 53.095876],
  kvwmapServerUrl: 'https://gdi-service.de/kvwmap_pet_dev',
  kvwmapServerLoginName: 'korduan',
  kvwmapServerPasswort: 'XKt!k$l6q6'
*/
  // LK-VG
  startZoom: 8,
  minZoom: 8,
  maxZoom: 18,
  maxExtent: [339600, 5894500, 492200, 6016500],
  startPosition: [53.78441, 13.81898],
  kvwmapServerUrl: 'https://geoportal-vg.de/kvwmap_test',
  kvwmapServerLoginName: 'kvmobile',
  kvwmapServerPasswort: ''

  // LK-ROS
/*
  startZoom: 8,
  minZoom: 8,
  maxZoom: 18,
  maxExtent: [154300, 5836054.721, 360500, 6023975.279],
  startPosition: [12.20896, 53.095876],
  kvwmapServerUrl: 'https://geoportal.lkros.de/kvwmap_dev',
  kvwmapServerLoginName: '',
  kvwmapServerPasswort: ''
*/

  // Noch eine Ausdehnung
/*
  startZoom: 8,
  minZoom: 8,
  maxZoom: 18,
  maxExtent: [254243.367, 5936500, 380556.633, 6023530],
  startPosition: [12.19127, 53.97413],
  kvwmapServerUrl: 'https://...',
  kvwmapServerLoginName: 'xy',
  kvwmapServerPasswort: 'z'
*/
}