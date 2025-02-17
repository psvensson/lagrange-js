const {KeyEncoder} = require('./KeyEncoder');

module.exports = class CompoundEncoder extends KeyEncoder {
    /**
     * @param {KeyEncoder[]} encoders - an array of encoders for each column
     */
    constructor(encoders = []) {
      super();
      this.encoders = encoders;
    }
  
    /**
     * encode(values: any[]) => Uint8Array
     *    Expects an array of values [val1, val2, ...] matching
     *    the order of this.encoders.
     */
    encode(values) {
      if (!Array.isArray(values) || values.length !== this.encoders.length) {
        throw new Error("CompoundEncoder: values must be an array with the same length as encoders");
      }
  
      // We’ll build an array of byte arrays, then join them with length prefixes
      let parts = [];
      for (let i = 0; i < this.encoders.length; i++) {
        const encoded = this.encoders[i].encode(values[i]);
        // We store a 2-byte length prefix (for simplicity). Real systems might store 4 bytes or variable length.
        const lengthBytes = new Uint8Array(2);
        lengthBytes[0] = (encoded.length >> 8) & 0xff;
        lengthBytes[1] = encoded.length & 0xff;
  
        parts.push(lengthBytes);
        parts.push(encoded);
      }
  
      // Concatenate all parts into one Uint8Array
      return this._concatArrays(parts);
    }
  
    /**
     * decode(bytes: Uint8Array) => any[]
     *    Reconstruct the array of original values from the combined byte array.
     */
    decode(bytes) {
      let offset = 0;
      let result = [];
  
      for (let i = 0; i < this.encoders.length; i++) {
        // First 2 bytes = length
        const len = (bytes[offset] << 8) | (bytes[offset + 1]);
        offset += 2;
  
        // Next 'len' bytes = the actual encoded data for this column
        const slice = bytes.slice(offset, offset + len);
        offset += len;
  
        const decodedVal = this.encoders[i].decode(slice);
        result.push(decodedVal);
      }
  
      return result;
    }
  
    /**
     * compareBytes(a: Uint8Array, b: Uint8Array) => number
     *    We must compare the two compound-encoded byte arrays
     *    column by column.
     */
    compareBytes(a, b) {
      let offsetA = 0;
      let offsetB = 0;
  
      for (let i = 0; i < this.encoders.length; i++) {
        // Read length for column i in 'a'
        if (offsetA + 2 > a.length) return -1; // a is shorter
        const lenA = (a[offsetA] << 8) | (a[offsetA + 1]);
        offsetA += 2;
  
        // Read length for column i in 'b'
        if (offsetB + 2 > b.length) return 1; // b is shorter
        const lenB = (b[offsetB] << 8) | (b[offsetB + 1]);
        offsetB += 2;
  
        // Compare the slices with the sub-encoder's compare
        const sliceA = a.slice(offsetA, offsetA + lenA);
        const sliceB = b.slice(offsetB, offsetB + lenB);
  
        // We can use the sub-encoder’s compareBytes if needed
        const subCompare = this.encoders[i].compareBytes(sliceA, sliceB);
        if (subCompare !== 0) {
          return subCompare; // if not equal, we return immediately
        }
  
        // If they are equal for this column, move on to the next
        offsetA += lenA;
        offsetB += lenB;
      }
  
      // If we exhaust all columns without difference, they are equal (0)
      // unless one encoded array has extra bytes (which shouldn’t happen if
      // we strictly store the same number of columns).
      // But just in case:
      if (offsetA < a.length) return 1;   // 'a' has extra data
      if (offsetB < b.length) return -1; // 'b' has extra data
      return 0;
    }
  
    // Utility to concatenate multiple Uint8Arrays
    _concatArrays(arrays) {
      let totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
      let result = new Uint8Array(totalLength);
      let offset = 0;
      for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
      }
      return result;
    }
  }
  