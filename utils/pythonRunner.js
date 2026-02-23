/**
 * Utilidad para encontrar y ejecutar Python de forma portable.
 * Busca: venv del proyecto → python/python3 del sistema.
 * Elimina la dependencia de rutas hardcodeadas a Anaconda.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..');

/**
 * Encuentra el ejecutable de Python más adecuado.
 * Prioridad:
 *   1. Variable de entorno PYTHON_PATH (override explícito)
 *   2. Entorno virtual del proyecto (.venv o venv)
 *   3. python / python3 del sistema (PATH)
 */
function findPython() {
  // 1. Override explícito
  const envPython = process.env.PYTHON_PATH;
  if (envPython && fs.existsSync(envPython)) return envPython;

  // 2. Virtualenv del proyecto
  const isWin = process.platform === 'win32';
  const venvDirs = ['.venv', 'venv'];
  for (const dir of venvDirs) {
    const p = isWin
      ? path.join(projectRoot, dir, 'Scripts', 'python.exe')
      : path.join(projectRoot, dir, 'bin', 'python');
    if (fs.existsSync(p)) return p;
  }

  // 3. Sistema
  return isWin ? 'python' : 'python3';
}

/**
 * Crea un proceso Python para el script dado.
 * @param {string} scriptPath  Ruta absoluta al script .py
 * @param {string[]} args      Argumentos posicionales
 * @param {object} extraEnv    Variables de entorno adicionales
 * @returns {ChildProcess}
 */
function spawnPython(scriptPath, args = [], extraEnv = {}) {
  const pythonExe = findPython();
  const env = { ...process.env, ...extraEnv };
  return spawn(pythonExe, [scriptPath, ...args], { env });
}

module.exports = { findPython, spawnPython, projectRoot };
