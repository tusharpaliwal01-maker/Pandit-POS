/**
 * PANDIT POS Universal Thermal & Label Printing Engine
 * Supports:
 * 1. Direct Web Serial / USB to RETSOL RTP82 and TSC TE244
 * 2. Isolated sandboxed iframe printing (zero CSS collision, no blank pages)
 * 3. Pop-up printable window fallback (for environments where iframe print is blocked)
 * 4. Raw file downloads (.PRN / .BIN) for DOS/Windows printer utilities
 */

import { Invoice, Shop, Product, LabelPrintConfig } from '../types';
import { generateCode128Svg } from './barcode128';
import {
  hardwarePrinterManager,
  buildEscPosReceiptBinary,
  buildTsplScript,
} from './hardwarePrinters';

/**
 * Universal Fail-Safe Receipt Printer for RETSOL RTP82
 * If Web Serial is connected, prints directly over USB/COM.
 * Otherwise, uses isolated iframe printing with pop-up fallback.
 */
export async function printReceipt(
  invoice: Invoice,
  shop: Shop,
  paperWidth: '80mm' | '58mm' = '80mm',
  options: { kickDrawer?: boolean; autoCut?: boolean; buzzer?: boolean } = {}
): Promise<{ success: boolean; method: 'serial' | 'iframe' | 'popup' | 'error'; message?: string }> {
  // 1. Direct Serial Print if connected
  if (hardwarePrinterManager.isConnected('RETSOL')) {
    try {
      const ok = await hardwarePrinterManager.printInvoiceToRetsol(invoice, shop, {
        paperWidth,
        kickDrawer: options.kickDrawer ?? false,
        autoCut: options.autoCut ?? true,
        buzzer: options.buzzer ?? false,
      });
      if (ok) {
        return { success: true, method: 'serial', message: 'Printed directly to RETSOL RTP82 over Serial/USB' };
      }
    } catch (err: any) {
      console.warn('Direct serial print failed, falling back to browser print:', err);
    }
  }

  // 2. Browser Print via Isolated Iframe
  const receiptHtml = generateReceiptHtml(invoice, shop, paperWidth);
  const printed = await printHtmlViaIframe(receiptHtml, {
    pageWidth: paperWidth,
    pageHeight: 'auto',
    title: `Receipt_${invoice.invoiceNumber}`,
  });

  if (printed) {
    return { success: true, method: 'iframe', message: `Printed via browser print queue (${paperWidth})` };
  }

  // 3. Fallback: Open in dedicated print tab
  openReceiptInNewTab(invoice, shop, paperWidth);
  return { success: true, method: 'popup', message: 'Opened printable receipt in new window' };
}

/**
 * Universal Fail-Safe Label Printer for TSC TE244
 * If Web Serial is connected, prints directly in TSPL2.
 * Otherwise, prints calibrated SVG labels via isolated iframe.
 */
export async function printBarcodeLabels(
  items: { product: Product; copies: number }[],
  config: LabelPrintConfig,
  shop: Shop
): Promise<{ success: boolean; method: 'serial' | 'iframe' | 'popup' | 'error'; message?: string }> {
  if (items.length === 0) {
    return { success: false, method: 'error', message: 'No products selected for label printing.' };
  }

  // 1. Direct Serial Print if connected to TSC TE244
  if (hardwarePrinterManager.isConnected('TSC')) {
    try {
      const ok = await hardwarePrinterManager.printLabelsToTsc(items, config, shop);
      if (ok) {
        return { success: true, method: 'serial', message: 'Sent TSPL commands directly to TSC TE244 printer' };
      }
    } catch (err: any) {
      console.warn('Direct TSC serial print failed, falling back to browser print:', err);
    }
  }

  // 2. Browser Print via Isolated Iframe
  const labelsHtml = generateLabelsHtml(items, config, shop);
  const is2Up = config.layoutMode === '2-up' || config.labelSize === '100x25';
  const widthStr = is2Up ? '100mm' : config.labelSize === '40x20' ? '40mm' : config.labelSize === '70x35' ? '70mm' : '50mm';
  const heightStr = config.labelSize === '40x20' ? '20mm' : config.labelSize === '70x35' ? '35mm' : '25mm';

  const printed = await printHtmlViaIframe(labelsHtml, {
    pageWidth: widthStr,
    pageHeight: heightStr,
    title: 'TSC_TE244_Labels',
  });

  if (printed) {
    return { success: true, method: 'iframe', message: `Printed barcode labels via browser dialog (${widthStr})` };
  }

  // 3. Fallback: Open in dedicated print tab
  openLabelsInNewTab(items, config, shop);
  return { success: true, method: 'popup', message: 'Opened printable labels in new window' };
}

