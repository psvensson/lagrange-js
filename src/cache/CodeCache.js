const SystemCache = require('./SystemCache');

module.exports = class CodeCache extends SystemCache {
    constructor(messageLayer, initialData) {
        super(messageLayer, initialData);
        this.cacheName = SystemCache.CODE_CACHE;    
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

    async insertInitialData(initialData) {
        // The initialData format is the same as the output from the sqlite3 all() function call, just an array of rows
        // The call looks like this that produced the data;        
        await Promise.all(initialData.map(row => this.addCode(row)));
    }

    addCode(codeObj) {
        // insert a new record of the node in the db 
        const sqlStatement = `INSERT INTO ${this.tableName} (id, name, type, body) VALUES ('${codeObj.id}', '${codeObj.name}', '${codeObj.type}', '${codeObj.body}')`;        
        return this.run(sqlStatement);
    }

    showContext() {
        const error = new Error('fakeError')
        // Extract the stack trace and split it into individual lines
        const stackTrace = error.stack?.split('\n')
        console.log('+++++++++++++++++++++++++++++++++++++++++++++ stack trace (DEBUG Test) +++++++++++++++++++++++++++++++++++++++++++++')
        console.log(stackTrace)
    }
}