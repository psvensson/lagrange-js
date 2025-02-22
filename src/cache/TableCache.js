const SystemCache = require("./SystemCache");
const logger = require('../logger');

module.exports = class TableCache extends SystemCache {
    constructor(messageLayer, initialData) {
        super(messageLayer, initialData, SystemCache.TABLE_CACHE);
    }

    getTableName() {
        return 'tables';
    }

    // Partitions refer to their tables, not the other way around.
    // Is it enough to just have ownership/createdBy for tables? 
    // It could be the lowest level of interaction for any program or user, below that is the core system which is just itself.
    createTable() {
        const sqlStatement = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id TEXT PRIMARY KEY, 
                name TEXT,
                schema TEXT,
                createAt TEXT,
                modifiedAt TEXT,
                createdBy TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_name ON ${this.tableName} (name);
        `;
        this.db.exec(sqlStatement);
    }

    addItem(table) {
        logger.log('TableCache::addTable table: ')
        logger.dir(table)
        const sqlStatement = `INSERT INTO ${this.tableName} (id, name, schema, partitions) VALUES ('${table.id}', '${table.name}', '${table.schema}', '${table.partitions}')`;
        return this.run(sqlStatement)
    }
    
}