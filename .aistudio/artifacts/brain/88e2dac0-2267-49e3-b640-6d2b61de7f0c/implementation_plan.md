# PANDIT POS — Multi-Shop Retail Point of Sale & Inventory Management

PANDIT POS is a multi-shop retail point-of-sale, inventory management, customer credit ledger (Khata), thermal receipting, and barcode labeling system designed for fast-paced retail operations (fireworks, FMCG, and general retail), featuring hardware-first peripheral workflows and Gemini-powered supplier bill OCR.

## User Review & Critical Decisions

> [!IMPORTANT]
> The clarifying choices confirmed for your retail setup have been locked into this architecture plan:
> - **Default Catalog**: Pre-seeded with a specialized **Fireworks & Celebrations Catalog** (sparklers, floral fountains, ground chakras, rockets, multi-shot aerial cakes, and gift boxes) with standard Indian GST slabs (18% / 28%), batch numbers, and safety guidance.
> - **Supplier Bill OCR Extraction**: Integrated with an **Interactive Review & Approval Table** to preview parsed supplier invoices (PDF/JPEG/PNG), match items by barcode/name against existing inventory, and quick-add newly discovered products before executing batch stock additions.
> - **Thermal Receipt Width**: Defaults to **80mm standard thermal roll format** (with seamless 58mm compact switch), calibrated for Windows/driver queues like RETSOL RTP82 with WhatsApp itemized bill dispatch.

- **Confirmed Decision 1**: Pre-seeded fireworks retail product catalog with active stock, MRP, purchase rates, and GST rates.
- **Confirmed Decision 2**: Gemini multimodal vision-driven supplier invoice parser with an interactive mapping review grid.
- **Confirmed Decision 3**: Dual thermal receipt widths (80mm / 58mm) and separate CODE128 barcode label formatting (40×20mm, 50×25mm, 70×35mm for TSC TE244).
- **Default Multi-Shop Hierarchy**: SUPERMASTER platform overview with multi-tenant shop isolation, Admin shop administration, and Staff cashier permissions.

---

## 1. Overview & Core Concept

- **What It Does**: PANDIT POS empowers retail shop owners and cashiers to execute sub-second barcode checkout, manage multi-shop inventories, print thermal customer receipts and CODE128 shelf barcode stickers, track customer credit ledgers (Khata) with balance enforcement, and ingest supplier bills automatically via Gemini multimodal OCR.
- **Target Audience / Persona**:
  - *Cashiers / Staff*: High-throughput keyboard & barcode-wedge checkout, instant UPI QR/Cash change calculation, and customer Khata assignment.
  - *Store Managers / Admins*: Real-time stock audit, bulk OCR supplier restocking, customer debt collection, and profit/GST reports.
  - *Supermaster Platform Admins*: Creation and oversight of independent shop branches, admin account provisioning, and platform-wide metrics.
- **Key Value**: Replaces clumsy disjointed apps with a single, lightning-fast retail suite that cleanly separates label printing from receipt printing, prevents stock overselling, and automates supplier bill entry.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Cashier Speed Checkout (POS Billing)**:
   - Cashier scans product barcode with handheld USB/Bluetooth scanner (auto-Enter adds item immediately).
   - Instant search fallback (fuzzy name or category).
   - Real-time cart calculation (per-item unit discount, inclusive/exclusive GST breakdown, stock ceiling warning).
   - One-click payment selection: **Cash** (with live change breakdown), **UPI** (instant dynamic QR & UPI ID), or **Khata** (customer credit ledger with balance verification).
   - Checkout triggers printable thermal receipt modal and pre-filled WhatsApp share link (`wa.me`).
2. **Barcode Label Generation (TSC TE244 Workflow)**:
   - Dedicated label module distinct from receipt printing.
   - Selection of products and copies; visual preview of CODE128 barcodes at 40×20mm, 50×25mm, and 70×35mm sizes.
   - Horizontal and vertical print offset calibration for 100×25mm continuous dual-label media.
