const BTreeNode = require('./BTreeNode');
const {TextEncoder} = require('./KeyEncoder');

module.exports = class BTreeIndex {
    constructor(order = 4, keyEncoder = new TextEncoder()) {
      this.root = new BTreeNode(order, true);
      this.keyEncoder = keyEncoder; 
    }
  
    insert(value, pointer) {
      // Convert value to bytes
      const keyBytes = this.keyEncoder.encode(value);
      // Insert into root
      this.root.insertKey(keyBytes, pointer, this.keyEncoder);
      // If root is overfull, split
      if (this.root.keys.length > this.root.order) {
        const newRoot = new BTreeNode(this.root.order, false);
        newRoot.pointers.push(this.root);
        newRoot.splitChild(0, this.keyEncoder);
        this.root = newRoot;
      }
    }
  
    search(value) {
      const keyBytes = this.keyEncoder.encode(value);
      return this.root.searchKey(keyBytes, this.keyEncoder);
    }
  }