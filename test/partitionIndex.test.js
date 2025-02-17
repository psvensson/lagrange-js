const BPTreeIndex = require('../src/partition/BPTreeIndex');
const {CustomTextEncoder,IntegerEncoder} = require('../src/partition/KeyEncoder');


test('should insert and search integer values correctly', () => {
    const intIndex = new BPTreeIndex(4, new IntegerEncoder());
    intIndex.insert(42, 1000);
    intIndex.insert(10, 1001);
    intIndex.insert(99, 1002);

    expect(intIndex.search(42)).toBe(1000);
    expect(intIndex.search(10)).toBe(1001);
    expect(intIndex.search(99)).toBe(1002);
});

test('should insert and search text values correctly', () => {
    const textIndex = new BPTreeIndex(4, new CustomTextEncoder());
    textIndex.insert("Alice", 2000);
    textIndex.insert("Bob", 2001);
    textIndex.insert("Zoe", 2002);

    expect(textIndex.search("Alice")).toBe(2000);
    expect(textIndex.search("Bob")).toBe(2001);
    expect(textIndex.search("Zoe")).toBe(2002);
});

test('should return undefined for non-existent integer keys', () => {
    const intIndex = new BPTreeIndex(4, new IntegerEncoder());
    intIndex.insert(42, 1000);
    expect(intIndex.search(99)).toBeUndefined();
});

test('should return undefined for non-existent text keys', () => {
    const textIndex = new BPTreeIndex(4, new CustomTextEncoder());
    textIndex.insert("Alice", 2000);
    expect(textIndex.search("Charlie")).toBeUndefined();
});

test('should handle duplicate integer keys by updating the pointer', () => {
    const intIndex = new BPTreeIndex(4, new IntegerEncoder());
    intIndex.insert(42, 1000);
    intIndex.insert(42, 1003);
    expect(intIndex.search(42)).toBe(1003);
});

test('should handle duplicate text keys by updating the pointer', () => {
    const textIndex = new BPTreeIndex(4, new CustomTextEncoder());
    textIndex.insert("Alice", 2000);
    textIndex.insert("Alice", 2003);
    expect(textIndex.search("Alice")).toBe(2003);
});

test('should handle overfull root by splitting', () => {
    const intIndex = new BPTreeIndex(3, new IntegerEncoder());
    intIndex.insert(42, 1000);
    intIndex.insert(10, 1001);
    intIndex.insert(99, 1002);
    intIndex.insert(1, 1003);

    expect(intIndex.search(42)).toBe(1000);
    expect(intIndex.search(10)).toBe(1001);
    expect(intIndex.search(99)).toBe(1002);
    expect(intIndex.search(1)).toBe(1003);
});

// Test the CompoundEncode for compound indexes
test('should handle overfull root by splitting', () => {
    const CompoundEncoder = require('../src/partition/CompoundEncoder');
    const {CustomTextEncoder} = require('../src/partition/KeyEncoder');
    // Suppose we have two TEXT columns for simplicity
    const compoundTextEncoder = new CompoundEncoder([
        new CustomTextEncoder(), // for lastname
        new CustomTextEncoder()  // for firstname
    ]);
    
    // Create a B-tree index using this compound encoder
    const nameIndex = new BPTreeIndex(4, compoundTextEncoder);
    
    // Insert some rows
    // Values is an array [lastname, firstname]
    nameIndex.insert(["Smith", "John"], 1000);
    nameIndex.insert(["Smith", "Jane"], 1001);
    nameIndex.insert(["Adams", "Sam"], 1002);
    nameIndex.insert(["Brown", "Sue"], 1003);
    
    // Search
    const pointerJane = nameIndex.search(["Smith", "Jane"]);
    console.log("Pointer for Smith, Jane is:", pointerJane);
    expect(pointerJane).toBe(1001);
})

