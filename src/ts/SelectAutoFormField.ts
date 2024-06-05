import { kvm } from "./app";

/*
 * create a select form field in the structure
 * <div class="form-label">
 * 	<label for="baumart_id">Obstart</label>
 * </div>
 * <div class="form-value">
 * 	<select id="4" name="baumart_id" required_by="sorte_id">
 *		<option value="">Bitte wählen</option>
 *		<option value="0">00 fehlende Obstart</option>
 *	</select>
 * </div>
 */
export class SelectAutoFormField {
  settings: any;
  selector: string;
  element: JQuery<HTMLElement>;

  constructor(formId, settings) {
    this.settings = settings;
    this.selector = "#" + formId + " input[id=" + this.get("index") + "]";
    this.element = $(`
			<input
				id="${this.get("index")}"
				name="${this.get("name")}"
				${(this.get("privilege") == "0" ? ' disabled' : '')}
			/>
      <div
        id="${this.get("index")}_autoSelect"
      >
        ${$.map(this.get("enums"), (option) => {
          return `
            <div
              value="${option.value}"
              class="${this.get("index")}_autoSelect"
              style="display: none"
            >${option.value}</div>
          `;
        }).join("")}
      </div>
    `);
  }

  get(key) {
    return this.settings[key];
  }

  setValue(val) {
    //console.log('SelectFormField.setValue with value: ' + val);
    if (kvm.coalesce(val, "") == "" && this.get("default")) {
      val = this.get("default");
    }
    this.element.val(val == "null" ? "" : val);
  };

  getValue(action = "") {
    //console.log('SelectFormField.getValue');
    var val = this.element.val();

    if (typeof val === "undefined" || val == "") {
      val = null;
    }
    return val;
  };

  bindEvents() {
    console.log('SelectAutoFormField.bindEvents');
    $("#featureFormular input[id=" + this.get("index") + "]").on('input', (evt) => {
      console.log('KeyDown: evt: %o', evt);
      console.log('target: %o', evt.target);
      console.log('val: %o', $(evt.target).val());
      const val = $(evt.target).val();
      $(`.${this.get("index")}_autoSelect`).hide();
      if (val != '') {
        $(`div[value*='${val}']`).show();
      }
    });

    $("#featureFormular input[id=" + this.get("index") + "]").on("change", function (evt) {
      if (!$("#saveFeatureButton").hasClass("active-button")) {
        $("#saveFeatureButton").toggleClass("active-button inactive-button");
      }
      let elm = evt.target;
      if (elm.hasAttribute("required_by")) {
        var required_by_idx = kvm.activeLayer.attribute_index[this.getAttribute("required_by")];
        console.log("Select Feld %s hat abhängiges Auswahlfeld %s", (<HTMLInputElement>this).name, this.getAttribute("required_by"));
        kvm.activeLayer.attributes[required_by_idx].formField.filter_by_required(elm.getAttribute("name"), $(elm).val());
        // find attribute with the name in required_by
        // apply the filter on the options, call filter_by_required
      }
    });
    $("#featureFormular input[id=" + this.get("index") + "]").on("keyup", function (evt) {
      let elm = $(evt.target);
			let val: string = String(elm.val());
			let selectField = $(`#featureFormular select[id="${elm.attr('id')}]`);
			if ((val.length  > 2)) {

				selectField.show();
				console.log('Key up event on select auto field value: %s', elm.val());
			}
    });
/**
 * Beispiel unter https://stackoverflow.com/questions/1447728/how-to-dynamic-filter-options-of-select-with-jquery
 jQuery.fn.filterByText = function(textbox) {
  return this.each(function() {
    var select = this;
    var options = [];
    $(select).find('option').each(function() {
      options.push({
        value: $(this).val(),
        text: $(this).text()
      });
    });
    $(select).data('options', options);

    $(textbox).on('change keyup', function(evt) {
      var options = $(select).empty().data('options');
      var search = $.trim($(this).val());
      var regex = new RegExp(search, "gi");

      $.each(options, function(i) {
        var option = options[i];
        if (option.text.match(regex) !== null) {
          $(select).append(
            $('<option>').text(option.text).val(option.value)
          );
        }
      });
    });
  });
};

$(function() {
  $('select').filterByText($('input'));
});

<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
<select>
  <option value="hello">hello</option>
  <option value="world">world</option>
  <option value="lorem">lorem</option>
  <option value="ipsum">ipsum</option>
  <option value="lorem ipsum">lorem ipsum</option>
</select>
<input type="text">
*/

	};
}

