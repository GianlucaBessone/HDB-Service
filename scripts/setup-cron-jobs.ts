import * as fs from 'fs';
import * as path from 'path';

// Load env vars
// removed dotenv

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
  }
];

async function createJob(jobConfig: any) {
  // Construct the payload according to cron-job.org API specification
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

  for (const job of JOBS) {
    await createJob(job);
  }

  console.log('✅ Proceso finalizado.');
}

main();
