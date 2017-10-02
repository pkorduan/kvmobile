function GeometrieFormField(formId, settings) {
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <input\
      type="text"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
      value=""' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />'
  );

  this.setValue = function(val) {
    console.log('GeometrieFormField.setValue with value: %o', val);
    this.element.val(val == 'null' ? '' : val);
  };

  this.getValue = function() {
    console.log('GeometrieFormField.getValue');
    var val = this.element.val();

    return val;
  };

  this.bindChangeEvent = function() {
    console.log('SelectFormField.bindChangeEvent');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'change',
      function() {
        console.log('event on saveFeatureButton');
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );
  };

  this.withLabel = function() {
    return $('<div>').append(
      $('<label for="Koordinaten" />')
        .html(
          '<i class="fa fa-map-marker fa-2x menubutton" aria-hidden="true" style="margin-right: 20px; margin-left: 7px"></i>'
        )
        .append(
          this.element
        )
    )
  };

  return this;
}