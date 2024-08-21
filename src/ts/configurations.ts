import * as L from "leaflet";

import { BackgroundLayerSetting } from "./Layer";

// export type BackgroundLayerSettings = {
//   layer_id?: number;
//   label: string;
//   online: boolean;
//   style?: string;
//   interactiv?: boolean;
//   type: string;
//   url?: string;
//   params: any;
// };

export type Configuration = {
  name: string;
  dbname: string;
  fingerprintAuth: boolean;
  confirmSaveNew: boolean;
  viewAfterCreate: string;
  viewAfterUpdate: string;
  viewAfterDelete?: string;
  newAfterCreate: boolean;
  /*
   * Beispiele für Pfade in denen Bilder gespeichert werden
   * file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/
   * file:///storage/BA82-4AA9/Android/data/de.gdiservice.kvmobile/cache/
   * emulated/0 wird als default in den Einstellungen gesetzt
   * der Nutzer kann die Angabe unter Einstellungen setzen
   * wenn das erste Foto gespeichert wird mit dem Camera Plugin, wird
   * der verwendete Pfad ermittelt und die Einstellung überschrieben.
   */
  localImgPath: string;
  localTilePath: string;
  localBackupPath: string;
  projZone: number;
  logLevel: any;
  debug: boolean;
  fontSize: string;
  minTrackDistance: number;
  kvwmapServerId: number;
  kvwmapServerName: string;
  markerStyles: {
    [key: string]: { color: string; weight: number; fill: boolean; fillOpacity: number; fillColor: string };
  };
  mapSettings: {
    newPosSelect: number;
    minZoom: number;
    maxZoom: number;
    startZoom: number;
    west: number;
    south: number;
    east: number;
    north: number;
    startCenterLat: number;
    startCenterLon: number;
  };
  kvwmapServerUrl: string;
  kvwmapServerLoginName: string;
  kvwmapServerPasswort: string;
  backgroundLayerSettings: BackgroundLayerSetting[];
  confirmSave?: any;
  activeBackgroundLayerId?: string;
};

