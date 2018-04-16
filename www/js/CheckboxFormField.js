function CheckboxFormField(formId, settings) {
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <input\
      type="checkbox"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
    />' +
    this.get('alias')
  );

  this.setValue = function(val) {
    //console.log('CheckboxFormField.setValue with value: ' + val);
    this.element.val(val);
    this.element.prop('checked', false);
    if (val == 't') {
      this.element.prop('checked', true);
    }
  };

  this.getValue = function(action = '') {
   // console.log('CheckboxFormField.getValue');
    return (this.element.prop('checked') ? 't' : (this.element.val() == '' ? null : 'f'));
  };

  this.bindEvents = function() {
    //console.log('CheckboxFormField.bindEvents');
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
    return $('<div class="form-field">').append(
      $('<label for="' + this.get('name') + '"/>')
        .append(
          this.element
        )
        .append('&nbsp;')
        .append(
          this.get('alias')
        )
    )
  };

  return this;
}