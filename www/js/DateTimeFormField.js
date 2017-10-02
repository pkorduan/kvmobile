function DateTimeFormField(formId, settings) {
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <input\
      type="datetime-local"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />' +
    this.get('alias')
  );

  this.setValue = function(val) {
    if (val == 'null') {
      val = '';
    }
    else {
      val = this.toISO(val);
    }
    console.log('DateTimeFormField.setValue with value: ' + val);
    this.element.val(val);
  };

  this.getValue = function() {
    console.log('TextFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = 'null';
    }
    else {
      
    }
    return this.fromISO(val);
  };

  this.bindChangeEvent = function() {
    console.log('DateTimeFormField.bindChangeEvent');
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
      $('<label for="' + this.get('name') + '"/><br>')
        .append(
          this.get('alias')
        )
        .append(
          this.element
        )
    )
  };

  this.toISO = function(datetime) {
    return datetime.replace(/\//g, '-').replace(' ', 'T');
  }

  this.fromISO = function(datetime) {
    return datetime.replace(/-/g, '/').replace('T', ' ');
  }

  return this;
}