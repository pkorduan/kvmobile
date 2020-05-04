/*
* create a dateTime form field in the structure
*   <div class="form-field">
*     <div class="form-label">
*       <label for="name"/>
*     </div>
*     <div class="form-value">
*       <input type="text" id="1" name="bezeichnung" value="Wert"/>
*     </div>
*   </div>
*/
function DateTimeFormField(formId, settings) {
  //console.log('Erzeuge DateTimeFormField with settings %o', settings);
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <input\
      type="datetime-local"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
      value=""' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />'
  );

  this.setValue = function(val) {
    kvm.log('val: ' + val, 4);
    var val = kvm.coalesce(val, '');
    if (val != '') val = this.toISO(val);
    kvm.log('DateTimeFormField ' + this.get('name') + ' setValue with value: ' + JSON.stringify(val), 4);
    this.element.val(val);
  };

  this.getValue = function(action = '') {
   kvm.log('DateTimeFormField.getValue', 4);
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
    }

    // return current time if attribut type is Time and (action is empty or equal to option)
    kvm.log('name: ' + this.get('name') + ' formtype: ' + this.get('form_element_type') + ' action: ' + action + ' option: ' + this.get('options') + ' value: ' + this.element.val(), 4);
    if (
      this.get('form_element_type') == 'Time' &&
      (
        action == '' ||
        action.toLowerCase() == this.get('options').toLowerCase()
      ) &&
      this.get('name') != 'updated_at_server'
    ) {
      val = (new Date()).toISOString()
    }

    return this.fromISO(val);
  };

  this.bindEvents = function() {
    //console.log('DateTimeFormField.bindEvents');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'change',
      function() {
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );
  };

  this.toISO = function(datetime) {
    return datetime.replace(/\//g, '-').replace(' ', 'T');
  }

  this.fromISO = function(datetime) {
    kvm.log('konvert ' + this.get('name') + ' datetime: ' + datetime, 4);
    return (typeof datetime == 'string' ? datetime.replace(/-/g, '/').replace('T', ' ').replace('Z', '') : null);
  }

  return this;
}