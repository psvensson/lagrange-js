const BPTreeNode = require('./BPTreeNode');

module.exports = class BPTreeIndex {
    /**
     * @param {number} order - the max # of children an internal node can have
     *                         so each internal node can have up to (order - 1) keys.
     *                         Each leaf can have up to (order - 1) data entries.
     * @param {KeyEncoder} keyEncoder
     */
    constructor(order = 4, keyEncoder) {
      this.order = order;
      this.keyEncoder = keyEncoder;
      // Start with a single leaf node
      this.root = new BPTreeNode(/*leaf=*/true);
    }
  
    /** Insert a (value, rowPtr) into the B+ tree */
    insert(value, rowPointer) {
      const keyBytes = this.keyEncoder.encode(value);
  
      // If root splits, we handle that here
      const splitInfo = this._insertRecursive(this.root, keyBytes, rowPointer);
  
      if (splitInfo) {
        // We have to create a new root
        const newRoot = new BPTreeNode(/*leaf=*/false);
        newRoot.keys.push(splitInfo.separatorKey);
        newRoot.children.push(this.root, splitInfo.newNode);
        this.root = newRoot;
      }
    }
  
    /** Search for a single value, return the row pointer or null */
    search(value) {
      const keyBytes = this.keyEncoder.encode(value);
      return this._searchNode(this.root, keyBytes);
    }
  
    /*
     * PRIVATE METHODS
     */
  
    /**
     * Recursively insert (keyBytes, rowPtr) into subtree rooted at `node`.
     * Return null if no split happened,
     * or {separatorKey, newNode} if a split happened.
     */
    _insertRecursive(node, keyBytes, rowPointer) {
      if (node.leaf) {
        // Insert into the leaf
        const pos = this._findInsertPos(node.keys, keyBytes);
        node.keys.splice(pos, 0, keyBytes);
        node.records.splice(pos, 0, rowPointer);
  
        // Check if over capacity
        if (node.size > this._maxLeafKeys()) {
          return this._splitLeaf(node);
        }
        return null;
      } else {
        // INTERNAL node
        // find which child to descend into
        const pos = this._findInsertPos(node.keys, keyBytes);
        const child = node.children[pos];
  
        const splitInfo = this._insertRecursive(child, keyBytes, rowPointer);
        if (splitInfo) {
          // Child was split, insert the new separatorKey + newNode in 'node'
          node.keys.splice(pos, 0, splitInfo.separatorKey);
          node.children.splice(pos + 1, 0, splitInfo.newNode);
  
          if (node.size > this._maxInternalKeys()) {
            return this._splitInternal(node);
          }
        }
        return null;
      }
    }
  
    _searchNode(node, keyBytes) {
    if (node.leaf) {
        // In a leaf, do a linear or binary search
        for (let i = 0; i < node.size; i++) {
        const cmp = this.keyEncoder.compareBytes(keyBytes, node.keys[i]);
        if (cmp === 0) {
            return node.records[i];
        }
        if (cmp < 0) break; // keys are sorted, no match beyond
        }
        return undefined;
    } else {
        // INTERNAL NODE
        let i = 0;
        // The difference: compare >= 0 => increment i
        while (i < node.keys.length &&
                this.keyEncoder.compareBytes(keyBytes, node.keys[i]) >= 0) {
        i++;
        }
        return this._searchNode(node.children[i], keyBytes);
    }
    }
  
    /** Split a leaf node into two leaves. Return {separatorKey, newNode}. */
    _splitLeaf(leaf) {
      const newLeaf = new BPTreeNode(/*leaf=*/true);
  
      // We'll split roughly in half
      const splitIndex = Math.ceil(leaf.size / 2);
  
      const movedKeys = leaf.keys.splice(splitIndex);
      const movedRecords = leaf.records.splice(splitIndex);
  
      newLeaf.keys = movedKeys;
      newLeaf.records = movedRecords;
  
      // Optional: link leaf nodes
      newLeaf.nextLeaf = leaf.nextLeaf;
      leaf.nextLeaf = newLeaf;
  
      // The first key of the new leaf is the separator to add up
      const separatorKey = newLeaf.keys[0];
      return { separatorKey, newNode: newLeaf };
    }
  
    /** Split an internal node into two. Return {separatorKey, newNode}. */
    _splitInternal(node) {
      const newNode = new BPTreeNode(/*leaf=*/false);
  
      // E.g. for order=3 => can hold 2 keys, if we have 3 keys, we split
      const splitIndex = Math.floor(node.size / 2);
  
      // The separator is the middle key
      const separatorKey = node.keys[splitIndex];
  
      // Everything to the right of that moves to newNode
      const rightKeys = node.keys.splice(splitIndex + 1);
      const rightChildren = node.children.splice(splitIndex + 1);
  
      newNode.keys = rightKeys;
      newNode.children = rightChildren;
  
      // Return the middle key up the tree
      return { separatorKey, newNode };
    }
  
    /**************************************
     * Tree "order" capacity rules
     **************************************/
    /** For a B+ leaf, can store up to (order - 1) data keys */
    _maxLeafKeys() {
      return this.order - 1;
    }
  
    /** For an internal node, can store up to (order - 1) keys => up to order children */
    _maxInternalKeys() {
      return this.order - 1;
    }
  
    /**
     * Return the insertion index for keyBytes in sorted array of keys.
     * (Could do a real binary search; here’s a simple approach.)
     */
    _findInsertPos(keys, keyBytes) {
      let i = 0;
      while (i < keys.length && this.keyEncoder.compareBytes(keyBytes, keys[i]) > 0) {
        i++;
      }
      return i;
    }
  }