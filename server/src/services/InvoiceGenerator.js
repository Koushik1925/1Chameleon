const PDFDocument = require('pdfkit');

class InvoiceGenerator {
  generateInvoicePdf(payment, user, planDetails, stream) {
    const doc = new PDFDocument({ margin: 50 });

    doc.pipe(stream);

    // Header Logo & Brand
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#06B6D4').text('CHAMELEON PRO', 50, 50);
    doc.fontSize(9).font('Helvetica').fillColor('#64748B').text('SEE. CONNECT. CONTROL.', 50, 75);

    // Invoice Meta (right aligned)
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#1E293B').text('INVOICE', 400, 50, { align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor('#64748B')
       .text(`Invoice No: ${payment.invoiceNumber}`, 400, 70, { align: 'right' })
       .text(`Date: ${new Date(payment.paidAt).toLocaleDateString()}`, 400, 85, { align: 'right' })
       .text(`Payment Method: ${(payment.paymentMethod || 'card').toUpperCase()}`, 400, 100, { align: 'right' });

    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, 125).lineTo(550, 125).stroke();

    // Bill To & Company info
    const topPos = 145;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('Billed To:', 50, topPos);
    doc.font('Helvetica').fillColor('#0F172A')
       .text(user.profile?.name || 'Customer', 50, topPos + 15)
       .text(user.email, 50, topPos + 30);

    doc.font('Helvetica-Bold').fillColor('#475569').text('Merchant:', 350, topPos);
    doc.font('Helvetica').fillColor('#0F172A')
       .text('Chameleon Remote Systems Inc.', 350, topPos + 15)
       .text('support@chameleon-agent.online', 350, topPos + 30);

    // Table Header
    const tableTop = 220;
    doc.rect(50, tableTop, 500, 20).fill('#F1F5F9');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569')
       .text('Item Description', 60, tableTop + 6)
       .text('Duration', 280, tableTop + 6)
       .text('Rate', 400, tableTop + 6)
       .text('Amount', 480, tableTop + 6, { align: 'right', width: 60 });

    // Table Row
    const rowTop = tableTop + 25;
    doc.font('Helvetica').fontSize(9).fillColor('#0F172A')
       .text(`Chameleon Pro Subscription - ${planDetails.name}`, 60, rowTop)
       .text(`${planDetails.duration} Days`, 280, rowTop)
       .text(`INR ${(planDetails.amount / 100).toFixed(2)}`, 400, rowTop)
       .text(`INR ${(payment.amount / 100).toFixed(2)}`, 480, rowTop, { align: 'right', width: 60 });

    doc.strokeColor('#F1F5F9').lineWidth(1).moveTo(50, rowTop + 18).lineTo(550, rowTop + 18).stroke();

    // Summary Totals
    const summaryTop = rowTop + 35;
    doc.font('Helvetica').fontSize(9).fillColor('#475569')
       .text('Subtotal:', 380, summaryTop)
       .text('Tax (GST 0%):', 380, summaryTop + 15)
       .font('Helvetica-Bold').fillColor('#0F172A')
       .text('Total Paid:', 380, summaryTop + 35);

    doc.font('Helvetica').fontSize(9).fillColor('#0F172A')
       .text(`INR ${(payment.amount / 100).toFixed(2)}`, 480, summaryTop, { align: 'right', width: 60 })
       .text('INR 0.00', 480, summaryTop + 15, { align: 'right', width: 60 })
       .font('Helvetica-Bold').fillColor('#22C55E')
       .text(`INR ${(payment.amount / 100).toFixed(2)}`, 480, summaryTop + 35, { align: 'right', width: 60 });

    // Footer terms
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#94A3B8')
       .text('Thank you for choosing Chameleon Pro for high-performance system remote control.', 50, 400, { align: 'center', width: 500 });

    doc.end();
  }
}

module.exports = new InvoiceGenerator();
