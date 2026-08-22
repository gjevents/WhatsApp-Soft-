import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import whatsappPkg from 'whatsapp-web.js';

const { Client, LocalAuth, MessageMedia } = whatsappPkg;

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
});

const PORT = process.env.WHATSAPP_SERVICE_PORT || 3001;
const SERVICE_DIR = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.resolve(SERVICE_DIR, '..', 'sessions', 'whatsapp');
const STATUS = {
  state: 'DISCONNECTED',
  qr: null,
  message: 'WhatsApp service idle',
  phone: null,
  expectedPhone: null
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

let client = null;
let initializePromise = null;
let destroyPromise = null;

async function destroyClient() {
  if (destroyPromise) return destroyPromise;

  const clientToDestroy = client;
  client = null;
  if (!clientToDestroy) return;

  destroyPromise = clientToDestroy.destroy().catch(error => {
    console.warn('Destroy warning:', error.message);
  }).finally(() => {
    destroyPromise = null;
  });

  return destroyPromise;
}

function createClient() {
  if (client) return client;
  
  try {
    client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'gj-events',
        dataPath: SESSION_DIR,
        rmMaxRetries: 20
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process'
        ],
        timeout: 60000
      }
    });

    client.on('qr', async (qr) => {
      STATUS.state = 'QR_REQUIRED';
      STATUS.qr = qr;
      STATUS.message = 'Scan the QR code';
      emitState();
    });

    client.on('authenticated', () => {
      console.log('WhatsApp authenticated');
      STATUS.state = 'AUTHENTICATED';
      STATUS.qr = null;
      STATUS.message = 'WhatsApp authenticated, waiting for ready...';
      emitState();
    });

    client.on('auth_failure', () => {
      console.log('WhatsApp authentication failed');
      STATUS.state = 'DISCONNECTED';
      STATUS.message = 'Authentication failed';
      emitState();
    });

    client.on('ready', () => {
      console.log('WhatsApp client is ready to send messages');
      const connectedPhone = client.info?.wid?.user || null;
      STATUS.phone = connectedPhone;
      if (STATUS.expectedPhone && normalizePhone(STATUS.expectedPhone) !== normalizePhone(connectedPhone)) {
        STATUS.state = 'DISCONNECTED';
        STATUS.qr = null;
        STATUS.message = `Login rejected. Connect the configured WhatsApp number ending in ${normalizePhone(STATUS.expectedPhone).slice(-4)}.`;
        emitState();
        destroyClient();
        return;
      }
      STATUS.state = 'READY';
      STATUS.qr = null;
      STATUS.message = 'WhatsApp ready - you can send messages';
      emitState();
    });

    client.on('disconnected', () => {
      STATUS.state = 'DISCONNECTED';
      STATUS.message = 'WhatsApp disconnected';
      emitState();
    });

    client.on('error', (error) => {
      console.error('WhatsApp Client Error:', error.message);
      STATUS.state = 'ERROR';
      STATUS.message = `Error: ${error.message}`;
      emitState();
    });

    client.on('message', async (msg) => {
      if (msg.body === '!ping') {
        await msg.reply('pong');
      }
    });

    return client;
  } catch (error) {
    console.error('Failed to create WhatsApp client:', error.message);
    STATUS.state = 'ERROR';
    STATUS.message = `Failed to create client: ${error.message}`;
    emitState();
    return null;
  }
}

function emitState() {
  io.emit('whatsapp-state', STATUS);
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, status: STATUS.state });
});

app.get('/state', (_req, res) => {
  res.json({
    status: STATUS.state,
    qr: STATUS.qr,
    message: STATUS.message,
    phone: STATUS.phone
  });
});

