const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env manually since we are outside Next.js
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
    }
});

const token = env.TELEGRAM_BOT_TOKEN;
const chatId = env.TELEGRAM_CHAT_ID;

console.log('--- Telegram Config Check ---');
console.log('Token exists:', !!token);
console.log('ChatID exists:', !!chatId);
console.log('ChatID value:', chatId); // Safe to show part of it usually, but here I'll show it to debug for user if needed (in logs)
console.log('-----------------------------');

if (!token || !chatId) {
    console.error('Missing credentials!');
    process.exit(1);
}

const data = JSON.stringify({
    chat_id: chatId,
    text: "🔔 Test notification from leadsgen88 debug script.",
    parse_mode: "Markdown"
});

const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, res => {
    console.log(`StatusCode: ${res.statusCode}`);

    let responseBody = '';
    res.on('data', d => {
        responseBody += d;
    });

    res.on('end', () => {
        console.log('Response:', responseBody);
    });
});

req.on('error', error => {
    console.error('Error:', error);
});

req.write(data);
req.end();
