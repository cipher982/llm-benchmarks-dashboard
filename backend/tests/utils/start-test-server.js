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
    // Find an available port
    console.log('🔍 Looking for available port...');
    const port = await findAvailablePort(3000, 3999);
    console.log(`✅ Found available port: ${port}`);

    // Write port to file for Playwright
    fs.writeFileSync(PORT_FILE, port.toString(), 'utf8');
    console.log(`📝 Wrote port to ${PORT_FILE}`);

    // Start Next.js dev server
    console.log('🚀 Starting Next.js dev server...');

    const env = {
      ...process.env,
      PORT: port.toString(),
      // Use test MongoDB or fast-timeout connection
      MONGODB_URI: process.env.MONGODB_URI ||
        'mongodb://localhost:27017/test-db?serverSelectionTimeoutMS=2000&connectTimeoutMS=2000',
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
