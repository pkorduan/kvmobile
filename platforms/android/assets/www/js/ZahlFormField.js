function ZahlFormField(formId, settings) {
  //console.log('Erzeuge ZahlFormField with settings %o', settings);
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
    //console.log('ZahlFormField.setValue with value: ' + val);
    this.element.val(val == 'null' ? '' : val);
  };

  this.getValue = function(action = '') {
    //console.log('ZahlFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
    }
    return val;
  };

  this.bindEvents = function() {
   // console.log('ZahlFormField.bindEvents');
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
    return $('<div class="form-field">').append(
      $('<label for="' + this.get('name') + '"/>')
        .html(
          (this.get('alias') ? this.get('alias') : this.get('name')) + '<br>'
        )
        .append(
          this.element
        )
    )
  };

  return this;
}