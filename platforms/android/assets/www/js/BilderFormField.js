function BilderFormField(formId, settings) {
  this.settings = settings;
  this.images_div_id = 'images_' + settings['index'];

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + formId + ' input[id=' + this.get('index') + ']',

  this.element = $('\
    <input\
      type="hidden"\
      id="' + this.get('index') + '"\
      name="' + this.get('name') + '"\
      value=""' +
      (this.get('privilege') == '0' ? ' disabled' : '') + '\
    />'
  );

  this.setValue = function(val) {
    var val = kvm.coalesce(val, ''),
        i;

    console.log('BilderFormField.setValue with value: %o', val);
    this.element.val(this.removeBraces(val));

    if (val == '') {
      $('#' + this.images_div_id).html('').hide();
      $('#dropAllPictureButton_' + this.get('index')).hide();
    }
    else {
      console.log('Add images to previews div: ' + val);
      images = val.split(',');
      for (i=0; i < images.length; i++) {
        // ToDo check if image exists, if not show placeholder and try to download it
        // else addImage in form
        this.addImage(
          this.removeOriginalName(
            this.serverToLocalPath(
              images[i].trim()
            )
          )
        );
      }
    }
    // ToDo hier alle Bilder an element anhängen mit after wie in take Picture
    

    $('#large_image_1').attr("src", val).show();
    console.log('Add click handler on preview div' + val);
  };

  this.getValue = function() {
    console.log('BilderFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
    }
    else {
      val = this.addBraces(val);
    }

    return val;
  };

  /*
  * Remove the part with original name of image in val
  * Return the first part before & delimiter
  */
  this.removeOriginalName = function(val) {
    return val.split('&').shift();
  }

  /*
  * Remove first and last caracter from string
  * in this class used to remove the braces {...} from array values
  * but can be used also for all other enclosing character
  */
  this.removeBraces = function(val) {
    return val.substring(1, val.length-1)
  }

  /*
  * Add braces around the value to make an array
  */
  this.addBraces = function(val) {
    console.log('BilderformField.addBraces');
    return '{' + val + '}';
  }

  /*
  * Replace server image path by local image path
  */
  this.serverToLocalPath = function(src) {
    return config.localImgPath + src.substring(src.lastIndexOf('/') + 1);
  };

  /*
  * Replace local image path by servers image path
  */
  this.localToServerPath = function(src) {
    return kvm.activeLayer.get('document_path') + src.substring(src.lastIndexOf('/') + 1);
  };

  this.addImage = function(src) {
    console.log('Add Image to FormField');
    $('#' + this.images_div_id).append($('\
      <img\
        src="' + src + '"\
        style="margin-bottom: 2px; width: 100%;"\
        onclick=".msg(this.src)"\
      />\
    ')).show();

    $('#dropAllPictureButton_' + this.get('index')).show();

    $('img[src$="' + src + '"]').on(
      'click',
      function(evt) {
        navigator.notification.confirm(
          'Bild Löschen?',
          function(buttonIndex) {
            if (buttonIndex == 1) { // ja
              kvm.msg('Einzelne Bilder Löschen ist noch nicht implementiert.');
              console.log('Bild löschen');
            }

            if (buttonIndex == 2) { // nein
              // Do nothing
            }
          },
          '',
          ['ja', 'nein']
        );
      }
    );

  };

  /*
  * Remove the image tag witch have this src and
  * the corresponding path from hidden formfield
  */
  this.dropImage = function(src) {
    // ToDo implement this function and bind to delte choice of after dialog from image click
  };

  this.bindEvents = function() {
    console.log('SelectFormField.bindEvents');
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
      { context: this},
      this.takePicture,
    );
/*
    $('#selectPictureButton_1').bind(
      'click',
      { context: this},
      this.selectPicture,
    );
*/
    $('#dropAllPictureButton_' + this.get('index')).bind(
      'click',
      { context: this},
      this.dropAllPictures,
    );

  };

  this.dropAllPictures = function(evt) {
    var context = evt.data.context;
    console.log('BilderformField.dropAllPictures');
    context.setValue('');
    context.element.trigger('change');
  };

  this.takePicture = function(evt) {
    console.log('BilderFormField.takePicture %o', evt);
    formField = evt.data.context;

    navigator.camera.getPicture(
      function(imageData) {
        console.log("BilderFormField.takePicture success with imageData %o", imageData);
        console.log('Get Element of BilderFormField %o', formField);
        var files = $('#featureFormular input[id=1]').val(); 

        formField.addImage(
          imageData
        );

        if (files != '') {
          files += ',';
        }
        $('#featureFormular input[id=1]').val(files + formField.localToServerPath(imageData)).trigger('change');
        $('#featureFormular input[id=2]').val((new Date()).toISOString().replace('Z', '')).show();
        formField.element.trigger('change');
      },
      function(message) {
        alert('Failed because: ' + message);
      },
      {
        quality: 25,
        correctOrientation: true,
        sourceType: Camera.PictureSourceType.CAMERA,
        destinationType: Camera.DestinationType.FILE_URI,
        saveToPhotoAlbum: true
      }
    );
  };
/*
  this.selectPicture = function(evt) {
    console.log('BilderFormField.takePicture %o', evt);
    formField = evt.data.context;

    navigator.camera.getPicture(
      function(imageData) {
        console.log("BilderFormField.takePicture success with imageData %o", imageData);
        console.log('Get Element of BilderFormField %o', formField);
        var files = $('#featureFormular input[id=1]').val(); 

        formField.addImage(imageData);

        if (files != '') {
          files += ',';
        }
        $('#featureFormular input[id=1]').val(files + imageData).trigger('change');
        $('#featureFormular input[id=2]').val((new Date()).toISOString().replace('Z', '')).show();
      },
      function(message) {
        alert('Failed because: ' + message);
      },
      {
        quality: 25,
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
        destinationType: Camera.DestinationType.FILE_URI
      }
    );
  };

*/
  this.withLabel = function() {
    return $('\
      <div class="form-field">\
        <i id="takePictureButton_' + this.get('index') + '" class="fa fa-camera fa-2x" style="color: rgb(38, 50, 134)"/>\
        <!--i id="selectPictureButton_' + this.get('index') + '" class="fa fa-picture-o fa-2x" style="color: rgb(38, 50, 134)"/-->\
        <i id="dropAllPictureButton_' + this.get('index') + '" class="fa fa-trash fa-2x" style="color: rgb(238, 50, 50); float: right; display: none;"/>\
        <div id="' + this.images_div_id + '"></div>\
      <div/>\
    ')
    .append(
      this.element
    );
  };

  return this;
}