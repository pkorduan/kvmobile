/*
* create a text form field in the structure
*   <div class="form-field">
*     <div class="form-label">
*       <label for="name"/>
*     </div>
*     <div class="form-value">
*       <input type="text" id="1" name="bezeichnung" value="Wert"/>
*     </div>
*   </div>
*/
function TextFormField(formId, settings) {
  //console.log('Erzeuge TextformField with settings %o', settings);
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']';

  this.element = $('<div class="form-value">').append('\
    <input\
      type="text"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
      value=""' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />'
  );

  this.setValue = function(val) {
    //console.log('TextFormField ' + this.get('name') + ' setValue with value: %o', val);
    if (!val && this.get('default')) {
      val = this.get('default');
    }

    this.element.val(val == null || val == 'null' ? '' : val);
  };

  /*
  * get the value from form field expect
  * form_element_type UserID, here get the value from store
  * when no action is given in options specified or
  * action == option
  */
  this.getValue = function(action = '') {
    //console.log('TextFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
    }

    if (
      this.get('form_element_type') == 'UserID' &&
      (
        action == '' ||
        this.get('options') == '' ||
        action.toLowerCase() == this.get('options').toLowerCase()
      )
    ) {
      val = kvm.store.getItem('userId')
    }

    return val;
  };

  this.bindEvents = function() {
    //console.log('TextFormField.bindEvents');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'keyup',
      function() {
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );
  };

  this.withLabel = function() {
    var label = $('<div class="form-label">').append('<label for="' + this.get('name') + '"/>');

    label.append((this.get('alias') ? this.get('alias') : this.get('name')));

    if (this.get('tooltip')) {
      label.append('&nbsp;<i class="fa fa-exclamation-circle" style="color: #f57802" onclick="kvm.msg(\'' + this.get('tooltip') + '\');"></i>');
    }

    return $('<div class="form-field">').append(label).append('<br>').append(this.element);
  };

  return this;
}