export const configurations: Configuration[] = [
  {
    name: "Standard",
    dbname: "kvmobile",
    fingerprintAuth: false,
    confirmSaveNew: false,
    viewAfterCreate: "last",
    viewAfterUpdate: "last",
    newAfterCreate: false,
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
    localImgPath: "cdvfile:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/",
    localTilePath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/",
    localBackupPath: "file:///storage/emulated/0/Documents/",
    projZone: 33,
    logLevel: 4,
    debug: true,
    fontSize: "24px",
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: "kvwmap",
    markerStyles: {
      "0": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      "1": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      "2": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      "3": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" },
    },
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
      startCenterLon: 13.4658,
    },
    kvwmapServerUrl: "https://gdi-service.de/kvwmap_pet_dev",
    kvwmapServerLoginName: "korduan",
    kvwmapServerPasswort: "",
    backgroundLayerSettings: [
      {
        layer_id: 1,
        label: "BaseMap DE",
        online: true,
        type: "wms",
        url: "https://sgx.geodatenzentrum.de/wms_basemapde",
        params: {
          layers: "de_basemapde_web_raster_farbe",
          format: "image/png",
          attribution: "Basemap DE dl-de/by-2-0",
        },
      },
      /*    {
                label: 'Luftbilder offline',
                online: false,
                type: 'tile',
                url : 'https://isk.geobasis-bb.de/mapproxy/dop20c_wmts/service?service=WMTS&request=GetTile&version=1.0.0&layer=bebb_dop20c&style=default&format=image/png&TileMatrixSet=grid_25833&TileMatrix={z}&TileRow={x}&TileCol={y}',
                params: {
                  attribution: "LGB WMTS DOP20c"
                }
              },
      {
        label: "Luftbilder online",
        online: true,
        type: "wms",
        url: "https://isk.geobasis-bb.de/ows/dop20c_wms",
        params: {
          layers: "bebb_dop20c",
          format: "image/png",
          transparent: true,
          attribution: "LGB WMS DOP20",
        },
      },*/
      /*
            {
              label: "Vektorkacheln offline",
              online: true,
              type: "vectortile",
              //'https://api.mapbox.com/styles/v1/pkorduan/ckrg05q6c4x7n17nr0kjbe6j9.html?fresh=true&title=view&access_token=pk.eyJ1IjoicGtvcmR1YW4iLCJhIjoiY2lxbm54b2Q4MDAzaGkzbWFodWtka2NsaCJ9.SiUN3rvZ1pbyOyZ3xQh-Hg#{z}/{x}/{y}',
              url: "https://gdi-service.de/tileserver-gl/data/v3/{z}/{x}/{y}.pbf",
              style: "default",
              interactiv: false,
              params: {
                minZoom: 7,
                maxZoom: 14,
                west: 13.04961,
                south: 51.353,
                east: 13.89345,
                north: 51.90666,
                // rendererFactory: L.canvas.tile,
                // TODO
                rendererFactory: L.canvas,
                getFeatureId: function (f) {
                  return f.properties.osm_id;
                },
                vectorTileLayerStyles: {
                  // A plain set of L.Path options.
                  landuse: {
                    weight: 0,
                    fillColor: "#9bc2c4",
                    fillOpacity: 1,
                    fill: true,
                  },
                  // A function for styling features dynamically, depending on their
                  // properties and the map's zoom level
                  admin: function (properties, zoom) {
                    var level = properties.admin_level;
                    var weight = 1;
                    if (level == 2) {
                      weight = 2;
                    }
                    return {
                      weight: weight,
                      color: "#cf52d3",
                      dashArray: "2, 6",
                      fillOpacity: 0,
                    };
                  },
                  // A function for styling features dynamically, depending on their
                  // properties, the map's zoom level, and the layer's geometry
                  // dimension (point, line, polygon)
                  water: function (properties, zoom, geometryDimension) {
                    if (geometryDimension === 1) {
                      // point
                      return {
                        radius: 5,
                        color: "#cf52d3",
                      };
                    }
                    if (geometryDimension === 2) {
                      // line
                      return {
                        weight: 1,
                        color: "#cf52d3",
                        dashArray: "2, 6",
                        fillOpacity: 0,
                      };
                    }
                    if (geometryDimension === 3) {
                      // polygon
                      return {
                        weight: 1,
                        fillColor: "#9bc2c4",
                        fillOpacity: 1,
                        fill: true,
                      };
                    }
                  },
                  // An 'icon' option means that a L.Icon will be used
                  place: {
                    //icon: new L.Icon.Default()
                  },
                  road: [],
                },
                maxNativeZoom: 14,
                attribution: "OSM TileServer GL GDI-Service",
              },
            },
      */
    ],
  },
  {
    name: "LK-ROS",
    dbname: "kvmobile",
    fingerprintAuth: false,
    confirmSaveNew: false,
    viewAfterCreate: "last",
    viewAfterUpdate: "last",
    newAfterCreate: false,
    localImgPath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/",
    localTilePath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/",
    localBackupPath: "file:///storage/emulated/0/Documents/",
    projZone: 33,
    logLevel: 4,
    debug: true,
    fontSize: "24px",
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: "kvwmap",
    markerStyles: {
      "0": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      "1": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      "2": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      "3": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" },
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
      startCenterLon: 12.20896,
    },
    kvwmapServerUrl: "https://gdi-service.de/kvwmap_pet_dev",
    kvwmapServerLoginName: "korduan",
    kvwmapServerPasswort: "",
    backgroundLayerSettings: [
      {
        layer_id: 1,
        label: "Hintergrundkarte offline",
        online: false,
        type: "tile",
        url: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/orka-tiles-vg/{z}/{x}/{y}.png",
        params: {
          attribution: "Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.",
        },
      },
      {
        layer_id: 2,
        label: "Hintergrundkarte online",
        online: true,
        type: "tile",
        url: "https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png",
        params: {
          attribution: "Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.",
        },
      },
      {
        layer_id: 3,
        label: "Luftbild online",
        online: true,
        type: "wms",
        url: "https://www.geodaten-mv.de/dienste/adv_dop",
        params: {
          layers: "mv_dop",
          format: "image/png",
          attribution: "Geoportal-MV DOP WMS",
        },
      },
      {
        layer_id: 4,
        label: "Luftbildkacheln online",
        online: true,
        type: "tile",
        url: "https://www.geodaten-mv.de/dienste/dop_wmts/wmts/mv_dop/ETRS89UTM33/{z}/{x}/{y}.png",
        params: {
          attribution: "Geoportal-MV DOP WMST",
        },
      },
    ],
  },
  {
    name: "LK-VR",
    dbname: "kvmobile",
    fingerprintAuth: false,
    confirmSaveNew: false,
    viewAfterCreate: "last",
    viewAfterUpdate: "last",
    newAfterCreate: false,
    localImgPath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/",
    localTilePath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/",
    localBackupPath: "file:///storage/emulated/0/Documents/",
    projZone: 33,
    logLevel: 4,
    debug: true,
    fontSize: "24px",
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: "kvwmap",
    markerStyles: {
      "0": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      "1": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      "2": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      "3": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" },
    },
    mapSettings: {
      newPosSelect: 1,
      minZoom: 8,
      maxZoom: 18,
      startZoom: 8,
      west: 12.16,
      south: 53.88,
      east: 13.858,
      north: 54.737,
      startCenterLat: 54.294,
      startCenterLon: 12.981,
    },
    kvwmapServerUrl: "https://geoport.lk-vr.de",
    kvwmapServerLoginName: "",
    kvwmapServerPasswort: "",
    backgroundLayerSettings: [
      {
        layer_id: 1,
        label: "Regionalkarte offline",
        online: false,
        type: "tile",
        url: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/orka-tiles-vg/{z}/{x}/{y}.png",
        params: {
          attribution: "Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.",
        },
      },
      {
        layer_id: 2,
        label: "Regionalkarte online",
        online: true,
        type: "tile",
        url: "https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png",
        params: {
          attribution: "Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.",
        },
      },
      {
        layer_id: 3,
        label: "Luftbild online",
        online: true,
        type: "wms",
        url: "https://www.geodaten-mv.de/dienste/adv_dop",
        params: {
          layers: "mv_dop",
          format: "image/png",
          attribution: "Geoportal-MV DOP WMS",
        },
      },
    ],
  },
  {
    name: "LK-VG",
    dbname: "kvmobile",
    fingerprintAuth: false,
    confirmSaveNew: false,
    viewAfterCreate: "last",
    viewAfterUpdate: "last",
    newAfterCreate: false,
    localImgPath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/",
    localTilePath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/",
    localBackupPath: "file:///storage/emulated/0/Documents/",
    projZone: 33,
    logLevel: 4,
    debug: true,
    fontSize: "24px",
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: "kvwmap",
    markerStyles: {
      "0": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      "1": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      "2": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      "3": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" },
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
      startCenterLon: 13.81898,
    },
    kvwmapServerUrl: "https://geoportal-vg.de/kvwmap_test",
    kvwmapServerLoginName: "kvmobile",
    kvwmapServerPasswort: "",
    backgroundLayerSettings: [
      {
        label: "Hintergrundkarte offline",
        online: false,
        type: "tile",
        url: "https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png",
        params: {
          attribution: "Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.",
        },
      },
    ],
  },
  {
    name: "Biospährenreservat Südost-Rügen",
    dbname: "kvmobile",
    fingerprintAuth: false,
    confirmSaveNew: false,
    viewAfterCreate: "last",
    viewAfterUpdate: "last",
    newAfterCreate: false,
    localImgPath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/",
    localTilePath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/",
    localBackupPath: "file:///storage/emulated/0/Documents/",
    projZone: 33,
    logLevel: 4,
    debug: true,
    fontSize: "24px",
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: "kvwmap",
    markerStyles: {
      "0": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      "1": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      "2": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      "3": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" },
    },
    mapSettings: {
      newPosSelect: 2,
      minZoom: 11,
      maxZoom: 18,
      startZoom: 11,
      west: 13.41325,
      south: 54.26467,
      east: 13.77459,
      north: 54.40732,
      startCenterLat: 54.35742,
      startCenterLon: 13.62101,
    },
    kvwmapServerUrl: "https://geoport.lk-vr.de/kvwmap",
    kvwmapServerLoginName: "",
    kvwmapServerPasswort: "",
    backgroundLayerSettings: [
      {
        layer_id: 50304552,
        label: "ORKA online",
        online: true,
        type: "tile",
        url: "https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png",
        params: {
          attribution: "Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.",
        },
      },
      {
        layer_id: 503045521,
        label: "OSM offline",
        online: false,
        type: "vectortile",
        url: "https://gdi-service.de/tileserver-gl-mv/data/v3/{z}/{x}/{y}.pbf",
        style: "basic-MV",
        interactiv: false,
        params: {
          minZoom: 9,
          maxZoom: 18,
          maxNativeZoom: 14,
          west: 13.41325,
          south: 54.26467,
          east: 13.77459,
          north: 54.40732,
          bounds: [
            [54.26467, 13.41325],
            [54.40732, 13.77459],
          ],
          // rendererFactory: L.canvas.tile,
          // TODO
          rendererFactory: L.canvas,
          getFeatureId: function (f) {
            return f.properties.osm_id;
          },
          vectorTileLayerStyles: {
            // A plain set of L.Path options.
            landuse: {
              weight: 0,
              fillColor: "#9bc2c4",
              fillOpacity: 1,
              fill: true,
            },
            // A function for styling features dynamically, depending on their
            // properties and the map's zoom level
            admin: function (properties, zoom) {
              var level = properties.admin_level;
              var weight = 1;
              if (level == 2) {
                weight = 2;
              }
              return {
                weight: weight,
                color: "#cf52d3",
                dashArray: "2, 6",
                fillOpacity: 0,
              };
            },
            // A function for styling features dynamically, depending on their
            // properties, the map's zoom level, and the layer's geometry
            // dimension (point, line, polygon)
            water: function (properties, zoom, geometryDimension) {
              if (geometryDimension === 1) {
                // point
                return {
                  radius: 5,
                  color: "#cf52d3",
                };
              }
              if (geometryDimension === 2) {
                // line
                return {
                  weight: 1,
                  color: "#cf52d3",
                  dashArray: "2, 6",
                  fillOpacity: 0,
                };
              }
              if (geometryDimension === 3) {
                // polygon
                return {
                  weight: 1,
                  fillColor: "#9bc2c4",
                  fillOpacity: 1,
                  fill: true,
                };
              }
            },
            // An 'icon' option means that a L.Icon will be used
            place: {
              //icon: new L.Icon.Default()
            },
            road: [],
          },
          attribution: "OSM TileServer GL GDI-Service",
        },
      },
      {
        layer_id: 50304407,
        label: "Luftbilder online",
        online: true,
        type: "wms",
        url: "https://www.geodaten-mv.de/dienste/adv_dop",
        params: {
          layers: "mv_dop",
          format: "image/png",
          attribution: "Geoportal-MV DOP WMS",
        },
      },
      {
        layer_id: 503044071,
        label: "Luftbilder offline",
        online: true,
        type: "tile",
        url: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/bing_satellite/{z}/{x}/{y}.jpeg",
        params: {
          attribution: "Bing Satellite",
        },
      },
    ],
  },
  {
    name: "LK-EE",
    dbname: "kvmobile",
    fingerprintAuth: false,
    confirmSaveNew: false,
    viewAfterCreate: "last",
    viewAfterUpdate: "last",
    newAfterCreate: false,
    localImgPath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/",
    localTilePath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/",
    localBackupPath: "file:///storage/emulated/0/Documents/",
    projZone: 33,
    logLevel: 4,
    debug: true,
    fontSize: "24px",
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: "kvwmap",
    markerStyles: {
      "0": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      "1": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      "2": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      "3": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" },
    },
    mapSettings: {
      newPosSelect: 1,
      minZoom: 9,
      maxZoom: 19,
      startZoom: 8,
      west: 13.02,
      south: 51.25,
      east: 13.91,
      north: 51.9,
      startCenterLat: 51.6128,
      startCenterLon: 13.4658,
    },
    kvwmapServerUrl: "https://geoportal.lkee.de/",
    kvwmapServerLoginName: "",
    kvwmapServerPasswort: "",
    backgroundLayerSettings: [
      {
        layer_id: 1,
        label: "Vektorkacheln offline",
        online: false,
        type: "vectortile",
        //'https://api.mapbox.com/styles/v1/pkorduan/ckrg05q6c4x7n17nr0kjbe6j9.html?fresh=true&title=view&access_token=pk.eyJ1IjoicGtvcmR1YW4iLCJhIjoiY2lxbm54b2Q4MDAzaGkzbWFodWtka2NsaCJ9.SiUN3rvZ1pbyOyZ3xQh-Hg#{z}/{x}/{y}',
        url: "https://gdi-service.de/tileserver-gl/data/v3/{z}/{x}/{y}.pbf",
        style: "default",
        interactiv: false,
        params: {
          minZoom: 7,
          maxZoom: 18,
          west: 13.02,
          south: 51.35,
          east: 13.91,
          north: 51.9,
          bounds: [
            [51.35, 13.02],
            [51.9, 13.91],
          ],
          // rendererFactory: L.canvas.tile,
          // TODO
          rendererFactory: L.canvas,
          getFeatureId: function (f) {
            return f.properties.osm_id;
          },
          vectorTileLayerStyles: {
            // A plain set of L.Path options.
            landuse: {
              weight: 0,
              fillColor: "#9bc2c4",
              fillOpacity: 1,
              fill: true,
            },
            // A function for styling features dynamically, depending on their
            // properties and the map's zoom level
            admin: function (properties, zoom) {
              var level = properties.admin_level;
              var weight = 1;
              if (level == 2) {
                weight = 2;
              }
              return {
                weight: weight,
                color: "#cf52d3",
                dashArray: "2, 6",
                fillOpacity: 0,
              };
            },
            // A function for styling features dynamically, depending on their
            // properties, the map's zoom level, and the layer's geometry
            // dimension (point, line, polygon)
            water: function (properties, zoom, geometryDimension) {
              if (geometryDimension === 1) {
                // point
                return {
                  radius: 5,
                  color: "#cf52d3",
                };
              }
              if (geometryDimension === 2) {
                // line
                return {
                  weight: 1,
                  color: "#cf52d3",
                  dashArray: "2, 6",
                  fillOpacity: 0,
                };
              }
              if (geometryDimension === 3) {
                // polygon
                return {
                  weight: 1,
                  fillColor: "#9bc2c4",
                  fillOpacity: 1,
                  fill: true,
                };
              }
            },
            // An 'icon' option means that a L.Icon will be used
            place: {
              //icon: new L.Icon.Default()
            },
            road: [],
          },
          maxNativeZoom: 14,
          attribution: "OSM TileServer GL GDI-Service",
        },
      },
      {
        layer_id: 2,
        label: "Luftbilder online",
        online: true,
        type: "wms",
        url: "https://isk.geobasis-bb.de/mapproxy/dop20c/service/wms",
        params: {
          layers: "bebb_dop20c",
          format: "image/png",
          transparent: true,
          attribution: "LGB WMS DOP20",
          minZoom: 7,
          maxZoom: 18,
          west: 13.02,
          south: 51.35,
          east: 13.91,
          north: 51.9,
          bounds: [
            [51.35, 13.02],
            [51.9, 13.91],
          ],
        },
      },
      /*      {
        label: "Luftbilder offline",
        online: false,
        type: "tile",
        url: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/dop-20/{z}/{x}/{y}.png",
        params: {
          attribution: "LGB WMS DOP20",
        },
      }
*/
    ],
  },
  {
    name: "LK-MSE",
    dbname: "kvmobile",
    fingerprintAuth: false,
    confirmSaveNew: false,
    viewAfterCreate: "last",
    viewAfterUpdate: "last",
    newAfterCreate: false,
    localImgPath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/",
    localTilePath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/",
    localBackupPath: "file:///storage/emulated/0/Documents/",
    projZone: 33,
    logLevel: 4,
    debug: true,
    fontSize: "24px",
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: "kvwmap",
    markerStyles: {
      "0": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      "1": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      "2": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      "3": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" },
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
      startCenterLon: 12.96181,
    },
    kvwmapServerUrl: "https://geoport-lk-mse.de/supergis",
    kvwmapServerLoginName: "paulmobil",
    kvwmapServerPasswort: "",
    backgroundLayerSettings: [
      {
        layer_id: 1,
        label: "Hintergrundkarte offline",
        online: false,
        type: "tile",
        url: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/orka-tiles-vg/{z}/{x}/{y}.png",
        params: {
          attribution: "Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.",
        },
      },
      {
        layer_id: 2,
        label: "Hintergrundkarte online",
        online: true,
        type: "tile",
        url: "https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png",
        params: {
          attribution: "Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.",
        },
      },
      {
        layer_id: 3,
        label: "Luftbild online",
        online: true,
        type: "wms",
        url: "https://www.geodaten-mv.de/dienste/adv_dop",
        params: {
          layers: "mv_dop",
          format: "image/png",
          attribution: "Geoportal-MV DOP WMS",
        },
      },
      {
        layer_id: 4,
        label: "Luftbildkacheln online",
        online: true,
        type: "tile",
        url: "https://www.geodaten-mv.de/dienste/dop_wmts/wmts/mv_dop/ETRS89UTM33/{z}/{x}/{y}.png",
        params: {
          attribution: "Geoportal-MV DOP WMST",
        },
      },
    ],
  },
  {
    name: "GDI-Service",
    dbname: "kvmobile",
    fingerprintAuth: false,
    confirmSaveNew: false,
    viewAfterCreate: "last",
    viewAfterUpdate: "last",
    newAfterCreate: false,
    localImgPath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/",
    localTilePath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/",
    localBackupPath: "file:///storage/emulated/0/Documents/",
    projZone: 33,
    logLevel: 4,
    debug: true,
    fontSize: "24px",
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: "kvwmap",
    markerStyles: {
      "0": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      "1": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      "2": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      "3": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" },
    },
    mapSettings: {
      newPosSelect: 1,
      minZoom: 8,
      maxZoom: 18,
      startZoom: 8,
      west: 10.5,
      south: 53.0,
      east: 14.75,
      north: 54.75,
      startCenterLat: 54.1,
      startCenterLon: 12.1,
    },
    kvwmapServerUrl: "https://dev.gdi-service.de/kvwmap_pet_dev",
    kvwmapServerLoginName: "korduan",
    kvwmapServerPasswort: "",
    backgroundLayerSettings: [
      /*      {
        label: "Vektorkacheln mit Cache",
        online: true,
        type: "vectortile",
        //'https://api.mapbox.com/styles/v1/pkorduan/ckrg05q6c4x7n17nr0kjbe6j9.html?fresh=true&title=view&access_token=pk.eyJ1IjoicGtvcmR1YW4iLCJhIjoiY2lxbm54b2Q4MDAzaGkzbWFodWtka2NsaCJ9.SiUN3rvZ1pbyOyZ3xQh-Hg#{z}/{x}/{y}',
        url: "https://gdi-service.de/tileserver-gl-mv/data/v3/{z}/{x}/{y}.pbf",
        style: "default",
        interactiv: false,
        params: {
          minZoom: 7,
          maxZoom: 18,
          west: 10.5,
          south: 53.0,
          east: 14.75,
          north: 54.75,
          bounds: [
            [53.0, 10.5],
            [54.75, 14.75],
          ],
          // rendererFactory: L.canvas.tile,
          // TODO
          rendererFactory: L.canvas,
          getFeatureId: function (f) {
            return f.properties.osm_id;
          },
          vectorTileLayerStyles: {
            // A plain set of L.Path options.
            landuse: {
              weight: 0,
              fillColor: "#9bc2c4",
              fillOpacity: 1,
              fill: true,
            },
            // A function for styling features dynamically, depending on their
            // properties and the map's zoom level
            admin: function (properties, zoom) {
              var level = properties.admin_level;
              var weight = 1;
              if (level == 2) {
                weight = 2;
              }
              return {
                weight: weight,
                color: "#cf52d3",
                dashArray: "2, 6",
                fillOpacity: 0,
              };
            },
            // A function for styling features dynamically, depending on their
            // properties, the map's zoom level, and the layer's geometry
            // dimension (point, line, polygon)
            water: function (properties, zoom, geometryDimension) {
              if (geometryDimension === 1) {
                // point
                return {
                  radius: 5,
                  color: "#cf52d3",
                };
              }
              if (geometryDimension === 2) {
                // line
                return {
                  weight: 1,
                  color: "#cf52d3",
                  dashArray: "2, 6",
                  fillOpacity: 0,
                };
              }
              if (geometryDimension === 3) {
                // polygon
                return {
                  weight: 1,
                  fillColor: "#9bc2c4",
                  fillOpacity: 1,
                  fill: true,
                };
              }
            },
            // An 'icon' option means that a L.Icon will be used
            place: {
              //icon: new L.Icon.Default()
            },
            road: [],
          },
          maxNativeZoom: 14,
          attribution: "OSM TileServer GL GDI-Service",
        },
      },
*/
      /*
      {
        label: "Hintergrundkarte offline",
        online: false,
        type: "tile",
        url: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/orka-tiles-vg/{z}/{x}/{y}.png",
        params: {
          attribution: "Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.",
        },
      },
*/
      {
        layer_id: 1,
        label: "Hintergrundkarte online",
        online: true,
        type: "tile",
        url: "https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png",
        params: {
          attribution: "Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.",
        },
      },
      {
        layer_id: 1,
        label: "Luftbild online",
        online: true,
        type: "wms",
        url: "https://www.geodaten-mv.de/dienste/adv_dop",
        params: {
          layers: "mv_dop",
          format: "image/png",
          attribution: "Geoportal-MV DOP WMS",
        },
      },
      /*
      {
        label: "Luftbildkacheln online",
        online: true,
        type: "tile",
        url: "https://www.geodaten-mv.de/dienste/dop_wmts/wmts/mv_dop/ETRS89UTM33/{z}/{x}/{y}.png",
        params: {
          attribution: "Geoportal-MV DOP WMST",
        },
      },
      */
    ],
  }, // GDI-Service
  {
    name: "Streuobst KOB",
    dbname: "kvmobile",
    fingerprintAuth: false,
    confirmSaveNew: false,
    viewAfterCreate: "formular",
    viewAfterUpdate: "dataView",
    newAfterCreate: false,
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
    localImgPath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/",
    localTilePath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/",
    localBackupPath: "file:///storage/emulated/0/Documents/",
    projZone: 33,
    logLevel: 4,
    debug: true,
    fontSize: "24px",
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: "kvwmap",
    markerStyles: {
      "0": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      "1": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      "2": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      "3": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" },
    },
    mapSettings: {
      newPosSelect: 1,
      minZoom: 8,
      maxZoom: 18,
      startZoom: 8,
      west: 5.81839,
      south: 47.53976,
      east: 15.07015,
      north: 55.0682,
      startCenterLat: 48.63346,
      startCenterLon: 9.03363,
    },
    kvwmapServerUrl: "https://mvbio.de/streuobst",
    kvwmapServerLoginName: "",
    kvwmapServerPasswort: "",
    backgroundLayerSettings: [
      {
        layer_id: 1,
        label: "BaseMap DE",
        online: true,
        type: "wms",
        url: "https://sgx.geodatenzentrum.de/wms_basemapde",
        params: {
          layers: "de_basemapde_web_raster_farbe",
          format: "image/png",
          attribution: "Basemap DE dl-de/by-2-0",
        },
      },
      {
        layer_id: 2,
        label: "Luftbilder",
        online: true,
        type: "bing",
        params: {
          BING_KEY: "AqPPMA0XK54KqnsEpK_wSbcg4laDT0eqrS3c-XrMKhW10FJODMwETRJp5nbYPb-u",
          attribution: "© 2024 Microsoft Corporation",
        },
      },
    ],
  },
  {
    name: "Streuobst MV",
    dbname: "kvmobile",
    fingerprintAuth: false,
    confirmSaveNew: false,
    viewAfterCreate: "last",
    viewAfterUpdate: "last",
    newAfterCreate: false,
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
    localImgPath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/cache/",
    localTilePath: "file:///storage/emulated/0/Android/data/de.gdiservice.kvmobile/files/",
    localBackupPath: "file:///storage/emulated/0/Documents/",
    projZone: 33,
    logLevel: 4,
    debug: true,
    fontSize: "24px",
    minTrackDistance: 5,
    kvwmapServerId: 1,
    kvwmapServerName: "kvwmap",
    markerStyles: {
      "0": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#dd8181" },
      "1": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#465dc0" },
      "2": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#23a325" },
      "3": { color: "#000000", weight: 4, fill: true, fillOpacity: 0.8, fillColor: "#26a7f1" },
    },
    mapSettings: {
      newPosSelect: 1,
      minZoom: 8,
      maxZoom: 18,
      startZoom: 8,
      west: 7.48,
      south: 47.56,
      east: 14.75,
      north: 54.75,
      startCenterLat: 54.1,
      startCenterLon: 12.1,
    },
    kvwmapServerUrl: "https://mvbio.de/streuobst",
    kvwmapServerLoginName: "kobmbl",
    kvwmapServerPasswort: "",
    backgroundLayerSettings: [
      {
        layer_id: 1,
        label: "BaseMap DE",
        online: true,
        type: "wms",
        url: "https://sgx.geodatenzentrum.de/wms_basemapde",
        params: {
          layers: "de_basemapde_web_raster_farbe",
          format: "image/png",
          attribution: "Basemap DE dl-de/by-2-0",
        },
      },
      {
        layer_id: 2,
        label: "ORKA",
        online: true,
        type: "tile",
        url: "https://www.orka-mv.de/geodienste/orkamv/tiles/1.0.0/orkamv/GLOBAL_WEBMERCATOR/{z}/{x}/{y}.png",
        params: {
          attribution: "Kartenbild &copy; Hanse- und Universitätsstadt Rostock (CC BY 4.0) | Kartendaten &copy; OpenStreetMap (ODbL) und LkKfS-MV.",
        },
      },
      {
        layer_id: 3,
        label: "Luftbild",
        online: true,
        type: "wms",
        url: "https://www.geodaten-mv.de/dienste/adv_dop",
        params: {
          layers: "mv_dop",
          format: "image/png",
          attribution: "Geoportal-MV DOP WMS",
        },
      },
    ],
  },
];
//# sourceMappingURL=config.js.map
