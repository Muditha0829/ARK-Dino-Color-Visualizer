/**
 * Low-level binary reader for ARK save files.
 * ARK uses little-endian encoding throughout.
 */
class BinaryReader {
  constructor(buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  get remaining() {
    return this.buffer.length - this.offset;
  }

  readInt8() {
    const val = this.buffer.readInt8(this.offset);
    this.offset += 1;
    return val;
  }

  readUInt8() {
    const val = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return val;
  }

  readInt16() {
    const val = this.buffer.readInt16LE(this.offset);
    this.offset += 2;
    return val;
  }

  readUInt16() {
    const val = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    return val;
  }

  readInt32() {
    const val = this.buffer.readInt32LE(this.offset);
    this.offset += 4;
    return val;
  }

  readUInt32() {
    const val = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return val;
  }

  readInt64() {
    const lo = this.buffer.readUInt32LE(this.offset);
    const hi = this.buffer.readUInt32LE(this.offset + 4);
    this.offset += 8;
    return hi * 0x100000000 + lo;
  }

  readFloat() {
    const val = this.buffer.readFloatLE(this.offset);
    this.offset += 4;
    return val;
  }

  readDouble() {
    const val = this.buffer.readDoubleLE(this.offset);
    this.offset += 8;
    return val;
  }

  readBool() {
    return this.readUInt32() !== 0;
  }

  readBool8() {
    return this.readUInt8() !== 0;
  }

  readBytes(count) {
    const slice = this.buffer.slice(this.offset, this.offset + count);
    this.offset += count;
    return slice;
  }

  readGuid() {
    return this.readBytes(16).toString('hex');
  }

  /**
   * Read an Unreal FString.
   * Positive length = UTF-8/Latin1, negative length = UTF-16LE.
   */
  readFString() {
    const len = this.readInt32();
    if (len === 0) return '';
    if (len > 0) {
      const str = this.buffer.toString('latin1', this.offset, this.offset + len - 1);
      this.offset += len;
      return str;
    } else {
      // UTF-16LE: each char is 2 bytes, negative len encodes char count
      const charCount = -len;
      const str = this.buffer.toString('utf16le', this.offset, this.offset + (charCount - 1) * 2);
      this.offset += charCount * 2;
      return str;
    }
  }

  /**
   * Read an FName: index into name table, plus optional number suffix.
   * @param {string[]} nameTable
   */
  readFName(nameTable) {
    const index = this.readInt32();
    const instance = this.readInt32(); // for numbered names like "None_2"
    if (!nameTable || index < 0 || index >= nameTable.length) {
      return `<invalid_name:${index}>`;
    }
    const base = nameTable[index];
    return instance > 0 ? `${base}_${instance}` : base;
  }

  peek(count = 4) {
    return this.buffer.slice(this.offset, this.offset + count);
  }

  seek(offset) {
    this.offset = offset;
  }

  skip(count) {
    this.offset += count;
  }
}

module.exports = BinaryReader;
