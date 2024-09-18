import { Control, Util, DomEvent, DomUtil, Layer, Map as LMap } from "leaflet";
// import * as Util from '../core/Util';
// import * as DomEvent from '../dom/DomEvent';
// import * as DomUtil from '../dom/DomUtil';

/*
 * @class Control.Layers
 * @aka L.Control.Layers
 * @inherits Control
 *
 * The layers control gives users the ability to switch between different base layers and switch overlays on/off (check out the [detailed example](https://leafletjs.com/examples/layers-control/)). Extends `Control`.
 *
 * @example
 *
 * ```js
 * var baseLayers = {
 * 	"Mapbox": mapbox,
 * 	"OpenStreetMap": osm
 * };
 *
 * var overlays = {
 * 	"Marker": marker,
 * 	"Roads": roadsLayer
 * };
 *
 * L.control.layers(baseLayers, overlays).addTo(map);
 * ```
 *
 * The `baseLayers` and `overlays` parameters are object literals with layer names as keys and `Layer` objects as values:
 *
 * ```js
 * {
 *     "<someName1>": layer1,
 *     "<someName2>": layer2
 * }
 * ```
 *
 * The layer names can contain HTML, which allows you to add additional styling to the items:
 *
 * ```js
 * {"<img src='my-layer-icon' /> <span class='my-layer-item'>My Layer</span>": myLayer}
 * ```
 */

declare module "leaflet" {
  interface Control {
    _map: LMap;
    _refocusOnMap: () => void;
  }
}

export class LayerCtrl extends Control {
  // @section
  // @aka Control.Layers options
  options = <any>{
    // @option collapsed: Boolean = true
    // If `true`, the control will be collapsed into an icon and expanded on mouse hover, touch, or keyboard activation.
    collapsed: true,
    position: "topright",

    // @option autoZIndex: Boolean = true
    // If `true`, the control will assign zIndexes in increasing order to all of its layers so that the order is preserved when switching them on/off.
    autoZIndex: true,

    // @option hideSingleBase: Boolean = false
    // If `true`, the base layers in the control will be hidden when there is only one.
    hideSingleBase: false,

    // @option sortLayers: Boolean = false
    // Whether to sort the layers. When `false`, layers will keep the order
    // in which they were added to the control.
    sortLayers: false,

    // @option sortFunction: Function = *
    // A [compare function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
    // that will be used for sorting the layers, when `sortLayers` is `true`.
    // The function receives both the `L.Layer` instances and their names, as in
    // `sortFunction(layerA, layerB, nameA, nameB)`.
    // By default, it sorts layers alphabetically by their name.
    sortFunction: function (layerA, layerB, nameA, nameB) {
      return nameA < nameB ? -1 : nameB < nameA ? 1 : 0;
    },
  };
  // _map: LMap;
  private _layerControlInputs: HTMLInputElement[];
  private _layers: { layer: Layer; name: string; overlay: boolean }[] = [];
  private _lastZIndex: number;
  private _handlingClick: boolean;
  private _preventClick: boolean;
  private _container: HTMLDivElement;
  private _section: HTMLElement;
  private _layersLink: HTMLAnchorElement;
  private _baseLayersList: HTMLDivElement;
  private _separator: HTMLDivElement;
  private _overlaysList: HTMLDivElement;

  constructor(baseLayers, overlays, options: any) {
    super();
    Util.setOptions(this, options);

    this._layerControlInputs = [];
    this._layers = [];
    this._lastZIndex = 0;
    this._handlingClick = false;
    this._preventClick = false;

    for (let i in baseLayers) {
      this._addLayer(baseLayers[i], i);
    }

    for (let i in overlays) {
      this._addLayer(overlays[i], i, true);
    }
  }

  onAdd(map: LMap) {
    this._initLayout();
    this._update();

    this._map = map;
    map.on("zoomend", this._checkDisabledLayers, this);

    for (var i = 0; i < this._layers.length; i++) {
      this._layers[i].layer.on("add remove", this._onLayerChange, this);
    }

    return this._container;
  }

  addTo(map) {
    Control.prototype.addTo.call(this, map);
    // Trigger expand after Layers Control has been inserted into DOM so that is now has an actual height.
    return this._expandIfNotCollapsed();
  }

  onRemove() {
    this._map.off("zoomend", this._checkDisabledLayers, this);

    for (var i = 0; i < this._layers.length; i++) {
      this._layers[i].layer.off("add remove", this._onLayerChange, this);
    }
  }

  // @method addBaseLayer(layer: Layer, name: String): this
  // Adds a base layer (radio button entry) with the given name to the control.
  addBaseLayer(layer, name) {
    this._addLayer(layer, name);
    return this._map ? this._update() : this;
  }

