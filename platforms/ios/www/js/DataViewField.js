/*
* create a field in data view in the form
*   <div class="data-view-field">
*     <div class="data-view-label">
*       label
*     </div>
*     <div class="data-view-value">
*       value
*    </div>
*  </div>
*/
function DataViewField(divId, settings) {
  this.settings = settings;

  this.get = function(key) {
    return this.settings[key];
  };

  this.selector = '#' + divId + ' > #' + this.get('index');

  this.element = $('<div id="' + this.get('index') + '" class="data-view-value">');

  this.setValue = function(val) {
    console.log('DataViewField.setValue with value: ' + val);
    if (this.get('form_element_type') == 'Dokument') {
      kvm.log('DataViewField.setValue for Document Attribute with value: ' +  val, 4);
      var val = kvm.coalesce(val, ''),
          images,
          localFile,
          remoteFile,
          i;

      this.element.html('');
      this.element.append('<div id="imagePreviewDiv" style="display: none">');

      // create new images if exists
      if (val == '') {
        $('#imagePreviewDiv').hide();
      }
      else {
        kvm.log('Add images to previews div: ' + val, 4);
        images = kvm.removeBraces(val).split(',');
        kvm.log('images: ' + JSON.stringify(images), 4);
        for (i = 0; i < images.length; i++) {
          remoteFile = images[i];
          localFile = kvm.removeOriginalName(kvm.serverToLocalPath(remoteFile));
          kvm.log('images[' + i + ']: ' + remoteFile, 4);

          window.resolveLocalFileSystemURL(
            localFile,
            (function(fileEntry) {
              kvm.log('Datei ' + fileEntry.toURL() + ' existiert.', 4);
              var src = fileEntry.toURL();
              var img_div = $('<div class="img" src="' + src + '" style="background-image: url(' + src + ');" field_id="' + this.get('index') + '"name="' + src + '"></div>');
              this.element.append(img_div);
            }).bind(this),
            (function() {
              kvm.log('Datei ' + this.localFile + ' existiert nicht!', 2);
              var img_div = $('<div class="img" src="img/no_image.png" style="background-image: url(img/no_image.png);" field_id="' + this.context.get('index') + '"name="img/no_image.png"></div>');
              kvm.activeLayer.downloadImage(this.localFile, this.remoteFile);
            }).bind({
              context : this,
              localFile : localFile,
              remoteFile : remoteFile
            })
          );
        }
      }
    } // end of document
    else if (this.get('form_element_type') == 'SubFormEmbeddedPK') {
      var options = this.get('options').split(';')[0].split(','),
          stelleId = kvm.activeStelle.get('id'),
          subFormLayerId = options[0],
          subFormFK = options[1],
          subFormPreviewAttribute = options[2],
          subFormTable = $.parseJSON(kvm.store.getItem('layerSettings_' + stelleId + '_' + subFormLayerId)).table_name;
      sql = "\
        SELECT\
        FROM\
          " + subFormTable + "\
      ";
      console.log('SQL: %s', sql);
    }
    else {
      this.element.html(kvm.coalesce(val, ''));
    }
    this.element.trigger('change');
    return val;
  };

  this.withLabel = function() {
    var label = $('<div class="data-view-label">');

    label.append((this.get('alias') ? this.get('alias') : this.get('name')));

    if (this.get('tooltip')) {
      label.append('&nbsp;<i class="fa fa-exclamation-circle" style="color: #f57802" onclick="kvm.msg(\'' + this.get('tooltip') + '\');"></i>');
    }

    return $('<div class="data-view-field">').append(label).append(this.element);
  };

  return this;
}