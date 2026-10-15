/**
 * Hardware Drivers & Serial Protocol Engine for:
 * 1. RETSOL RTP82 (ESC/POS 80mm/58mm Thermal Receipt Printer)
 * 2. TSC TE244 (TSPL / TSPL2 Barcode Label Printer)
 */

import { Invoice, Shop, Product, LabelPrintConfig, PrinterType, ConnectionStatus } from '../types';

interface SerialConnection {
  port: any;
  writer: any;
  type: PrinterType;
  baudRate: number;
}

class HardwarePrinterManager {
  private connections: Map<PrinterType, SerialConnection> = new Map();
  private listeners: Set<(type: PrinterType, status: ConnectionStatus, message?: string) => void> = new Set();

  public subscribe(callback: (type: PrinterType, status: ConnectionStatus, message?: string) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(type: PrinterType, status: ConnectionStatus, message?: string) {
    this.listeners.forEach((cb) => cb(type, status, message));
  }

  public isSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public isConnected(type: PrinterType): boolean {
    const conn = this.connections.get(type);
    return !!(conn && conn.port && conn.writer);
  }

  public async connect(type: PrinterType, baudRate: number = 9600): Promise<boolean> {
    if (!this.isSerialSupported()) {
      this.notify(type, 'error', 'Web Serial API is not supported in this browser. Please use Google Chrome, MS Edge, or standard Browser Print.');
      return false;
    }

    try {
      this.notify(type, 'connecting');
      const serial = (navigator as any).serial;
      const port = await serial.requestPort();
      await port.open({ baudRate });

      const writer = port.writable.getWriter();
      this.connections.set(type, { port, writer, type, baudRate });
      this.notify(type, 'connected', `${type} connected on USB/COM port (${baudRate} baud)`);
      return true;
    } catch (err: any) {
      console.error(`Serial connection error for ${type}:`, err);
      this.notify(type, 'error', err?.message || `Failed to connect to ${type} printer port.`);
      return false;
    }
  }

  public async disconnect(type: PrinterType): Promise<void> {
    const conn = this.connections.get(type);
    if (!conn) return;

    try {
      if (conn.writer) {
        conn.writer.releaseLock();
      }
      if (conn.port) {
        await conn.port.close();
      }
    } catch (err) {
      console.warn(`Error disconnecting ${type}:`, err);
    } finally {
      this.connections.delete(type);
      this.notify(type, 'disconnected', `${type} printer disconnected.`);
    }
  }

  public async sendRaw(type: PrinterType, data: Uint8Array | string): Promise<boolean> {
    const conn = this.connections.get(type);
    if (!conn || !conn.writer) {
      return false;
    }

    try {
      const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      await conn.writer.write(buffer);
      return true;
    } catch (err: any) {
      console.error(`Error sending data to ${type}:`, err);
      this.notify(type, 'error', err?.message || `Communication failed with ${type}`);
      return false;
    }
  }

  // ==========================================
  // RETSOL RTP82 (ESC/POS) Specific Features
  // ==========================================

  /**
   * Cash Drawer Kick (RJ11 port pulse)
   * Pin 2: ESC p 0 25 250 (0x1B 0x70 0x00 0x19 0xFA)
   */
  public async kickCashDrawer(): Promise<boolean> {
    const drawerCmd = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    return this.sendRaw('RETSOL', drawerCmd);
  }

  /**
   * Paper Auto-Cutter
   * Partial cut: GS V 66 0 (0x1D 0x56 0x42 0x00)
   * Full cut: GS V 65 0 (0x1D 0x56 0x41 0x00)
   */
  public async cutPaper(mode: 'full' | 'partial' = 'partial'): Promise<boolean> {
    const feedAndCut = new Uint8Array([
      0x1b, 0x64, 0x03, // feed 3 lines
      0x1d, 0x56, mode === 'full' ? 0x41 : 0x42, 0x00,
    ]);
    return this.sendRaw('RETSOL', feedAndCut);
  }

  /**
   * Sound Internal Buzzer/Beeper
   * ESC B 2 2 (2 beeps of duration 200ms)
   */
  public async soundBuzzer(beeps: number = 2): Promise<boolean> {
    const beepCmd = new Uint8Array([0x1b, 0x42, Math.min(5, Math.max(1, beeps)), 0x02]);
    return this.sendRaw('RETSOL', beepCmd);
  }

  /**
   * Send Complete ESC/POS Receipt to RETSOL RTP82
   */
  public async printInvoiceToRetsol(
    invoice: Invoice,
    shop: Shop,
    options: {
      paperWidth?: '80mm' | '58mm';
      kickDrawer?: boolean;
      autoCut?: boolean;
      buzzer?: boolean;
    } = {}
  ): Promise<boolean> {
    const bytes = buildEscPosReceiptBinary(invoice, shop, options);
    const sent = await this.sendRaw('RETSOL', bytes);
    return sent;
  }

  // ==========================================
  // TSC TE244 (TSPL/TSPL2) Specific Features
  // ==========================================

  /**
   * Run TSC Media Sensor Gap Calibration
   */
  public async calibrateTscSensor(): Promise<boolean> {
    const cmd = `GAPDETECT\r\nFORMFEED\r\n`;
    return this.sendRaw('TSC', cmd);
  }

  /**
   * Feed exactly 1 label sticker
   */
  public async feedTscLabel(): Promise<boolean> {
    const cmd = `FORMFEED\r\n`;
    return this.sendRaw('TSC', cmd);
  }

  /**
   * Print TSC Internal Self-Test Diagnostics
   */
  public async printTscSelfTest(): Promise<boolean> {
    const cmd = `SELFTEST\r\n`;
    return this.sendRaw('TSC', cmd);
  }

  /**
   * Send TSPL2 Batch to TSC TE244
   */
  public async printLabelsToTsc(
    items: { product: Product; copies: number }[],
    config: LabelPrintConfig,
    shop: Shop
  ): Promise<boolean> {
    const script = buildTsplScript(items, config, shop);
    return this.sendRaw('TSC', script);
  }
}

export const hardwarePrinterManager = new HardwarePrinterManager();

// ==========================================
// ESC/POS Binary Command Builder
// ==========================================

export function buildEscPosReceiptBinary(
  invoice: Invoice,
  shop: Shop,
  options: {
    paperWidth?: '80mm' | '58mm';
    kickDrawer?: boolean;
    autoCut?: boolean;
    buzzer?: boolean;
  } = {}
): Uint8Array {
  const { paperWidth = '80mm', kickDrawer = false, autoCut = true, buzzer = false } = options;
  const is58mm = paperWidth === '58mm';
  const maxChars = is58mm ? 32 : 48;

  const buffer: number[] = [];
  const appendText = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      buffer.push(text.charCodeAt(i) & 0xff);
    }
  };

  // 1. Initialize Printer: ESC @
  buffer.push(0x1b, 0x40);

  // 2. Buzzer if requested: ESC B 2 2
  if (buzzer) {
    buffer.push(0x1b, 0x42, 0x02, 0x02);
  }

  // 3. Cash Drawer Kick if requested: ESC p 0 25 250
  if (kickDrawer) {
    buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa);
  }

  // 4. Center Align: ESC a 1
  buffer.push(0x1b, 0x61, 0x01);

  // Double Height & Width for Shop Name: GS ! 0x11
  buffer.push(0x1d, 0x21, 0x11);
  appendText(`${shop.name}\n`);

  // Normal text: GS ! 0x00
  buffer.push(0x1d, 0x21, 0x00);
  appendText(`${shop.address}\n`);
  appendText(`${shop.city}, ${shop.state} - ${shop.pincode}\n`);
  appendText(`GSTIN: ${shop.gstin}\n`);
  appendText(`Ph: ${shop.phonePrimary}\n`);

  const divider = '-'.repeat(maxChars) + '\n';
  appendText(divider);

  // 5. Left Align: ESC a 0
  buffer.push(0x1b, 0x61, 0x00);
  appendText(`INVOICE: ${invoice.invoiceNumber}\n`);
  appendText(`DATE: ${new Date(invoice.createdAt).toLocaleDateString()} ${new Date(invoice.createdAt).toLocaleTimeString()}\n`);
  appendText(`CASHIER: ${invoice.cashierName}\n`);
  if (invoice.customerName) {
    appendText(`CUSTOMER: ${invoice.customerName} (${invoice.customerMobile || ''})\n`);
  }
  appendText(divider);

  // 6. Items Table
  if (is58mm) {
    appendText(`ITEM           QTY  RATE   TOTAL\n`);
    appendText(divider);
    invoice.items.forEach((it) => {
      const name = it.name.length > 14 ? it.name.slice(0, 12) + '..' : it.name.padEnd(14, ' ');
      const qty = it.quantity.toString().padStart(3, ' ');
      const rate = it.unitPrice.toString().padStart(6, ' ');
      const total = it.total.toString().padStart(7, ' ');
      appendText(`${name} ${qty} ${rate} ${total}\n`);
      if (it.discountAmount > 0) {
        appendText(`  *Disc -Rs.${it.discountAmount}\n`);
      }
    });
  } else {
    // 80mm
    appendText(`ITEM                            QTY    RATE    TOTAL\n`);
    appendText(divider);
    invoice.items.forEach((it) => {
      const name = it.name.length > 30 ? it.name.slice(0, 28) + '..' : it.name.padEnd(30, ' ');
      const qty = it.quantity.toString().padStart(4, ' ');
      const rate = it.unitPrice.toString().padStart(7, ' ');
      const total = it.total.toString().padStart(7, ' ');
      appendText(`${name}${qty}${rate}${total}\n`);
      if (it.discountAmount > 0) {
        appendText(`  * Special Line Discount: -Rs. ${it.discountAmount}\n`);
      }
    });
  }

  appendText(divider);

  // 7. Totals: Right Align ESC a 2
  buffer.push(0x1b, 0x61, 0x02);
  const halfGst = (invoice.gstTotal / 2).toFixed(2);
  appendText(`Subtotal: Rs. ${invoice.subtotal.toFixed(2)}\n`);
  if (invoice.discountTotal > 0) {
    appendText(`Discount: -Rs. ${invoice.discountTotal.toFixed(2)}\n`);
  }
  appendText(`CGST: Rs. ${halfGst}\n`);
  appendText(`SGST: Rs. ${halfGst}\n`);

  // Bold Grand Total: ESC E 1
  buffer.push(0x1b, 0x45, 0x01);
  // Double Height: GS ! 0x01
  buffer.push(0x1d, 0x21, 0x01);
  appendText(`GRAND TOTAL: Rs. ${invoice.grandTotal.toFixed(2)}\n`);
  // Reset font
  buffer.push(0x1d, 0x21, 0x00);
  buffer.push(0x1b, 0x45, 0x00);

  // Left Align for payment mode
  buffer.push(0x1b, 0x61, 0x00);
  appendText(`Payment Mode: ${invoice.paymentMethod}\n`);
  if (invoice.paymentMethod === 'CASH' && invoice.cashReceived) {
    appendText(`Cash Tendered: Rs. ${invoice.cashReceived.toFixed(2)} | Change: Rs. ${(invoice.changeGiven || 0).toFixed(2)}\n`);
  }
  if (invoice.paymentMethod === 'UPI' && shop.upiId) {
    appendText(`UPI Payee: ${shop.upiId}\n`);
  }
  if (invoice.paymentMethod === 'KHATA') {
    appendText(`* Debited to Customer Khata Balance\n`);
  }

  appendText(divider);

  // 8. Footer: Center Align ESC a 1
  buffer.push(0x1b, 0x61, 0x01);
  appendText(`${shop.receiptFooter}\n`);
  appendText(`*** THANK YOU - VISIT AGAIN ***\n\n`);

  // 9. Feed Paper & Auto-cut: ESC d 3 + GS V 66 0
  if (autoCut) {
    buffer.push(0x1b, 0x64, 0x04); // Feed 4 lines
    buffer.push(0x1d, 0x56, 0x42, 0x00); // Partial cut
  } else {
    buffer.push(0x1b, 0x64, 0x04); // Feed 4 lines
  }

  return new Uint8Array(buffer);
}

