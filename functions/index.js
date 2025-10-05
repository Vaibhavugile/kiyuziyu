// functions/index.js
const functions = require("firebase-functions");
const fs = require("fs");
const os = require("os");
const path = require("path");
const admin = require("firebase-admin");
const axios = require("axios");
const PDFDocument = require("pdfkit");

admin.initializeApp();
const db = admin.firestore();

// Function to draw the item table headers
function drawItemsHeader(doc, y) {
  doc.fillColor("#aaaaaa").fontSize(10)
      .text("ITEM", 100, y)
      .text("QTY", 300, y, {width: 100, align: "right"})
      .text("PRICE", 400, y, {width: 100, align: "right"})
      .text("TOTAL", 500, y, {width: 50, align: "right"});

  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y + 15)
      .lineTo(550, y + 15).stroke();

  return y + 30; // Return new Y position after header
}


async function generateInvoice(orderData, filePath) {
  const doc = new PDFDocument({size: "A4", margin: 50});
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // Document Dimensions for A4: approx width=595, height=842. Margins 50.
  const MAX_ITEMS_Y = 742; // Max Y position before adding a page

  const logoPath = path.join(__dirname, "src", "assets",
      "WhatsApp Image 2025-09-12 at 00.31.52_50c66845.jpg");
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 50, 45, {width: 50});
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to render local logo image:", err.message);
    }
  }

  doc.fontSize(25).fillColor("#444444").text("INVOICE", 400, 50,
      {align: "right"});
  doc.fontSize(10).text(`Order ID: #${orderData.orderId || orderData.id}`,
      400, 75, {align: "right"});
  doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString()}`,
      400, 90, {align: "left"});

  doc.strokeColor("#aaaaaa").lineWidth(1)
      .moveTo(50, 120).lineTo(550, 120).stroke();

  // From / To
  const customerInfoY = 140;
  doc.fontSize(12).fillColor("#000000").text("Invoice To:", 50, customerInfoY);

  if (orderData.billingInfo) {
    doc
        .fontSize(10)
        .text(orderData.billingInfo.fullName || "-", 50, customerInfoY + 15)
        .text(
            `${orderData.billingInfo.addressLine1 || ""},
                 ${orderData.billingInfo.city || ""}`,
            50,
            customerInfoY + 30,
        )
        .text(orderData.billingInfo.pincode || "", 50, customerInfoY + 45)
        .text(`Email: ${orderData.billingInfo.email || "-"}`,
            50, customerInfoY + 60)
        .text(`Phone: ${orderData.billingInfo.phoneNumber || "-"}`,
            50, customerInfoY + 75);
  }

  doc.fontSize(12).text("Invoice For:", 350, customerInfoY, {align: "right"});
  doc
      .fontSize(10)
      .text("Your Company Name", 350, customerInfoY + 15, {align: "right"})
      .text("Your Address Line 1", 350, customerInfoY + 30, {align: "right"})
      .text("City, State, Pincode", 350, customerInfoY + 45, {align: "right"})
      .text("Email: your_email@example.com", 350, customerInfoY + 60,
          {align: "right"})
      .text("Phone: Your Phone Number", 350, customerInfoY + 75,
          {align: "right"});

  // Items header
  doc.moveDown().moveDown();
  let itemsY = drawItemsHeader(doc, 250); // Initial header position

  // Items list
  doc.fillColor("#000000");

  const items = Array.isArray(orderData.items) ? orderData.items : [];

  // Pre-fetch all images
  const itemsWithImages = await Promise.all(items.map(async (item) => {
    let imageBuffer = null;
    if (item.image) {
      try {
        const resp = await axios.get(item.image, {
          responseType: "arraybuffer",
          timeout: 10000,
        });
        imageBuffer = resp.data;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Failed to download image for ${item.productName}:`,
            err.message);
      }
    }
    return {...item, imageBuffer};
  }));

  // Draw all items sequentially now that all images are fetched
  for (const item of itemsWithImages) {
    const itemTotal = (item.quantity || 0) * (item.priceAtTimeOfOrder || 0);
    const imageSize = 30;
    // Increase item height to accommodate variation text
    const itemHeight = imageSize + 25;
    const imageX = 50;
    const textX = 100;
    const CHECK_Y = MAX_ITEMS_Y; // Max allowed Y for items

    // 💥 PAGE BREAK CHECK 💥
    if (itemsY + itemHeight > CHECK_Y) {
      doc.addPage();
      // Start items lower on new page to allow for a top margin
      itemsY = drawItemsHeader(doc, 75);
    }

    if (item.imageBuffer) {
      try {
        doc.image(item.imageBuffer, imageX, itemsY,
            {width: imageSize, height: imageSize});
      } catch (imgErr) {
        // eslint-disable-next-line no-console
        console.error(`Failed to render image for ${item.productName}:`,
            imgErr.message);
      }
    }

    // --- DRAW PRODUCT NAME ---
    doc
        .fontSize(10)
        .text(item.productName || "-", textX, itemsY + 5, {
          width: 180, // Max width for item name
          continued: false,
        });

    // 🛑 NEW: DRAW VARIATION DETAILS 🛑
    let nextY = itemsY + 5; // Start drawing text at Y+5

    // Draw Product Name (Primary Line)
    doc.fontSize(10).text(item.productName || "-", textX, nextY);
    nextY += 12; // Move down for the next line

    if (item.variation) {
      let variationText = "Var: ";

      // Append Color
      if (item.variation.color) {
        variationText += `Color: ${item.variation.color}`;
      }

      // Append Size, adding separator if Color was present
      if (item.variation.size) {
        if (item.variation.color) {
          variationText += " | ";
        }
        variationText += `Size: ${item.variation.size}`;
      }

      // Draw Variation Line
      doc.fontSize(8).fillColor("#777777")
          .text(variationText, textX, nextY);

      doc.fillColor("#000000"); // Reset color
      // nextY += 10; // Not needed if we use itemHeight to advance itemsY
    }
    // 🛑 END VARIATION DRAWING 🛑


    // Draw QTY, PRICE, TOTAL (These positions remain relative to itemsY)
    doc.fontSize(10)
        .text(item.quantity != null ? item.quantity : "-", 300,
            itemsY + imageSize / 4, {
              width: 100,
              align: "right",
            })
        .text(`₹${(item.priceAtTimeOfOrder || 0).toFixed(2)}`, 400,
            itemsY + imageSize / 4, {
              width: 100,
              align: "right",
            })
        .text(`₹${itemTotal.toFixed(2)}`, 500, itemsY + imageSize / 4, {
          width: 50,
          align: "right",
        });

    itemsY += itemHeight; // Use the increased itemHeight
  }

  // Check if totals need to start on a new page
  const totalsHeaderHeight = 60; // Approximate height for Totals box
  if (itemsY + 30 + totalsHeaderHeight > MAX_ITEMS_Y) {
    doc.addPage();
    itemsY = 75;
  }

  // Totals
  const totalsY = itemsY + 30;
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(350, totalsY)
      .lineTo(550, totalsY).stroke();

  // Labels

  // Values
  doc.fontSize(10).fillColor("#000000")
      .text(`₹${(orderData.subtotal || 0).toFixed(2)}`,
          500, totalsY + 10, {align: "right"})
      .text(`₹${(orderData.shippingFee || 0).toFixed(2)}`,
          500, totalsY + 25, {align: "right"});

  doc.strokeColor("#000000").lineWidth(1).moveTo(400, totalsY + 45)
      .lineTo(550, totalsY + 45).stroke(); // Line before grand total

  doc
      .moveDown()
      .moveDown()
      .fontSize(15)
      .text(`₹${(orderData.totalAmount || 0).toFixed(2)}`,
          500, totalsY + 50, {align: "right"})
      .fillColor("#000000");

  // Footer
  doc.moveDown().moveDown().moveDown();
  const footerY = doc.y;
  doc.fillColor("#aaaaaa").text("Thank you for your business!", 50,
      footerY + 50, {
        align: "center",
        width: 500,
      });

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

