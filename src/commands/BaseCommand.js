
//TODO: make this class (renamed) just generate command objects instead and ditch the subclasses
module.exports = class BaseCommand {
    constructor(data) {
       this.data = data;
    }

    stringify(extra) {
        return JSON.stringify({command: this.constructor.name, data: this.data, ...extra});
    }
    
}