/**
 * Build RETSOL Diagnostic & Alignment Test Receipt
 */
export function buildEscPosTestReceipt(shop: Shop, paperWidth: '80mm' | '58mm' = '80mm'): Uint8Array {
  const is58mm = paperWidth === '58mm';
  const maxChars = is58mm ? 32 : 48;
  const buffer: number[] = [];
  const appendText = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      buffer.push(text.charCodeAt(i) & 0xff);
    }
  };

  // Init
  buffer.push(0x1b, 0x40);
  // Buzzer
  buffer.push(0x1b, 0x42, 0x01, 0x02);

  // Center
  buffer.push(0x1b, 0x61, 0x01);
  buffer.push(0x1d, 0x21, 0x11); // Double
  appendText(`RETSOL RTP82 TEST\n`);
  buffer.push(0x1d, 0x21, 0x00); // Normal
  appendText(`Thermal Receipt Diagnostic Pattern\n`);
  appendText(`Roll Width: ${paperWidth} (${maxChars} columns)\n`);
  appendText(`Store: ${shop.name}\n`);

  const divider = '='.repeat(maxChars) + '\n';
  appendText(divider);

  // Left
  buffer.push(0x1b, 0x61, 0x00);
  appendText(`RULER ALIGNMENT CHECK:\n`);
  appendText(`12345678901234567890123456789012${is58mm ? '' : '3456789012345678'}\n`);
  appendText(divider);

  appendText(`FONT STYLES TEST:\n`);
  buffer.push(0x1b, 0x45, 0x01); // Bold
  appendText(`[BOLD FONT ACTIVATED]\n`);
  buffer.push(0x1b, 0x45, 0x00); // Bold Off
  buffer.push(0x1d, 0x21, 0x01); // Double height
  appendText(`[DOUBLE HEIGHT FONT]\n`);
  buffer.push(0x1d, 0x21, 0x10); // Double width
  appendText(`[DOUBLE WIDTH]\n`);
  buffer.push(0x1d, 0x21, 0x00); // Normal

  appendText(divider);
  buffer.push(0x1b, 0x61, 0x01);
  appendText(`CUTTER TEST: CUT FOLLOWS THIS LINE\n`);
  appendText(`*** RETSOL RTP82 READY ***\n\n\n`);

  // Feed & Cut
  buffer.push(0x1b, 0x64, 0x04);
  buffer.push(0x1d, 0x56, 0x42, 0x00);

  return new Uint8Array(buffer);
}

