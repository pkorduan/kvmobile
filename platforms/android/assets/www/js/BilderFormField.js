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

  /* Assign the value of the feature to the form field as it is in the database and
  * create corresponding form and view elements.
  * @params any set to '' if val is undefined, null, 'null' or NAN 
  */
  this.setValue = function(val) {
    kvm.log('BilderFormField.setValue with value: ' +  val, 4);
    var val = kvm.coalesce(val, ''),
        images,
        localFile,
        remoteFile,
        i;

    this.element.val(val);

    // remove images from preview div
    $('#' + this.images_div_id).html('');

    // create new images if exists
    if (val == '') {
      $('#' + this.images_div_id).html('').hide();
      $('#dropAllPictureButton_' + this.get('index')).hide();
    }
    else {
      kvm.log('Add images to previews div: ' + val, 4);
      images = this.removeBraces(val).split(',');
      kvm.log('images: ' + JSON.stringify(images), 4);
      for (i = 0; i < images.length; i++) {
        remoteFile = images[i];
        localFile = this.removeOriginalName(this.serverToLocalPath(remoteFile));
        kvm.log('images[' + i + ']: ' + remoteFile, 4);

        window.resolveLocalFileSystemURL(
          localFile,
          (function(fileEntry) {
            kvm.log('Datei ' + fileEntry.toURL() + ' existiert.', 4);
            this.addImage(fileEntry.toURL());
          }).bind(this),
          (function() {
            kvm.log('Datei ' + this.localFile + ' existiert nicht!', 2);
            this.context.addImage('img/no_image.png', this.remoteFile);
            kvm.activeLayer.downloadImage(this.localFile, this.remoteFile);
          }).bind({
            context : this,
            localFile : localFile,
            remoteFile : remoteFile
          })
        );
      }
    }
  };

  this.getValue = function(action = '') {
    //console.log('BilderFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == '') {
      val = null;
    }

    return val;
  };

  /*
  * Remove the part with original name of image in val
  * Return the first part before & delimiter
  */
  this.removeOriginalName = function(val) {
    kvm.log('BilderFormField.removeOriginalName: ' + val, 4);
    return val.split('&').shift();
  }

  /*
  * Remove first and last caracter from string
  * in this class used to remove the braces {...} from array values
  * but can be used also for all other enclosing character
  */
  this.removeBraces = function(val) {
    kvm.log('BilderFormField.removeBraces ' + val, 4);
    var result = val.substring(1, val.length-1)
    return result;
  }

  /*
  * Add braces around the value to make an array
  */
  this.addBraces = function(val) {
    kvm.log('BilderformField.addBraces ' + val, 4);
    var result = '{' + val + '}';
    return result
  }

  /*
  * Replace server image path by local image path
  */
  this.serverToLocalPath = function(src) {
    kvm.log('BilderFormField.serverToLocalPath ' + src, 4);
    var result = config.localImgPath + src.substring(src.lastIndexOf('/') + 1);
    return result
  };

  /*
  * Replace local image path by servers image path
  */
  this.localToServerPath = function(src) {
    kvm.log('BilderFormField.localToServerPath src: ' + src, 4);
    var result = kvm.activeLayer.get('document_path') + src.substring(src.lastIndexOf('/') + 1);
    kvm.log('Result: ' + result,4);
    return result
  };

  /*
  * src is the file shown in view
  * name is the file stored in database
  * Images not downloaded yet to the device are default no_image.png
  * otherwise src is equal to name
  */
  this.addImage = function(src, name = '') {
    kvm.log('BilderFormField: Add Image to FormField', 4);
    var name = (name == '' ? src : name),
    img_div = $('<div class="img" src="' + src + '" style="background-image: url(' + src + ');" field_id="' + this.get('index') + '"name="' + name + '"></div>');
/*  ToDo: Ein Kommentarfeld einfügen. Realisieren über Datentyp, der dann aber auch das Datum des Bildes beinhaltet.
    img_div.append($('<br>'));
    img_div.append($('<input type="text"\ name="' + src + '"/>'));
*/
    $('#' + this.images_div_id).append(img_div).show();

    $('#dropAllPictureButton_' + this.get('index')).show();

    $('div[name$="' + name + '"]').on(
      'click',
      function(evt) {
        var target = $(evt.target),
            src = target.attr('src'),
            fieldId = target.attr('field_id');
        if (src == 'img/no_image.png') {
          navigator.notification.confirm(
            'Bild herunterladen?',
            function(buttonIndex) {
              if (buttonIndex == 1) { // ja
                var remoteFile = target.attr('name'),
                    localFile = kvm.activeLayer.attributes[fieldId].formField.serverToLocalPath(remoteFile);

                kvm.activeLayer.downloadImage(localFile, remoteFile);
              }
              if (buttonIndex == 2) { // nein
                // Do nothing
              }
            },
            '',
            ['ja', 'nein']
          );
        }
        else {
          kvm.log('Versuche das Bild zu öffnen: ' + src, 4);
          cordova.plugins.fileOpener2.open(
            src,
            'image/jpeg',
            {
              error : function(e) {
                alert('Fehler beim laden der Datei: ' + e.message + ' Status: ' + e.status);
              },
              success : function() {
                kvm.log('Datei ' + src + ' erfolgreich geöffnet.', 4);
                navigator.notification.confirm(
                  'Bild Löschen?',
                  function(buttonIndex) {
                    if (buttonIndex == 1) { // nein
                      // Do nothing
                    }

                    if (buttonIndex == 2) { // ja
                      var field = kvm.activeLayer.attributes[fieldId].formField;

                      field.dropImage(target);
                    }
                  },
                  '',
                  ['nein', 'ja']
                );
              }
            }
          );
        }
      }
    );

  };

  this.addImgNameToVal = function(newImg) {
    var val = this.getValue();
    val = (
      val == null
        ? this.addBraces(newImg)
        : this.addBraces(this.removeBraces(val) + ',' + newImg)
    );
    this.element.val(val);
    this.element.trigger('change');
    return val;
  }

  /*
  * Remove the image tag witch have this src and
  * the corresponding path from hidden formfield
  */
  this.dropImage = function(imgDiv) {
    var imageField = this.element,
        src = imgDiv.attr('src'),
        activeLayer = kvm.activeLayer,
        sql = '';

    kvm.log('BilderFormField.dropImage img: ' + src, 4);
    // ToDo implement this function and bind to delte choice of after dialog from image click
    // remove image string from field value
    imageField.val(
      this.addBraces($.map(
        this.removeBraces(imageField.val()).split(','),
        function(path) {
          if (path.indexOf(src.substring(src.lastIndexOf('/') + 1)) < 0) {
            return path;
          }
        }
      ).join(',')
    ));

    imageField.trigger('change');
    imgDiv.remove();
  };

  this.bindEvents = function() {
    //console.log('SelectFormField.bindEvents');
    $('#featureFormular input[id=' + this.get('index') + ']').on(
      'change',
      function() {
       // console.log('event on saveFeatureButton');
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
    //console.log('BilderformField.dropAllPictures');
    navigator.notification.confirm(
      'Wirklich alle Bilder in diesem Datensatz Löschen?',
      function(buttonIndex) {
        if (buttonIndex == 1) { // nein
          // Do nothing
        }
        if (buttonIndex == 2) { // ja
          context.setValue('');
          context.element.trigger('change');
        }
      },
      '',
      ['nein', 'ja']
    );
  };

  this.takePicture = function(evt) {
    kvm.log('BilderFormField.takePicture: ' + JSON.stringify(evt), 4);

    navigator.camera.getPicture(
      (function(imageData) {
        this.addImage(imageData);
        this.addImgNameToVal(this.localToServerPath(imageData));
        $('#featureFormular input[id=2]').val((new Date()).toISOString().replace('Z', '')).show();
      }).bind(evt.data.context),
      function(message) {
        alert('Fehler wegen: ' + message);
      },
      {
        quality: 25,
        correctOrientation: true,
        allowEdit: true,
        sourceType: Camera.PictureSourceType.CAMERA,
        destinationType: Camera.DestinationType.FILE_URI,
        saveToPhotoAlbum: false
      }
    );
  };

/*
function listDir(path){
  window.resolveLocalFileSystemURL(path,
    function (fileSystem) {
      var reader = fileSystem.createReader();
      reader.readEntries(
        function (entries) {
          console.log(entries);
        },
        function (err) {
          console.log(err);
        }
      );
    }, function (err) {
      console.log(err);
    }
  );
}
*/
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
      </div><div class="clear"></div>\
    ')
    .append(
      this.element
    );
  };

  return this;
}