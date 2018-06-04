function TextfeldFormField(formId, settings) {
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <textarea\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
      rows="3"\
      style="width: 100%;"' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    >\
    </textarea>'
  );

  this.setValue = function(val) {
    //console.log('TextFormField.setValue with value: ' + val);
    if (!val && this.get('default')) {
      val = this.get('default');
    }

    this.element.val(val == 'null' ? '' : val);
  };

  this.getValue = function(action = '') {
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
    }

    return val;
  };

  this.bindEvents = function() {
    //console.log('TextfeldFormField.bindEvents');
    $('#featureFormular textarea[id=' + this.get('index') + ']').on(
      'keyup',
      function() {
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );
  };

  this.withLabel = function() {
    var label = $('<label for="' + this.get('name') + '"/>');

    label.append((this.get('alias') ? this.get('alias') : this.get('name')));

    if (this.get('tooltip')) {
      label.append('&nbsp;<i class="fa fa-exclamation-circle" style="color: #f57802" onclick="kvm.msg(\'' + this.get('tooltip') + '\');"></i>');
    }

    return $('<div class="form-field">').append(label).append('<br>').append(this.element);
  };

  return this;
}
