module.exports = class BPTreeNode {
    constructor(leaf = false) {
      this.leaf = leaf;
      this.keys = [];      // always sorted array of encoded keys
      this.children = [];  // used if internal node => array of child pointers (BPTreeNode)
      this.records = [];   // used if leaf => array of row pointers
      this.nextLeaf = null; // optional link to next leaf
    }
  
    get size() {
      return this.keys.length;
    }
  }
  