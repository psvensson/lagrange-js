/**********************************************
 * B-Tree Node and B-Tree Index
 **********************************************/
module.exports = class BTreeNode {
    constructor(order = 4, leaf = true) {
      // For simplicity, 'order' controls max keys in node.
      this.order = order;
      this.leaf = leaf;
      this.keys = [];     // array of Uint8Array (encoded keys)
      this.pointers = []; // array of row pointers or child node references
      // children: if not leaf, pointers[i] references child node
      // if leaf, pointers[i] references actual row (64-bit address, or an object, etc.)
    }
  
    /**
     * insertKey(keyBytes, pointer, keyEncoder)
     * Insert key into this node if there's space, otherwise handle splitting logic.
     */
    insertKey(keyBytes, pointer, keyEncoder) {
      // 1) Find correct position via binary search in this.keys
      let i = 0;
      while (i < this.keys.length && keyEncoder.compareBytes(keyBytes, this.keys[i]) > 0) {
        i++;
      }
  
      if (this.leaf) {
        // Insert here
        this.keys.splice(i, 0, keyBytes);
        this.pointers.splice(i, 0, pointer);
      } else {
        // Recurse into child
        const childNode = this.pointers[i];
        childNode.insertKey(keyBytes, pointer, keyEncoder);
  
        // Check if child is overfull
        if (childNode.keys.length > this.order) {
          this.splitChild(i, keyEncoder);
        }
      }
    }
  
    /**
     * splitChild(childIndex, keyEncoder)
     * Split the child node at childIndex into two nodes.
     */
    splitChild(childIndex, keyEncoder) {
      const child = this.pointers[childIndex];
      const newNode = new BTreeNode(child.order, child.leaf);
  
      // Example: split roughly in half
      const mid = Math.floor(child.keys.length / 2);
  
      // Move half the keys/pointers to newNode
      newNode.keys = child.keys.splice(mid);
      newNode.pointers = child.pointers.splice(mid);
  
      // Insert the 'median' key into this node
      const medianKey = newNode.keys.shift(); // the first key in the new node
      const medianPointer = newNode.pointers.shift(); // pointer parallel to medianKey (leaf case)
  
      // Place the median key in the parent
      this.keys.splice(childIndex, 0, medianKey);
      this.pointers.splice(childIndex + 1, 0, newNode);
    }
  
    /**
     * searchKey(keyBytes, keyEncoder)
     * Return pointer if found, otherwise null.
     */
    searchKey(keyBytes, keyEncoder) {
      let i = 0;
      while (i < this.keys.length && keyEncoder.compareBytes(keyBytes, this.keys[i]) > 0) {
        i++;
      }
      // If we found an exact match, return pointer
      if (i < this.keys.length && keyEncoder.compareBytes(keyBytes, this.keys[i]) === 0) {
        return this.pointers[i];
      } else if (this.leaf) {
        return undefined; // not found
      } else {
        // descend into child node
        return this.pointers[i].searchKey(keyBytes, keyEncoder);
      }
    }
  }