#!/usr/bin/env node
/**
 * Test Server Starter
 *
 * Starts the Next.js dev server on an available port.
 * Writes the port to a file for Playwright to read.
 * Handles graceful shutdown on SIGINT/SIGTERM.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { findAvailablePort } = require('./port-finder');

const PORT_FILE = path.join(__dirname, '.test-server-port');

async function startTestServer() {
  try {
    // A fixed port by default, not a discovered one.
    //
    // Playwright can only wait for a server it knows the address of, and
    // `webServer.url` has to be static in the config. With a discovered port
    // there was nothing to wait on, so Playwright began navigating the moment
    // the command was spawned and raced the dev server's boot — the suite
    // failed with ERR_CONNECTION_REFUSED whenever the server lost. That suite
    // is a tracked pre-deploy gate, so the race blocked deploys.
    const port = Number(process.env.TEST_SERVER_PORT) || 3210;
    console.log(`🔌 Using port ${port}`);

    // Write port to file for Playwright
    fs.writeFileSync(PORT_FILE, port.toString(), 'utf8');
    console.log(`📝 Wrote port to ${PORT_FILE}`);

    // Start Next.js dev server
    console.log('🚀 Starting Next.js dev server...');

    const env = {
      ...process.env,
      PORT: port.toString(),
      // Route fixtures make accessibility tests database-free.
      MONGODB_URI: process.env.MONGODB_URI ?? '',
    };

    const server = spawn('npm', ['run', 'dev'], {
      env,
      stdio: 'inherit',
      shell: true,
    });

    // Handle server errors
    server.on('error', (err) => {
      console.error('❌ Failed to start server:', err);
      cleanup();
      process.exit(1);
    });

    // Handle server exit
    server.on('exit', (code) => {
      console.log(`Server exited with code ${code}`);
      cleanup();
      process.exit(code || 0);
    });

    // Handle process signals
    const cleanup = () => {
      console.log('\n🧹 Cleaning up...');
      try {
        if (fs.existsSync(PORT_FILE)) {
          fs.unlinkSync(PORT_FILE);
          console.log('🗑️  Removed port file');
        }
      } catch (err) {
        console.error('Warning: Failed to cleanup:', err.message);
      }
    };

    process.on('SIGINT', () => {
      console.log('\n⚠️  Received SIGINT');
      server.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      console.log('\n⚠️  Received SIGTERM');
      server.kill('SIGTERM');
    });

    process.on('exit', cleanup);

  } catch (err) {
    console.error('❌ Error starting test server:', err);
    process.exit(1);
  }
}

// Start the server
startTestServer();
