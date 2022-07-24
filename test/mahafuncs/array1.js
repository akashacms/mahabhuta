
const mahabhuta = require('../../dist/index');
const util = require('util');

const pluginName = "mahabhuta sample plugin";


class BunkyBump extends mahabhuta.CustomElement {
    get elementName() { return "funky-bump"; }
    async process($element, metadata, dirty) {
        return '<div class="funky-bump">Do the funky bump!</div>';
    }
}

class ShowOptions extends mahabhuta.CustomElement {
    get elementName() { return "show-options"; }
    async process($element, metadata, dirty) {

        console.log(`show options `, this.array.options);

        let optionRows = '';
        for (const key in this.array.options) {
            optionRows += `
            <tr><td>${key}</td><td>${this.array.options[key]}</td></tr>
            `;
        }
        return `
        <table>
        ${optionRows}
        </table>
        `;
    }
}


module.exports.mahabhutaArray = function(options) {
    let ret = new mahabhuta.MahafuncArray(pluginName, options);
    ret.addMahafunc(new BunkyBump());
    ret.addMahafunc(new ShowOptions());
    return ret;
};


exports.mahabhuta = module.exports.mahabhutaArray({});

