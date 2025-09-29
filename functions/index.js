const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {v4: uuidv4} = require("uuid");

admin.initializeApp();
const db = admin.firestore();

// IMPORTANT: Replace with env variables in production
const MSG91_AUTH_KEY = "468116AwggRESvY68bf021bP1";
const MY_BUSINESS_NUMBER = "+918446442204";

const WHATSAPP_TEMPLATE_NAME = "invoice_pdf";
const WHATSAPP_TEMPLATE_NAMESPACE = "9fdcfe39_c1cc_4d44_b582_d043de7d016d";
const WHATSAPP_INTEGRATED_NUMBER = "15558698269";

// Generate PDF invoice
// Generate PDF invoice
const generateInvoice = async (orderData, filePath) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // --- Invoice Header with Logo ---
  const logoPath = path.join(__dirname,
      "src/assets/WhatsApp Image 2025-09-12 at 00.31.52_50c66845.jpg");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 45, {
      width: 50,
    });
  }

  doc
      .fontSize(25)
      .fillColor("#444444")
      .text("INVOICE", 400, 50, {
        align: "right",
      });
  doc
      .fontSize(10)
      .text(`Order ID: #${orderData.orderId}`, 400, 75, {
        align: "right",
      });
  doc
      .fontSize(10)
      .text(`Date: ${new Date().toLocaleDateString()}`, 400, 90, {
        align: "right",
      });

  // --- Separator Line ---
  doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(50, 120)
      .lineTo(550, 120)
      .stroke();

  // --- From / To Information ---
  const customerInfoY = 140;
  const businessInfoY = 140;

  // "Invoice To" section
  doc.fontSize(12).fillColor("#000000").text("Invoice To:", 50, customerInfoY);
  doc
      .fontSize(10)
      .text(orderData.billingInfo.fullName, 50, customerInfoY + 15)
      .text(
          `${orderData.billingInfo.addressLine1},${orderData.billingInfo.city}`,
          50,
          customerInfoY + 30,
      )
      .text(`${orderData.billingInfo.pincode}`, 50, customerInfoY + 45);
  doc
      .fillColor("#000000")
      .text(`Email: ${orderData.billingInfo.email}`, 50, customerInfoY + 60)
      .text(`Phone: ${orderData.billingInfo.phoneNumber}`
          , 50, customerInfoY + 75);

  // "Invoice From" (Your Business Info)
  doc
      .fontSize(12)
      .text("Invoice For:", 350, businessInfoY, {
        align: "right",
      });
  doc
      .fontSize(10)
      .text("Your Company Name", 350, businessInfoY + 15, {
        align: "right",
      })
      .text("Your Address Line 1", 350, businessInfoY + 30, {
        align: "right",
      })
      .text("City, State, Pincode", 350, businessInfoY + 45, {
        align: "right",
      })
      .text("Email: your_email@example.com", 350, businessInfoY + 60, {
        align: "right",
      })
      .text("Phone: Your Phone Number", 350, businessInfoY + 75, {
        align: "right",
      });

  // --- Order Summary / Items Table Header ---
  doc
      .moveDown()
      .moveDown()
      .moveDown()
      .moveDown()
      .fillColor("#aaaaaa")
      .fontSize(10)
      .text("ITEM", 100, 250) // Adjust position for image
      .text("QTY", 300, 250, {
        width: 100,
        align: "right",
      })
      .text("PRICE", 400, 250, {
        width: 100,
        align: "right",
      })
      .text("TOTAL", 500, 250, {
        width: 50,
        align: "right",
      });
  doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(50, 265)
      .lineTo(550, 265)
      .stroke();

  // --- Items List with Images ---
  let itemsY = 280;
  doc.fillColor("#000000");

  const imagePromises = orderData.items.map(async (item) => {
    let imageBuffer = null;
    try {
      const response = await axios.get(item.image, {
        responseType: "arraybuffer",
      });
      imageBuffer = response.data;
    } catch (err) {
      console.error(`Failed to download image for item ${item.productName}:`,
          err.message);
      // Continue without image if download fails
    }

    const itemTotal = item.quantity * item.priceAtTimeOfOrder;
    const imageSize = 30; // 30x30 pixels
    const imageX = 50;
    const textX = 100;

    if (imageBuffer) {
      doc.image(imageBuffer, imageX, itemsY, {
        width: imageSize,
        height: imageSize,
      });
    }

    doc
        .fontSize(10)
        .text(item.productName, textX, itemsY + imageSize / 4)
        .text(item.quantity, 300, itemsY + imageSize / 4, {
          width: 100,
          align: "right",
        })
        .text(`₹${item.priceAtTimeOfOrder.toFixed(2)}`,
            400, itemsY + imageSize / 4, {
              width: 100,
              align: "right",
            })
        .text(`₹${itemTotal.toFixed(2)}`, 500, itemsY + imageSize / 4, {
          width: 50,
          align: "right",
        });

    itemsY += imageSize + 15; // Move down for the next item
  });

  // Wait for all image processing to complete before writing totals
  await Promise.all(imagePromises);

  // --- Totals Section ---
  const totalsY = itemsY + 30;
  doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(350, totalsY)
      .lineTo(550, totalsY)
      .stroke();

  doc
      .fontSize(10)
      .text("Subtotal:", 400, totalsY + 10, {
        align: "right",
      })
      .text(`₹${orderData.subtotal.toFixed(2)}`, 500, totalsY + 10, {
        align: "right",
      });
  doc
      .text("Shipping:", 400, totalsY + 25, {
        align: "right",
      })
      .text(`₹${orderData.shippingFee.toFixed(2)}`, 500, totalsY + 25, {
        align: "right",
      });

  // Final Total
  doc
      .moveDown()
      .moveDown()
      .fontSize(15)
      .text("Total Amount:", 400, totalsY + 50, {
        align: "right",
      })
      .text(`₹${orderData.totalAmount.toFixed(2)}`, 500, totalsY + 50, {
        align: "right",
      })
      .fillColor("#000000");

  // --- Footer ---
  doc.moveDown().moveDown().moveDown();
  const footerY = doc.y;
  doc
      .fillColor("#aaaaaa")
      .text("Thank you for your business!", 50, footerY + 50, {
        align: "center",
        width: 500,
      });
  doc.end();

  // Wait for the PDF to finish writing to the stream
  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
};

