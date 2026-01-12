import { ScriptExecutor } from '../../src/services/script.executor';
import { config } from '../../src/config/environment';
import * as fs from 'fs/promises';
import { EventEmitter } from 'events';

// Mock fs/promises
jest.mock('fs/promises');
// Mock child_process
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

import { spawn } from 'child_process';

describe('ScriptExecutor Error Handling', () => {
    const dbConfig = {
        databaseName: 'test_db',
        databaseType: 'postgresql'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle fs errors during setup (mkdtemp)', async () => {
        (fs.mkdtemp as jest.Mock).mockRejectedValue(new Error('Disk full'));

        const result = await ScriptExecutor.execute('console.log("hi")', dbConfig);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Disk full');
    });

    it('should handle spawn errors', async () => {
        (fs.mkdtemp as jest.Mock).mockResolvedValue('/tmp/test');
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.rm as jest.Mock).mockResolvedValue(undefined);

        const mockChild = new EventEmitter() as any;
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = jest.fn();
        mockChild.killed = false;

        (spawn as jest.Mock).mockReturnValue(mockChild);

        const promise = ScriptExecutor.execute('console.log("hi")', dbConfig);

        // Simulate spawn error
        setTimeout(() => {
            mockChild.emit('error', new Error('Spawn failed'));
        }, 10);

        const result = await promise;

        expect(result.success).toBe(false);
        expect(result.error).toBe('Spawn failed');
    });

    it('should ignore error if already timed out', async () => {
        // Set short timeout
        const originalTimeout = config.scriptExecution.timeoutMs;
        config.scriptExecution.timeoutMs = 100;

        (fs.mkdtemp as jest.Mock).mockResolvedValue('/tmp/test');
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.rm as jest.Mock).mockResolvedValue(undefined);

        const mockChild = new EventEmitter() as any;
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = jest.fn();
        mockChild.killed = false;

        (spawn as jest.Mock).mockReturnValue(mockChild);

        const promise = ScriptExecutor.execute('console.log("hi")', dbConfig);

        // Wait for timeout to trigger inside ScriptExecutor (100ms + buffer)
        await new Promise(resolve => setTimeout(resolve, 200));

        // Now emit error (simulation of race condition)
        mockChild.emit('error', new Error('Late error'));

        const result = await promise;

        // Restore timeout
        config.scriptExecution.timeoutMs = originalTimeout;

        // Should be timeout error, not "Late error"
        expect(result.success).toBe(false);
        expect(result.error).toContain('timed out');
    });

    it('should handle non-Error object rejection', async () => {
        (fs.mkdtemp as jest.Mock).mockRejectedValue('String Error');

        const result = await ScriptExecutor.execute('console.log("hi")', dbConfig);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown error'); // OR 'String Error' depending on implementation. The code says: instance of Error ? msg : 'Unknown error'
    });

    it('should handle exit code 1 with no stderr', async () => {
        (fs.mkdtemp as jest.Mock).mockResolvedValue('/tmp/test');
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        (fs.rm as jest.Mock).mockResolvedValue(undefined);

        const mockChild = new EventEmitter() as any;
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();
        mockChild.kill = jest.fn();
        mockChild.killed = false;

        (spawn as jest.Mock).mockReturnValue(mockChild);

        const promise = ScriptExecutor.execute('console.log("hi")', dbConfig);

        // Simulate close with error code but NO stderr data
        setTimeout(() => {
            mockChild.emit('close', 1);
        }, 10);

        const result = await promise;

        expect(result.success).toBe(false);
        expect(result.error).toBe('Process exited with code 1');
    });
});
