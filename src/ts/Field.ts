export interface Field {
    settings: any;
    selector: string;
    element: JQuery<HTMLElement>;
    get(key: string): any;
    setValue: (val: string) => void;
    getValue: (action: string) => void;
    bindEvents: () => void;
}
