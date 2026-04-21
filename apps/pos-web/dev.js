#!/usr/bin/env node

// Script para iniciar Next.js y mantenerlo corriendo a pesar del error ENOWORKSPACES
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('🚀 Iniciando CoffeeOS Frontend...');
console.log('📍 Puerto: 3001');
console.log('🔗 URL: http://localhost:3001\n');

process.chdir(__dirname);

let serverReady = false;
let nextProcess = null;
let keepRunning = true;
let checkInterval = null;

function startNext() {
  nextProcess = spawn(
    'node',
    [
      path.join(__dirname, '../../node_modules/next/dist/bin/next'),
      'dev',
      '-p',
      '3001',
    ],
    {
      cwd: __dirname,
      env: process.env,
      shell: false,
      detached: false,
    },
  );

  nextProcess.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);

    if (output.includes('Ready in')) {
      serverReady = true;
      console.log('\n✅ Servidor Next.js listo');

      // Iniciar verificación de salud
      if (!checkInterval) {
        checkInterval = setInterval(checkHealth, 2000);
      }
    }
  });

  nextProcess.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('ENOWORKSPACES') && !output.includes('workspace')) {
      process.stderr.write(output);
    }
  });

  nextProcess.on('error', (err) => {
    console.error('❌ Error:', err.message);
  });

  nextProcess.on('close', (code) => {
    if (serverReady && keepRunning) {
      console.log(
        '⚠️  Next.js cerrado, pero el servidor debería estar corriendo...',
      );
      // No hacer nada, el proceso HTTP de Next.js sigue vivo
      return;
    }

    if (code !== 0 && keepRunning) {
      console.log(
        `⚠️  Proceso cerrado con código ${code}, reintentando en 2s...`,
      );
      setTimeout(startNext, 2000);
    }
  });
}

function checkHealth() {
  const req = http.get('http://localhost:3001', (res) => {
    if (res.statusCode === 200 || res.statusCode === 404) {
      if (!serverReady) {
        console.log('✅ Servidor verificado y funcionando');
        serverReady = true;
      }
    }
  });

  req.on('error', () => {
    if (serverReady) {
      console.log('❌ Servidor dejó de responder, reiniciando...');
      serverReady = false;
      if (nextProcess) {
        nextProcess.kill();
      }
      setTimeout(startNext, 1000);
    }
  });

  req.end();
}

// Manejar cierre limpio
const cleanup = () => {
  console.log('\n👋 Cerrando servidor...');
  keepRunning = false;
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  if (nextProcess) {
    nextProcess.kill();
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Iniciar
startNext();

// Mantener el proceso principal vivo
setInterval(() => {
  // Keep alive
}, 10000);