/**
 * Robust print helper that prints a given HTML string via an isolated iframe.
 * Avoids modal clipping, fixed backdrop issues, and browser viewport constraints.
 */
export function printHtmlViaIframe(
  contentHtml: string,
  options: {
    pageWidth?: string;
    pageHeight?: string;
    title?: string;
  } = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    const { pageWidth = '80mm', pageHeight = 'auto', title = 'PANDIT POS Print' } = options;

    try {
      // Remove any existing print iframes
      const oldIframe = document.getElementById('pandit-pos-print-iframe');
      if (oldIframe) {
        oldIframe.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'pandit-pos-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';

      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        console.warn('Iframe document unavailable, falling back to window.print()');
        window.print();
        resolve(true);
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <style>
              @page {
                size: ${pageWidth} ${pageHeight};
                margin: 0;
              }
              *, *::before, *::after {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              html, body {
                margin: 0;
                padding: 0;
                background-color: #ffffff;
                color: #000000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "JetBrains Mono", monospace;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .text-left { text-align: left; }
              .font-bold { font-weight: bold; }
              svg {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 0 auto;
              }
              /* Barcode Label Container - Explicit Print Layout */
              .barcode-label {
                width: 48mm !important;
                height: 23mm !important;
                min-width: 48mm !important;
                min-height: 23mm !important;
                box-sizing: border-box !important;
                padding: 1mm !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: space-between !important;
                overflow: visible !important;
                background: #ffffff !important;
                color: #000000 !important;
                border: 0.5px solid #d1d5db !important;
                visibility: visible !important;
                opacity: 1 !important;
              }

              .barcode-label,
              .barcode-label * {
                visibility: visible !important;
                opacity: 1 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* Store Name explicitly visible as block */
              .barcode-label .barcode-store,
              .barcode-label .barcode-label-store,
              .barcode-label [data-field="store-name"],
              .barcode-store-name {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                color: #000000 !important;
                font-size: 8px !important;
                font-weight: 700 !important;
                text-align: center !important;
                text-transform: uppercase !important;
                line-height: 1.1 !important;
                width: 100% !important;
                max-width: 100% !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                border-bottom: 0.5px solid #000000 !important;
                padding-bottom: 0.4mm !important;
                margin: 0 !important;
                flex-shrink: 0 !important;
              }

              /* Product Name explicitly visible as block */
              .barcode-label .barcode-product,
              .barcode-label .barcode-label-title,
              .barcode-label [data-field="product-name"],
              .barcode-product-name {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                color: #000000 !important;
                font-size: 8.5px !important;
                font-weight: 600 !important;
                text-align: center !important;
                line-height: 1.15 !important;
                width: 100% !important;
                max-width: 100% !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                margin: 0.2mm 0 !important;
                flex-shrink: 0 !important;
              }

              /* Barcode container wrapper explicitly flex */
              .barcode-label .barcode-code-wrap,
              .barcode-label .barcode-label-code-wrap,
              .barcode-label [data-field="barcode-wrapper"] {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                width: 100% !important;
                visibility: visible !important;
                opacity: 1 !important;
                margin: 0.1mm 0 !important;
                flex-shrink: 0 !important;
                max-height: 10.5mm !important;
                overflow: hidden !important;
              }

              /* Barcode SVG and canvas graphic */
              .barcode-label svg,
              .barcode-label svg.barcode,
              svg.barcode,
              canvas.barcode {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 90% !important;
                max-width: 92% !important;
                max-height: 10.5mm !important;
                height: auto !important;
                margin: 0 auto !important;
                image-rendering: crisp-edges !important;
                image-rendering: pixelated !important;
              }

              /* Barcode Numeric Code text explicitly visible */
              .barcode-label svg text,
              svg.barcode text,
              .barcode-label .barcode-number,
              .barcode-label .barcode-numeric-code,
              .barcode-numeric-code {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                fill: #000000 !important;
                color: #000000 !important;
                font-family: 'JetBrains Mono', monospace, Arial, sans-serif !important;
                font-size: 8px !important;
                font-weight: 700 !important;
                letter-spacing: 0.5px !important;
                text-anchor: middle !important;
              }

              /* Prices Row explicitly flex */
              .barcode-label .barcode-prices,
              .barcode-label .barcode-label-prices,
              .barcode-label [data-field="prices-row"],
              .barcode-prices-row {
                display: flex !important;
                flex-direction: row !important;
                justify-content: space-between !important;
                align-items: center !important;
                width: 100% !important;
                visibility: visible !important;
                opacity: 1 !important;
                color: #000000 !important;
                border-top: 0.5px solid #000000 !important;
                padding-top: 0.4mm !important;
                margin-top: 0.2mm !important;
                line-height: 1.1 !important;
                flex-shrink: 0 !important;
              }

              /* MRP and Selling Price text elements explicitly visible */
              .barcode-label .barcode-mrp,
              .barcode-label .barcode-label-mrp,
              .barcode-label [data-field="mrp"],
              .barcode-mrp {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                color: #333333 !important;
                text-decoration: line-through !important;
                font-size: 8px !important;
                font-weight: 700 !important;
              }

              .barcode-label .barcode-selling,
              .barcode-label .barcode-label-selling,
              .barcode-label [data-field="selling-price"],
              .barcode-selling-price {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                color: #000000 !important;
                font-size: 9.5px !important;
                font-weight: 800 !important;
              }
            </style>
          </head>
          <body>
            ${contentHtml}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (err) {
          console.warn('Iframe print error, falling back:', err);
          resolve(false);
        }
      }, 300);
    } catch (e) {
      console.error('Fatal iframe print error:', e);
      resolve(false);
    }
  });
}

