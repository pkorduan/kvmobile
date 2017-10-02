function TextfeldFormField(formId, settings) {
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <textarea\
      id="' + this.get('index') + '"\
      placeholder="' + this.get('alias') + '"\
      name="' + this.get('name') + '"' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    >\
    </textarea>'
  );

  this.setValue = function(val) {
    console.log('TextFormField.setValue with value: ' + val);
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

  this.bindChangeEvent = function() {
    console.log('TextfeldFormField.bindChangeEvent');
    $('#featureFormular textarea[id=' + this.get('index') + ']').on(
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
          this.get('alias') ? this.get('alias') : this.get('name') + '<br>' 
        )
        .append(
          this.element
        )
    )
  };

  return this;
}