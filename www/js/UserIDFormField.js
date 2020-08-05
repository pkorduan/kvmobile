/*
* create a UserID form field in the structure
*   <div class="form-field">
*     <div class="form-label">
*       <label for="name"/>
*     </div>
*     <div class="form-value">
*       <input type="text" id="1" name="bezeichnung" value="Wert"/>
*     </div>
*   </div>
*/
function UserIDFormField(formId, settings) {
  //console.log('Erzeuge UserIDFormField with settings %o', settings);
  this.settings = settings,

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <input\
      type="text"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
      value="" disabled\
    />'
  );

  this.setValue = function(val) {
    if (!val && this.get('default')) {
      val = this.get('default');
    }

    this.element.val(val == 'null' ? '' : val);
  };

  this.getValue = function(action = '') {
   kvm.log('UserIDFormField.getValue', 4);
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
    }

    // return kvm.store.userName if attribut type is User and (action is empty or equal to option)
    kvm.log('name: ' + this.get('name') + ' formtype: ' + this.get('form_element_type') + ' action: ' + action + ' option: ' + this.get('options') + ' value: ' + this.element.val(), 4);
    if (
      this.get('form_element_type') == 'UsUserID' &&
      (
        action == '' ||
        action.toLowerCase() == this.get('options').toLowerCase()
      )
    ) {
      val = kvm.store.userName;
    }

    return val;
  };

  this.bindEvents = function() {
    // bind no event on this form element
  };

  return this;
}