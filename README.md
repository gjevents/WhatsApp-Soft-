# GJ Events WhatsApp Marketing Automation System

A full-stack WhatsApp web marketing automation app for GJ Events. The project includes a professional dashboard UI, contact management, campaign orchestration, media uploads, real-time progress with Socket.IO, and a Playwright-based WhatsApp Web automation layer that keeps a persistent browser session for authenticated WhatsApp Web usage.

## Overview

This application is designed for a business to:

- connect a WhatsApp Business Web session by scanning a QR code
- import and manage opted-in contacts
- set a maximum contact limit and consent policies
- create a campaign with one common message and optional media
- process recipients sequentially with a configurable delay
- monitor progress in real time
- retry failed messages selectively
- review historical campaign performance and stats

> This system is intended only for messaging contacts who have explicitly opted in. It does not bypass WhatsApp protections or use any prohibited automation or evasion mechanisms.

## Features

- Responsive SaaS dashboard with sidebar, cards, charts, and tables
- Contacts management with CSV and Excel import
- Contact limit enforcement and duplicate detection
- Campaign wizard with preview and confirmation
- Optional attachment support for images, video, PDF, and documents
- Queue-based sequential sending with pause/resume/stop logic
- Real-time progress updates via Socket.IO
- Retry failed recipients with a configurable limit
- Prisma + SQLite database for persistent state
- Playwright-based WhatsApp Web session management
- Production-ready setup with validation, logging, and API routing

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router, Recharts
- Backend: Node.js, Express, TypeScript, Socket.IO, Prisma, SQLite, Playwright
- Validation: Zod
- Uploads: Multer
- Logging: Pino

## Installation

1. Install dependencies in the root workspace:

   npm install

2. Install frontend dependencies:

   npm --prefix frontend install

3. Install backend dependencies:

   npm --prefix backend install

4. Copy the example environment file:

   copy .env.example .env

5. Configure your environment values in the root .env file.

## Database Setup

From the backend folder:

   cd backend
   npx prisma generate
   npx prisma db push

If you want to initialize migrations:

   npx prisma migrate dev --name init

## Running the App in Development

From the project root:

   npm run dev

This starts:

- React frontend on http://localhost:5173
- Express API on http://localhost:4000

## WhatsApp QR Connection

1. Open the WhatsApp page in the app.
2. Click Connect WhatsApp.
3. Scan the QR code from your mobile WhatsApp app.
4. Open WhatsApp > Linked Devices > Link a Device.
5. After the session is established, the app will show a connected state.

The Playwright browser session is stored in the `sessions/whatsapp` directory so it persists across backend restarts when the WhatsApp session remains valid.

## Contact Import

The application accepts:

- CSV files
- XLS/XLSX files

Each contact must include a valid phone number and consent status. The app prevents duplicate entries and enforces the configured maximum contacts limit before the import completes.

## Creating a Campaign

1. Open the Create Campaign page.
2. Select eligible contacts.
3. Create the message template with support for {{name}} and {{phone}}.
4. Optionally attach media.
5. Set a delay between messages.
6. Preview the campaign.
7. Confirm and start sending.

## Sending Media

Supported media types include JPG, JPEG, PNG, WEBP, PDF, MP4, MOV, DOC, DOCX, XLS, XLSX, PPT, PPTX, and ZIP, with validation to block executable files and invalid MIME types.

## Retry Failed Messages

Failed recipients can be retried from the campaign details or campaign history page. Retry attempts are capped by the configured limit to avoid infinite retry loops.

## Production Build

From the root:

   npm run build

This performs both frontend and backend builds.

## Deployment Notes

- Set secure environment variables in production.
- Keep the SQLite database and uploads directory writable.
- Use a proper reverse proxy (such as Nginx or a Node process manager) in production.
- Keep the browser session directory on persistent storage if the server is restarted.

## Troubleshooting

- If the QR code does not show, restart the WhatsApp service by reconnecting.
- If the browser session has expired, use Reconnect WhatsApp.
- If imports fail, check that the phone number format is valid and the file MIME type is supported.
- If media uploads fail, confirm the file size and extension are valid.

## Responsible Use / Consent Requirements

This application is only for legitimate marketing communication to people who have explicitly agreed to receive messages. The app includes consent tracking and defaults to only sending to OPTED_IN contacts. Every campaign should respect local consent laws and brand policy.

## License

This project is provided as a working starter for GJ Events and should be adapted to your production business process, data retention policy, and compliance requirements.
