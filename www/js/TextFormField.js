function TextFormField(formId, settings) {
  console.log('Erzeuge TextformField with settings %o', settings);
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']';

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
    console.log('TextFormField ' + this.get('name') + ' setValue with value: %o', val);
    this.element.val(val == 'null' ? '' : val);
  };

  this.getValue = function() {
    console.log('TextFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = 'null';
    }
    return val;
  };

  this.bindEvents = function() {
    console.log('TextFormField.bindEvents');
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