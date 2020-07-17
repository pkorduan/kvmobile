/*
* create a User form field in the structure
*   <div class="form-field">
*     <div class="form-label">
*       <label for="name"/>
*     </div>
*     <div class="form-value">
*       <input type="text" id="1" name="bezeichnung" value="Wert"/>
*     </div>
*   </div>
*/
function UserFormField(formId, settings) {
  //console.log('Erzeuge UserFormField with settings %o', settings);
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
    kvm.log('UserFormField.getValue', 4);
    var val = this.element.val();


    if (typeof val === "undefined" || val == '') {
      val = null;
    }

    // return kvm.store.userName if attribut type is User and (action is empty or equal to option)
    kvm.log('name: ' + this.get('name') + ' formtype: ' + this.get('form_element_type') + ' action: ' + action + ' option: ' + this.get('options') + ' value: ' + this.element.val(), 4);
    console.log('action == leer: ', action == '');
    console.log('this.get(form_element_type == User: ', this.get('form_element_type') == 'User');

    if (
      this.get('form_element_type') == 'User' &&
      (
        action == '' ||
        this.get('options') == '' ||
        action.toLowerCase() == this.get('options').toLowerCase()
      )
    ) {
      console.log('hier ist true, bitte setze jetzt val');
      val = kvm.store.getItem('userName');
    }
    console.log('val vor übergabe: %s und in store: %s', val, kvm.store.getItem('userName'));
    kvm.log('UserFormField.getValue return: ' + val, 4);
    return val;
  };

  this.bindEvents = function() {
    // bind no event on this form element
  };

  return this;
}