/**
 * Sample Script: Timeout
 * This script runs an infinite loop (or very long wait) to trigger the 30s timeout.
 */

console.log('Starting infinite loop to trigger timeout...');

// Keep the event loop alive forever
setInterval(() => {
    // Do nothing, just keep process alive
}, 1000);

// Or busy wait (blocks CPU, might be harder to kill if not handled well, but node handles sigterm usually)
// while(true); // Blocking event loop prevents sigterm handling in some cases? 
// Actually, simple setInterval is better to simulate a "stuck" async task.
