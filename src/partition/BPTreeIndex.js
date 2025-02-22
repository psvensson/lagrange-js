const BPTreeNode = require('./BPTreeNode');

module.exports = class BPTreeIndex {
  constructor(order, keyEncoder) {
    this.order = order;
    this.keyEncoder = keyEncoder;
    this.root = new BPTreeNode(true); // start with a single leaf
    this.keyCount = 0;                // increment whenever we do insertEncoded
  }

  insert(value, rowPtr) {
    const keyBytes = this.keyEncoder.encode(value);
    this.insertEncoded(keyBytes, rowPtr);
  }

  insertEncoded(keyBytes, rowPtr) {
    const splitInfo = this._insertRecursive(this.root, keyBytes, rowPtr);
    if (splitInfo) {
      // root split
      const newRoot = new BPTreeNode(false);
      newRoot.keys.push(splitInfo.separatorKey);
      newRoot.children.push(this.root, splitInfo.newNode);
      this.root = newRoot;
    }
    this.keyCount++;
  }

  removeEncoded(keyBytes) {
    // Edge case: If tree is empty
    if (!this.root) return false;

    const removed = this._removeRecursive(this.root, keyBytes);

    // After removal, if the root is internal and becomes empty,
    // we can adjust it to point to the single child, etc.
    if (removed && !this.root.leaf && this.root.size === 0 && this.root.children.length === 1) {
      this.root = this.root.children[0];
    }
    if (removed) {
      this.keyCount--;
    }
    return removed;
  }

  _removeRecursive(node, kb) {
    if (node.leaf) {
      // Find key in leaf
      for (let i = 0; i < node.keys.length; i++) {
        const cmp = this.keyEncoder.compareBytes(kb, node.keys[i]);
        if (cmp === 0) {
          // Found => remove
          node.keys.splice(i, 1);
          node.records.splice(i, 1);
          return true;
        }
        if (cmp < 0) {
          // Since keys are sorted, if we pass the position,
          // it's not in this leaf
          return false;
        }
      }
      return false;
    } else {
      // Internal node => find the child to go down
      let i = 0;
      while (i < node.keys.length && this.keyEncoder.compareBytes(kb, node.keys[i]) >= 0) {
        i++;
      }
      const removed = this._removeRecursive(node.children[i], kb);
      if (!removed) {
        return false;
      }
      // For demonstration, we won't handle merges in underflow case.
      return true;
    }
  }

  search(value) {
    const kb = this.keyEncoder.encode(value);
    return this.searchEncoded(kb);
  }

  searchEncoded(kb) {
    return this._searchNode(this.root, kb);
  }

  rangeSearch(startValue, endValue) {
    const startBytes = startValue != null ? this.keyEncoder.encode(startValue) : null;
    const endBytes   = endValue   != null ? this.keyEncoder.encode(endValue)   : null;
    return this.rangeSearchEncoded(startBytes, endBytes);
  }

  rangeSearchEncoded(startBytes, endBytes) {
    let results = [];
    this._rangeSearchNode(this.root, startBytes, endBytes, results);
    return results;
  }

  getApproxSize() {
    return this.keyCount;
  }

  ///////////////////////////
  // Internal B+ Tree Logic
  ///////////////////////////
  _insertRecursive(node, kb, rowPtr) {
    if (node.leaf) {
      // Insert in sorted order
      const pos = this._findInsertPos(node.keys, kb);
      node.keys.splice(pos, 0, kb);
      node.records.splice(pos, 0, rowPtr);

      // Over capacity => split
      if (node.size > this._maxLeafKeys()) {
        return this._splitLeaf(node);
      }
      return null;
    } else {
      // internal node
      const pos = this._findInsertPos(node.keys, kb);
      const splitInfo = this._insertRecursive(node.children[pos], kb, rowPtr);
      if (splitInfo) {
        node.keys.splice(pos, 0, splitInfo.separatorKey);
        node.children.splice(pos + 1, 0, splitInfo.newNode);

        if (node.size > this._maxInternalKeys()) {
          return this._splitInternal(node);
        }
      }
      return null;
    }
  }

  _searchNode(node, kb) {
    if (node.leaf) {
      for (let i = 0; i < node.keys.length; i++) {
        const cmp = this.keyEncoder.compareBytes(kb, node.keys[i]);
        if (cmp === 0) return node.records[i];
        if (cmp < 0) break;
      }
      return null;
    } else {
      let i = 0;
      // "go right on equality"
      while (i < node.keys.length &&
             this.keyEncoder.compareBytes(kb, node.keys[i]) >= 0) {
        i++;
      }
      return this._searchNode(node.children[i], kb);
    }
  }

  _rangeSearchNode(node, startBytes, endBytes, results) {
    if (node.leaf) {
      for (let i = 0; i < node.keys.length; i++) {
        if (startBytes && this.keyEncoder.compareBytes(node.keys[i], startBytes) < 0) {
          continue;
        }
        // *** Old code used >= 0 => excludes equality
        // if (endBytes && this.keyEncoder.compareBytes(node.keys[i], endBytes) >= 0) {
        //   break;
        // }
        // *** New code:
        if (endBytes && this.keyEncoder.compareBytes(node.keys[i], endBytes) > 0) {
          break;
        }
        results.push({
          key: this.keyEncoder.decode(node.keys[i]),
          rowPtr: node.records[i]
        });
      }
    } else {
      // naive DFS
      for (let c of node.children) {
        this._rangeSearchNode(c, startBytes, endBytes, results);
      }
    }
  }

  ///////////////////////////
  // Splitting
  ///////////////////////////
  _splitLeaf(leaf) {
    const newLeaf = new BPTreeNode(true);
    const splitIndex = Math.ceil(leaf.size / 2);

    const movedKeys = leaf.keys.splice(splitIndex);
    const movedRecs = leaf.records.splice(splitIndex);

    newLeaf.keys = movedKeys;
    newLeaf.records = movedRecs;

    newLeaf.nextLeaf = leaf.nextLeaf;
    leaf.nextLeaf = newLeaf;

    const sepKey = newLeaf.keys[0];
    return { separatorKey: sepKey, newNode: newLeaf };
  }

  _splitInternal(node) {
    const newNode = new BPTreeNode(false);
    const splitIndex = Math.floor(node.size / 2);
    const sepKey = node.keys[splitIndex];

    const rightKeys = node.keys.splice(splitIndex + 1);
    const rightChildren = node.children.splice(splitIndex + 1);

    newNode.keys = rightKeys;
    newNode.children = rightChildren;

    return { separatorKey: sepKey, newNode };
  }

  _maxLeafKeys() {
    // max number of data keys in a leaf
    return this.order - 1;
  }

  _maxInternalKeys() {
    // max number of separator keys in an internal node
    return this.order - 1;
  }

  _findInsertPos(sortedKeys, kb) {
    let i = 0;
    while (i < sortedKeys.length &&
           this.keyEncoder.compareBytes(kb, sortedKeys[i]) > 0) {
      i++;
    }
    return i;
  }
}