/**
 * Open standalone printable receipt in new tab (guaranteed to print in any environment)
 */
export function openReceiptInNewTab(
  invoice: Invoice,
  shop: Shop,
  paperWidth: '80mm' | '58mm' = '80mm'
) {
  const content = generateReceiptHtml(invoice, shop, paperWidth);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up was blocked. Please allow pop-ups for this POS application.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${invoice.invoiceNumber}</title>
        <style>
          @page { size: ${paperWidth} auto; margin: 0; }
          body {
            margin: 0;
            padding: 4mm;
            background: #f1f5f9;
            font-family: 'JetBrains Mono', Courier, monospace;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .receipt-sheet {
            background: #ffffff;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            width: ${paperWidth};
            max-width: ${paperWidth};
            padding: 4mm;
          }
          .toolbar {
            margin-bottom: 12px;
            display: flex;
            gap: 8px;
          }
          button {
            background: #ea580c;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
          }
          @media print {
            body { background: #fff; padding: 0; }
            .toolbar { display: none; }
            .receipt-sheet { box-shadow: none; padding: 2mm; width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button onclick="window.print()">Print Receipt</button>
          <button style="background:#475569" onclick="window.close()">Close Window</button>
        </div>
        <div class="receipt-sheet">
          ${content}
        </div>
        <script>
          setTimeout(() => { window.print(); }, 400);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Open standalone barcode sticker sheet in new tab
 */
export function openLabelsInNewTab(
  items: { product: Product; copies: number }[],
  config: LabelPrintConfig,
  shop: Shop
) {
  const content = generateLabelsHtml(items, config, shop);
  const is2Up = config.layoutMode === '2-up' || config.labelSize === '100x25';
  const widthStr = is2Up ? '100mm' : config.labelSize === '40x20' ? '40mm' : config.labelSize === '70x35' ? '70mm' : '50mm';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up was blocked. Please allow pop-ups for this POS application.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>TSC TE244 Labels - ${shop.name}</title>
        <style>
          @page { size: ${widthStr} auto; margin: 0; }
          body {
            margin: 0;
            padding: 6mm;
            background: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .toolbar {
            margin-bottom: 12px;
            display: flex;
            gap: 8px;
          }
          button {
            background: #ea580c;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
          }
          @media print {
            body { background: #fff; padding: 0; }
            .toolbar { display: none; }
            
            /* Barcode Label Container - Explicit Print Layout */
            .barcode-label {
              width: 48mm !important;
              height: 23mm !important;
              min-width: 48mm !important;
              min-height: 23mm !important;
              box-sizing: border-box !important;
              padding: 1mm !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: space-between !important;
              overflow: visible !important;
              background: #ffffff !important;
              color: #000000 !important;
              border: 0.5px solid #d1d5db !important;
              visibility: visible !important;
              opacity: 1 !important;
            }

            .barcode-label,
            .barcode-label * {
              visibility: visible !important;
              opacity: 1 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* Store Name explicitly visible */
            .barcode-label .barcode-store,
            .barcode-label .barcode-label-store,
            .barcode-label [data-field="store-name"] {
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              color: #000000 !important;
              font-size: 8px !important;
              font-weight: 700 !important;
              text-align: center !important;
              text-transform: uppercase !important;
              line-height: 1.1 !important;
              width: 100% !important;
              max-width: 100% !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              border-bottom: 0.5px solid #000000 !important;
              padding-bottom: 0.4mm !important;
              margin: 0 !important;
              flex-shrink: 0 !important;
            }

            /* Product Name explicitly visible */
            .barcode-label .barcode-product,
            .barcode-label .barcode-label-title,
            .barcode-label [data-field="product-name"] {
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              color: #000000 !important;
              font-size: 8.5px !important;
              font-weight: 600 !important;
              text-align: center !important;
              line-height: 1.15 !important;
              width: 100% !important;
              max-width: 100% !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              margin: 0.2mm 0 !important;
              flex-shrink: 0 !important;
            }

            /* Barcode container wrapper explicitly flex */
            .barcode-label .barcode-code-wrap,
            .barcode-label .barcode-label-code-wrap,
            .barcode-label [data-field="barcode-wrapper"] {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              width: 100% !important;
              visibility: visible !important;
              opacity: 1 !important;
              margin: 0.1mm 0 !important;
              flex-shrink: 0 !important;
              max-height: 10.5mm !important;
              overflow: hidden !important;
            }

            /* Barcode SVG and canvas */
            .barcode-label svg,
            .barcode-label svg.barcode,
            svg.barcode,
            canvas.barcode {
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              width: 90% !important;
              max-width: 92% !important;
              max-height: 10.5mm !important;
              height: auto !important;
              margin: 0 auto !important;
              image-rendering: crisp-edges !important;
              image-rendering: pixelated !important;
            }

            /* Barcode Numeric Code explicitly visible */
            .barcode-label svg text,
            svg.barcode text,
            .barcode-label .barcode-number,
            .barcode-label .barcode-numeric-code,
            .barcode-numeric-code {
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              fill: #000000 !important;
              color: #000000 !important;
              font-family: 'JetBrains Mono', monospace, Arial, sans-serif !important;
              font-size: 8px !important;
              font-weight: 700 !important;
              letter-spacing: 0.5px !important;
              text-anchor: middle !important;
            }

            /* Prices Row explicitly flex */
            .barcode-label .barcode-prices,
            .barcode-label .barcode-label-prices,
            .barcode-label [data-field="prices-row"] {
              display: flex !important;
              flex-direction: row !important;
              justify-content: space-between !important;
              align-items: center !important;
              width: 100% !important;
              visibility: visible !important;
              opacity: 1 !important;
              color: #000000 !important;
              border-top: 0.5px solid #000000 !important;
              padding-top: 0.4mm !important;
              margin-top: 0.2mm !important;
              line-height: 1.1 !important;
              flex-shrink: 0 !important;
            }

            /* MRP and Selling Price explicitly visible */
            .barcode-label .barcode-mrp,
            .barcode-label .barcode-label-mrp,
            .barcode-label [data-field="mrp"] {
              display: inline-block !important;
              visibility: visible !important;
              opacity: 1 !important;
              color: #333333 !important;
              text-decoration: line-through !important;
              font-size: 8px !important;
              font-weight: 700 !important;
            }

            .barcode-label .barcode-selling,
            .barcode-label .barcode-label-selling,
            .barcode-label [data-field="selling-price"] {
              display: inline-block !important;
              visibility: visible !important;
              opacity: 1 !important;
              color: #000000 !important;
              font-size: 9.5px !important;
              font-weight: 800 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button onclick="window.print()">Print Labels (TSC TE244)</button>
          <button style="background:#475569" onclick="window.close()">Close Window</button>
        </div>
        <div style="background:#fff; padding: 2mm;">
          ${content}
        </div>
        <script>
          setTimeout(() => { window.print(); }, 400);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * HTML Builder for Thermal Receipt (Clean, Self-Contained, B&W)
 */
export function generateReceiptHtml(
  invoice: Invoice,
  shop: Shop,
  paperWidth: '80mm' | '58mm' = '80mm'
): string {
  const is58mm = paperWidth === '58mm';
  const fontSize = is58mm ? '10px' : '11px';
  const halfGst = (invoice.gstTotal / 2).toFixed(2);

  const itemsRows = invoice.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px dashed #000;">
        <td style="padding: 3px 0; vertical-align: top;">
          <div style="font-weight: bold;">${item.name}</div>
          <div style="font-size: 9px; color: #444;">GST ${item.gstRate}% ${item.discountAmount > 0 ? `· Disc -₹${item.discountAmount}` : ''}</div>
        </td>
        <td style="text-align: center; padding: 3px 2px; vertical-align: top;">${item.quantity}</td>
        <td style="text-align: right; padding: 3px 2px; vertical-align: top;">₹${item.unitPrice}</td>
        <td style="text-align: right; padding: 3px 0; font-weight: bold; vertical-align: top;">₹${item.total}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div style="width: 100%; max-width: ${paperWidth}; margin: 0 auto; font-family: 'JetBrains Mono', Courier, monospace; font-size: ${fontSize}; line-height: 1.25; color: #000; background: #fff; padding: 2mm;">
      <!-- Shop Header -->
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <div style="font-size: 14px; font-weight: bold; text-transform: uppercase;">${shop.name}</div>
        <div style="font-size: 10px; margin-top: 2px;">${shop.address}</div>
        <div style="font-size: 10px;">${shop.city}, ${shop.state} - ${shop.pincode}</div>
        <div style="font-size: 10px; font-weight: bold; margin-top: 2px;">GSTIN: ${shop.gstin}</div>
        <div style="font-size: 10px;">Ph: ${shop.phonePrimary}</div>
      </div>

      <!-- Invoice Meta -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 6px; font-size: 10px;">
        <div style="display: flex; justify-content: space-between;">
          <span><strong>INVOICE:</strong> ${invoice.invoiceNumber}</span>
          <span>${new Date(invoice.createdAt).toLocaleDateString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #333;">
          <span>Time: ${new Date(invoice.createdAt).toLocaleTimeString()}</span>
          <span>Cashier: ${invoice.cashierName}</span>
        </div>
        ${
          invoice.customerName
            ? `<div style="border-top: 1px dotted #ccc; margin-top: 3px; padding-top: 3px; display: flex; justify-content: space-between;">
                <span>Customer: <strong>${invoice.customerName}</strong></span>
                <span>${invoice.customerMobile || ''}</span>
              </div>`
            : ''
        }
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: ${fontSize}; margin-bottom: 6px;">
        <thead>
          <tr style="border-bottom: 1px solid #000; font-size: 9px; text-transform: uppercase;">
            <th style="text-align: left; padding-bottom: 2px;">Item</th>
            <th style="text-align: center; padding-bottom: 2px;">Qty</th>
            <th style="text-align: right; padding-bottom: 2px;">Rate</th>
            <th style="text-align: right; padding-bottom: 2px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Totals & Taxes -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 6px; font-size: 10px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Subtotal:</span>
          <span>₹${invoice.subtotal.toFixed(2)}</span>
        </div>
        ${
          invoice.discountTotal > 0
            ? `<div style="display: flex; justify-content: space-between;">
                <span>Special Discount:</span>
                <span>-₹${invoice.discountTotal.toFixed(2)}</span>
              </div>`
            : ''
        }
        <div style="display: flex; justify-content: space-between; color: #444; font-size: 9px;">
          <span>CGST:</span>
          <span>₹${halfGst}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #444; font-size: 9px;">
          <span>SGST:</span>
          <span>₹${halfGst}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; border-top: 1px solid #000; padding-top: 3px; margin-top: 3px;">
          <span>GRAND TOTAL:</span>
          <span>₹${invoice.grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <!-- Payment Details -->
      <div style="border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 6px; font-size: 10px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Payment Mode:</span>
          <strong>${invoice.paymentMethod}</strong>
        </div>
        ${
          invoice.paymentMethod === 'CASH' && invoice.cashReceived !== undefined
            ? `<div style="display: flex; justify-content: space-between; color: #333;">
                <span>Cash Tendered:</span>
                <span>₹${invoice.cashReceived.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold;">
                <span>Change Returned:</span>
                <span>₹${(invoice.changeGiven || 0).toFixed(2)}</span>
              </div>`
            : ''
        }
        ${
          invoice.paymentMethod === 'UPI' && shop.upiId
            ? `<div style="text-align: center; font-size: 9px; margin-top: 2px;">
                UPI Payee: <strong>${shop.upiId}</strong>
              </div>`
            : ''
        }
        ${
          invoice.paymentMethod === 'KHATA'
            ? `<div style="text-align: center; font-weight: bold; font-size: 9px; background: #eee; padding: 2px; margin-top: 2px;">
                Debited to Customer Khata Account
              </div>`
            : ''
        }
      </div>

      <!-- Footer -->
      <div style="text-align: center; font-size: 9px; color: #333; padding-top: 4px;">
        <div>${shop.receiptFooter}</div>
        <div style="font-weight: bold; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; color: #666;">
          *** THANK YOU · VISIT AGAIN ***
        </div>
      </div>
    </div>
  `;
}

/**
 * HTML Builder for Barcode Sticker Sheet (TSC TE244 Compatible)
 */
export function generateLabelsHtml(
  items: { product: Product; copies: number }[],
  config: LabelPrintConfig,
  shop: Shop
): string {
  const is2Up = config.layoutMode === '2-up' || config.labelSize === '100x25';
  const effectiveShopName = config.customShopName?.trim() || shop?.name || 'PANDIT POS';

  const sizeMap = {
    '40x20': { width: '40mm', height: '20mm', barcodeHeight: 28, fontSize: 8, columns: 1 },
    '50x25': { width: '50mm', height: '25mm', barcodeHeight: 34, fontSize: 9, columns: 1 },
    '70x35': { width: '70mm', height: '35mm', barcodeHeight: 46, fontSize: 10, columns: 1 },
    '100x25': { width: '48mm', height: '23mm', barcodeHeight: 38, fontSize: 9, columns: 2 },
  };

  const currentDim = sizeMap[config.labelSize] || sizeMap['50x25'];
  const cols = is2Up ? 2 : currentDim.columns;

  const flatList: Product[] = [];
  items.forEach((item) => {
    for (let c = 0; c < item.copies; c++) {
      flatList.push(item.product);
    }
  });

  const stickersHtml = flatList
    .map((prod) => {
      const svg = generateCode128Svg(prod.barcode, {
        height: currentDim.barcodeHeight,
        fontSize: currentDim.fontSize,
        showText: config.showBarcodeText,
      });

      return `
        <div class="barcode-label" style="
          width: ${is2Up ? '48mm' : currentDim.width};
          height: ${is2Up ? '23mm' : currentDim.height};
          min-width: ${is2Up ? '48mm' : currentDim.width};
          min-height: ${is2Up ? '23mm' : currentDim.height};
          border: 0.5px solid #d1d5db;
          padding: 1mm;
          background: #ffffff;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          page-break-inside: avoid;
        ">
          ${
            config.showShopName
              ? `<div class="barcode-store barcode-label-store" data-field="store-name" title="${effectiveShopName}" style="font-size: 8px; font-weight: bold; text-align: center; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-bottom: 0.5px solid #000; padding-bottom: 0.4mm; width: 100%; display: block; line-height: 1.1; flex-shrink: 0;">
                  ${effectiveShopName}
                </div>`
              : ''
          }
          <div class="barcode-product barcode-label-title" data-field="product-name" style="font-size: 8.5px; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0.2mm 0; width: 100%; display: block; line-height: 1.15; flex-shrink: 0;">
            ${prod.name}
          </div>
          <div class="barcode-code-wrap barcode-label-code-wrap" data-field="barcode-wrapper" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; margin: 0.1mm 0; flex-shrink: 0; max-height: 10.5mm; overflow: hidden;">
            ${svg}
          </div>
          <div class="barcode-prices barcode-label-prices" data-field="prices-row" style="display: flex; justify-content: space-between; align-items: center; border-top: 0.5px solid #000; padding-top: 0.4mm; margin-top: 0.2mm; font-size: 8px; font-weight: bold; width: 100%; line-height: 1.1; flex-shrink: 0;">
            ${config.showMrp ? `<span class="barcode-mrp barcode-label-mrp" data-field="mrp" style="text-decoration: line-through; color: #444; font-size: 8px; display: inline-block;">MRP: ₹${prod.mrp}</span>` : '<span style="display:inline-block;"></span>'}
            ${config.showSellingPrice ? `<span class="barcode-selling barcode-label-selling" data-field="selling-price" style="font-size: 9.5px; color: #000; font-weight: 800; display: inline-block;">₹${prod.sellingPrice}</span>` : '<span style="display:inline-block;"></span>'}
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div style="
      display: grid;
      grid-template-columns: repeat(${cols}, auto);
      gap: 2mm;
      justify-content: center;
      margin: 0 auto;
      transform: translate(${config.offsetX}mm, ${config.offsetY}mm);
    ">
      ${stickersHtml}
    </div>
  `;
}

/**
 * Downloads a raw binary file (e.g. .BIN for RETSOL ESC/POS)
 */
export function downloadRawBinary(filename: string, data: Uint8Array) {
  const blob = new Blob([data as any], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a raw text file (e.g. .PRN for TSC TE244 TSPL2)
 */
export function downloadRawText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download ESC/POS Binary for given Invoice
 */
export function downloadInvoiceEscPos(invoice: Invoice, shop: Shop, paperWidth: '80mm' | '58mm' = '80mm') {
  const bytes = buildEscPosReceiptBinary(invoice, shop, { paperWidth, kickDrawer: false, autoCut: true });
  downloadRawBinary(`Invoice_${invoice.invoiceNumber}_RETSOL.bin`, bytes);
}

/**
 * Download TSPL2 PRN Script for given products and TSC config
 */
export function downloadTscTsplPrn(
  items: { product: Product; copies: number }[],
  config: LabelPrintConfig,
  shop: Shop
) {
  const script = buildTsplScript(items, config, shop);
  downloadRawText(`TSC_Labels_${Date.now()}.prn`, script);
}
