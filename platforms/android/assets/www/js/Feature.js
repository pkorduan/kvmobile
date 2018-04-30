function Feature(data = {}) {
  //kvm.log('Create Feature with data: ' + JSON.stringify(data), 4);
  this.data = (typeof data == 'string' ? $.parseJSON(data) : data);

/*
  $.each(
    this.data,
    (function(i, v) {
      this.data[i] = (typeof v == 'string' && v.indexOf('{') == 0 ? v.slice(1, -1).split(',') : v);
    }).bind({
      data: this.data
    })
  );
*/
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

    if (this.get('point') != '') {
      var geom = kvm.wkx.Geometry.parse(new kvm.Buffer(this.get('point'), 'hex'));
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

  this.getOlFeature = function() {
    //console.log('set feature with coord: ', this.getCoord());
    return new ol.Feature({
      gid: this.get('uuid'),
      type: 'PointFeature',
      geometry: new ol.geom.Point(this.getCoord()),
    });
  };

  this.update = function() {
    sql = "\
      SELECT\
        *\
      FROM\
        haltestellen\
      WHERE\
        uuid = '" + this.get('uuid') + "'\
    ";
    kvm.log('Frage feature uuid: ' + this.get('uuid') + ' mit sql: ' + sql + ' ab.', 3);
    kvm.db.executeSql(
      sql,
      [],
      function(rs) {
        kvm.log('Objekt aktualisiert.', 3);
        kvm.log('Feature.update result: ' + JSON.stringify(rs.rows.item(0)));
        var data = rs.rows.item(0);
        kvm.activeLayer.activeFeature.data = (typeof data == 'string' ? $.parseJSON(data) : data);

        if (typeof kvm.activeLayer.features['id_' + data.uuid] == 'undefined') {
          //console.log('insert new feature name in feature list: ' + kvm.activeLayer.activeFeature.get('name'));
          $('#featurelistTable tr:first').before(kvm.activeLayer.activeFeature.listElement);
        }
        else {
          //console.log('replace old with new name in feature list: ' + kvm.activeLayer.activeFeature.get('name'));
          $('#' + kvm.activeLayer.activeFeature.get('uuid')).html(kvm.activeLayer.activeFeature.get('name'));
        }
      },
      function(error) {
        kvm.log('Fehler bei der Abfrage des Features mit uuid ' + this.get('uuid') + ' aus lokaler Datenbank: ' + error.message);
      }
    );
  };

  this.listElement = function() {
    return '\
      <div class="feature-item" id="' + this.get('uuid') + '">' + kvm.coalesce(this.get(kvm.activeLayer.get('name_attribute')), 'Datensatz ' + this.get(kvm.activeLayer.get('id_attribute'))) + '</div>\
    ';
  };
}
