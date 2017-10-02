function ZahlFormField(formId, settings) {
  console.log('Erzeuge ZahlFormField with settings %o', settings);
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']';

  this.element = $('\
    <input\
      type="number"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
      value=""' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />'
  );

  this.setValue = function(val) {
    console.log('ZahlFormField.setValue with value: ' + val);
    this.element.val(val == 'null' ? '' : val);
  };

  this.getValue = function() {
    console.log('ZahlFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = 'null';
    }
    return val;
  };

  this.bindChangeEvent = function() {
    console.log('ZahlFormField.bindChangeEvent');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'keyup',
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
      $('<label for="' + this.get('name') + '"/><br>')
        .html(
          this.get('alias')
        )
        .append(
          this.element
        )
    )
  };

  return this;
}