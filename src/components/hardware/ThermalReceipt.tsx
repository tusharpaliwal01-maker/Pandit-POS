import React from 'react';
import { Invoice, Shop } from '../../types';

interface ThermalReceiptProps {
  invoice: Invoice;
  shop: Shop;
  paperWidth?: '80mm' | '58mm';
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  invoice,
  shop,
  paperWidth = '80mm',
}) => {
  const is58mm = paperWidth === '58mm';
  const widthClass = is58mm ? 'max-w-[58mm] text-[10px]' : 'max-w-[80mm] text-xs';

  // Calculate CGST and SGST splits
  const halfGst = invoice.gstTotal / 2;

  return (
    <div
      className={`print-area-receipt mx-auto bg-white text-black p-2 font-mono leading-tight ${widthClass}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Header */}
      <div className="text-center pb-2 border-b border-black border-dashed">
        <h2 className="font-bold text-sm tracking-tight uppercase">{shop.name}</h2>
        <p className="text-[10px] text-gray-700 leading-tight mt-0.5">{shop.address}</p>
        <p className="text-[10px] text-gray-700">
          {shop.city}, {shop.state} - {shop.pincode}
        </p>
        <p className="text-[10px] font-semibold mt-0.5">GSTIN: {shop.gstin}</p>
        <p className="text-[10px]">Ph: {shop.phonePrimary}</p>
      </div>

      {/* Invoice Meta */}
      <div className="py-1.5 border-b border-black border-dashed text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span className="font-bold">INVOICE: {invoice.invoiceNumber}</span>
          <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>Time: {new Date(invoice.createdAt).toLocaleTimeString()}</span>
          <span>Cashier: {invoice.cashierName}</span>
        </div>
        {invoice.customerName && (
          <div className="flex justify-between border-t border-black/30 pt-0.5 mt-0.5">
            <span>Customer: <strong>{invoice.customerName}</strong></span>
            <span>{invoice.customerMobile || ''}</span>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="py-1.5 border-b border-black border-dashed">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-black text-[9px] uppercase">
              <th className="py-0.5">Item</th>
              <th className="text-center py-0.5">Qty</th>
              <th className="text-right py-0.5">Rate</th>
              <th className="text-right py-0.5">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/20 text-[10px]">
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="align-top">
                <td className="py-1 pr-1">
                  <div className="font-semibold leading-tight">{item.name}</div>
                  <div className="text-[9px] text-gray-600">
                    GST {item.gstRate}% {item.discountAmount > 0 ? `· Disc -₹${item.discountAmount}` : ''}
                  </div>
                </td>
                <td className="text-center py-1 font-semibold">{item.quantity}</td>
                <td className="text-right py-1">₹{item.unitPrice}</td>
                <td className="text-right py-1 font-semibold">₹{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals & Tax Breakup */}
      <div className="py-1.5 border-b border-black border-dashed space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₹{invoice.subtotal.toFixed(2)}</span>
        </div>
        {invoice.discountTotal > 0 && (
          <div className="flex justify-between text-gray-800">
            <span>Special Discount:</span>
            <span>-₹{invoice.discountTotal.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-700 text-[9px]">
          <span>CGST:</span>
          <span>₹{halfGst.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-700 text-[9px]">
          <span>SGST:</span>
          <span>₹{halfGst.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
          <span>GRAND TOTAL:</span>
          <span>₹{invoice.grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Details */}
      <div className="py-1.5 border-b border-black border-dashed text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span>Payment Mode:</span>
          <span className="font-bold">{invoice.paymentMethod}</span>
        </div>
        {invoice.paymentMethod === 'CASH' && invoice.cashReceived !== undefined && (
          <>
            <div className="flex justify-between text-gray-700">
              <span>Cash Tendered:</span>
              <span>₹{invoice.cashReceived.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Change Returned:</span>
              <span>₹{(invoice.changeGiven || 0).toFixed(2)}</span>
            </div>
          </>
        )}
        {invoice.paymentMethod === 'UPI' && shop.upiId && (
          <div className="text-center pt-1 text-[9px] text-gray-700">
            UPI Payee ID: <strong>{shop.upiId}</strong>
          </div>
        )}
        {invoice.paymentMethod === 'KHATA' && (
          <div className="bg-gray-100 p-1 text-center font-semibold text-[9px] mt-0.5">
            Debited to Customer Khata Account
          </div>
        )}
      </div>

      {/* Footer Text */}
      <div className="pt-2 text-center text-[9px] leading-tight text-gray-800 space-y-1">
        <p>{shop.receiptFooter}</p>
        <p className="font-semibold text-[8px] uppercase tracking-widest text-gray-500">
          *** THANK YOU · VISIT AGAIN ***
        </p>
      </div>
    </div>
  );
};
