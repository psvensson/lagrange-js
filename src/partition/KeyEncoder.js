class KeyEncoder {
  encode(value) {
    throw new Error('Must implement encode() in subclass');
  }
  decode(bytes) {
    throw new Error('Must implement decode() in subclass');
  }

  /**
   * Lexicographical compare of two Uint8Arrays.
   * negative if a < b, 0 if equal, positive if a > b
   */
  compareBytes(a, b) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
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
   * We'll store a 32-bit integer in the last 4 bytes 
   * of an 8-byte array, big-endian 
   */
  encode(value) {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setInt32(4, value, false); // big-endian
    return new Uint8Array(buffer);
  }

  decode(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getInt32(4, false);
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
    KeyEncoder,
    IntegerEncoder,
    RealEncoder,
    CustomTextEncoder,
    BlobEncoder,
    NumericEncoder
  }