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
    console.log('CheckboxFormField.setValue with value: ' + val);
    this.element.val(val);
    if (val == 1) {
      this.element.prop('checked', true);
    }
  };

  this.getValue = function() {
    console.log('CheckboxFormField.getValue');

    return (this.element.prop('checked') ? 1 : this.element.val());
  };

  this.bindEvents = function() {
    console.log('CheckboxFormField.bindEvents');
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