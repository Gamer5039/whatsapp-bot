# WhatsApp AI Bot

A WhatsApp bot that can process messages, images, and PDF documents using AI capabilities.

## Features

- WhatsApp message handling
- PDF document processing
- Image analysis
- AI-powered responses using OpenRouter API
- QR code generation for WhatsApp Web authentication

## Setup

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/whatsapp-bot.git
cd whatsapp-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your OpenRouter API key:
```
OPENROUTER_API_KEY=your_api_key_here
```

4. Start the bot:
```bash
npm start
```

5. Scan the QR code:
- The QR code will be displayed in the terminal
- A backup PNG file will also be generated as "whatsapp-qr.png"
- Scan the QR code using WhatsApp on your phone to authenticate

## Environment Variables

- `OPENROUTER_API_KEY`: Your OpenRouter API key (required)

## Usage

Once the bot is running and authenticated:
- Send text messages to get AI responses
- Send images for analysis
- Send PDF documents to extract and analyze text

## Deployment

1. Create a new repository on GitHub
2. Initialize git and push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-bot.git
git push -u origin main
```

## Important Notes

- The QR code changes with each session for security
- Keep your API keys secure and never commit them to version control
- The bot requires a stable internet connection
- WhatsApp must be installed on your phone to scan the QR code

## License

MIT
