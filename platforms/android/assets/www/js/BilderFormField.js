function BilderFormField(formId, settings) {
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
      value=""' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />'
  );

  this.setValue = function(val) {
    console.log('BilderFormField.setValue with value: %o', val);
    this.element.val(val == 'null' ? '' : val);
    console.log('Add images to previews div ' + val);
    console.log('Add click handler on preview div' + val);
  };

  this.getValue = function() {
    console.log('BilderFormField.getValue');
    var val = this.element.val();

    return val;
  };

  this.bindChangeEvent = function() {
    console.log('SelectFormField.bindChangeEvent');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'change',
      function() {
        console.log('event on saveFeatureButton');
        if (!$('#saveFeatureButton').hasClass('active-button')) {
          $('#saveFeatureButton').toggleClass('active-button inactive-button');
        }
      }
    );

    $('#takePictureButton_' + this.get('index')).bind(
      'click',
      this.takePicture,
    );

  };

  this.takePicture = function(evt) {
    console.log('BilderFormField.takePicture %o', evt);

/*    navigator.camera.getPicture(
      function(imageData) {
        var image = $('#large_image_' + this.get('index'));
        image.attr("src", imageData);
        
        $('#featureFormular input[id=' + this.get('index') + ']')html(imageData);
      },
      function(message) {
        alert('Failed because: ' + message);
      }, {
        quality: 25,
        destinationType: Camera.DestinationType.FILE_URI
      }
    );
*/
  },

  this.withLabel = function() {
    return $('\
      <div>\
        <i id="takePictureButton_' + this.get('index') + '" class="fa fa-camera fa-2x menubutton"/>\
        <div id="previews_' + this.get('index') + '">\
        </div>\
        <img\
          id="large_image_' + this.get('index') + '"\
          style="display: none;"\
        />\
      </div>\
    ')
    .append(
      this.element
    );
  };

  return this;
}