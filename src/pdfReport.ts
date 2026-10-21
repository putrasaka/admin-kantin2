import { jsPDF } from 'jspdf';
import type { Product, Transaction } from './App';

const MONTH_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const formatRp = (n: number): string => 'Rp ' + (n || 0).toLocaleString('id-ID');

// Konversi ISO string -> tanggal WIB (UTC+7) secara deterministik
export const wibDateKey = (iso: string): string => {
  const d = new Date(new Date(iso).getTime() + 7 * 3600e3);
  return d.toISOString().slice(0, 10);
};

const wibTime = (iso: string): string => {
  const d = new Date(new Date(iso).getTime() + 7 * 3600e3);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}.${mm} WIB`;
};

export const buildDateLabel = (dateKey: string): string => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return `${d} ${MONTH_ID[m - 1]} ${y}`;
};

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

export async function generateTransactionReportPdf(
  transactions: Transaction[],
  dateLabel: string,
  products: Product[]
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ===== HEADER BLOCK =====
  doc.setFillColor(...rgb('#355872'));
  doc.roundedRect(margin, y, contentW, 16, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('LAPORAN PENJUALAN KANTIN MABIT', margin + 5, y + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...rgb('#9CD5FF'));
  doc.text(`Kantin Ma'had Bina Tahfidz • Tanggal: ${dateLabel}`, margin + 5, y + 12.5);
  y += 24;

  // ===== SECTION: RINCIAN TRANSAKSI =====
  doc.setFillColor(...rgb('#355872'));
  doc.rect(margin, y + 0.5, 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...rgb('#355872'));
  doc.text('RINCIAN TRANSAKSI PER PEMBELI', margin + 5, y + 6);
  y += 13;

  const lineColor = rgb('#e2e8f0');
  const qtyX = margin + contentW - 38; // tepi kanan kolom qty/harga
  const subX = margin + contentW - 6; // tepi kanan kolom subtotal

  transactions.forEach((tx, idx) => {
    const itemH = 5.2;
    const cardH = 15 + tx.items.length * itemH + 9;
    ensureSpace(cardH + 2);

    // Card bg
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...rgb('#e2e8f0'));
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, cardH, 3, 3, 'FD');

    // Nama + waktu
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...rgb('#1e293b'));
    doc.text(`${idx + 1}. ${tx.customerName}`, margin + 5, y + 7);
    const nameW = doc.getTextWidth(`${idx + 1}. ${tx.customerName}`);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...rgb('#94a3b8'));
    doc.text(`(${wibTime(tx.date)})`, margin + 5 + nameW + 2, y + 7);

    // Badge metode bayar (kanan atas)
    const isCash = tx.paymentMethod === 'cash';
    const badge = isCash ? 'CASH (TUNAI)' : 'TABUNGAN';
    doc.setFontSize(8.5);
    const badgeW = doc.getTextWidth(badge) + 6;
    const bx = margin + contentW - 4 - badgeW;
    doc.setFillColor(...(isCash ? rgb('#dcfce7') : rgb('#fef3c7')));
    doc.setDrawColor(...(isCash ? rgb('#bbf7d0') : rgb('#fde68a')));
    doc.roundedRect(bx, y + 2.5, badgeW, 5.5, 2, 2, 'FD');
    doc.setTextColor(...(isCash ? rgb('#15803d') : rgb('#b45309')));
    doc.setFont('helvetica', 'bold');
    doc.text(badge, bx + badgeW / 2, y + 6.2, { align: 'center' });

    // Item rows — kolom tetap agar tidak bertumpuk
    let iy = y + 14;
    doc.setFont('helvetica', 'normal');
    tx.items.forEach((item) => {
      doc.setFontSize(10);
      doc.setTextColor(...rgb('#334155'));
      doc.text(`• ${item.productName}`, margin + 5, iy);
      doc.setFontSize(9.5);
      doc.setTextColor(...rgb('#64748b'));
      doc.text(`${item.quantity} x ${formatRp(item.price)}`, qtyX, iy, { align: 'right' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...rgb('#0f172a'));
      doc.text(formatRp(item.subtotal), subX, iy, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      iy += itemH;
    });

    // Divider + total
    doc.setDrawColor(...lineColor);
    doc.setLineWidth(0.3);
    doc.line(margin + 4, iy - 1.5, margin + contentW - 4, iy - 1.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...rgb('#0f172a'));
    doc.text(`Total: ${formatRp(tx.totalAmount)}`, subX, iy + 4.5, { align: 'right' });

    y += cardH + 4;
  });

  // ===== SECTION: REKAP PENJUALAN & KEUNTUNGAN =====
  y += 6;
  ensureSpace(60);
  doc.setFillColor(...rgb('#355872'));
  doc.rect(margin, y + 0.5, 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...rgb('#355872'));
  doc.text('REKAP PENJUALAN & KEUNTUNGAN', margin + 5, y + 6);
  y += 13;

  // Agregasi per produk dari transaksi hari itu
  const costByProduct = new Map<string, number>();
  products.forEach(p => costByProduct.set(p.name, p.costPrice));

  const agg = new Map<string, { qty: number; revenue: number; profit: number }>();
  transactions.forEach(tx => {
    tx.items.forEach(item => {
      const cost = costByProduct.get(item.productName) ?? 0;
      const prev = agg.get(item.productName) || { qty: 0, revenue: 0, profit: 0 };
      prev.qty += item.quantity;
      prev.revenue += item.subtotal;
      prev.profit += Math.max(0, item.price - cost) * item.quantity;
      agg.set(item.productName, prev);
    });
  });

  // Header tabel
  const colName = margin + 4;
  const colQty = margin + contentW - 90;
  const colRev = margin + contentW - 48;
  const colProfit = margin + contentW - 4;
  const rowH = 7;

  doc.setFillColor(...rgb('#355872'));
  doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('NAMA BARANG', colName + 2, y + 5.5);
  doc.text('TOTAL TERJUAL', colQty, y + 5.5, { align: 'right' });
  doc.text('TOTAL HARGA TERJUAL', colRev, y + 5.5, { align: 'right' });
  doc.text('KEUNTUNGAN', colProfit, y + 5.5, { align: 'right' });
  y += 8;

  // Baris per produk
  let totalQty = 0;
  let totalRev = 0;
  let totalProfit = 0;
  let idx = 0;
  agg.forEach((v, name) => {
    if (y + rowH > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
    doc.setFillColor(...rgb(bg));
    doc.setDrawColor(...lineColor);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentW, rowH, 'FD');
    doc.setTextColor(...rgb('#334155'));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${idx + 1}. ${name}`, colName + 2, y + 4.8);
    doc.setTextColor(...rgb('#64748b'));
    doc.text(String(v.qty), colQty, y + 4.8, { align: 'right' });
    doc.setTextColor(...rgb('#0f172a'));
    doc.text(formatRp(v.revenue), colRev, y + 4.8, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...rgb('#15803d'));
    doc.text(formatRp(v.profit), colProfit, y + 4.8, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    totalQty += v.qty;
    totalRev += v.revenue;
    totalProfit += v.profit;
    y += rowH;
    idx++;
  });

  // Baris TOTAL
  if (y + rowH + 2 > pageH - margin) {
    doc.addPage();
    y = margin;
  }
  doc.setFillColor(...rgb('#e2e8f0'));
  doc.setDrawColor(...rgb('#cbd5e1'));
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, rowH, 'FD');
  doc.setTextColor(...rgb('#0f172a'));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL :', colName + 2, y + 4.8);
  doc.text(String(totalQty), colQty, y + 4.8, { align: 'right' });
  doc.text(formatRp(totalRev), colRev, y + 4.8, { align: 'right' });
  doc.setTextColor(...rgb('#15803d'));
  doc.text(formatRp(totalProfit), colProfit, y + 4.8, { align: 'right' });
  y += rowH + 6;

  // Catatan keuntungan
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...rgb('#94a3b8'));
  doc.text('Catatan: Keuntungan = (Harga Jual − Harga Beli) × jumlah terjual. Produk tanpa harga beli dihitung 0.', margin, y + 2);

  // ===== PAGE NUMBERS =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...rgb('#94a3b8'));
    doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
  }

  // ===== DOWNLOAD =====
  const fileName = 'rekap_penjualan_kantin_' + dateLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.pdf';
  doc.save(fileName);
}