exports.placeOrder = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "http://localhost:3000"); // update for frontend
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({error: "Method Not Allowed"});
  }

  const orderData = req.body;
  const tempDirectory = os.tmpdir();
  const invoiceFileName = `invoice_${uuidv4()}.pdf`;
  const invoicePath = path.join(tempDirectory, invoiceFileName);

  try {
    console.log("Starting order processing...");

    // 1. Save order and update product stock in a single transaction
    await db.runTransaction(async (t) => {
      // --- PHASE 1: ALL READS FIRST (Required by Firestore Transactions) ---

      // 1. Collect all product references and create read promises
      const productReadPromises = orderData.items.map((item) => {
        const productRef = db
            .collection("collections")
            .doc(item.collectionId)
            .collection("subcollections")
            .doc(item.subcollectionId)
            .collection("products")
            .doc(item.productId);
        // Execute the read operation inside the transaction
        return t.get(productRef);
      });

      // 2. Wait for all product documents to be read
      const productDocs = await Promise.all(productReadPromises);
      console.log("All product documents successfully read.");

      // 3. Prepare updates (Validation and data generation)
      const updates = [];

      for (let i = 0; i < orderData.items.length; i++) {
        const item = orderData.items[i];
        const productDoc = productDocs[i];

        if (!productDoc.exists) {
          throw new Error(`Product not found: ${productDoc.ref.path}`);
        }

        const productData = productDoc.data();
        const quantitySold = Number(item.quantity);

        // Case 1: Product with Variations
        if (item.variation && productData.variations &&
                    Array.isArray(productData.variations)) {
          let variationFound = false;
          const updatedVariations = productData.variations.map((v) => {
            const isMatch = (v.color === item.variation.color &&
                            v.size === item.variation.size);

            if (isMatch) {
              const currentQuantity = Number(v.quantity) || 0;
              const newQuantity = currentQuantity - quantitySold;

              if (newQuantity < 0) {
                throw new Error(
                    `Insufficient stock for ${item.productName} ` +
                                    `(${v.color} ${v.size}). Only ` +
                                    `${currentQuantity} available.`,
                );
              }

              variationFound = true;
              return {...v, quantity: newQuantity};
            }
            return v;
          });

          if (!variationFound) {
            throw new Error(
                `Variation not found in product: ${item.productName}`,
            );
          }

          // Store the planned update
          updates.push({
            ref: productDoc.ref,
            data: {variations: updatedVariations},
          });

          // Case 2: Simple Product
        } else {
          const currentQuantity = Number(productData.quantity) || 0;
          const newQuantity = currentQuantity - quantitySold;

          if (newQuantity < 0) {
            throw new Error(
                `Insufficient stock for simple product ${item.productName}. ` +
                            `Only ${currentQuantity} available.`,
            );
          }

          // Store the planned update
          updates.push({
            ref: productDoc.ref,
            data: {quantity: newQuantity},
          });
        }
      }


      // --- PHASE 2: ALL WRITES NOW (Must follow all reads) ---

      // 4. Save the Order (The first write)
      const orderRef = db.collection("orders").doc();
      orderData.orderId = orderRef.id;

      t.set(orderRef, {
        ...orderData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "Placed",
      });
      console.log("Order saved with ID:", orderRef.id);


      // 5. Update Product Stock (The remaining writes)
      updates.forEach((update) => {
        t.update(update.ref, update.data);
      });
      console.log("Stock updated safely in transaction.");
    });
    // End of Transaction


    // --- 2. Post-Transaction Steps (PDF, Storage, WhatsApp) ---

    // 3. Generate PDF
    console.log("Generating PDF...");
    await generateInvoice(orderData, invoicePath);
    console.log("PDF created:", invoicePath);

    // 4. Upload to Firebase Storage
    console.log("Uploading to Firebase Storage...");
    const bucket = admin.storage().bucket();
    const destination = `invoices/${invoiceFileName}`;
    await bucket.upload(invoicePath, {
      destination,
      metadata: {contentType: "application/pdf"},
    });

    const mediaUrl =
            `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
            `${encodeURIComponent(destination)}?alt=media`;

    console.log("PDF uploaded. Public URL:", mediaUrl);

    // 5. Send WhatsApp Message
    console.log("Sending WhatsApp message...");
    const messagePayload = {
      integrated_number: WHATSAPP_INTEGRATED_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: WHATSAPP_TEMPLATE_NAME,
          language: {code: "en", policy: "deterministic"},
          namespace: WHATSAPP_TEMPLATE_NAMESPACE,
          to_and_components: [
            {
              to: [orderData.billingInfo.phoneNumber, MY_BUSINESS_NUMBER],
              components: {
                header_1: {
                  filename: invoiceFileName,
                  type: "document",
                  value: mediaUrl,
                },
                body_1: {
                  type: "text",
                  value: orderData.billingInfo.fullName,
                },
              },
            },
          ],
        },
      },
    };

    await axios.post(
        "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
        messagePayload,
        {
          headers: {
            "authkey": MSG91_AUTH_KEY,
            "Content-Type": "application/json",
          },
        },
    );

    console.log("WhatsApp message sent.");

    // 6. Cleanup temp file
    fs.unlinkSync(invoicePath);
    console.log("Order complete.");
    res.status(200).json({message: "Order placed and invoice sent!"});
  } catch (err) {
    console.error(
        "Error processing order (Transaction rolled back):",
        err.message,
    );
    if (fs.existsSync(invoicePath)) fs.unlinkSync(invoicePath);
    // Return a 400 error for business logic failures (like insufficient stock)
    const statusCode = err.message.includes("Insufficient stock") ? 400 : 500;

    const errorMessage = err.message.split(": ")[0] ||
            "Failed to process order";

    res.status(statusCode).json({
      error: errorMessage,
    });
  }
});

