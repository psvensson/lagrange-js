module.exports = class BaseData {
    constructor(info) {
        this.id = info.id;
        this.createdAt = info.createdAt || Date.now();
        this.updatedAt = info.updatedAt || Date.now();
        this.deletedAt = info.deletedAt;
    }

}