3. **Supplier Purchase Ingestion (Gemini OCR Bill Parser)**:
   - Drag-and-drop supplier invoice photo or PDF.
   - Gemini multimodal vision model (`gemini-3.8-flash`) extracts vendor name, invoice date, item line items, quantities, purchase rates, MRP, and GST rates.
   - Interactive review table matches items to existing catalog via barcode or name similarity; unmatched items can be created with one click.
   - Confirmation atomically adds stock and logs purchase audit.
4. **Customer Khata Ledger**:
   - Customer account overview with total purchases, available credit limit, and current outstanding balance.
   - Ledger timeline of credit sales, manual adjustments, and payments.
   - Safe payment collection modal (capped strictly to the outstanding balance).
5. **Shop Administration & Reports**:
   - Date-filtered analytics (Today, 7-day, 30-day, Custom) with revenue, bill count, average basket size, top-selling fireworks, and GST summary.
   - Multi-tenant shop settings: Shop brand name, GSTIN, address, contact numbers, UPI ID, and receipt footer message.

### Visual Identity & Theme
- **Aesthetic Direction**: High-efficiency retail dashboard. Utilitarian, tactile, and clear under bright shop counter lighting.
- **Color Palette**:
  - *Dominant Canvas (60%)*: Crisp light slate neutral canvas (`#F8FAFC` / `#FFFFFF`) with dark charcoal shell (`#0F172A`).
  - *Structural Surfaces (30%)*: Deep charcoal sidebar (`#1E293B`), clean bordered cards with hairline dividers (`#E2E8F0`), and white transaction panels.
  - *Accent & Intent (10%)*: Vibrant Pandit Flame Orange (`#EA580C` / `#F97316`) for primary checkout actions, active tabs, and key focus rings; Emerald (`#16A34A`) for cash/paid states; Amber (`#D97706`) for Khata credit flags.
- **Typography**:
  - Display & Headings: `Plus Jakarta Sans` for clean, professional hierarchy.
  - Body & Form Controls: `DM Sans` / `Plus Jakarta Sans` for high legibility at 12–14px.
  - Financials & Barcodes: `JetBrains Mono` / `tabular-nums` for vertically aligned currency, quantities, and GST rates.
- **Peripheral Device Separation**:
  - *Handheld Scanner*: Dedicated scanner input trap with Enter-key event listener and diagnostic HID tester.
  - *Receipt Printer*: Native browser print dialog tailored for 80mm/58mm rolls (RETSOL RTP82 queue guidance).
  - *TSC Label Printer*: Separate calibrated page layout with zero browser margins and physical label size bounds.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Explicit Separation of Peripherals**:
  - *Chosen Approach*: Keep Handheld Barcode Scanner, Thermal Receipt Printer, and TSC Barcode Label Printer as three strictly separate hardware modules with dedicated setup guides and test tools.
  - *Why*: In real retail environments, conflating label printer queues with receipt printers causes misaligned labels and corrupted receipt paper rolls.
- **Decision 2: Transactional Integrity for Sales & Stock**:
  - *Chosen Approach*: Atomic stock decrement and Khata ledger snapshotting. Product historical sales record price snapshots so future catalog updates never mutate historical receipts.
  - *Why*: Eliminates race conditions, prevents negative inventory, and preserves financial auditability.
- **Decision 3: Server-Side Gemini Multimodal OCR**:
  - *Chosen Approach*: Server-side endpoint utilizing `gemini-3.8-flash` with structured JSON schema (`responseSchema`) to parse supplier invoice images into clean row data, paired with a client-side review and matching grid.
  - *Why*: Maximizes accuracy on Indian invoice layouts (HSN codes, CGST/SGST, batch numbers) while giving the store manager full override control before database commit.
- **Decision 4: Multi-Tenant Role Isolation**:
  - *Chosen Approach*: Strict shop scoping across all data stores. SUPERMASTER creates shops and shop-admins; ADMIN manages shop settings, staff, and inventory; STAFF cashiers are restricted to POS billing and Khata lookups.

---

## 4. Technical Architecture & Data Strategy

