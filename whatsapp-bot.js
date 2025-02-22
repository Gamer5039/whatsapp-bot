require('dotenv').config();
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');
const mime = require('mime-types');
const pdf = require('pdf-parse');

// OpenRouter API configuration
if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY not found in environment variables');
    process.exit(1);
}
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Configure puppeteer options for Deepnote environment
const puppeteerConfig = {
    executablePath: '/usr/bin/chromium',
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--disable-gpu'
    ],
    headless: 'new'
};

// Initialize WhatsApp client with puppeteer options
const client = new Client({
    puppeteer: puppeteerConfig,
    webVersion: '2.2401.6',
    webVersionCache: {
        type: 'none'
    }
});

// Function to extract text from PDF
async function extractTextFromPDF(buffer) {
    try {
        const data = await pdf(buffer);
        return data.text;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

// Function to process text with DeepSeek API
async function processTextWithAI(text, context = '') {
    try {
        let prompt = text;
        if (context) {
            prompt = `Context from PDF:\n${context}\n\nQuestion: ${text}\nPlease answer based on the context provided.`;
        }

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://github.com/whatsapp-bot',
                'X-Title': 'WhatsApp AI Bot',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-r1:free',
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                top_p: 1,
                repetition_penalty: 1
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('OpenRouter API Error:', errorData);
            throw new Error(`OpenRouter API responded with status ${response.status}`);
        }

        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        }
        throw new Error('Invalid response from OpenRouter API');
    } catch (error) {
        console.error('Error processing with OpenRouter:', error);
        throw error;
    }
}

// Function to process image
async function processImageWithAI(imageBase64, caption) {
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://github.com/whatsapp-bot',
                'X-Title': 'WhatsApp AI Bot',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-r1:free',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: caption || 'What do you see in this image? Please describe it in detail.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageBase64}`
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.7,
                top_p: 1,
                repetition_penalty: 1
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('OpenRouter Vision API Error:', errorData);
            throw new Error(`OpenRouter Vision API responded with status ${response.status}`);
        }

        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        }
        throw new Error('Invalid response from OpenRouter Vision API');
    } catch (error) {
        console.error('Error processing image with OpenRouter:', error);
        throw error;
    }
}

// Generate QR code for WhatsApp Web authentication
client.on('qr', async (qr) => {
    console.log('Generating QR code...');
    
    try {
        qrcode.generate(qr, { small: true });
        console.log('Please scan the QR code above with WhatsApp');
    } catch (error) {
        console.log('Terminal QR code generation failed, generating image file instead...');
    }

    try {
        await QRCode.toFile('whatsapp-qr.png', qr);
        console.log('\nQR code has been saved as "whatsapp-qr.png"');
        console.log('Please download and scan this QR code with WhatsApp');
    } catch (error) {
        console.error('Failed to generate QR code image:', error);
    }
});

client.on('ready', () => {
    console.log('WhatsApp bot is ready!');
});

// Store PDF contexts for ongoing conversations
const pdfContexts = new Map();

// Handle incoming messages
client.on('message', async (message) => {
    if (message.body.startsWith('!')) {
        return; // Ignore messages starting with ! to prevent loops
    }

    try {
        let response;
        
        // Check if the message has media
        if (message.hasMedia) {
            const media = await message.downloadMedia();
            
            if (media.mimetype === 'application/pdf') {
                // Handle PDF file
                console.log('Processing PDF document...');
                const buffer = Buffer.from(media.data, 'base64');
                const pdfText = await extractTextFromPDF(buffer);
                
                // Store PDF context for this chat
                pdfContexts.set(message.from, pdfText);
                
                response = "I've read the PDF document. You can now ask me questions about its content.";
            } else if (media.mimetype.startsWith('image/')) {
                // Handle image
                console.log('Processing image with DeepSeek Vision...');
                response = await processImageWithAI(media.data, message.body);
            } else {
                response = "Sorry, I can only process PDF documents and image files.";
            }
        } else {
            // Process text message
            console.log('Processing text with DeepSeek...');
            // Check if we have a stored PDF context for this chat
            const pdfContext = pdfContexts.get(message.from);
            response = await processTextWithAI(message.body, pdfContext);
        }

        await message.reply(response);
    } catch (error) {
        console.error('Error:', error);
        await message.reply('Sorry, I encountered an error: ' + error.message);
    }
});

// Enhanced error logging
client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
    // Clear PDF contexts on disconnect
    pdfContexts.clear();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the client
console.log('Initializing WhatsApp client...');
client.initialize().catch(err => {
    console.error('Failed to initialize client:', err);
    console.error('Error details:', err.message);
});