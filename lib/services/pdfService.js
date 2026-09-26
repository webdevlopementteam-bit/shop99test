import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// PDFs are written straight into public/uploads/ so Next.js serves them
// statically at /uploads/<file> with zero extra route code, same as every
// other upload in this app (see lib/upload.js).
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function orderPlain(order) {
  if (!order) return {};
  return typeof order.get === "function" ? order.get({ plain: true }) : order;
}

function money(n) {
  if (n == null || n === "") return "—";
  const v = Number(n);
  if (Number.isNaN(v)) return String(n);
  return `₹${v.toFixed(2)}`;
}

function shortDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/** Phone, email, full address from placed order (snapshot). */
function deliveryContactLines(o) {
  if (!o) return [];

  const lines = [];

  const phone = o?.phone ? String(o.phone).trim() : "";
  const email = o?.email ? String(o.email).trim() : "";

  if (phone) lines.push(`Phone: ${phone}`);
  if (email) lines.push(`Email: ${email}`);

  const addrParts = [o?.address, o?.city, o?.state, o?.postcode]
    .map((x) => (x ? String(x).trim() : ""))
    .filter(Boolean);

  if (addrParts.length) {
    lines.push(addrParts.join(", "));
  }

  return lines;
}

/** Human-readable variant line for invoice/label (handles nested JSON from checkout). */
function formatVariantLeaf(v) {
  if (v == null) return "";
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return String(v);
  if (Array.isArray(v)) {
    return v
      .map((x) => formatVariantLeaf(x))
      .filter(Boolean)
      .join(", ");
  }
  if (t === "object") {
    return Object.entries(v)
      .map(([k, val]) => {
        const inner = formatVariantLeaf(val);
        return inner ? `${k}: ${inner}` : k;
      })
      .filter(Boolean)
      .join(" · ");
  }
  return String(v);
}

function attributesText(raw) {
  if (raw == null || raw === "") return "—";

  let data = raw;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    data = raw;
  } else {
    const s = String(raw).trim();
    if (!s) return "—";
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        data = JSON.parse(s);
      } catch {
        return s;
      }
    } else {
      return s;
    }
  }

  if (Array.isArray(data)) {
    const line = formatVariantLeaf(data);
    return line || "—";
  }

  if (data && typeof data === "object") {
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      if (v == null || v === "") continue;
      const label =
        k === "product_variant_id" || k === "variant_id" ? "Variant ID" : k === "label" ? "Label" : k.replace(/_/g, " ");
      const formatted = formatVariantLeaf(v);
      if (!formatted) continue;
      parts.push(`${label}: ${formatted}`);
    }
    return parts.length ? parts.join(" · ") : "—";
  }

  return String(raw);
}

const C = {
  navy: "#1a365d",
  navyLight: "#2c5282",
  slate: "#2d3748",
  muted: "#718096",
  border: "#cbd5e0",
  tableHead: "#edf2f7",
  white: "#ffffff",
  soft: "#e2e8f0",
  black: "#1a202c",
  grid: "#94a3b8",
};

/** Column left edges: [x0, x1, ... xn] */
function tableColumnXs(left, colWidths) {
  const xs = [left];
  for (let i = 0; i < colWidths.length; i++) {
    xs.push(xs[i] + colWidths[i]);
  }
  return xs;
}

/**
 * Full grid: outer border + verticals + horizontals. Paints header row fill first.
 * @param rows — { height, cells: string[] }[]  same length as colWidths for cells
 * @returns bottom Y of table
 */
