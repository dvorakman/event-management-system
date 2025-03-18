import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CONTAINER_NAME = 'event-management-postgres';
const DB_NAME = 'postgres';
const DB_USER = 'postgres';
const DB_PASSWORD = 'postgres';
const DB_PORT = '5432';

async function runCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return true;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return false;
  }
}

async function isDockerRunning() {
  try {
    await execAsync('docker info');
    return true;
  } catch (error) {
    console.error('Docker is not running. Please start Docker Desktop and try again.');
    return false;
  }
}

async function isContainerRunning() {
  try {
    const { stdout } = await execAsync(`docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Names}}"`);
    return stdout.trim() === CONTAINER_NAME;
  } catch (error) {
    return false;
  }
}

async function startDatabase() {
  console.log('🔍 Checking Docker status...');
  
  if (!await isDockerRunning()) {
    process.exit(1);
  }

  console.log('✅ Docker is running');
  
  // Check if container is already running
  if (await isContainerRunning()) {
    console.log(`✅ PostgreSQL container '${CONTAINER_NAME}' is already running`);
    return;
  }

  // Check if container exists but is stopped
  try {
    await execAsync(`docker start ${CONTAINER_NAME}`);
    console.log(`✅ Started existing PostgreSQL container '${CONTAINER_NAME}'`);
    return;
  } catch (error) {
    // Container doesn't exist, create a new one
    console.log('🚀 Creating new PostgreSQL container...');
  }

  // Create and start a new container
  const startCommand = `docker run --name ${CONTAINER_NAME} -e POSTGRES_DB=${DB_NAME} -e POSTGRES_USER=${DB_USER} -e POSTGRES_PASSWORD=${DB_PASSWORD} -p ${DB_PORT}:5432 -d postgres:latest`;
  
  if (await runCommand(startCommand)) {
    console.log(`
✅ PostgreSQL container started successfully!

   Connection details:
   - Host: localhost
   - Port: ${DB_PORT}
   - Database: ${DB_NAME}
   - Username: ${DB_USER}
   - Password: ${DB_PASSWORD}

   To stop the database:
   $ docker stop ${CONTAINER_NAME}

   To view logs:
   $ docker logs ${CONTAINER_NAME}
`);
  } else {
    console.error('Failed to start PostgreSQL container');
    process.exit(1);
  }
}

startDatabase().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
}); 