  // @method addOverlay(layer: Layer, name: String): this
  // Adds an overlay (checkbox entry) with the given name to the control.
  addOverlay(layer: Layer, name: string) {
    this._addLayer(layer, name, true);
    return this._map ? this._update() : this;
  }

  // @method removeLayer(layer: Layer): this
  // Remove the given layer from the control.
  removeLayer(layer) {
    layer.off("add remove", this._onLayerChange, this);

    var obj = this._getLayer(Util.stamp(layer));
    if (obj) {
      this._layers.splice(this._layers.indexOf(obj), 1);
    }
    return this._map ? this._update() : this;
  }

  // @method expand(): this
  // Expand the control container if collapsed.
  expand() {
    DomUtil.addClass(this._container, "leaflet-control-layers-expanded");
    this._section.style.height = "";
    var acceptableHeight = this._map.getSize().y - (this._container.offsetTop + 50);
    if (acceptableHeight < this._section.clientHeight) {
      DomUtil.addClass(this._section, "leaflet-control-layers-scrollbar");
      this._section.style.height = acceptableHeight + "px";
    } else {
      DomUtil.removeClass(this._section, "leaflet-control-layers-scrollbar");
    }
    this._checkDisabledLayers();
    return this;
  }

  // @method collapse(): this
  // Collapse the control container if expanded.
  collapse() {
    DomUtil.removeClass(this._container, "leaflet-control-layers-expanded");
    return this;
  }

  _initLayout() {
    var className = "leaflet-control-layers",
      container = (this._container = DomUtil.create("div", className)),
      collapsed = this.options.collapsed;

    // makes this work on IE touch devices by stopping it from firing a mouseout event when the touch is released
    container.setAttribute("aria-haspopup", "true");

    DomEvent.disableClickPropagation(container);
    DomEvent.disableScrollPropagation(container);

    var section = (this._section = DomUtil.create("section", className + "-list"));

    if (collapsed) {
      this._map.on("click", this.collapse, this);

      DomEvent.on(
        container,
        {
          mouseenter: this._expandSafely,
          mouseleave: this.collapse,
        },
        this
      );
    }

    var link = (this._layersLink = DomUtil.create("a", className + "-toggle", container));
    link.href = "#";
    link.title = "Layers";
    link.setAttribute("role", "button");

    DomEvent.on(
      link,
      {
        keydown: (e: any) => {
          if (e.keyCode === 13) {
            this._expandSafely();
          }
        },
        // Certain screen readers intercept the key event and instead send a click event
        click: function (e) {
          DomEvent.preventDefault(e);
          this._expandSafely();
        },
      },
      this
    );

    if (!collapsed) {
      this.expand();
    }

    this._baseLayersList = DomUtil.create("div", className + "-base", section);
    this._separator = DomUtil.create("div", className + "-separator", section);
    this._overlaysList = DomUtil.create("div", className + "-overlays", section);

    container.appendChild(section);
  }

  private _getLayer(id): { layer: Layer; name: string; overlay: boolean } | undefined {
    for (let i = 0; i < this._layers.length; i++) {
      if (this._layers[i] && Util.stamp(this._layers[i].layer) === id) {
        return this._layers[i];
      }
    }
  }

  private _addLayer(layer: Layer, name: string, overlay?: boolean) {
    if (this._map) {
      layer.on("add remove", this._onLayerChange, this);
    }

    this._layers.push({
      layer: layer,
      name: name,
      overlay: overlay || false,
    });

    if (this.options.sortLayers) {
      this._layers.sort((a, b) => {
        return this.options.sortFunction(a.layer, b.layer, a.name, b.name);
      });
    }

    if (this.options.autoZIndex && (<any>layer).setZIndex) {
      this._lastZIndex++;
      (<any>layer).setZIndex(this._lastZIndex);
    }

    this._expandIfNotCollapsed();
  }

  private _update() {
    if (!this._container) {
      return this;
    }

    DomUtil.empty(this._baseLayersList);
    DomUtil.empty(this._overlaysList);

    this._layerControlInputs = [];
    var baseLayersPresent,
      overlaysPresent,
      i,
      obj,
      baseLayersCount = 0;

    for (i = 0; i < this._layers.length; i++) {
      obj = this._layers[i];
      this._addItem(obj);
      overlaysPresent = overlaysPresent || obj.overlay;
      baseLayersPresent = baseLayersPresent || !obj.overlay;
      baseLayersCount += !obj.overlay ? 1 : 0;
    }

    // Hide base layers section if there's only one layer.
    if (this.options.hideSingleBase) {
      baseLayersPresent = baseLayersPresent && baseLayersCount > 1;
      this._baseLayersList.style.display = baseLayersPresent ? "" : "none";
    }

    this._separator.style.display = overlaysPresent && baseLayersPresent ? "" : "none";

    return this;
  }