app.post('/connect', async (req, res) => {
  try {
    STATUS.expectedPhone = req.body?.expectedPhone || null;
    if (client && ['CONNECTING', 'QR_REQUIRED', 'AUTHENTICATED', 'READY'].includes(STATUS.state)) {
      return res.json({ status: STATUS.state, message: STATUS.message, phone: STATUS.phone });
    }
    STATUS.state = 'CONNECTING';
    STATUS.message = 'Connecting to WhatsApp';
    emitState();
    const whatsappClient = createClient();
    if (!whatsappClient) {
      return res.status(500).json({ error: 'Failed to create WhatsApp client' });
    }
    initializePromise = whatsappClient.initialize().catch(error => {
      console.error('Initialize error:', error.message);
      STATUS.state = 'ERROR';
      STATUS.message = `Initialize error: ${error.message}`;
      client = null;
      emitState();
      throw error;
    });
    initializePromise.catch(() => {});
    res.json({ status: STATUS.state, message: STATUS.message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/disconnect', async (_req, res) => {
  await destroyClient();
  initializePromise = null;

  STATUS.state = 'DISCONNECTED';
  STATUS.qr = null;
  STATUS.message = 'WhatsApp disconnected';
  STATUS.phone = null;
  emitState();
  res.json({ status: STATUS.state, message: STATUS.message });
});

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

app.delete('/session', async (_req, res) => {
  try {
    await destroyClient();
    fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    console.log('Session directory removed');
    STATUS.state = 'DISCONNECTED';
    STATUS.qr = null;
    STATUS.message = 'Session cleared';
    emitState();
    res.json({ status: STATUS.state, message: STATUS.message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/send', async (req, res) => {
  const { phone, message } = req.body || {};
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message required' });
  }
  try {
    // Ensure we have a client
    let whatsappClient = client;
    if (!whatsappClient) {
      console.log('Client not initialized, creating new client...');
      whatsappClient = createClient();
      if (!whatsappClient) {
        return res.status(500).json({ error: 'Failed to create WhatsApp client' });
      }
    }

    // Check if connected
    if (STATUS.state !== 'READY' && STATUS.state !== 'AUTHENTICATED') {
      console.log(`Cannot send: WhatsApp state is ${STATUS.state}, not READY or AUTHENTICATED`);
      return res.status(400).json({ 
        error: 'WhatsApp not ready to send messages',
        current_status: STATUS.state,
        message: STATUS.message
      });
    }

    // Format phone number: expect digits, format as international (e.g., 919876543210)
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Phone number must have at least 10 digits' });
    }
    
    // Ensure it's in international format (with country code for India: 91)
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const chatId = `${formattedPhone}@c.us`;

    console.log(`Sending message to ${chatId}: "${message}"`);
    const msg = await whatsappClient.sendMessage(chatId, message);
    const messageId = msg?.id?._serialized || null;
    
    console.log(`Message sent successfully to ${formattedPhone}${messageId ? `, ID: ${messageId}` : ''}`);
    res.json({ 
      success: true, 
      phone: formattedPhone,
      message_id: messageId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Send error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

app.post('/send-media', async (req, res) => {
  const { phone, message, mediaUrl, mediaUrls, mediaType } = req.body || {};
  const urls = mediaUrls || (mediaUrl ? [mediaUrl] : []);
  if (!phone || urls.length === 0) {
    return res.status(400).json({ error: 'phone and mediaUrl required' });
  }
  try {
    let whatsappClient = client;
    if (!whatsappClient) {
      console.log('Client not initialized, creating new client...');
      whatsappClient = createClient();
      if (!whatsappClient) {
        return res.status(500).json({ error: 'Failed to create WhatsApp client' });
      }
    }

    if (STATUS.state !== 'READY' && STATUS.state !== 'AUTHENTICATED') {
      return res.status(400).json({ 
        error: 'WhatsApp not ready to send messages',
        current_status: STATUS.state
      });
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Phone number must have at least 10 digits' });
    }
    
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const chatId = `${formattedPhone}@c.us`;

    for (const [index, url] of urls.entries()) {
      console.log(`Sending media to ${chatId}: ${url}`);
      const media = await MessageMedia.fromUrl(url);
      if (message && index === 0) {
        await whatsappClient.sendMessage(chatId, message, { media });
      } else {
        await whatsappClient.sendMessage(chatId, media);
      }
    }
    
    res.json({ success: true, phone: formattedPhone, mediaType });
  } catch (error) {
    console.error('Send media error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to send media' });
  }
});

io.on('connection', (socket) => {
  socket.emit('whatsapp-state', STATUS);
  socket.on('ping', () => socket.emit('pong'));
});

fs.mkdirSync(SESSION_DIR, { recursive: true });

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`WhatsApp service is already running on port ${PORT}. Reuse the existing service.`);
    process.exitCode = 0;
    return;
  }

  console.error('WhatsApp service failed to start:', error.message);
  process.exitCode = 1;
});

httpServer.listen(PORT, () => {
  console.log(`WhatsApp service running on http://localhost:${PORT}`);
  console.log('Use POST /connect to initialize WhatsApp client');
});
