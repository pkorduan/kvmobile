import { AttributeSetting } from "./Attribute";

export interface Field {
    settings?: AttributeSetting;
    selector?: string;
    // element: JQuery<HTMLElement>;
    // get(key: string): any;
    setValue: (val: string) => void;
    getValue?: (action?: string) => any;
    bindEvents: () => void;
}
