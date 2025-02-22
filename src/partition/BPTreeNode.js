module.exports = class BPTreeNode {
  constructor(leaf = false) {
    this.leaf = leaf;
    this.keys = [];       // if leaf=true, data keys; if leaf=false, separator keys
    this.records = [];    // if leaf=true, parallel array of rowPointers
    this.children = [];   // if leaf=false, array of child nodes
    this.nextLeaf = null; // simple leaf chain pointer
  }
  get size() {
    return this.keys.length;
  }
}
  