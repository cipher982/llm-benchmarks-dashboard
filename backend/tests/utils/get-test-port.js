/**
 * Get Test Port
 *
 * Reads the port number from the file written by start-test-server.js
 * Used by Playwright config to know which port the test server is running on.
 */

const fs = require('fs');
const path = require('path');

const PORT_FILE = path.join(__dirname, '.test-server-port');

/**
 * Read the test server port from file
 * @param {number} maxAttempts - Maximum number of attempts (default: 30)
 * @param {number} delayMs - Delay between attempts in ms (default: 1000)
 * @returns {Promise<number>} Port number
 */
async function getTestPort(maxAttempts = 30, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (fs.existsSync(PORT_FILE)) {
      const portStr = fs.readFileSync(PORT_FILE, 'utf8').trim();
      const port = parseInt(portStr, 10);

      if (!isNaN(port) && port > 0 && port < 65536) {
        return port;
      }
    }

    // Wait before next attempt
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Failed to get test port after ${maxAttempts} attempts. Port file: ${PORT_FILE}`);
}

/**
 * Synchronously get the test port (for config files)
 * Returns default port if file doesn't exist yet
 * @param {number} defaultPort - Default port to return (default: 3000)
 * @returns {number} Port number
 */
function getTestPortSync(defaultPort = 3000) {
  try {
    if (fs.existsSync(PORT_FILE)) {
      const portStr = fs.readFileSync(PORT_FILE, 'utf8').trim();
      const port = parseInt(portStr, 10);

      if (!isNaN(port) && port > 0 && port < 65536) {
        return port;
      }
    }
  } catch (err) {
    // Ignore errors, return default
  }

  return defaultPort;
}

module.exports = {
  getTestPort,
  getTestPortSync,
};
