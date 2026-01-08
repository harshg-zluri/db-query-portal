/**
 * Sample Script: Runtime Error
 * This script throws an explicit error to test error capturing.
 */

console.log('Starting script...');

// Throw an error explicitly
throw new Error('This is a simulated runtime error for testing purposes.');

console.log('This line will never be reached.');
