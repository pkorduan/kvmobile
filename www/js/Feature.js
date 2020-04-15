/*
* Klasse zum Vorhalten der Datenobjekte zur Laufzeit der Anwendung
* Ein Feature ist leer (außer die automatisch generierte uuid) wenn es neu angelegt werden soll
* oder enthält die Daten eines Datensatzes des Layers.
* Soll ein Feature editiert werden, wird dieses in das Formular geladen
* Beim Speichern wird das Feature nicht über das Formular aktualisiert, sondern die Daten
* aus dem Formular entnommen in die Datenbank geschrieben und dann sämtliche Daten neu geladen.
* ToDo: Das ist sicher nicht sinnvoll, gerade wenn man viele Daten hat. Es sollte dann nur das Featureobjekt
* neu gebildet werden und der Eintrag in der featureList und die Darstellung in der Karte.
* Wir erfolgt die Änderung der Koordianten:
* 
* Enthält folgende Transformations-Funktionen für Koordinaten
* von einem Format zu, nächsten
* wkb, wkx, latLng, aLatLng, latLngs, aLatLngs, coord, coords
* latLngToWkx // z.B. latLng aus getCenter() übernehmen und für Feature speichern in wkx
* aLatLngToWkx // z.B. um latitude und longitude von geolocation in Feature zu speichern
* coordToWkx // z.B. um lng und lat aus Geolocation in Feature speichern
* wkxToLatLngs // z.B. um aus Feature Marker oder Polylines in Karte zu zeichnen
* wkxToLatLng // z.B. um von einem Punktfeature ein Marker zu erzeugen
* wkbToWkx // um die PostGIS Geometrie in das Wkx Objekt zu übernehmen
* wkxToWkb // um die Geometrie von wkx Objekt in die PostGIS-Geometrie rauszuschreiben beim Speichern
* aLatLngs und aCoords Funktionen sind identisch mit den ohne a, enthalten aber Arrays von LatLngs bzw. Coords
* aLatLngs und aCoords können bei Polygon und Multi-Geometrien verschachtelt sein.
* Wenn das Zentrale Format immer wkx ist, kann man mit fromXY und asXY alle Transformationen umsetzen
*/
function Feature(
  data = {},
  options = {
    id_attribute: 'uuid',
    geometry_type: 'Point',
    geometry_attribute: 'geom',
    new: true
  }) {
  //console.log('Create Feature with data: %o and options: %o', data, options);
  this.data = (typeof data == 'string' ? $.parseJSON(data) : data);
  this.options = options; // Optionen, die beim Erzeugen des Features mit übergeben wurden. Siehe Default-Argument in init-Klasse.
  this.id = this.data[options.id_attribute];
  this.markerId = ''; // Id des Layers (z.B. circleMarkers) in dem das Feature gezeichnet ist
  this.editableLayer = L.marker(kvm.map.getCenter()); // Leaflet Layer-Objekt in dem die editierbare Geometrie ist //ToDo starte an vorhandener Position
  this.editable = false; // Feature ist gerade im Modus editierbar oder nicht

  this.get = function(key) {
    return (typeof this.data[key] == 'undefined' ? 'null' : this.data[key]);
  };

  this.setEditable = function(editable) {
    if (editable) {
      console.log('Setze feature: %s editierbar.', this.id);
      this.editableLayer = kvm.controller.mapper.createEditable(this);
    }
    else {
      console.log('Entferne editierbare Geometrie von feature: %s.', this.id);
      this.editableLayer = kvm.controller.mapper.removeEditable(this);
    }
    this.editable = editable;
  };

  this.showPopupButtons = function() {
    return kvm.activeLayer.showPopupButtons;
  };

  this.getAsArray = function(key) {
    return (this.data[key] ? this.data[key].slice(1, -1).split(',') : []);
  };

  this.getFeatureId = function() {
    return this.get(this.options.id_attribute);
  };

  this.set = function(key, value) {
    this.data[key] = value;
    return this.data[key];
  };

  this.getData = function() {
    return this.data;
  };

  this.setData = function(data) {
    //console.log('Feature.setData %o', data);
    this.data = (typeof data == 'string' ? $.parseJSON(data) : data);
  };

  /*
  * Setzt die Geometrie neu an Hand der übergebenen wkx Geometrie neu wenn sie sich gegenüber der vorherigen geändert hat.
  * und lößt den Trigger aus, der angibt, dass sich die Geom des Features geändert hat.
  */
  this.setGeom = function(wkx) {
    console.log('setGeom mit wkx: %o', wkx);
    var oldGeom = this.newGeom;
    this.newGeom = wkx;
    console.log('vergleiche oldGeom: %o mit newGeom: %o', oldGeom, this.newGeom);

    if (oldGeom != this.newGeom) {
      console.log('Neuer Wert wurde gesetzt. Löse Trigger geomChanged mit exclude wkx aus.');
      $(document).trigger('geomChanged', [{ geom: this.newGeom, exclude: 'wkx'}]);
    }
  };

  /*
  * Setzt die LatLngs des editableLayers auf die übergebene Geometrie
  * wenn sich der Wert zu dem vorherigen geändert hat und
  * lößt einen Trigger aus, der angibt, dass sich die Geom des Features geändert hat.
  */
  this.setLatLngs = function(geom) {
    console.log('setLatLngs in feature with geom: %o', geom);
    var newLatLngs = this.wkxToLatLngs(geom),
        oldLatLngs = this.getLatLngs();

    console.log('vergleiche alte mit neuer coord');
    if (oldLatLngs != newLatLngs) {
      console.log('Ändere alte latlngs: %o auf neue: %o', oldLatLngs, newLatLngs);
      if (this.options.geometry_type == 'Point') {
        this.editableLayer.setLatLng(newLatLngs);
      }
      else {
        this.editableLayer.setLatLngs(newLatLngs);
      }
      $(document).trigger('geomChanged', [{ geom: geom, exclude: 'latlngs'}]);
    }
    console.log('Neue latLngs für die Editable Geometry in der Karte: %o', newLatLngs);
  };

  this.getLatLngs = function() {
    console.log('getLatLngs');
    if (this.options.geometry_attribute == 'Point') {
      return this.editableLayer.getLatLng();
    }
    else {
      return this.editableLayer.getLatLng();
    }
  };

  /*
  * Gibt von einem WKX Geometry Objekt ein Array mit latlng Werten aus.
  */
  this.wkxToLatLngs = function(geom = this.geom) {
    // ToDo hier ggf. den Geometrietyp auch aus this.geometry_type auslesen und nicht aus der übergebenen geom
    // Problem dann, dass man die Funktion nur benutzen kann für den Geometrietype des activeLayer
    var coordsLevelDeep = kvm.controller.mapper.coordsLevelsDeep[geom.toWkt().split('(')[0].toUpperCase()];
    return (coordsLevelDeep == 0 ? L.GeoJSON.coordsToLatLng(geom.toGeoJSON().coordinates) : L.GeoJSON.coordsToLatLngs(geom.toGeoJSON().coordinates, coordsLevelDeep));
  };

  /*
  * Erzeugt an Hand des übergebenen wkb Strings ein wkx-Geometry-Objekt mit eastnorth Werten
  */
  this.wkbToWkx = function(wkb) {
    return kvm.wkx.Geometry.parse(new kvm.Buffer(wkb, 'hex'));
  };

  /*
  * Konvertiert das Array von Lat,Lng Werten alatlngs in ein wkx.Geometry-Objekt
  * Je nach dem ob das Feature ein Punkt, Linie oder Fläche ist wird daraus eine entsprechende WKX-Geometrie gemacht
  * Die Funktion wandelt die Koordinatenachsenreihenfolge von latlng auf eastnorth!
  * @return Liefert das erzeugte WKX-Geometrie-Objekt zurück.
  * Umformungsvarianten für WKX-Geometrie sind:
  * -> WKB für den Wert des geom_attribut: geom.toWkb().toString('hex') => '0101000000000000000000f03f0000000000000040'
  * -> LatLng für die Geometrie des circleMarkers oder/und editables: kvm.controller.mapper.toLatLngs(geom) => [[[54, 12], [54.1 12.1]],[[54 12], [...]],[...]]]
  * -> WKT für die Anzeige im Formular: geom.toWkt() => 'MULTIPOLYGON(((54, 12 ....)))'
  */
  this.aLatLngsToWkx = function(alatlngs) {
    var result;

    switch (this.options.geometry_type) {
      case 'Point' : result = kvm.wkx.Geometry.parse('SRID=4326;POINT(' + alatlngs[0][1] + ' ' + alatlngs[0][0] + ')');
      break;
      case 'MultiPoint' : result = kvm.wkx.Geometry.parse('SRID=4326;MULTIPOINT(' + alatlngs.map(function(point) { return point[1] + ' ' + point[0]; }).join(', ') + ')');
      break;
      case 'Linestring' : result = kvm.wkx.Geometry.parse('SRID=4326;LINESTRING(' + alatlngs.map(function(point) { return point[1] + ' ' + point[0]; }).join(', ') + ')');
      break; 
      case 'MultiLinestring' : result = kvm.wkx.Geometry.parse('SRID=4326;MULTILINESTRING(' + alatlngs.map(function(linestring) { return '(' + linestring.map(function(point) { return point[1] + ' ' + point[0]; }).join(', ') + ')'; }).join(', ') + ')');
      break;
      case 'Polygon' : result = kvm.wkx.Geometry.parse('SRID=4326;POLYGON(' + alatlngs.map(function(polyline) { return '(' + polyline.map(function(point) { return point[1] + ' ' + point[0]; }).join(', ') + ')'; }).join(', ') + ')');
        break;
        case 'MultiPolygon' : result = kvm.wkx.Geometry.parse('SRID=4326;MULTIPOLYGON(' + alatlngs.map(function(polygon) { return '(' + polygon.map(function(polyline) { return '(' + polyline.map(function(point) { return point[1] + ' ' + point[0]; }).join(', ') + ')'; }).join(', ') + ')'; }).join(',') + ')');
      break;
      default : result = kvm.wkx.Geometry.parse('SRID=4326;POINT(' + alatlngs.join(' ') + ')');
    }
    return result;
  };

  this.wkxToWkb = function(wkx) {
    return wkx.toWkb().toString('hex');
  };

  this.reverseAxis = function(point) {
    return point[1] + ' ' + point[0]
  };
  //.toEwkb().inspect().replace(/<|Buffer| |>/g, '')

  this.update = function() {
    sql = "\
      SELECT\
        *\
      FROM\
        haltestellen\
      WHERE\
        uuid = '" + this.get(this.options.id_attribute) + "'\
    ";
    kvm.log('Frage feature uuid: ' + this.get(this.options.id_attribute) + ' mit sql: ' + sql + ' ab.', 3);
    kvm.db.executeSql(
      sql,
      [],
      function(rs) {
        kvm.log('Objekt aktualisiert.', 3);
        kvm.log('Feature.update result: ' + JSON.stringify(rs.rows.item(0)));
        var data = rs.rows.item(0);
        kvm.activeLayer.activeFeature.data = (typeof data == 'string' ? $.parseJSON(data) : data);

        if (typeof kvm.activeLayer.features[data.uuid] == 'undefined') {
          //console.log('insert new feature name in feature list: ' + kvm.activeLayer.activeFeature.get('name'));
          $('#featurelistTable tr:first').before(kvm.activeLayer.activeFeature.listElement);
        }
        else {
          //console.log('replace old with new name in feature list: ' + kvm.activeLayer.activeFeature.get('name'));
          $('#' + kvm.activeLayer.activeFeature.get(this.options.id_attribute)).html(kvm.activeLayer.activeFeature.get('name'));
        }
      },
      function(error) {
        kvm.log('Fehler bei der Abfrage des Features mit uuid ' + this.get(this.options.id_attribute) + ' aus lokaler Datenbank: ' + error.message);
      }
    );
  };

  this.unselect = function() {
    kvm.log('Deselektiere Feature ' + this.markerId, 4);
    if (this.markerId) {
      kvm.map._layers[this.markerId].setStyle(this.getNormalCircleMarkerStyle());
    }
    $('.feature-item').removeClass('selected-feature-item');
  };

  this.select = function() {
    kvm.log('Markiere Feature ' + this.id, 4);
    kvm.activeLayer.activeFeature = this;

    kvm.log('Select feature in map ' + this.markerId,4 );
    kvm.map._layers[this.markerId].setStyle(this.getSelectedCircleMarkerStyle());
    kvm.map.setZoom(18);
    kvm.map.panTo(kvm.map._layers[this.markerId].getLatLng());

    if (!this.showPopupButtons()) {
      $('.popup-functions').hide();
    }

    kvm.log('Select feature in list' + this.id, 4);
    $('#' + this.id).addClass('selected-feature-item');
  };

  this.listElement = function() {
    return '\
      <div class="feature-item feature-status-' + this.get('status') + '" id="' + this.get(this.options.id_attribute) + '">' + kvm.coalesce(this.get(kvm.activeLayer.get('name_attribute')), 'Datensatz ' + this.get(this.options.id_attribute)) + '</div>\
    ';
  };

  /*
  * ToDo addListElement zusammenlegen mit createFeatureList
  */
  this.addListElement = function() {
    kvm.log('Feature.addListElement', 4);
    $('#featurelistBody').prepend(this.listElement);
    kvm.log(this.id + ' zur Liste hinzugefügt.', 4);

    $("#" + this.id).on(
      'click',
      function(evt) {
        kvm.log('Öffne DataView mit Objektdaten.', 4);
        var id = evt.target.getAttribute('id'),
            feature = kvm.activeLayer.features[id],
            activeFeature = kvm.activeLayer.activeFeature;

        if (activeFeature) {
          activeFeature.unselect();
        }
        feature.select();
        kvm.activeLayer.loadFeatureToView(feature, { editable: false });
        kvm.showItem('dataView');
      }
    );
    kvm.log('Click Event an Listenelement registriert', 4);

    $('#numDatasetsText').html(Object.keys(this.activeLayer.features).length);
    kvm.log('Anzeige der Anzahl der Features aktualisiert.', 4);
  };

  this.updateListElement = function() {
    kvm.log('Feature.updateListElement', 4);
    $("#" + this.id).html(kvm.coalesce(this.get(kvm.activeLayer.get('name_attribute')), 'Datensatz ' + this.id));
  };

  this.getNormalCircleMarkerStyle = function() {
    return config.markerStyles[this.get('status') ? this.get('status') : 0];
  };

  this.getSelectedCircleMarkerStyle = function() {
    var style = this.getNormalCircleMarkerStyle();
    style.weight = 5;
    style.color = '#ff2828';
    return style;
  };

  this.getEditModeCircleMarkerStyle = function() {
    return { color: "#666666", fill: true, fillOpacity: 0.8, fillColor: "#cccccc" };
  };

  if (this.data[this.options.geometry_attribute]) {
    console.log('Setze geom des neuen Features mit data: %o', this.data);
    this.geom = this.wkbToWkx(this.data[this.options.geometry_attribute]);
  }
  this.newGeom = this.geom; // Aktuelle WKX-Geometry beim Editieren. Entspricht this.geom wenn das Feature neu geladen wurde und Geometrie in Karte, durch GPS oder Formular noch nicht geändert wurde.
}
