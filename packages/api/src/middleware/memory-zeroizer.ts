/**
 * Secure Memory Zeroizer
 *
 * Implements a conceptual wrapper for processing sensitive variables in memory,
 * filling them with zeros (0x00) after processing to prevent RAM scraping
 * or swap memory leaks (acting as the Software TEE isolation mechanism).
 *
 * License: Apache 2.0
 */

export class SecureBuffer {
  private buffer: Buffer | null;

  constructor(data: Buffer | string | number[]) {
    this.buffer = Buffer.from(data);
  }

  /**
   * Returns a copy or reference for actual operations. Use with caution.
   */
  get(): Buffer {
    if (!this.buffer) {
      throw new Error(
        "Attempted to read zeroized or uninitialized SecureBuffer",
      );
    }
    return this.buffer;
  }

  /**
   * Actively zeroizes the memory space that this Buffer occupies
   * overriding the underlying ArrayBuffer with 0x00, then nullifying the reference.
   */
  zeroize(): void {
    if (this.buffer) {
      // Overwrite memory directly
      this.buffer.fill(0);
      this.buffer = null;
    }
  }

  /**
   * Helper designed to process secure data and automatically zeroize afterwards.
   */
  static async withSecureContext<T>(
    factory: () => Buffer | Promise<Buffer>,
    operation: (secureData: Buffer) => Promise<T>,
  ): Promise<T> {
    const data = await factory();
    const secureBuffer = new SecureBuffer(data);
    try {
      const result = await operation(secureBuffer.get());
      return result;
    } finally {
      secureBuffer.zeroize();
    }
  }
}
