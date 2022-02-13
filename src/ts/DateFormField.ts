/*
 * create a date form field in the structure
 *   <div class="form-field">
 *     <div class="form-label">
 *       <label for="name"/>
 *     </div>
 *     <div class="form-value">
 *       <input type="date" id="1" name="bezeichnung" value="Wert"/>
 *     </div>
 *   </div>
 */
function DateFormField(formId, settings): void {
    //console.log('Erzeuge DateFormField with settings %o', settings);
    (this.settings = settings),
        (this.get = function (key) {
            return this.settings[key];
        });

    (this.selector = "#" + formId + " input[id=" + this.get("index") + "]"), (this.element = $('\
    <input\
      type="date"\
      id="' + this.get("index") + '"\
      name="' + this.get("name") + '"\
      value=""' + (this.get("privilege") == "0" ? " disabled" : "") + "\
    />"));

    this.setValue = function (val) {
        kvm.log("val: " + val, 4);
        var val = kvm.coalesce(val, "");
        if (this.isValidDate(val)) {
            val = this.toISO(val);
        }
        kvm.log("DateFormField " + this.get("name") + " setValue with value: " + JSON.stringify(val), 4);
        this.element.val(val);
    };

    this.getValue = function (action = "") {
        kvm.log("DateFormField.getValue", 4);
        var val = this.element.val();
        if (typeof val === "undefined" || val == "") {
            val = null;
        }
        return val;
    };

    this.getAutoValue = function () {
        kvm.log("DateFormField.getAutoValue", 4);
        return kvm.today();
    };

    this.bindEvents = function () {
        //console.log('DateFormField.bindEvents');
        $("#featureFormular input[id=" + this.get("index") + "]").on("change", function () {
            if (!$("#saveFeatureButton").hasClass("active-button")) {
                $("#saveFeatureButton").toggleClass("active-button inactive-button");
            }
        });
    };

    this.toISO = function (date) {
        return typeof date == "string" ? date.replace(/\//g, "-") : "";
    };

    this.fromISO = function (date) {
        kvm.log("konvert " + this.get("name") + " date: " + date, 4);
        return typeof date == "string" ? date.replace(/-/g, "/").replace("T", " ").replace("Z", "") : null;
    };

    /*
     * Validate date format
     * changed from: https://www.c-sharpcorner.com/article/date-validation-as-text-format-in-javascript/
     */
    this.isValidDate = function (dateString) {
        if (!(typeof dateString === "string" || dateString instanceof String)) {
            console.log(dateString + " ist kein String.");
            return false;
        }
        let dateformat = /^\d{4}[-](0?[1-9]|1[0-2])[-](0?[1-9]|[1-2][0-9]|3[01])$/;
        if (dateString.match(dateformat)) {
            //console.log('Datumsformat passt zur Form YYYY-MM-DD');
            let operator = dateString.split("-");
            let datepart = [];
            if (operator.length > 1) {
                //console.log('Es sind mehr als 1 - vorhanden');
                datepart = dateString.split("-");
            } else {
                //console.log('Es fehlen - Zeichen');
            }
            let year = parseInt(datepart[0]);
            let month = parseInt(datepart[1]);
            let day = parseInt(datepart[2]);
            let ListofDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            if (year < 1970) {
                console.log("Es werden nur Datumsangaben ab 1970 zugelassen.");
                return false;
            }
            //console.log('Prüfe Jahr: ' + year + ' Monat: ' + month + ' Tag: ' + day);
            if (month == 1 || month > 2) {
                //console.log('Kein Februar');
                if (day > ListofDays[month - 1]) {
                    //console.log('Tag ist größer als ', ListofDays[month - 1]);
                    return false;
                }
            } else if (month == 2) {
                //console.log('Prüfe Tag im Februar');
                let leapYear = false;
                if ((!(year % 4) && year % 100) || !(year % 400)) {
                    //console.log('Es ist Schaltjahr!');
                    leapYear = true;
                }
                if (leapYear == false && day >= 29) {
                    console.log("Tag ist größer als 28. Und wir haben kein Schaltjahr.");
                    return false;
                } else if (leapYear == true && day > 29) {
                    console.log("Wir haben Schaltjahr aber der Tag ist größer als 29.");
                    return false;
                }
            }
        } else {
            console.log("Unültiges Datumsformat");
            return false;
        }
        return true;
    };

    return this;
}
