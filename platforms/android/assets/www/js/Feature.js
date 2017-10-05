function Feature(data = {}) {
  console.log('Create Feature with data %o', data);
  this.data = (typeof data == 'string' ? $.parseJSON(data) : data);

  this.get = function(key) {
    return this.data[key];
  };

  this.set = function(key, value) {
    this.data[key] = value;
    return this.data[key];
  };

  this.getData = function() {
    return this.data;
  };

  this.setData = function(data) {
    console.log('Feature.setData %o', data);
    this.data = (typeof data == 'string' ? $.parseJSON(data) : data);
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
    console.log('Frage feature uuid: ' + this.get('uuid') + ' mit sql: ' + sql + ' ab.');
    kvm.db.executeSql(
      sql,
      [],
      function(rs) {
        console.log('Feature.update result: %o', rs.rows.item(0));
        var data = rs.rows.item(0);
        kvm.activeLayer.activeFeature.data = (typeof data == 'string' ? $.parseJSON(data) : data);
        $('#' + kvm.activeLayer.activeFeature.get('uuid')).html(kvm.activeLayer.activeFeature.get('name'));
        console.log('new data of feature: %o', this.data);
        // ToDo update feature in FeatureList
      },
      function(error) {
        kvm.log('Fehler bei der Abfrage des Features mit uuid ' + this.get('uuid') + ' aus lokaler Datenbank: ' + error.message);
      }
    );
  };
}