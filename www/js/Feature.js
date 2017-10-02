function Feature(data = {}) {
  console.log('Create Feature with data %o', data);
  this.data = (typeof data == 'string' ? $.parseJSON(data) : data);

  this.get = function(key) {
    return this.data[key];
  };

  this.getData = function() {
    return this.data;
  };

  this.set = function(key, value) {
    this.data[key] = value;
    return this.data[key];
  };

}