// function autocomplete(inp, arr) {
//   /*the autocomplete function takes two arguments,
//   the text field element and an array of possible autocompleted values:*/
//   var currentFocus;
//   /*execute a function when someone writes in the text field:*/
//   inp.addEventListener("input", function(e) {
//       var a, b, i, val = this.value;
//       /*close any already open lists of autocompleted values*/
//       closeAllLists();
//       if (!val) { return false;}
//       currentFocus = -1;
//       /*create a DIV element that will contain the items (values):*/
//       a = document.createElement("DIV");
//       a.setAttribute("id", this.id + "autocomplete-list");
//       a.setAttribute("class", "autocomplete-items");
//       /*append the DIV element as a child of the autocomplete container:*/
//       this.parentNode.appendChild(a);
//       /*for each item in the array...*/
//       for (i = 0; i < arr.length; i++) {
//         /*check if the item starts with the same letters as the text field value:*/
//         if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
//           /*create a DIV element for each matching element:*/
//           b = document.createElement("DIV");
//           /*make the matching letters bold:*/
//           b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
//           b.innerHTML += arr[i].substr(val.length);
//           /*insert a input field that will hold the current array item's value:*/
//           b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
//           /*execute a function when someone clicks on the item value (DIV element):*/
//           b.addEventListener("click", function(e) {
//               /*insert the value for the autocomplete text field:*/
//               inp.value = this.getElementsByTagName("input")[0].value;
//               /*close the list of autocompleted values,
//               (or any other open lists of autocompleted values:*/
//               closeAllLists();
//           });
//           a.appendChild(b);
//         }
//       }
//   });
//   /*execute a function presses a key on the keyboard:*/
//   inp.addEventListener("keydown", function(e) {
//       var x = document.getElementById(this.id + "autocomplete-list");
//       if (x) x = x.getElementsByTagName("div");
//       if (e.keyCode == 40) {
//         /*If the arrow DOWN key is pressed,
//         increase the currentFocus variable:*/
//         currentFocus++;
//         /*and and make the current item more visible:*/
//         addActive(x);
//       } else if (e.keyCode == 38) { //up
//         /*If the arrow UP key is pressed,
//         decrease the currentFocus variable:*/
//         currentFocus--;
//         /*and and make the current item more visible:*/
//         addActive(x);
//       } else if (e.keyCode == 13) {
//         /*If the ENTER key is pressed, prevent the form from being submitted,*/
//         e.preventDefault();
//         if (currentFocus > -1) {
//           /*and simulate a click on the "active" item:*/
//           if (x) x[currentFocus].click();
//         }
//       }
//   });
//   function addActive(x) {
//     /*a function to classify an item as "active":*/
//     if (!x) return false;
//     /*start by removing the "active" class on all items:*/
//     removeActive(x);
//     if (currentFocus >= x.length) currentFocus = 0;
//     if (currentFocus < 0) currentFocus = (x.length - 1);
//     /*add class "autocomplete-active":*/
//     x[currentFocus].classList.add("autocomplete-active");
//   }
//   function removeActive(x) {
//     /*a function to remove the "active" class from all autocomplete items:*/
//     for (var i = 0; i < x.length; i++) {
//       x[i].classList.remove("autocomplete-active");
//     }
//   }
//   function closeAllLists(elmnt) {
//     /*close all autocomplete lists in the document,
//     except the one passed as an argument:*/
//     var x = document.getElementsByClassName("autocomplete-items");
//     for (var i = 0; i < x.length; i++) {
//       if (elmnt != x[i] && elmnt != inp) {
//         x[i].parentNode.removeChild(x[i]);
//       }
//     }
//   }
//   /*execute a function when someone clicks in the document:*/
//   document.addEventListener("click", function (e) {
//       closeAllLists(e.target);
//   });
// }

// /*An array containing all the country names in the world:*/
// var countries = ["Afghanistan","Albania","Algeria","Andorra","Angola","Anguilla","Antigua & Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia & Herzegovina","Botswana","Brazil","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Cayman Islands","Central Arfrican Republic","Chad","Chile","China","Colombia","Congo","Cook Islands","Costa Rica","Cote D Ivoire","Croatia","Cuba","Curacao","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Ethiopia","Falkland Islands","Faroe Islands","Fiji","Finland","France","French Polynesia","French West Indies","Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guam","Guatemala","Guernsey","Guinea","Guinea Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Jamaica","Japan","Jersey","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macau","Macedonia","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Myanmar","Namibia","Nauro","Nepal","Netherlands","Netherlands Antilles","New Caledonia","New Zealand","Nicaragua","Niger","Nigeria","North Korea","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Puerto Rico","Qatar","Reunion","Romania","Russia","Rwanda","Saint Pierre & Miquelon","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","St Kitts & Nevis","St Lucia","St Vincent","Sudan","Suriname","Swaziland","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor L'Este","Togo","Tonga","Trinidad & Tobago","Tunisia","Turkey","Turkmenistan","Turks & Caicos","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay"];