exports.generateInvoiceForPrint = functions.https.onRequest(async (req, res) =>{
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    return res.status(204).send("");
  }

  const orderId = req.query.orderId;
  if (!orderId) {
    return res.status(400).send("Missing orderId query parameter.");
  }

  const tempDirectory = os.tmpdir();
  const invoiceFileName = `invoice_${orderId}.pdf`;
  const invoicePath = path.join(tempDirectory, invoiceFileName);

  try {
    const orderDoc = await db.collection("orders").doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).send("Order not found.");
    }

    const orderData = {id: orderDoc.id, ...orderDoc.data(),
      orderId: orderDoc.id};

    await generateInvoice(orderData, invoicePath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition",
        `inline; filename="${invoiceFileName}"`);

    const readStream = fs.createReadStream(invoicePath);
    readStream.pipe(res);

    readStream.on("close", () => {
      try {
        fs.unlinkSync(invoicePath);
        // eslint-disable-next-line no-console
        console.log(`Cleaned up temporary file: ${invoicePath}`);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Cleanup error:", e.message);
      }
    });
    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error generating invoice PDF:", error);
    try {
      if (fs.existsSync(invoicePath)) fs.unlinkSync(invoicePath);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Cleanup error:", e.message);
    }
    return res.status(500).send(`Internal Server Error: ${error.message}`);
  }
});
