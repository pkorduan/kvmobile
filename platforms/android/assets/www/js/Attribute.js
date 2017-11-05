function Attribute(layer, settings = {}) {
  console.log('Erzeuge Attributeobjekt with settings %o', settings);
  this.layer = layer;
  this.settings = settings;

  this.get = function(key) {
    return this.settings[key];
  };

  this.set = function(key, value) {
    this.settings[key] = value;
    return this.settings[key];
  };

  this.getFormField = function() {
    console.log('Attribute.getFormField(' + this.get('form_element_type') + ')');
    var field = '';

    switch (this.get('form_element_type')) {
      case 'Auswahlfeld' :
        field = new SelectFormField('featureFormular', this.settings);
        break;
      case 'Text' :
        if (this.get('type') == 'timestamp') {
          field = new DateTimeFormField('featureFormular', this.settings);
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
  }

  this.formField = this.getFormField();

  return this;
}