function SelectFormField(formId, settings) {
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <select\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '>' +
      $.map(
        this.get('options').split(','),
        function(option) {
          option = option.replace(/(^')|('$)/g, '')
          return '<option value="' + option + '">' + option + '</option>';
        }
      ).join('\n') + '\
    </select>'
  );

  this.setValue = function(val) {
    console.log('SelectFormField.setValue with value: ' + val);
    this.element.val(val == 'null' ? '' : val);
  };

  this.getValue = function() {
    console.log('SelectFormField.getValue');
    var val = this.element.val();

    if (val == null || typeof val === "undefined" || val == '') {
      val = 'null';
    }
    return val;
  };

  this.bindEvents = function() {
    console.log('SelectFormField.bindEvents');
    $('#featureFormular select[id=' + this.get('index') + ']').on(
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