function drawGridTable(doc, left, top, colWidths, rows, options = {}) {
  const {
    headerRows = 1,
    headerFill = C.tableHead,
    borderColor = C.grid,
    headerTextColor = C.slate,
    bodyTextColor = C.black,
    lineWidth = 0.55,
  } = options;

  const width = colWidths.reduce((a, b) => a + b, 0);
  const xs = tableColumnXs(left, colWidths);
  let y = top;

  for (let r = 0; r < rows.length; r++) {
    if (r < headerRows) {
      doc.save();
      doc.fillColor(headerFill).rect(left, y, width, rows[r].height).fill();
      doc.restore();
    }
    y += rows[r].height;
  }
  const totalH = y - top;

  doc.save();
  doc.strokeColor(borderColor).lineWidth(lineWidth);
  doc.rect(left, top, width, totalH).stroke();
  for (let i = 1; i < xs.length - 1; i++) {
    doc.moveTo(xs[i], top).lineTo(xs[i], top + totalH).stroke();
  }
  y = top;
  for (const row of rows) {
    y += row.height;
    doc.moveTo(left, y).lineTo(left + width, y).stroke();
  }
  doc.restore();

  y = top;
  rows.forEach((row, ri) => {
    const isHeader = ri < headerRows;
    const h = row.height;
    const cellAligns =
      row.cellAligns ||
      colWidths.map((_, ci) => {
        if (ci === 0) return "center";
        if (ci === 1) return "left";
        return "right";
      });

    let x = left;
    row.cells.forEach((cell, ci) => {
      const cw = colWidths[ci];
      const padL = ci === 0 ? 3 : 6;
      const padR = 6;
      const tw = Math.max(8, cw - padL - padR);
      doc
        .font(isHeader || row.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(isHeader ? 8 : row.fontSize ?? 9)
        .fillColor(isHeader ? headerTextColor : bodyTextColor);

      let ty = y + (isHeader ? 7 : 6);
      if (!isHeader && row.centerNumeric && ci >= 2) {
        ty = y + Math.max(6, (h - (row.fontSize ?? 9)) / 2);
      }

      doc.text(String(cell ?? "—"), x + padL, ty, {
        width: tw,
        align: cellAligns[ci],
        lineGap: 2,
      });
      x += cw;
    });
    y += h;
  });

  return top + totalH;
}

/** Two-column summary table: header row + body lines, full grid */
function drawSummaryTable(doc, left, top, width, headerCells, bodyLines, options = {}) {
  const colLabel = width * 0.64;
  const colVal = width - colLabel;
  const colWidths = [colLabel, colVal];
  const rows = [
    { height: 24, cells: headerCells },
    ...bodyLines.map((r) => ({
      height: r.height ?? 22,
      cells: [r.label, r.value],
      bold: r.bold,
      fontSize: r.fontSize,
      cellAligns: ["left", "right"],
      centerNumeric: false,
    })),
  ];
  return drawGridTable(doc, left, top, colWidths, rows, {
    headerRows: 1,
    headerFill: C.tableHead,
    ...options,
  });
}

// ✅ INVOICE
export const createInvoicePDF = (order) => {
  const o = orderPlain(order);
  const stamp = Date.now();
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(UPLOAD_DIR, `invoice-${o.id}-${stamp}.pdf`);
  const relative = `/uploads/invoice-${o.id}-${stamp}.pdf`;

  const rate = Number(o.rate) || 0;
  const qty = Number(o.qty) || 0;
  const lineAmount = rate * qty;
  const igst = Number(o.igst) || 0;
  const cgst = Number(o.cgst) || 0;
  const sgst = Number(o.sgst) || 0;
  const grandTotal = lineAmount + igst + cgst + sgst;

  const attrLine = attributesText(o.attributes);
  const descBody = [String(o.product_name ?? "—"), attrLine !== "—" ? `Variant: ${attrLine}` : ""]
    .filter(Boolean)
    .join("\n");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const stream = fs.createWriteStream(filePath);
    stream.on("finish", () => resolve(relative));
    stream.on("error", reject);
    doc.pipe(stream);

    const M = 48;
    const W = doc.page.width - 2 * M;
    let y = M;

    // ----- Header band -----
    doc.save();
    doc.roundedRect(M, y, W, 58, 5).fill(C.navy);
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(22);
    doc.text("INVOICE", M, y + 14, { width: W, align: "center" });
    doc.restore();
    y += 70;

    doc.fillColor(C.black).font("Helvetica");

    // ----- Order meta (two columns) -----
    const half = W / 2 - 8;
    const metaY = y;
    doc.font("Helvetica").fontSize(8).fillColor(C.muted).text("ORDER ID", M, metaY);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(C.slate)
      .text(String(o.order_id ?? "—"), M, metaY + 12, { width: half });

    doc.font("Helvetica").fontSize(8).fillColor(C.muted).text("INVOICE DATE", M + half + 16, metaY);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(C.slate)
      .text(shortDate(o.order_date), M + half + 16, metaY + 12, { width: half });

    y = metaY + 38;
    doc.font("Helvetica").fontSize(8).fillColor(C.muted).text("ORDER STATUS", M, y);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(C.slate)
      .text(String(o.status ?? "—"), M, y + 12, { width: half });

    doc.font("Helvetica").fontSize(8).fillColor(C.muted).text("PAYMENT MODE", M + half + 16, y);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(C.slate)
      .text(String(o.payment_mode ?? "—"), M + half + 16, y + 12, { width: half });

    y += 40;

    // ----- Delivery address block (from placed order snapshot) -----
    const billHead = String(o.customer_name ?? "—");
    const billExtra = deliveryContactLines(o);
    const billBody = [billHead, ...billExtra].join("\n");
    const billTextW = W - 24;
    const billInnerH = doc.heightOfString(billBody, { width: billTextW, lineGap: 3 });
    const billBoxH = Math.max(56, 18 + billInnerH + 16);
    doc.roundedRect(M, y, W, billBoxH, 4).stroke(C.border);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text("DELIVERY ADDRESS", M + 12, y + 10);
    doc.font("Helvetica").fontSize(11).fillColor(C.black).text(billBody, M + 12, y + 22, {
      width: billTextW,
      lineGap: 3,
    });
    y += billBoxH + 10;

    // ----- Line items (full grid table) -----
    doc.font("Helvetica-Bold").fontSize(10).fillColor(C.slate).text("Line items", M, y);
    y += 16;

    const colSr = 34;
    const colQty = 44;
    const colRate = 58;
    const colMrp = 58;
    const colAmt = 76;
    const colDesc = W - colSr - colQty - colRate - colMrp - colAmt;
    const colWidths = [colSr, colDesc, colQty, colRate, colMrp, colAmt];

    doc.font("Helvetica").fontSize(9);
    const innerDescW = colDesc - 12;
    const rowTextH = doc.heightOfString(descBody || "—", { width: innerDescW, lineGap: 2 });
    const dataRowH = Math.max(30, rowTextH + 14);

    y = drawGridTable(
      doc,
      M,
      y,
      colWidths,
      [
        { height: 24, cells: ["#", "Description", "Qty", "Rate (₹)", "MRP (₹)", "Amount (₹)"] },
        {
          height: dataRowH,
          cells: ["1", descBody || "—", String(qty), money(o.rate), money(o.mrp), money(lineAmount)],
          centerNumeric: true,
          cellAligns: ["center", "left", "right", "right", "right", "right"],
        },
      ],
      { headerRows: 1, headerFill: C.tableHead },
    );

    y += 18;

    // ----- Tax & total (two-column grid table) -----
    doc.font("Helvetica-Bold").fontSize(10).fillColor(C.slate).text("Tax summary", M, y);

    y += 14;

    const taxRows = [{ label: "Taxable value (before GST)", value: money(lineAmount) }];

    // Outside Delhi → IGST
    if (Number(o.igst) > 0) {
      taxRows.push({ label: "IGST", value: money(o.igst) });
    }

    // Delhi → CGST + SGST
    if (Number(o.cgst) > 0) {
      taxRows.push({ label: "CGST", value: money(o.cgst) });

      taxRows.push({ label: "SGST", value: money(o.sgst) });
    }

    taxRows.push({ label: "Grand total", value: money(grandTotal), bold: true, fontSize: 11, height: 28 });

    y = drawSummaryTable(doc, M, y, W, ["Particulars", "Amount (₹)"], taxRows);

    y += 22;

    // ----- Shipping (grid table) -----
    if (o.shipping_partner || o.tracking_id || o.tracking_link) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.slate).text("Shipping & delivery", M, y);
      y += 14;

      const shipLines = [
        { label: "Carrier / partner", value: String(o.shipping_partner ?? "—") },
        { label: "Tracking ID (AWB)", value: String(o.tracking_id ?? "—") },
        { label: "Expected delivery", value: shortDate(o.delivery_date) },
      ];
      if (o.tracking_link) {
        doc.font("Helvetica").fontSize(9);
        const urlW = W * 0.36 - 12;
        const urlH = Math.max(24, doc.heightOfString(String(o.tracking_link), { width: Math.max(40, urlW), lineGap: 1 }) + 14);
        shipLines.push({ label: "Tracking URL", value: String(o.tracking_link), height: urlH });
      }

      y = drawSummaryTable(doc, M, y, W, ["Field", "Details"], shipLines);
      y += 8;
    }

    // ----- Footer -----
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(C.muted)
      .text("This is a computer-generated invoice and does not require a signature.", M, doc.page.height - 52, {
        width: W,
        align: "center",
      });

    doc.end();
  });
};

