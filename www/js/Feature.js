function Feature(
  data = {},
  options = {
    id_attribute: 'uuid',
    geometry_type: 'Point',
    geometry_attribute: 'geom'}
  ) {
  //kvm.log('Create Feature with data: ' + JSON.stringify(data), 4);
  this.data = (typeof data == 'string' ? $.parseJSON(data) : data);
  this.options = options;
  this.markerId = '';
  this.draggable = '';

  this.get = function(key) {
    return (typeof this.data[key] == 'undefined' ? 'null' : this.data[key]);
  };

  this.getAsArray = function(key) {
    return (this.data[key] ? this.data[key].slice(1, -1).split(',') : []);
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

  this.getCoord = function() {
    var coord = false;

    if (this.get(this.options.geometry_attribute) != '') {
      var geom = kvm.wkx.Geometry.parse(new kvm.Buffer(this.get(this.options.geometry_attribute), 'hex'));
/*
      ,
          coord = ol.proj.transform(
            [geom.x, geom.y],
            "EPSG:4326",
            kvm.map.getView().getProjection()
          );
          */
    }

    return [geom.y, geom.x];
  };

  /*
  * Setzt den Wert der Koordinaten auf das ewkt der LatLng Werte
  * param latlng Array mit Latitude und Longitude
  */
  this.setCoord = function(latlng) {
    console.log('latlng %o', latlng);
    // umwandeln von lat lng nach postgis geom
    var geom = kvm.wkx.Geometry.parse('SRID=4326;POINT(' + latlng.join(' ') + ')').toEwkb().inspect().replace(/<|Buffer| |>/g, '');
    this.set(this.options.geometry_attribute, geom);
  };

  this.getGeom = function() {
    var geom = false;
    if (this.options.geometry_type == 'Point') {
      geom = this.getCoord();
    }
    else {
      if (this.get(this.options.geometry_attribute) != '') {
        var geom = kvm.wkx.Geometry.parse(new kvm.Buffer(this.get(this.options.geometry_attribute), 'hex'));
      }
    }
    return geom;
  };

  this.setGeom = function(geom) {
    if (this.options.geometry_type == 'Point') {
      this.setCoord(geom);
    }
    else {
      if (this.get(this.options.geometry_attribute) != '') {
        //geom = das umgekehrte von geom = kvm.wkx.Geometry.parse(new kvm.Buffer(this.get(this.options.geometry_attribute), 'hex'));
        this.set(this.options.geometry_attribute, geom);
      }
    }
    return geom;
  };

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

  this.listElement = function() {
    return '\
      <div class="feature-item feature-status-' + this.get('status') + '" id="' + this.get(this.options.id_attribute) + '">' + kvm.coalesce(this.get(kvm.activeLayer.get('name_attribute')), 'Datensatz ' + this.get(this.options.id_attribute)) + '</div>\
    ';
  };
}
