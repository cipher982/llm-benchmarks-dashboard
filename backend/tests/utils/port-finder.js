/**
 * Port Finder Utility
 *
 * Finds an available port without external dependencies.
 * Uses Node's built-in net module to check port availability.
 */

const net = require('net');

/**
 * Check if a port is available
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} True if port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * Find an available port in a given range
 * @param {number} startPort - Starting port (default: 3000)
 * @param {number} endPort - Ending port (default: 3999)
 * @returns {Promise<number>} Available port number
 */
async function findAvailablePort(startPort = 3000, endPort = 3999) {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${endPort}`);
}

/**
 * Get a random available port
 * Uses port 0 to let the OS assign a random available port
 * @returns {Promise<number>} Available port number
 */
function getRandomAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (err) => {
      reject(err);
    });

    server.once('listening', () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });

    // Port 0 means the OS will assign an available port
    server.listen(0);
  });
}

module.exports = {
  isPortAvailable,
  findAvailablePort,
  getRandomAvailablePort,
};
