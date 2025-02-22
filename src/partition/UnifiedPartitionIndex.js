const {KeyEncoder} = require('./KeyEncoder');
const BPTreeIndex = require('./BPTreeIndex');

module.exports = class UnifiedPartitionIndex {
    constructor(
      keyEncoder, 
      order = 4,
      maxPartitionSize = 3,
      minPartitionSize = 1
    ) {
      this.keyEncoder = keyEncoder;
      this.order = order;
      this.maxPartitionSize = maxPartitionSize;
      this.minPartitionSize = minPartitionSize;
  
      const initial = {
        startKeyBytes: null, // -∞
        endKeyBytes: null,   // +∞
        btree: new BPTreeIndex(order, keyEncoder)
      };
      this.partitions = [ initial ];
    }
  
    insert(value, rowPtr) {
      const kb = this.keyEncoder.encode(value);
      const pIndex = this._findPartitionIndex(kb);
      if (pIndex < 0) throw new Error("No partition found for key??");
      const part = this.partitions[pIndex];
      part.btree.insertEncoded(kb, rowPtr);
  
      // If it exceeds capacity => split
      if (part.btree.getApproxSize() > this.maxPartitionSize) {
        this._splitPartition(pIndex);
      }
    }
  
    search(value) {
      const kb = this.keyEncoder.encode(value);
      const pIndex = this._findPartitionIndex(kb);
      if (pIndex < 0) return null;
      return this.partitions[pIndex].btree.searchEncoded(kb);
    }
  
    rangeSearch(startValue, endValue) {
      const startBytes = startValue != null ? this.keyEncoder.encode(startValue) : null;
      const endBytes   = endValue   != null ? this.keyEncoder.encode(endValue)   : null;
      const parts = this._findPartitionsForRange(startBytes, endBytes);
      let results = [];
      for (let p of parts) {
        results.push(...p.btree.rangeSearchEncoded(startBytes, endBytes));
      }
      return results;
    }
  
    ///////////////////////////
    // Splitting
    ///////////////////////////
    _splitPartition(pIndex) {
      const oldPart = this.partitions[pIndex];
      const oldTree = oldPart.btree;
  
      // find median key in old partition
      const splitKey = this._findMedianKey(oldTree);
      if (!splitKey) return; // can't split if no data
  
      // new partition covers [splitKey.. oldEnd)
      const newPart = {
        startKeyBytes: splitKey,
        endKeyBytes: oldPart.endKeyBytes,
        btree: new BPTreeIndex(this.order, this.keyEncoder)
      };
  
      // old partition => [oldStart.. splitKey)
      oldPart.endKeyBytes = splitKey;
  
      // Move keys >= splitKey
      this._moveData(oldPart, newPart);
  
      // Insert new partition
      this.partitions.splice(pIndex + 1, 0, newPart);
    }
  
    _findMedianKey(btree) {
      const allData = btree.rangeSearchEncoded(null, null);
      if (allData.length === 0) return null;
      const midIndex = Math.floor(allData.length / 2);
      const midVal = allData[midIndex].key;
      return this.keyEncoder.encode(midVal);
    }
  
    _moveData(oldPart, newPart) {
        // We assume oldPart.endKeyBytes is set to the pivot,
        // and newPart covers [pivot, ...). Then we gather
        // everything >= pivot from oldPart and move it.
        const pivot = newPart.startKeyBytes;  // e.g. the 'splitKey'
      
        // rangeSearchEncoded with endBytes=null => no upper bound
        const data = oldPart.btree.rangeSearchEncoded(pivot, null);
      
        for (let rec of data) {
          // Insert into the new partition
          const kb = this.keyEncoder.encode(rec.key);
          newPart.btree.insertEncoded(kb, rec.rowPtr);
      
          // Remove from old partition
          oldPart.btree.removeEncoded(kb);
        }
      }
      
  
    ///////////////////////////
    // Partition Lookup
    ///////////////////////////
    _findPartitionIndex(kb) {
      for (let i = 0; i < this.partitions.length; i++) {
        if (this._containsKey(this.partitions[i], kb)) return i;
      }
      return -1;
    }
  
    _containsKey(part, kb) {
      // covers [startKeyBytes, endKeyBytes)
      if (part.startKeyBytes) {
        if (this.keyEncoder.compareBytes(kb, part.startKeyBytes) < 0) return false;
      }
      if (part.endKeyBytes) {
        if (this.keyEncoder.compareBytes(kb, part.endKeyBytes) >= 0) return false;
      }
      return true;
    }
  
    _findPartitionsForRange(startBytes, endBytes) {
      let results = [];
      for (let p of this.partitions) {
        if (this._rangeIntersects(p, startBytes, endBytes)) {
          results.push(p);
        }
      }
      return results;
    }
  
    _rangeIntersects(part, startBytes, endBytes) {
      // partition covers [pStart.. pEnd)
      if (part.endKeyBytes && startBytes) {
        if (this.keyEncoder.compareBytes(part.endKeyBytes, startBytes) <= 0) {
          return false;
        }
      }
      if (part.startKeyBytes && endBytes) {
        if (this.keyEncoder.compareBytes(part.startKeyBytes, endBytes) >= 0) {
          return false;
        }
      }
      return true;
    }
  }