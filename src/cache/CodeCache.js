const SystemCache = require('./SystemCache');
const logger = require('../logger');

module.exports = class CodeCache extends SystemCache {
    constructor(messageLayer, initialData) {
        super(messageLayer, initialData, SystemCache.CODE_CACHE);
    }

    getTableName() {
        return 'code';
    }

    createTable() {
        const sqlStatement = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id TEXT PRIMARY KEY, 
                name TEXT,
                type TEXT,
                body TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_name ON ${this.tableName} (name);
            CREATE INDEX IF NOT EXISTS idx_type ON ${this.tableName} (type);
        `;
        // Create table using sqlite API and the this.db object
        this.db.exec(sqlStatement);        
    }

    addItem(codeObj) {
        // insert a new record of the node in the db 
        const sqlStatement = `INSERT INTO ${this.tableName} (id, name, type, body) VALUES ('${codeObj.id}', '${codeObj.name}', '${codeObj.type}', '${codeObj.body}')`;        
        return this.run(sqlStatement);
    }

    showContext() {
        const error = new Error('fakeError')
        // Extract the stack trace and split it into individual lines
        const stackTrace = error.stack?.split('\n')
        logger.log('+++++++++++++++++++++++++++++++++++++++++++++ stack trace (DEBUG Test) +++++++++++++++++++++++++++++++++++++++++++++')
        logger.log(stackTrace)
    }
}