// ✅ LABEL — shipping label layout (4×6 style)
export const createLabelPDF = (order) => {
  const o = orderPlain(order);
  const stamp = Date.now();
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(UPLOAD_DIR, `label-${o.id}-${stamp}.pdf`);
  const relative = `/uploads/label-${o.id}-${stamp}.pdf`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [288, 432], margin: 0 });
    const stream = fs.createWriteStream(filePath);
    stream.on("finish", () => resolve(relative));
    stream.on("error", reject);
    doc.pipe(stream);

    const pad = 14;
    const W = doc.page.width;
    const H = doc.page.height;
    const iw = W - 2 * pad;

    let y = pad;

    // Outer frame
    doc
      .lineWidth(1.2)
      .strokeColor("#0f172a")
      .rect(pad - 4, pad - 4, W - 2 * (pad - 4), H - 2 * (pad - 4))
      .stroke();
    doc.lineWidth(0.35).strokeColor(C.border);

    // Top bar
    doc.save();
    doc.rect(pad, y, iw, 28).fill(C.navy);
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(11);
    doc.text("SHIPPING LABEL", pad, y + 9, { width: iw, align: "center" });
    doc.restore();
    y += 34;

    doc.fillColor(C.black);

    // Order # block
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text("ORDER NUMBER", pad, y);
    y += 11;
    doc
      .font("Courier-Bold")
      .fontSize(20)
      .fillColor("#0f172a")
      .text(String(o.order_id ?? o.id ?? "—"), pad, y, { width: iw });
    y += 26;

    doc.moveTo(pad, y).lineTo(pad + iw, y).stroke(C.border);
    y += 10;

    // Deliver to
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text("DELIVER TO", pad, y);
    y += 12;
    doc.font("Helvetica-Bold").fontSize(13).fillColor(C.black).text(String(o.customer_name ?? "—"), pad, y, { width: iw });
    y += doc.heightOfString(String(o.customer_name ?? "—"), { width: iw }) + 12;

    const labelContact = deliveryContactLines(o);
    if (labelContact.length) {
      const contactStr = `Phone/Email/Address\n${labelContact.join("\n")}`;
      const stripY = H - pad - 52;
      const roomBelow = Math.max(28, stripY - y - 150);
      const contactMaxH = Math.min(72, roomBelow);
      const naturalH = doc.heightOfString(contactStr, { width: iw, lineGap: 2 });
      const contactDrawH = Math.min(naturalH, contactMaxH);
      doc.font("Helvetica").fontSize(7.5).fillColor(C.black).text(contactStr, pad, y, {
        width: iw,
        lineGap: 2,
        height: contactDrawH,
        ellipsis: true,
      });
      y += contactDrawH + 8;
    }

    doc.moveTo(pad, y).lineTo(pad + iw, y).stroke(C.border);
    y += 10;

    // Contents (grid table)
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text("PACKAGE CONTENTS", pad, y);
    y += 11;

    const colL = Math.round(iw * 0.3);
    const colR = iw - colL;
    const attr = attributesText(o.attributes);
    doc.font("Helvetica").fontSize(8);
    const prodH = Math.max(22, doc.heightOfString(String(o.product_name ?? "—"), { width: colR - 12, lineGap: 1 }) + 12);
    const labelRows = [
      { height: 18, cells: ["Detail", "Value"], cellAligns: ["left", "left"] },
      { height: prodH, cells: ["Product", String(o.product_name ?? "—")], cellAligns: ["left", "left"] },
      { height: 20, cells: ["Quantity", String(o.qty ?? "—")], cellAligns: ["left", "right"] },
    ];
    if (attr !== "—") {
      const ah = Math.max(20, doc.heightOfString(attr, { width: colR - 12, lineGap: 1 }) + 10);
      labelRows.push({ height: ah, cells: ["Variant / attrs", attr], cellAligns: ["left", "left"] });
    }
    y = drawGridTable(doc, pad, y, [colL, colR], labelRows, {
      headerRows: 1,
      headerFill: C.tableHead,
      lineWidth: 0.45,
    });

    y += 10;
    doc.moveTo(pad, y).lineTo(pad + iw, y).stroke(C.border);
    y += 10;

    // Sender
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text("FROM (SELLER)", pad, y);
    y += 12;
    doc.font("Helvetica").fontSize(9).fillColor(C.black).text(String(o.shop_name ?? "—"), pad, y, { width: iw });
    y += doc.heightOfString(String(o.shop_name ?? "—"), { width: iw }) + 10;

    // Bottom carrier strip
    const stripH = 52;
    const stripY = H - pad - stripH;
    if (y > stripY - 8) {
      y = stripY - 8;
    }

    doc.rect(pad, stripY, iw, stripH).fill("#f1f5f9").stroke("#94a3b8");
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text("CARRIER", pad + 10, stripY + 8);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#0f172a")
      .text(String(o.shipping_partner ?? "—"), pad + 10, stripY + 18, { width: iw * 0.45 });
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted).text("AWB / TRACKING", pad + iw * 0.48, stripY + 8);
    doc
      .font("Courier-Bold")
      .fontSize(11)
      .fillColor("#0f172a")
      .text(String(o.tracking_id ?? "—"), pad + iw * 0.48, stripY + 18, { width: iw * 0.5 - 10 });
    doc.font("Helvetica").fontSize(8).fillColor(C.slate).text(`Pay: ${o.payment_mode ?? "—"}`, pad + 10, stripY + 36, {
      width: iw - 20,
    });

    doc.end();
  });
};
