export class CheckboxFormField {
    settings: any;
    selector: string;
    element: JQuery<HTMLElement>;

    constructor(formId, settings) {
        this.settings = settings;
        this.selector = "#" + formId + " input[id=" + this.get("index") + "]";
        this.element = $('\
        <input\
          type="checkbox"\
          id="' + this.get("index") + '"\
          name="' + this.get("name") + '"' + (this.get("privilege") == "0" ? " disabled" : "") + "\
        />");
    }

    get(key) {
        return this.settings[key];
    }

    setValue(val) {
        //console.log('CheckboxFormField.setValue with value: ' + val);
        if (!val && this.get("default")) {
            val = this.get("default");
        }

        this.element.val(val);
        this.element.prop("checked", false);
        if (val == "t") {
            this.element.prop("checked", true);
        }
    }

    getValue(action = "") {
        // console.log('CheckboxFormField.getValue');
        return this.element.prop("checked") ? "t" : this.element.val() == "" ? null : "f";
    }

    bindEvents() {
        //console.log('CheckboxFormField.bindEvents');
        $("#featureFormular input[id=" + this.get("index") + "]").on("change", function () {
            if (!$("#saveFeatureButton").hasClass("active-button")) {
                $("#saveFeatureButton").toggleClass("active-button inactive-button");
            }
        });
    }
}
