import * as fs from 'fs';
import * as path from 'path';

// Load env vars from .env file
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    }
  }
}
loadEnv();

const CRON_JOB_API_KEY = 'h1izyIxkid1t3zL0nYS8j6n8D7vaf+7fLVP20K7QZQw=';
// Use the APP_URL from .env or default to localhost for testing, but warn if it's localhost
const APP_URL = process.env.APP_URL || 'https://tu-dominio-produccion.com';
const CRON_SECRET = process.env.CRON_SECRET || '';

const API_BASE = 'https://api.cron-job.org';

const headers = {
  'Authorization': `Bearer ${CRON_JOB_API_KEY}`,
  'Content-Type': 'application/json',
};

// Defined jobs to create
const JOBS = [
  {
    title: 'HDB Service - Tareas Diarias (Mensual/Mantenimiento)',
    url: `${APP_URL}/api/cron`,
    // Schedule: Daily at 02:00 AM
    schedule: {
      timezone: 'America/Argentina/Buenos_Aires',
      expiresAt: 0,
      hours: [2],
      mdays: [-1],
      minutes: [0],
      months: [-1],
      wdays: [-1]
    }
  },
  {
    title: 'HDB Service - Verificación de SLA',
    url: `${APP_URL}/api/cron/sla-check`,
    // Schedule: Every 30 minutes (*:00, *:30)
    schedule: {
      timezone: 'America/Argentina/Buenos_Aires',
      expiresAt: 0,
      hours: [-1],
      mdays: [-1],
      minutes: [0, 30],
      months: [-1],
      wdays: [-1]
    }
  },
  {
    title: 'HDB Service - Monitoreo de Estado',
    url: `${APP_URL}/api/health`,
    // Schedule: Every 5 minutes
    schedule: {
      timezone: 'America/Argentina/Buenos_Aires',
      expiresAt: 0,
      hours: [-1],
      mdays: [-1],
      minutes: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
      months: [-1],
      wdays: [-1]
    }
  }
];

async function deleteJob(jobId: number, title: string) {
  try {
    const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
      method: 'DELETE',
      headers,
    });
    if (response.ok) {
      console.log(`🗑️ Deleted obsolete/duplicate job "${title}" (ID: ${jobId})`);
    } else {
      console.error(`❌ Failed to delete job "${title}" (ID: ${jobId})`);
    }
  } catch (error) {
    console.error(`❌ Request failed to delete job "${title}":`, error);
  }
}

async function createJob(jobConfig: any) {
  const payload = {
    job: {
      url: jobConfig.url,
      enabled: true,
      saveResponses: true,
      title: jobConfig.title,
      schedule: jobConfig.schedule,
      requestMethod: 0, // GET
      extendedData: {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`
        }
      }
    }
  };

  try {
    const response = await fetch(`${API_BASE}/jobs`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`❌ Error creating job "${jobConfig.title}":`, err);
    } else {
      const data = await response.json();
      console.log(`✅ Job "${jobConfig.title}" created successfully! ID: ${data.jobId}`);
    }
  } catch (error) {
    console.error(`❌ Request failed for job "${jobConfig.title}":`, error);
  }
}

async function main() {
  console.log(`🚀 Iniciando configuración de Cron Jobs en Cron-job.org`);
  console.log(`🌐 Base URL: ${APP_URL}`);

  if (APP_URL.includes('localhost') || APP_URL.includes('tu-dominio')) {
    console.warn(`⚠️ ADVERTENCIA: Estás usando una URL local o de prueba (${APP_URL}). Cron-job.org no podrá alcanzar tu servidor local a menos que uses algo como ngrok.`);
  }

  if (!CRON_SECRET) {
    console.warn(`⚠️ ADVERTENCIA: No tienes CRON_SECRET en tu .env. Los endpoints estarán desprotegidos si no lo configuras.`);
  }

  // 1. Fetch existing jobs
  let existingJobs: any[] = [];
  try {
    const response = await fetch(`${API_BASE}/jobs`, { method: 'GET', headers });
    if (response.ok) {
      const data = await response.json();
      existingJobs = data.jobs || [];
    } else {
      console.error('❌ Failed to fetch existing jobs from cron-job.org');
    }
  } catch (error) {
    console.error('❌ Error fetching existing jobs:', error);
  }

  // 2. Clean up jobs targeting the placeholder domain or duplicate ones
  const jobsToDelete = existingJobs.filter(job => 
    job.url.includes('tu-dominio-produccion.com')
  );

  for (const job of jobsToDelete) {
    await deleteJob(job.jobId, job.title);
  }

  // Refresh list of existing jobs after deletions
  const remainingJobs = existingJobs.filter(job => !job.url.includes('tu-dominio-produccion.com'));

  // 3. Setup/Ensure correct jobs exist
  for (const targetJob of JOBS) {
    const matchingJobs = remainingJobs.filter(job => job.title === targetJob.title);

    if (matchingJobs.length === 1 && matchingJobs[0].url === targetJob.url) {
      console.log(`ℹ️ Job "${targetJob.title}" is already configured correctly.`);
      continue;
    }

    // If there are duplicate jobs or the URL is outdated, delete them and re-create a clean one
    if (matchingJobs.length > 0) {
      for (const job of matchingJobs) {
        await deleteJob(job.jobId, job.title);
      }
    }

    // Create the correct job
    await createJob(targetJob);
  }

  console.log('✅ Proceso finalizado.');
}

main();
