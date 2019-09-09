function Feature(data = {}, featureClass = 'default') {
	//kvm.log('Create Feature with data: ' + JSON.stringify(data), 4);
	this.data = (typeof data == 'string' ? $.parseJSON(data) : data);
	this.featureClass = featureClass;

	this.get = function(key) {
		return (typeof this.data[key] == 'undefined' ? 'null' : this.data[key]);
	};

	this.getAsArray = function(key) {
		return (this.data[key] ? this.data[key].slice(1, -1).split(',') : []);
	};

	this.set = function(key, value) {
		this.data[key] = value;
		return this.data[key];
	};

	this.getData = function() {
		return this.data;
	};

	this.setData = function(data) {
		//console.log('Feature.setData %o', data);
		this.data = (typeof data == 'string' ? $.parseJSON(data) : data);
	};

	this.getCoord = function() {
		var coord = false;

		if (this.get('point') != '') {
			var geom = kvm.wkx.Geometry.parse(new kvm.Buffer(this.get('point'), 'hex'));
/*
			,
					coord = ol.proj.transform(
						[geom.x, geom.y],
						"EPSG:4326",
						kvm.map.getView().getProjection()
					);
					*/
			return [geom.y, geom.x];
		}

		if (this.get('linestring') != '') {
			var geom = kvm.wkx.Geometry.parse(new kvm.Buffer(this.get('linestring'), 'hex'));
			return geom;
		}

		if (this.get('polygon') != '') {
			var geom = kvm.wkx.Geometry.parse(new kvm.Buffer(this.get('polygon'), 'hex'));
			return geom;
		}
	};

	this.getStyle = function() {
		var style;

		if (this.get('point') != '') {
			style = {
				icon: this.getIcon()
			}
		}

		if (this.get('linestring') != '') {
			style = {
				stroke: true,
				color: 'red',
				weight: 2
			}
		}

		if (this.get('polygon') != '') {
			style = {
				stroke: true,
				color: 'darkred',
				weight: 1,
				fill: true,
				fillColor: 'red',
				fillOpacity: 0.2
			}
		}

	};

	this.getIcon = function() {
		var iconFile = 'img/default.png',
				svgString;

		switch (this.featureClass) {
			case 'Totfunde':
				svgString = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M20.5,55.5 C20.5,34.5 36.5,20.5 60.5,20.5 C84.5,20.5 100.5,34.5 100.5,55.5 C100.5,76.5 60.5,125.5 60.5,125.5 C60.5,125.5 20.5,76.5 20.5,55.5 Z" style="stroke:#e3262f;stroke-opacity:1;stroke-width:0;stroke-linejoin:miter;stroke-miterlimit:2;stroke-linecap:round;fill-rule:evenodd;fill:#c61108;fill-opacity:1;"/><path d="M44.5,51.5 C44.5,51.5 76.5,51.5 76.5,51.5 " style="stroke:#ffffff;stroke-opacity:1;stroke-width:11;stroke-linejoin:miter;stroke-miterlimit:2;stroke-linecap:round;fill-rule:evenodd;fill:#ffffff;fill-opacity:1;"/><path d="M60.5,37.5 C60.5,37.5 60.4998,86.5 60.4998,86.5 " style="stroke:#ffffff;stroke-opacity:1;stroke-width:11;stroke-linejoin:miter;stroke-miterlimit:2;stroke-linecap:round;fill-rule:evenodd;fill:#ffffff;fill-opacity:1;"/><path d="M44.5,132.5 C44.5,132.5 76.5,160.5 76.5,160.5 " style="stroke:#e3262f;stroke-opacity:1;stroke-width:4.5;stroke-linejoin:miter;stroke-miterlimit:2;stroke-linecap:round;fill-rule:evenodd;fill:#c61108;fill-opacity:1;"/><path d="M76.5,132.5 C76.5,132.5 44.5,160.5 44.5,160.5 " style="stroke:#e3262f;stroke-opacity:1;stroke-width:4.5;stroke-linejoin:miter;stroke-miterlimit:2;stroke-linecap:round;fill-rule:evenodd;fill:#c61108;fill-opacity:1;"/></svg>';
				//iconFile = encodeURI("data:image/svg+xml," + svgString).replace('#','%23');
				iconFile = 'img/Totfund.png';
			break;
		}

		return L.icon({
			iconUrl: iconFile,
			//shadowUrl: 'leaf-shadow.png',
			iconSize:     [24, 24], // size of the icon
			//shadowSize:   [50, 64], // size of the shadow
			iconAnchor:   [12, 12], // point of the icon which will correspond to marker's location
			shadowAnchor: [16, 8],  // the same for the shadow
			popupAnchor:  [0, -12] // point from which the popup should open relative to the iconAnchor
		});
	};

	this.update = function() {
		sql = "\
			SELECT\
				*\
			FROM\
				haltestellen\
			WHERE\
				uuid = '" + this.get('uuid') + "'\
		";
		kvm.log('Frage feature uuid: ' + this.get('uuid') + ' mit sql: ' + sql + ' ab.', 3);
		kvm.db.executeSql(
			sql,
			[],
			function(rs) {
				kvm.log('Objekt aktualisiert.', 3);
				kvm.log('Feature.update result: ' + JSON.stringify(rs.rows.item(0)));
				var data = rs.rows.item(0);
				kvm.activeLayer.activeFeature.data = (typeof data == 'string' ? $.parseJSON(data) : data);

				if (typeof kvm.activeLayer.features['id_' + data.uuid] == 'undefined') {
					//console.log('insert new feature name in feature list: ' + kvm.activeLayer.activeFeature.get('name'));
					$('#featurelistTable tr:first').before(kvm.activeLayer.activeFeature.listElement);
				}
				else {
					//console.log('replace old with new name in feature list: ' + kvm.activeLayer.activeFeature.get('name'));
					$('#' + kvm.activeLayer.activeFeature.get('uuid')).html(kvm.activeLayer.activeFeature.get('name'));
				}
			},
			function(error) {
				kvm.log('Fehler bei der Abfrage des Features mit uuid ' + this.get('uuid') + ' aus lokaler Datenbank: ' + error.message);
			}
		);
	};

	this.listElement = function() {
		return '\
			<div class="feature-item feature-status-' + this.get('status') + '" id="' + this.get('uuid') + '">' + kvm.coalesce(this.get(kvm.activeLayer.get('name_attribute')), 'Datensatz ' + this.get(kvm.activeLayer.get('id_attribute'))) + '</div>\
		';
	};
}
