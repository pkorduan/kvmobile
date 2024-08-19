export interface ObservableEvent {
  type: string;
}

export interface Listener<T extends ObservableEvent> {
  (event: T): void;
}

export class PropertyChangeEvent implements ObservableEvent {
  static type = "propertyChanged";

  type = "propertyChanged";
  prop: string;
  newValue: any;
  oldValue: any;
  target: any;

  constructor(target: any, prop: string, oldValue: any, newValue: any) {
    this.prop = prop;
    this.newValue = newValue;
    this.oldValue = oldValue;
    this.target = target;
  }
}

export class ObservableSupport<T extends ObservableEvent> {
  private mapPropToLstn: Map<string, Listener<T>[]>;
  private lstn: Listener<T>[];

  addEventListener(listener: Listener<T>): void;
  addEventListener(a: string, listener: Listener<T>): void;
  addEventListener(a: string | Listener<T>, listener?: Listener<T>) {
    // console.info("addListener", a, listener)
    // let prop: string;
    let lst: Listener<T>;
    // let lstn: Listener<T>[];

    if (typeof a === "string") {
      if (!this.mapPropToLstn) {
        this.mapPropToLstn = new Map();
      }
      let lstn = this.mapPropToLstn.get(a);
      if (!lstn) {
        lstn = [];
        this.mapPropToLstn.set(a, lstn);
      }
      if (lstn.indexOf(listener) < 0) {
        lstn.push(listener);
      }
    } else {
      if (!this.lstn) {
        this.lstn = [];
      }
      if (this.lstn.indexOf(a) < 0) {
        this.lstn.push(a);
      }
    }
  }

  removeEventListener(listener: Listener<T>): void;
  removeEventListener(a: string, listener: Listener<T>): void;
  removeEventListener(a: string | Listener<T>, listener?: Listener<T>) {
    let prop: string;
    let lst: Listener<T>;
    let lstn: Listener<T>[];

    if (typeof a === "string") {
      prop = a;
      lst = listener;
      if (this.mapPropToLstn) {
        lstn = this.mapPropToLstn.get(prop);
      }
    } else {
      lst = a;
      lstn = this.lstn;
    }
    if (lstn) {
      let idx = lstn.indexOf(lst);
      if (idx >= 0) {
        lstn.slice(idx, 1);
      }
    }
  }

  _fire(event: ObservableEvent, lstn: Listener<T>[]) {
    if (lstn) {
      for (let index = 0; index < lstn.length; index++) {
        lstn[index].call(this, event);
      }
    }
  }

  fire(event: ObservableEvent) {
    if (this.mapPropToLstn) {
      if (event instanceof PropertyChangeEvent) {
        this._fire(event, this.mapPropToLstn.get(event.prop));
      } else {
        this._fire(event, this.mapPropToLstn.get(event.type));
      }
    }
    this._fire(event, this.lstn);
  }
}

export class PropertyChangeSupport extends ObservableSupport<PropertyChangeEvent> {
  set(prop: any, value: any) {
    const oldValue = this[prop];
    if (oldValue !== value) {
      this[prop] = value;
      this.fire(new PropertyChangeEvent(this, prop, oldValue, value));
    }
  }
}
