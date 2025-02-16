class KeyEncoder {
    /**
     * encode(value: any) => Uint8Array
     *   Convert a JS value to a comparable byte array.
     */
    encode(value) {
      throw new Error("Must implement encode() in subclass");
    }
  
    /**
     * decode(bytes: Uint8Array) => any
     *   Convert the byte array back to the original JS value.
     */
    decode(bytes) {
      throw new Error("Must implement decode() in subclass");
    }
  
    /**
     * compareBytes(a: Uint8Array, b: Uint8Array) => number
     *   Compare two byte arrays lexicographically:
     *   - return negative if a < b,
     *   - 0 if equal,
     *   - positive if a > b.
     */
    compareBytes(a, b) {
      // Default: generic lexicographical compare
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) {
          return a[i] - b[i];
        }
      }
      return a.length - b.length;
    }
  }

/**********************************************
 * Concrete Encoders for SQLite-like Types
 **********************************************/
// For simplicity, we’ll implement minimal logic.
// In a real system, you'd handle more edge cases (sign, encoding, overflow, etc.).

class IntegerEncoder extends KeyEncoder {
    /**
     * In SQLite, INTEGER can be up to 8 bytes in 2's complement.
     * We'll assume we store everything in a fixed 8-byte big-endian format.
     */
    encode(value) {
      // Convert JS Number to 64-bit big-endian
      // For demo, we assume it's within safe 32-bit range...
      const buffer = new ArrayBuffer(8);
      const dataView = new DataView(buffer);
      // big-endian putInt32 (upper 4 bytes)
      dataView.setUint32(0, 0); // zero out high 32 bits for simplicity
      dataView.setInt32(4, value, false); // false => big-endian
      return new Uint8Array(buffer);
    }
  
    decode(bytes) {
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      // ignoring high 4 bytes for simplicity
      return dataView.getInt32(4, false); // big-endian
    }
  }
  
  class RealEncoder extends KeyEncoder {
    /**
     * SQLite REAL is usually an 8-byte IEEE 754 double.
     * We'll store it directly in a big-endian 8-byte buffer.
     */
    encode(value) {
      const buffer = new ArrayBuffer(8);
      const dataView = new DataView(buffer);
      // We'll manually flip endianness for a big-endian representation.
      dataView.setFloat64(0, value, false);
      return new Uint8Array(buffer);
    }
  
    decode(bytes) {
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      return dataView.getFloat64(0, false);
    }
  }
  
  class CustomTextEncoder extends KeyEncoder {
    /**
     * SQLite TEXT is typically UTF-8. We'll do a naive UTF-8 conversion.
     * Then we might add a null terminator or length. For real usage,
     * you'd also handle collation, etc.
     */
    encode(value) {
      const text = String(value);
      // Simple UTF-8 encode using TextEncoder
      return new TextEncoder().encode(text);
    }
  
    decode(bytes) {
      return new TextDecoder().decode(bytes);
    }
  }
  
  class BlobEncoder extends KeyEncoder {
    /**
     * SQLite BLOB is just raw bytes. We'll assume value is already a Uint8Array.
     */
    encode(value) {
      if (!(value instanceof Uint8Array)) {
        throw new Error("BlobEncoder expects a Uint8Array");
      }
      return value;
    }
  
    decode(bytes) {
      // Return a copy or a view
      return new Uint8Array(bytes);
    }
  }
  
  class NumericEncoder extends KeyEncoder {
    /**
     * SQLite NUMERIC is essentially stored as text or an integer,
     * depending on context. For simplicity, let's store as string.
     * Real systems might parse decimal values carefully.
     */
    encode(value) {
      // Convert numeric to string, then to UTF-8
      const text = String(value);
      return new TextEncoder().encode(text);
    }
  
    decode(bytes) {
      const text = new TextDecoder().decode(bytes);
      // Return as number or string? This depends on your usage.
      return parseFloat(text);
    }
  }

  module.exports = {
    IntegerEncoder,
    RealEncoder,
    CustomTextEncoder,
    BlobEncoder,
    NumericEncoder
  }