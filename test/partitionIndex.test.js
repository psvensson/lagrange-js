const BPTreeIndex = require('../src/partition/BPTreeIndex');
const { CustomTextEncoder, IntegerEncoder } = require('../src/partition/KeyEncoder');
const UnifiedPartitionIndex = require('../src/partition/UnifiedPartitionIndex');    

describe('UnifiedPartitionIndex - Comprehensive Tests', () => {
    // Helper function to do range-> array of values
    function toValues(results) {
      return results.map(r => r.key);
    }
  
    /**
     * 1) Basic insertion without exceeding capacity
     *    - Confirms no split occurs for small inserts
     *    - Ensures we can search for each inserted key
     */
    test('should handle small insertions with no split', () => {
      const upi = new UnifiedPartitionIndex(new IntegerEncoder(), 4, 10, 1);
      // Insert some keys well below the "maxPartitionSize=10".
      const data = [5, 10, 15, 20];
      data.forEach((val, idx) => {
        upi.insert(val, 1000 + idx);
      });
  
      // Expect a single partition
      expect(upi.partitions.length).toBe(1);
  
      // Ensure we can search for them
      data.forEach((val, idx) => {
        const rowPtr = upi.search(val);
        expect(rowPtr).toBe(1000 + idx);
      });
  
      // Searching for absent key => null
      expect(upi.search(999)).toBe(null);
    });
  
    /**
     * 2) Forcing a single split
     *    - Insert enough keys to exceed maxPartitionSize
     *    - Verify that a split occurred
     *    - Verify searching for all keys still works
     */
    test('should split into two partitions when exceeding capacity', () => {
      const upi = new UnifiedPartitionIndex(new IntegerEncoder(), 4, 3, 1);
      // Partition can hold up to 3 total keys, so the 4th key triggers a split
      upi.insert(50, 1050);
      upi.insert(20, 1020);
      upi.insert(40, 1040);  // 3 keys so far, at capacity
      upi.insert(60, 1060);  // triggers split
  
      // Expect two partitions now
      expect(upi.partitions.length).toBe(2);
  
      // All data is still accessible
      expect(upi.search(50)).toBe(1050);
      expect(upi.search(20)).toBe(1020);
      expect(upi.search(40)).toBe(1040);
      expect(upi.search(60)).toBe(1060);
  
      // Check searching for something not inserted => null
      expect(upi.search(999)).toBe(null);
    });
  
    /**
     * 3) Multiple splits, ensuring that we can end up with several partitions
     *    - Insert a series of keys to cause repeated splits
     *    - Verify that all keys are found in the correct partition
     *    - Then do a range search across all partitions
     */
    test('should handle multiple splits and keep data correctly partitioned', () => {
      // order=4 => B+ Tree leaf can hold up to 3 keys
      // maxPartitionSize=3 => partition splits once it holds 4 keys
      const upi = new UnifiedPartitionIndex(new IntegerEncoder(), 4, 3, 1);
  
      // Insert 10 keys, which should lead to multiple partition splits
      const keys = [5, 1, 9, 10, 12, 3, 7, 50, 51, 52];
      keys.forEach((k, i) => upi.insert(k, 2000 + i));
  
      // Check how many partitions we ended up with
      expect(upi.partitions.length).toBeGreaterThanOrEqual(3);
  
      // Ensure all keys can be searched
      keys.forEach((k, i) => {
        const rowPtr = upi.search(k);
        expect(rowPtr).toBe(2000 + i);
      });
  
      // Range search from 1..13 => should return [1,3,5,7,9,10,12] in sorted order
      const range1to12 = upi.rangeSearch(1, 13);
      const values1to12 = toValues(range1to12);
      expect(values1to12).toEqual([1, 3, 5, 7, 9, 10, 12]);
  
      // Range search from null..5 => everything up to 5
      // (i.e. from -∞ up to 5, so returns [1,3,5] in sorted order)
      const rangeUpTo5 = upi.rangeSearch(null, 6);
      const valsUpTo5 = toValues(rangeUpTo5);
      expect(valsUpTo5).toEqual([1, 3, 5]);
  
      // Range search from 50..null => everything from 50 upward
      const range50Up = upi.rangeSearch(50, null);
      const vals50Up = toValues(range50Up);
      // We inserted [50, 51, 52], so check that:
      expect(vals50Up).toEqual([50, 51, 52]);
    });
  
    /**
     * 4) Edge case: inserting in ascending order
     *    - This often triggers splits at the "right edge".
     *    - Verify no errors, and partition boundaries shift as expected.
     */
    test('should handle ascending inserts, causing splits at the right boundary', () => {
      const upi = new UnifiedPartitionIndex(new IntegerEncoder(), 4, 3, 1);
  
      // Insert ascending from 1..8
      for (let i = 1; i <= 8; i++) {
        upi.insert(i, i + 10000);
      }
      // We expect multiple splits
      expect(upi.partitions.length).toBeGreaterThan(2);
  
      // Check all keys
      for (let i = 1; i <= 8; i++) {
        expect(upi.search(i)).toBe(i + 10000);
      }
    });
  
    /**
     * 5) Edge case: inserting in descending order
     *    - This often triggers splits that might create new partitions at the 'left' boundary.
     *    - Check that all keys remain searchable.
     */
    test('should handle descending inserts, causing splits at the left boundary', () => {
      const upi = new UnifiedPartitionIndex(new IntegerEncoder(), 4, 3, 1);
  
      // Insert descending from 10..3
      for (let i = 10; i >= 3; i--) {
        upi.insert(i, i + 5000);
      }
      // Expect multiple partitions
      expect(upi.partitions.length).toBeGreaterThanOrEqual(2);
  
      // Check all keys
      for (let i = 10; i >= 3; i--) {
        expect(upi.search(i)).toBe(i + 5000);
      }
    });
  
    /**
     * 6) Check searching for values below all partitions or above all partitions
     *    - Should return null
     */
    test('search for out-of-range keys returns null', () => {
      const upi = new UnifiedPartitionIndex(new IntegerEncoder(), 4, 3, 1);
  
      // Insert a handful
      [10, 20, 30].forEach((val, idx) => upi.insert(val, 9000 + idx));
  
      // Now we have some partitions if we exceeded capacity, or maybe still 1 partition
      expect(upi.search(5)).toBe(null);   // below all keys
      expect(upi.search(999)).toBe(null); // above all keys
    });
  
    /**
     * 7) Check that rangeSearch that spans multiple partitions returns correct results
     */
    test('rangeSearch spanning multiple partitions returns correct results', () => {
      const upi = new UnifiedPartitionIndex(new IntegerEncoder(), 4, 3, 1);
  
      // Insert data that definitely forces at least 2 partitions
      // We'll create two partitions: [1,2,3] and [4,5,6], etc.
      for (let i = 1; i <= 8; i++) {
        upi.insert(i, i + 100);
      }
      // We likely have multiple partitions by now.
  
      const results2to6 = upi.rangeSearch(2, 6);
      const values2to6 = toValues(results2to6);
      expect(values2to6).toEqual([2, 3, 4, 5, 6]);
    });
  
    /**
     * 8) (Optional) Check that if we keep inserting, partitions keep splitting in a chain
     *    - Insert enough to create 3 or more partitions
     *    - Then range-search across all to confirm data integrity
     */
    test('inserting many keys yields multiple partitions with correct data', () => {
      const upi = new UnifiedPartitionIndex(new IntegerEncoder(), 4, 3, 1);
  
      // Insert 20 sequential keys
      for (let i = 1; i <= 20; i++) {
        upi.insert(i, i + 30000);
      }
  
      // Expect at least 7 partitions because each can hold 3 keys max; 20/3 ~ 6-7 partitions
      expect(upi.partitions.length).toBeGreaterThanOrEqual(6);
  
      // Validate all keys
      for (let i = 1; i <= 20; i++) {
        expect(upi.search(i)).toBe(i + 30000);
      }
  
      // Spot check range from 15..18 => [15,16,17,18]
      const results15to18 = upi.rangeSearch(15, 18);
      const val15to18 = toValues(results15to18);
      expect(val15to18).toEqual([15, 16, 17, 18]);
    });
  });