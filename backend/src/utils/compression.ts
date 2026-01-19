/**
 * Result Compression Utilities
 * Handles gzip compression/decompression for large query results
 */

import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Compress a string result using gzip and return as base64
 */
export async function compressResult(data: string): Promise<string> {
    const buffer = Buffer.from(data, 'utf-8');
    const compressed = await gzip(buffer);
    return compressed.toString('base64');
}

/**
 * Decompress a base64-encoded gzip result back to string
 */
export async function decompressResult(compressed: string): Promise<string> {
    const buffer = Buffer.from(compressed, 'base64');
    const decompressed = await gunzip(buffer);
    return decompressed.toString('utf-8');
}

/**
 * Check if data should be compressed based on size threshold
 */
export function shouldCompress(data: string, thresholdBytes: number): boolean {
    return Buffer.byteLength(data, 'utf-8') > thresholdBytes;
}

/**
 * Get size of string in bytes
 */
export function getByteSize(data: string): number {
    return Buffer.byteLength(data, 'utf-8');
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