// ==========================================
// TSPL2 Command Builder for TSC TE244
// ==========================================

export function buildTsplScript(
  items: { product: Product; copies: number }[],
  config: LabelPrintConfig,
  shop: Shop
): string {
  const density = config.density ?? 10;
  const speed = config.speed ?? 3;
  const gap = config.gapMm ?? 2;
  const offsetX = Math.round(config.offsetX * 8); // 203 DPI = 8 dots/mm
  const offsetY = Math.round(config.offsetY * 8);

  const is2Up = config.layoutMode === '2-up' || config.labelSize === '100x25';
  const effectiveShopName = (config.customShopName?.trim() || shop?.name || 'PANDIT POS')
    .replace(/"/g, '')
    .trim();

  let script = '';

  if (is2Up) {
    // 100 x 25 mm media (Two 50x25mm labels across with 2mm gap in center)
    // Total width = 100mm, height = 25mm
    script += `SIZE 100 mm, 25 mm\r\n`;
    script += `GAP ${gap} mm, 0 mm\r\n`;
    script += `SPEED ${speed}\r\n`;
    script += `DENSITY ${density}\r\n`;
    script += `DIRECTION 1\r\n`;
    script += `REFERENCE 0,0\r\n`;
    script += `OFFSET 0 mm\r\n`;
    script += `SET PEEL OFF\r\n`;
    script += `SET CUTTER OFF\r\n`;

    // Flatten copies
    const flatList: Product[] = [];
    items.forEach((item) => {
      for (let c = 0; c < item.copies; c++) {
        flatList.push(item.product);
      }
    });

    // Process in pairs of 2
    for (let i = 0; i < flatList.length; i += 2) {
      const p1 = flatList[i];
      const p2 = flatList[i + 1];

      script += `CLS\r\n`;

      // Label 1 (Left Column: X = 20 + offsetX)
      const x1 = Math.max(10, 20 + offsetX);
      const y1 = Math.max(8, 8 + offsetY);
      if (config.showShopName) {
        script += `TEXT ${x1},${y1},"2",0,1,1,"${effectiveShopName.slice(0, 20)}"\r\n`;
      }
      script += `TEXT ${x1},${y1 + 22},"2",0,1,1,"${p1.name.slice(0, 20)}"\r\n`;
      script += `BARCODE ${x1},${y1 + 46},"128",48,${config.showBarcodeText ? 2 : 0},0,2,2,"${p1.barcode.trim()}"\r\n`;
      const priceY1 = y1 + 46 + 48 + (config.showBarcodeText ? 22 : 6);
      if (config.showMrp) {
        script += `TEXT ${x1},${priceY1},"2",0,1,1,"MRP:${p1.mrp}"\r\n`;
      }
      if (config.showSellingPrice) {
        script += `TEXT ${x1 + 140},${priceY1},"3",0,1,1,"Rs.${p1.sellingPrice}"\r\n`;
      }

      // Label 2 (Right Column: X = 420 + offsetX)
      if (p2) {
        const x2 = Math.max(410, 420 + offsetX);
        const y2 = y1;
        if (config.showShopName) {
          script += `TEXT ${x2},${y2},"2",0,1,1,"${effectiveShopName.slice(0, 20)}"\r\n`;
        }
        script += `TEXT ${x2},${y2 + 22},"2",0,1,1,"${p2.name.slice(0, 20)}"\r\n`;
        script += `BARCODE ${x2},${y2 + 46},"128",48,${config.showBarcodeText ? 2 : 0},0,2,2,"${p2.barcode.trim()}"\r\n`;
        const priceY2 = y2 + 46 + 48 + (config.showBarcodeText ? 22 : 6);
        if (config.showMrp) {
          script += `TEXT ${x2},${priceY2},"2",0,1,1,"MRP:${p2.mrp}"\r\n`;
        }
        if (config.showSellingPrice) {
          script += `TEXT ${x2 + 140},${priceY2},"3",0,1,1,"Rs.${p2.sellingPrice}"\r\n`;
        }
      }

      script += `PRINT 1,1\r\n`;
    }
  } else {
    // 1-UP Single Column (50x25, 40x20, 70x35)
    const dimMap = {
      '40x20': { w: 40, h: 20, barH: 30, x: 15, y: 8 },
      '50x25': { w: 50, h: 25, barH: 45, x: 20, y: 10 },
      '70x35': { w: 70, h: 35, barH: 60, x: 25, y: 15 },
      '100x25': { w: 100, h: 25, barH: 45, x: 20, y: 10 },
    };
    const currentDim = dimMap[config.labelSize] || dimMap['50x25'];

    script += `SIZE ${currentDim.w} mm, ${currentDim.h} mm\r\n`;
    script += `GAP ${gap} mm, 0 mm\r\n`;
    script += `SPEED ${speed}\r\n`;
    script += `DENSITY ${density}\r\n`;
    script += `DIRECTION 1\r\n`;
    script += `REFERENCE 0,0\r\n`;
    script += `OFFSET 0 mm\r\n`;
    script += `SET PEEL OFF\r\n`;
    script += `SET CUTTER OFF\r\n`;

    items.forEach((item) => {
      const p = item.product;
      const x = Math.max(10, currentDim.x + offsetX);
      const y = Math.max(5, currentDim.y + offsetY);

      script += `CLS\r\n`;
      if (config.showShopName) {
        script += `TEXT ${x},${y},"2",0,1,1,"${effectiveShopName.slice(0, 24)}"\r\n`;
      }
      script += `TEXT ${x},${y + 22},"2",0,1,1,"${p.name.slice(0, 22)}"\r\n`;
      script += `BARCODE ${x},${y + 46},"128",${currentDim.barH},${config.showBarcodeText ? 2 : 0},0,2,2,"${p.barcode.trim()}"\r\n`;
      const priceY = y + 46 + currentDim.barH + (config.showBarcodeText ? 22 : 6);
      if (config.showMrp) {
        script += `TEXT ${x},${priceY},"2",0,1,1,"MRP:Rs.${p.mrp}"\r\n`;
      }
      if (config.showSellingPrice) {
        script += `TEXT ${x + 130},${priceY},"3",0,1,1,"Rs.${p.sellingPrice}"\r\n`;
      }
      script += `PRINT ${item.copies},1\r\n`;
    });
  }

  return script;
}
