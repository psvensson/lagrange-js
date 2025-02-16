const BTreeIndex = require('../src/partition/BTreeIndex');
const {CustomTextEncoder,IntegerEncoder} = require('../src/partition/KeyEncoder');


test('should insert and search integer values correctly', () => {
    const intIndex = new BTreeIndex(4, new IntegerEncoder());
    intIndex.insert(42, 1000);
    intIndex.insert(10, 1001);
    intIndex.insert(99, 1002);

    expect(intIndex.search(42)).toBe(1000);
    expect(intIndex.search(10)).toBe(1001);
    expect(intIndex.search(99)).toBe(1002);
});

test('should insert and search text values correctly', () => {
    const textIndex = new BTreeIndex(4, new CustomTextEncoder());
    textIndex.insert("Alice", 2000);
    textIndex.insert("Bob", 2001);
    textIndex.insert("Zoe", 2002);

    expect(textIndex.search("Alice")).toBe(2000);
    expect(textIndex.search("Bob")).toBe(2001);
    expect(textIndex.search("Zoe")).toBe(2002);
});

test('should return undefined for non-existent integer keys', () => {
    const intIndex = new BTreeIndex(4, new IntegerEncoder());
    intIndex.insert(42, 1000);
    expect(intIndex.search(99)).toBeUndefined();
});

test('should return undefined for non-existent text keys', () => {
    const textIndex = new BTreeIndex(4, new CustomTextEncoder());
    textIndex.insert("Alice", 2000);
    expect(textIndex.search("Charlie")).toBeUndefined();
});

test('should handle duplicate integer keys by updating the pointer', () => {
    const intIndex = new BTreeIndex(4, new IntegerEncoder());
    intIndex.insert(42, 1000);
    intIndex.insert(42, 1003);
    expect(intIndex.search(42)).toBe(1003);
});

test('should handle duplicate text keys by updating the pointer', () => {
    const textIndex = new BTreeIndex(4, new CustomTextEncoder());
    textIndex.insert("Alice", 2000);
    textIndex.insert("Alice", 2003);
    expect(textIndex.search("Alice")).toBe(2003);
});
