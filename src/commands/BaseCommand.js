module.exports = class BaseCommand {
    constructor(data) {
       this.data = data;
    }

    stringify() {
        return JSON.stringify({command: this.constructor.name, data: this.data});
    }
    
}