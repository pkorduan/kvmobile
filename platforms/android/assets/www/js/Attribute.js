function Attribute(layer, settings = {}) {
  //console.log('Erzeuge Attributeobjekt with settings %o', settings);
  this.layer = layer;
  this.settings = settings;

  this.get = function(key) {
    return this.settings[key];
  };

  this.set = function(key, value) {
    this.settings[key] = value;
    return this.settings[key];
  };

  this.getViewField = function() {
    return new DataViewField('dataViewDiv', this.settings);
  };

  this.getFormField = function() {
    //console.log('Attribute.getFormField(' + this.get('form_element_type') + ')');
    var field = '';

    switch (this.get('form_element_type')) {
      case 'Auswahlfeld' :
        field = new SelectFormField('featureFormular', this.settings);
        break;
      case 'Text' :
        if (this.get('type') == 'timestamp') {
          field = new DateTimeFormField('featureFormular', this.settings);
        }
        else if (this.get('type').substr(0, 3) == 'int') {
          field = new ZahlFormField('featureFormular', this.settings);
        }
        else {
          field = new TextFormField('featureFormular', this.settings);
        }
        break;
      case 'Textfeld' :
        field = new TextfeldFormField('featureFormular', this.settings);
        break;
      case 'Time' :
        field = new DateTimeFormField('featureFormular', this.settings);
        break;
      case 'Checkbox' :
        field = new CheckboxFormField('featureFormular', this.settings);
        break;
      case 'Zahl' :
        field = new ZahlFormField('featureFormular', this.settings);
        break;
      case 'Geometrie' :
        field = new GeometrieFormField('featureFormular', this.settings);
        break;
      case 'Dokument':
        field = new BilderFormField('featureFormular', this.settings);
        break;

      default :
        field = new TextFormField('featureFormular', this.settings);
    }

    return field;
  };

  this.getSqliteType = function() {
    var pgType = this.get('type'),
        slType = '';

    switch (true) {
      case ($.inArray(pgType, [
          'character varying',
          'text',
          'character',
          'bool'
        ]) > -1) :
        slType = 'TEXT';
        break;
      case ($.inArray(pgType, [
          'int4',
          'int2',
          'int8',
          'int16',
          'bigint',
          'integer',
        ]) > -1) :
        slType = 'INTEGER';
        break;
      case ($.inArray(pgType, [
          'double precision'
        ]) > -1) :
        slType = 'REAL';
      default : slType = 'TEXT';
    }
    return slType;
  };

  /*
  * Return true if the Postgres attribute type is an array
  * Postgres Array Types starting with underline
  * Return false elsewise
  */
  this.isArrayType = function() {
    return (this.get('type').indexOf('_') == 0);
  };

  this.toSqliteValue = function(pgType, pgValue) {
    //console.log('Attribute.toSqliteValue pgType: ' + pgType + ' pgValue: %o', pgValue);
    var slType = this.getSqliteType();

    switch (true) {
      case (pgValue == null) :
        slValue = 'null';
        break;
      case (pgType == 'bool' && pgValue == '1') :
        slValue = "'t'";
        break;
      case (pgType == 'bool' && pgValue == '0') :
        slValue = "'f'";
        break;
      case (pgType == 'geometry') :
        slValue = "'" + kvm.wkx.Geometry.parse('SRID=4326;POINT(' + pgValue.coordinates.toString().replace(',', ' ') + ')').toEwkb().inspect().replace(/<|Buffer| |>/g, '') + "'";
        break;
      case (this.isArrayType()) :
        //console.log('value of arraytype: %o', pgValue);
        slValue = "'{" + pgValue + "}'";
        break;
      case (slType == 'INTEGER') :
        slValue = pgValue;
        break;
      default:
        slValue = "'" + pgValue + "'";
    }
    return slValue;
  };

  this.withLabel = function() {
    var label = $('<div class="form-label">').append('<label for="' + this.formField.get('name') + '"/>')
            .append((this.formField.get('alias') ? this.formField.get('alias') : this.formField.get('name'))),
        value = $('<div class="form-value">');

    if (this.get('form_element_type') == 'Geometrie') {
      value.append('<i id="saveGpsPositionButton" class="fa fa-map-marker fa-2x" aria-hidden="true" style="margin-right: 20px; margin-left: 7px; color: rgb(38, 50, 134);"></i>\
        <svg onclick="kvm.msg(\'Die GPS-Genauigkeit beträgt ca. \' + Math.round(kvm.controller.mapper.getGPSAccuracy()) + \' Meter.\')" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="28" height="28" version="1.1">\
          <g id="gps-signal-icon" class="gps-signal-level-0" transform="scale(1 -1) translate(0 -28)">\
            <rect class="bar-1" x="0" y="0" width="4" height="4" />\
            <rect class="bar-2" x="6" y="0" width="4" height="10" />\
            <rect class="bar-3" x="12" y="0" width="4" height="16" />\
            <rect class="bar-4" x="18" y="0" width="4" height="22" />\
            <rect class="bar-5" x="24" y="0" width="4" height="28" />\
          </g>\
        </svg>\
        <i id="goToGpsPositionButton" class="fa fa-pencil fa-2x" aria-hidden="true" style="float: right; margin-right: 20px; margin-left: 7px; color: rgb(38, 50, 134);"></i>\
        <input type="text" id="geom_wkt" value=""/>');
    }

    if (this.get('form_element_type') == 'Dokument') {
      value.append('\
          <i id="takePictureButton_' + this.get('index') + '" class="fa fa-camera fa-2x" style="color: rgb(38, 50, 134)"/>\
          <!--i id="selectPictureButton_' + this.get('index') + '" class="fa fa-picture-o fa-2x" style="color: rgb(38, 50, 134)"/-->\
          <i id="dropAllPictureButton_' + this.get('index') + '" class="fa fa-trash fa-2x" style="color: rgb(238, 50, 50); float: right; display: none;"/>\
          <div id="' + this.images_div_id + '"></div>\
      ');
    };

    if (this.formField.get('tooltip')) {
      label.append('&nbsp;<i class="fa fa-exclamation-circle" style="color: #f57802" onclick="kvm.msg(\'' + this.formField.get('tooltip') + '\');"></i>');
    }

    return $('<div class="form-field">')
      .append(label)
      .append(value.append(this.formField.element));
  };

  this.formField = this.getFormField();
  this.viewField = this.getViewField();

  return this;
}