  _onLayerChange(e) {
    if (!this._handlingClick) {
      this._update();
    }

    var obj = this._getLayer(Util.stamp(e.target));

    // @namespace Map
    // @section Layer events
    // @event baselayerchange: LayersControlEvent
    // Fired when the base layer is changed through the [layers control](#control-layers).
    // @event overlayadd: LayersControlEvent
    // Fired when an overlay is selected through the [layers control](#control-layers).
    // @event overlayremove: LayersControlEvent
    // Fired when an overlay is deselected through the [layers control](#control-layers).
    // @namespace Control.Layers
    var type = obj?.overlay ? (e.type === "add" ? "overlayadd" : "overlayremove") : e.type === "add" ? "baselayerchange" : null;

    if (type) {
      this._map.fire(type, obj);
    }
  }

  // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see https://stackoverflow.com/a/119079)
  _createRadioElement(name, checked) {
    var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"' + (checked ? ' checked="checked"' : "") + "/>";

    var radioFragment = document.createElement("div");
    radioFragment.innerHTML = radioHtml;

    return radioFragment.firstChild;
  }

  _addItem(obj) {
    var label = document.createElement("label"),
      checked = this._map.hasLayer(obj.layer),
      input;

    if (obj.overlay) {
      input = document.createElement("input");
      input.type = "checkbox";
      input.className = "leaflet-control-layers-selector";
      input.defaultChecked = checked;
    } else {
      input = this._createRadioElement("leaflet-base-layers_" + Util.stamp(this), checked);
    }

    this._layerControlInputs.push(input);
    input.layerId = Util.stamp(obj.layer);

    DomEvent.on(input, "click", this._onInputClick, this);

    var name = document.createElement("span");
    name.innerHTML = " " + obj.name;

    // Helps from preventing layer control flicker when checkboxes are disabled
    // https://github.com/Leaflet/Leaflet/issues/2771
    var holder = document.createElement("span");

    label.appendChild(holder);
    holder.appendChild(input);
    holder.appendChild(name);

    var container = obj.overlay ? this._overlaysList : this._baseLayersList;
    container.appendChild(label);

    this._checkDisabledLayers();
    return label;
  }

  _onInputClick() {
    // expanding the control on mobile with a click can cause adding a layer - we don't want this
    if (this._preventClick) {
      return;
    }

    const inputs = this._layerControlInputs;

    const addedLayers: Layer[] = [],
      removedLayers: Layer[] = [];

    this._handlingClick = true;

    for (var i = inputs.length - 1; i >= 0; i--) {
      const input = inputs[i];
      const layer = this._getLayer((<any>input).layerId)?.layer;

      if (layer) {
        if (input.checked) {
          addedLayers.push(layer);
        } else if (!input.checked) {
          removedLayers.push(layer);
        }
      }
    }

    // Bugfix issue 2318: Should remove all old layers before readding new ones
    for (i = 0; i < removedLayers.length; i++) {
      if (this._map.hasLayer(removedLayers[i])) {
        this._map.removeLayer(removedLayers[i]);
      }
    }
    for (i = 0; i < addedLayers.length; i++) {
      if (!this._map.hasLayer(addedLayers[i])) {
        this._map.addLayer(addedLayers[i]);
      }
    }

    this._handlingClick = false;

    this._refocusOnMap();
  }

  _checkDisabledLayers() {
    var inputs = this._layerControlInputs,
      input,
      layer,
      zoom = this._map.getZoom();

    for (var i = inputs.length - 1; i >= 0; i--) {
      input = inputs[i];
      layer = this._getLayer(input.layerId)?.layer;
      input.disabled = (layer.options.minZoom !== undefined && zoom < layer.options.minZoom) || (layer.options.maxZoom !== undefined && zoom > layer.options.maxZoom);
    }
  }

  _expandIfNotCollapsed() {
    if (this._map && !this.options.collapsed) {
      this.expand();
    }
    return this;
  }

  _expandSafely() {
    var section = this._section;
    this._preventClick = true;
    DomEvent.on(section, "click", DomEvent.preventDefault);
    this.expand();
    var that = this;
    setTimeout(function () {
      DomEvent.off(section, "click", DomEvent.preventDefault);
      that._preventClick = false;
    });
  }
}

// // @factory L.control.layers(baselayers?: Object, overlays?: Object, options?: Control.Layers options)
// // Creates a layers control with the given layers. Base layers will be switched with radio buttons, while overlays will be switched with checkboxes. Note that all base layers should be passed in the base layers object, but only one should be added to the map during map instantiation.
// export var layers = function (baseLayers, overlays, options) {
//   return new Layers(baseLayers, overlays, options);
// };