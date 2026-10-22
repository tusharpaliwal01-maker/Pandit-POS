import { GoogleGenAI, Type } from '@google/genai';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'store_db.json');

// Ensure server data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const apiRouter = express.Router();
apiRouter.use(express.json({ limit: '25mb' }));

/**
 * GET /api/storage/state
 * Retrieve persistent database snapshot from server disk
 */
apiRouter.get('/storage/state', (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content);
      return res.json({ success: true, data });
    }
    return res.json({ success: false, data: null });
  } catch (err: any) {
    console.error('Failed to read server database file:', err);
    return res.status(500).json({ error: 'Failed to read server database', details: err?.message });
  }
});

/**
 * POST /api/storage/state
 * Persist database snapshot permanently to server disk
 */
apiRouter.post('/storage/state', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    return res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('Failed to write server database file:', err);
    return res.status(500).json({ error: 'Failed to save database to disk', details: err?.message });
  }
});

function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * POST /api/gemini/parse-bill
 * Multimodal supplier invoice parser using gemini-3.8-flash
 */
apiRouter.post('/gemini/parse-bill', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 payload is required' });
    }

    const ai = getGeminiClient();

    const prompt = `You are an expert Indian retail & fireworks tax accountant and invoice parser.
Analyze this supplier purchase bill / tax invoice image carefully.
Extract the vendor details and every individual product line item with:
- vendorName (e.g., Sri Kaliswari Fireworks, Standard Fireworks Sivakasi, Krishna Fireworks)
- vendorGstin (e.g., 33AAAC... or 07AAAC...)
- invoiceNumber
- invoiceDate (YYYY-MM-DD format if identifiable, otherwise string)
- totalAmount (grand total from invoice)
- items: array of objects with:
  - name: clean product name (e.g. "10cm Electric Sparklers", "Special Ashoka Anar")
  - hsn: HSN code (typically 3604 for fireworks / pyrotechnic articles, or relevant SAC)
  - qty: quantity purchased as integer
  - purchasePrice: unit purchase rate / cost before tax
  - mrp: MRP printed on package or invoice (if not visible, estimate 1.6x - 2.0x purchasePrice)
  - gstRate: GST tax percentage (18 or 28 for fireworks)
  - batchNumber: batch code or lot number if shown (e.g., "SKF-26-04", or generate "BATCH-2026")

Return strictly the parsed data conforming to the schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64.replace(/^data:[^;]+;base64,/, ''),
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendorName: { type: Type.STRING },
            vendorGstin: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            invoiceDate: { type: Type.STRING },
            totalAmount: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  hsn: { type: Type.STRING },
                  qty: { type: Type.NUMBER },
                  purchasePrice: { type: Type.NUMBER },
                  mrp: { type: Type.NUMBER },
                  gstRate: { type: Type.NUMBER },
                  batchNumber: { type: Type.STRING },
                },
                required: ['name', 'qty', 'purchasePrice'],
              },
            },
          },
          required: ['vendorName', 'invoiceNumber', 'items'],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsedJson });
  } catch (err: any) {
    console.error('Error parsing supplier bill with Gemini:', err);
    return res.status(500).json({
      error: 'Failed to parse supplier invoice',
      details: err?.message || String(err),
    });
  }
});

/**
 * POST /api/gemini/chat
 * Multi-turn intelligent assistant for retail operations, stock, fireworks safety, and GST
 */
apiRouter.post('/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { messages, contextData } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are "Pandit Retail AI", the embedded intelligent retail operations co-pilot inside PANDIT POS.
You assist store cashiers, shop admins, and supervisors in managing a high-volume retail fireworks & celebrations shop.
Your capabilities include:
1. Answering POS & inventory questions: checking low stock, explaining pricing/margins, understanding GST (18% for sparklers/fountains/ground spinners, 28% for high-decibel rockets & aerial cakes).
2. Providing PESO (Petroleum and Explosives Safety Organisation) retail safety guidance:
   - Green fireworks QR verification (CSIR-NEERI formulations).
   - Storing fireworks in cool, dry, well-ventilated areas away from direct sunlight, sparks, and electrical switches.
   - Strictly prohibiting smoking or open flames within 50 meters of storage.
   - Keeping sand buckets, water buckets, and dry powder ABC fire extinguishers accessible.
3. Formulating customer recommendation bundles (e.g. "Safe Family Pack for Kids", "Grand Reception Sky Shot Display").
4. Customer Khata advice: credit aging, polite payment reminder message templates for WhatsApp.
5. Providing quick, actionable answers with bullet points and bold key numbers. Keep answers concise, respectful, and practical for busy shop counters.

Shop Context:
${contextData ? JSON.stringify(contextData) : 'PANDIT FIREWORKS & CELEBRATIONS wholesale & retail counter.'}`;

    // Format previous turns for Gemini
    const contents = messages.map((m: { role: 'user' | 'model' | 'assistant'; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({
      success: true,
      reply: response.text,
    });
  } catch (err: any) {
    console.error('Error in Gemini chat endpoint:', err);
    return res.status(500).json({
      error: 'Failed to process chat message',
      details: err?.message || String(err),
    });
  }
});
