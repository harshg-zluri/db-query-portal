import { compressResult, decompressResult, shouldCompress, getByteSize, formatBytes } from '../../../src/utils/compression';

describe('Compression Utils', () => {
    describe('compressResult & decompressResult', () => {
        it('should compress and decompress data correctly', async () => {
            const data = 'Hello World';
            const compressed = await compressResult(data);
            expect(compressed).not.toBe(data);

            const decompressed = await decompressResult(compressed);
            expect(decompressed).toBe(data);
        });

        it('should handle empty string', async () => {
            const data = '';
            const compressed = await compressResult(data);
            const decompressed = await decompressResult(compressed);
            expect(decompressed).toBe(data);
        });

        it('should compress large data', async () => {
            const data = 'a'.repeat(1000);
            const compressed = await compressResult(data);
            const decompressed = await decompressResult(compressed);
            expect(decompressed).toBe(data);
        });
    });

    describe('shouldCompress', () => {
        it('should return true if data size > threshold', () => {
            expect(shouldCompress('abc', 2)).toBe(true);
        });

        it('should return false if data size <= threshold', () => {
            expect(shouldCompress('abc', 3)).toBe(false);
            expect(shouldCompress('abc', 4)).toBe(false);
        });
    });

    describe('getByteSize', () => {
        it('should return correct byte size', () => {
            expect(getByteSize('hello')).toBe(5);
            expect(getByteSize('🌟')).toBe(4); // Emoji is 4 bytes
        });
    });

    describe('formatBytes', () => {
        it('should format bytes correctly', () => {
            expect(formatBytes(500)).toBe('500 B');
            expect(formatBytes(1500)).toBe('1.5 KB');
            expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
            expect(formatBytes(1024)).toBe('1.0 KB');
            expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
        });
    });
});