### System & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PANDIT POS Client App                           │
├───────────────────┬────────────────────────────────────────────────────┤
│ Left Navigation   │ Header: Shop Switcher, Role Badge, Device Status   │
│ - Dashboard       ├────────────────────────────────────────────────────┤
│ - POS Billing     │ Active Workspace View:                             │
│ - Inventory       │  ┌─────────────────────────┬────────────────────┐  │
│ - Barcode Labels  │  │ POS Catalog & Barcode   │ Real-Time Cart     │  │
│ - Khata Ledger    │  │ Scan Input Wedge Trap   │ & Customer Link    │  │
│ - Invoices List   │  ├─────────────────────────┴────────────────────┤  │
│ - Supplier OCR    │  │ Checkout Drawer: Cash / UPI QR / Khata       │  │
│ - Reports & GST   │  └──────────────────────────────────────────────┘  │
│ - Staff Mgmt      │ Modals: Receipt (80/58mm), TSC Labels, Scanner Test│
│ - Shop Settings   │ Gemini Assistant Drawer: Inventory & Sales queries │
└───────────────────┴────────────────────────────────────────────────────┘
                                   │
                    HTTP / JSON API & Gemini SDK
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Server API & Data Services                           │
│  - /api/pos/checkout: Atomic stock validation, receipt snapshot        │
│  - /api/gemini/parse-bill: Multimodal OCR via gemini-3.8-flash         │
│  - /api/gemini/assistant: Shop intelligence & stock alerts             │
│  - Shop-Scoped Data Layer: Products, Invoices, Khata, Users, Audit     │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Entities & Relationships
- **Shop**: `id`, `name`, `gstin`, `address`, `phone`, `email`, `upiId`, `receiptFooter`, `createdAt`.
- **User**: `id`, `shopId`, `username`, `mobile`, `passwordHash`, `role` (`SUPERMASTER` | `ADMIN` | `STAFF`), `active`.
- **Product**: `id`, `shopId`, `name`, `barcode`, `category`, `purchasePrice`, `mrp`, `sellingPrice`, `gstRate`, `stockQty`, `lowStockThreshold`, `unit`, `active`.
- **Customer**: `id`, `shopId`, `name`, `mobile`, `address`, `email`, `totalPurchases`, `khataBalance`.
- **Invoice & InvoiceItem**: `id`, `shopId`, `invoiceNumber`, `customerId`, `userId`, `subtotal`, `discountTotal`, `gstTotal`, `grandTotal`, `paymentMethod` (`CASH` | `UPI` | `KHATA`), `cashReceived`, `changeGiven`, `status`, `items: [{productId, name, barcode, qty, unitPrice, discount, gstRate, total}]`.
- **KhataEntry**: `id`, `shopId`, `customerId`, `invoiceId`, `type` (`CREDIT_SALE` | `PAYMENT_RECEIVED` | `ADJUSTMENT`), `amount`, `balanceAfter`, `notes`, `createdAt`.

### Peripheral Hardware Workflows
1. **Barcode Wedge Scanner**:
   - Background keydown listener captures continuous keystrokes ending in `Enter`.
   - Real-time diagnostic monitor shows raw scanner characters and latency.
2. **Thermal Receipt Printing**:
   - Custom `@media print` CSS handles 80mm and 58mm paper rolls with zero page margins, itemized tabular breakdown, and GST summary.
   - Thermal test receipt prints shop details, sample items, and UPI QR code.
3. **TSC TE244 Barcode Label Printing**:
   - Generates exact CODE128 SVG barcodes with product name, MRP, selling price, and shop name.
   - Configurable grid layout for 100×25mm 2-across label rolls with fine alignment offsets.

---

## 5. Verification & Testing Plan

1. **Compilation & Linting**: Run `compile_applet` and verify zero TypeScript or bundle issues.
2. **Barcode Scanner Operation**: Test HID barcode scanner wedge typing and camera scanner fallback.
3. **Checkout Validation**: Test Cash checkout with change, UPI checkout, and Khata checkout with balance enforcement and stock deduction.
4. **Receipt & Label Verification**: Validate thermal receipt rendering for 80mm and 58mm widths, and preview CODE128 labels for TSC TE244.
5. **Gemini Bill OCR**: Test supplier bill upload with sample invoices, verifying accurate line-item extraction and inventory stock updates.
6. **Multi-Role Scoping**: Switch between SUPERMASTER, ADMIN, and STAFF to verify permission boundaries.
