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

// =========================================================================
// UPDATED generateInvoice FUNCTION (with robust image error handling)
// =========================================================================
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

  // Safety check for the local logo
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 50, 45, {
        width: 50,
      });
    } catch (e) {
      // This is unlikely to fail unless the local file is corrupted
      console.error("Failed to include local logo image:", e.message);
    }
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
      .text("Kiyu-Ziyu", 350, businessInfoY + 15, {
        align: "right",
      })
      .text("Hinjewadi", 350, businessInfoY + 30, {
        align: "right",
      })
      .text("Pune, Maharashtra, 412101", 350, businessInfoY + 45, {
        align: "right",
      })
      .text("Email: kiyuziyujewellery@gmail.com", 350, businessInfoY + 60, {
        align: "right",
      })
      .text("Phone: +917897897441", 350, businessInfoY + 75, {
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

  // --- Items List with Images (The critical section with fixes) ---
  let itemsY = 280;
  doc.fillColor("#000000");

  const imagePromises = orderData.items.map(async (item) => {
    let imageBuffer = null;

    // CRITICAL FIX 1: Safely download the image (handle 404s/network errors)
    try {
      if (item.image) {
        const response = await axios.get(item.image, {
          responseType: "arraybuffer",
        });
        imageBuffer = response.data;
      }
    } catch (err) {
      console.warn(
          `Failed to download image for item ${item.productName}:`,
          err.message,
      );
      // imageBuffer remains null, and we rely on the next block for placeholder
    }

    const itemTotal = item.quantity * item.priceAtTimeOfOrder;
    const imageSize = 30; // 30x30 pixels
    const imageX = 50;
    const textX = 100;

    try {
      if (imageBuffer) {
        doc.image(imageBuffer, imageX, itemsY, {
          width: imageSize,
          height: imageSize,
        });
      } else {
        // Placeholder for failed download or missing URL
        doc
            .fillColor("#ff0000")
            .fontSize(8)
            .text("[No Image]", imageX, itemsY + imageSize / 3, {
              width: imageSize,
              align: "center",
            });
      }
    } catch (e) {
      // Placeholder for "Unknown image format" error (corrupted buffer)
      console.error(`Failed to place image ${item.productName}:`, e.message);
      doc
          .fillColor("#ff0000")
          .fontSize(8)
          .text("[Format Error]", imageX, itemsY + imageSize / 3, {
            width: imageSize,
            align: "center",
          });
    }

    // Reset color and font for the rest of the text
    doc.fillColor("#000000").fontSize(10);

    // Add item details
    doc
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
      .text("Subtotal:", 300, totalsY + 10, {
        width: 190,
        align: "right",
      })
      .text(`₹${orderData.subtotal.toFixed(2)}`, 500, totalsY + 10, {
        width: 50,
        align: "right",
      });
  doc
      .text("Shipping:", 300, totalsY + 25, {
        width: 190,
        align: "right",
      })
      .text(`₹${orderData.shippingFee.toFixed(2)}`, 500, totalsY + 25, {
        width: 50,
        align: "right",
      });


  // Final Total
  doc
      .moveDown()
      .moveDown()
      .fontSize(15)
      .text("Total Amount:", 300, totalsY + 50, {
        width: 190,
        align: "right",
      })
      .text(`₹${orderData.totalAmount.toFixed(2)}`, 500, totalsY + 50, {
        width: 50,
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
// =========================================================================
// END OF generateInvoice UPDATE
// =========================================================================

// Add this function above or below your exports.placeOrder function in index.js

exports.cancelOrder = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "https://kiyuziyuofficial.com"); // update for frontend origin
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({error: "Method Not Allowed"});
  }

  const {orderId} = req.body;
  // Note: The 'db' and 'admin' variables are available globally
  // because they are initialized at the top of index.js.

  if (!orderId) {
    return res.status(400).json({error: "Missing orderId."});
  }

  try {
    console.log(`Starting cancellation for Order ID: ${orderId}`);

    // Start a transaction to safely reverse stock and update status
    await db.runTransaction(async (t) => {
      // --- PHASE 1: ALL READS FIRST ---

      // 1. Read the Order Document
      const orderRef = db.collection("orders").doc(orderId);
      const orderDoc = await t.get(orderRef);

      if (!orderDoc.exists) {
        throw new Error("Order not found.");
      }

      const orderData = orderDoc.data();
      const currentStatus = orderData.status;

      // Basic validation checks
      if (currentStatus === "Cancelled") {
        throw new Error("Order is already cancelled.");
      }
      if (currentStatus === "Delivered") {
        throw new Error("Cannot cancel a delivered order.");
      }

      // 2. Read all Product Documents involved in the order
      const productReadPromises = orderData.items.map((item) => {
        const productRef = db
            .collection("collections")
            .doc(item.collectionId)
            .collection("subcollections")
            .doc(item.subcollectionId)
            .collection("products")
            .doc(item.productId);
        return t.get(productRef);
      });

      const productDocs = await Promise.all(productReadPromises);
      console.log("All product successfully read for stock reversal.");

      // 3. Prepare updates (Stock reversal logic)
      const updates = [];

      for (let i = 0; i < orderData.items.length; i++) {
        const item = orderData.items[i];
        const productDoc = productDocs[i];

        if (!productDoc.exists) {
          console.warn(`Product not found for stock,
            reversal: ${productDoc.ref.path}. Skipping.`);
          continue; // Skip stock update if product is deleted
        }

        const productData = productDoc.data();
        // The quantity to return to stock is the original quantity ordered
        const quantityToReturn = Number(item.quantity);

        if (item.variation && productData.variations &&
                    Array.isArray(productData.variations)) {
          let variationFound = false;
          const updatedVariations = productData.variations.map((v) => {
            const isMatch = (v.color === item.variation.color &&
                            v.size === item.variation.size);

            if (isMatch) {
              const currentQuantity = Number(v.quantity) || 0;
              // REVERSE LOGIC: ADD back the cancelled quantity
              const newQuantity = currentQuantity + quantityToReturn;

              variationFound = true;
              return {...v, quantity: newQuantity};
            }
            return v;
          });

          if (!variationFound) {
            console.warn(`Variation not found in product: ${item.productName}.,
                Cannot fully reverse stock.`);
          } else {
            // Store the planned update for variations
            updates.push({
              ref: productDoc.ref,
              data: {variations: updatedVariations},
            });
          }

          // Case 2: Simple Product (Stock is held in the 'quantity' field)
        } else {
          const currentQuantity = Number(productData.quantity) || 0;
          // REVERSE LOGIC: ADD back the cancelled quantity
          const newQuantity = currentQuantity + quantityToReturn;

          // Store the planned update for simple product
          updates.push({
            ref: productDoc.ref,
            data: {quantity: newQuantity},
          });
        }
      }

      // --- PHASE 2: ALL WRITES NOW ---

      // 4. Update the Order Status (First Write)
      t.update(orderRef, {
        status: "Cancelled",
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Order ${orderId} status set to Cancelled.`);

      // 5. Update Product Stock (Remaining Writes)
      updates.forEach((update) => {
        t.update(update.ref, update.data);
      });
      console.log("Stock successfully reversed in transaction.");
    });
    // End of Transaction

    res.status(200).json({message: `Order ${orderId},
            successfully cancelled and stock updated.`});
  } catch (err) {
    console.error("Error cancelling order (Transaction rolled back):",
        err.message);
    const statusCode = err.message.includes("Order not found") ||
            err.message.includes("already cancelled") ||
            err.message.includes("delivered order") ? 400 : 500;

    const errorMessage = err.message.split(": ")[0] || "Failed to cancel order";

    res.status(statusCode).json({
      error: errorMessage,
    });
  }
});

exports.placeOrder = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "https://kiyuziyuofficial.com");
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

  // Array to collect stock errors across all items
  const stockErrors = [];

  try {
    console.log("Starting order processing...");

    // 1. Save order and update product stock in a single transaction
    await db.runTransaction(async (t) => {
      // --- PHASE 1: ALL READS FIRST (Required by Firestore Transactions) ---

      // Key: refPath, Value: { productRef, items: [], productDoc: null }
      const productDataMap = new Map();

      for (const item of orderData.items) {
        const productRef = db
            .collection("collections")
            .doc(item.collectionId)
            .collection("subcollections")
            .doc(item.subcollectionId)
            .collection("products")
            .doc(item.productId);

        const refPath = productRef.path;

        if (!productDataMap.has(refPath)) {
          productDataMap.set(refPath, {productRef, items: [],
            productDoc: null});
        }
        productDataMap.get(refPath).items.push(item);
      }

      // 2. Fetch the documents for all UNIQUE product references
      const readPromises = Array.from(productDataMap.values()).map(
          (entry) => t.get(entry.productRef),
      );
      const uniqueProductDocs = await Promise.all(readPromises);
      console.log("All unique product documents successfully read.");

      // 3. Map the fetched documents back to the productDataMap
      let docIndex = 0;
      for (const entry of productDataMap.values()) {
        entry.productDoc = uniqueProductDocs[docIndex];
        docIndex++;
      }


      // 4. Prepare consolidated updates (Validation and data generation)
      const updates = [];

      // Iterate through the consolidated map of unique products
      for (const entry of productDataMap.values()) {
        const productDoc = entry.productDoc;
        const productRef = entry.productRef;
        const items = entry.items;
        const productPath = productRef.path;

        if (!productDoc.exists) {
          throw new Error(`Product not found: ${productPath}`);
        }

        const productData = productDoc.data();
        let updateData = {};

        // --- VARIATION CONSOLIDATION LOGIC ---
        if (productData.variations && Array.isArray(productData.variations)) {
          let updatedVariations = [...productData.variations];
          const variationErrors = [];

          for (const item of items) {
            const quantitySold = Number(item.quantity);
            let variationFound = false;

            // Only process items that actually specify a variation
            if (item.variation) {
              updatedVariations = updatedVariations.map((v) => {
                const isMatch = (
                  ((v.color ?? "").trim() ===
                  (item.variation.color ?? "").trim()) &&
                  ((v.size ?? "").trim() === (item.variation.size ?? "").trim())
                );

                if (isMatch) {
                  // CRUCIAL: Mark as found upon matching the variation object.
                  variationFound = true;

                  const currentQuantity = Number(v.quantity) || 0;
                  const newQuantity = currentQuantity - quantitySold;

                  if (newQuantity < 0) {
                    variationErrors.push({
                      productName: item.productName,
                      variation: `${v.color} ${v.size}`,
                      requested: quantitySold,
                      available: currentQuantity,
                    });
                    return v;
                  }

                  return {...v, quantity: newQuantity}; // Apply deduction
                }
                return v;
              });
            }

            if (item.variation && !variationFound) {
              // Corrected the error message for better readability
              throw new Error(`Variation not found : ${item.productName}`);
            }
          }

          if (variationErrors.length > 0) {
            stockErrors.push(...variationErrors);
          } else {
            updateData = {variations: updatedVariations};
          }

          // --- SIMPLE PRODUCT CONSOLIDATION LOGIC ---
        } else {
          const currentQuantity = Number(productData.quantity) || 0;
          const totalQuantitySold = items.reduce((sum, item) =>
            sum + Number(item.quantity), 0);
          const newQuantity = currentQuantity - totalQuantitySold;

          if (newQuantity < 0) {
            // ❌ INSUFFICIENT STOCK: COLLECT ERROR
            stockErrors.push({
              productName: items[0].productName, // Use first item's name
              variation: "N/A",
              requested: totalQuantitySold,
              available: currentQuantity,
            });
          } else {
            updateData = {quantity: newQuantity};
          }
        }

        // Only add a valid update (i.e., no stock error for this product)
        if (Object.keys(updateData).length > 0 &&
            !stockErrors.find((e) => e.productName === items[0].productName)) {
          updates.push({
            ref: productRef,
            data: updateData,
          });
        }
      } // End of productDataMap loop

      // CRITICAL CHECK: If any stock error was collected, throw a custom
      // error to rollback the entire transaction.
      if (stockErrors.length > 0) {
        throw new Error("STOCK_FAILURE_ROLLBACK");
      }

      // --- PHASE 2: ALL WRITES NOW (Must follow all reads) ---

      // 5. Save the Order (The first write)
      const orderRef = db.collection("orders").doc();
      orderData.orderId = orderRef.id;

      t.set(orderRef, {
        ...orderData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "Placed",
      });
      console.log("Order saved with ID:", orderRef.id);


      // 6. Update Product Stock (The remaining writes)
      updates.forEach((update) => {
        t.update(update.ref, update.data);
      });
      console.log("Stock updated safely in transaction.");
    });
    // End of Transaction (Success)


    // --- 2. Post-Transaction Steps (PDF, Storage, WhatsApp) ---

    // 7. Generate PDF
    console.log("Generating PDF...");
    await generateInvoice(orderData, invoicePath);
    console.log("PDF created:", invoicePath);

    // 8. Upload to Firebase Storage
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

    // 9. Send WhatsApp Message
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

    // 10. Cleanup temp file
    fs.unlinkSync(invoicePath);
    console.log("Order complete.");
    res.status(200).json({message: "Order placed and invoice sent!"});
  } catch (err) {
    console.error(
        "Error processing order (Transaction rolled back):",
        err.message,
    );
    if (fs.existsSync(invoicePath)) fs.unlinkSync(invoicePath);

    // --- ERROR HANDLING FIX ---
    if (err.message === "STOCK_FAILURE_ROLLBACK") {
      // Cleaned up the log message
      console.warn("Stock failure detected.");
      return res.status(409).json({
        error: "Insufficient stock detected for some items.",
        stockErrors: stockErrors,
      });
    }
    // Update status code check to include the corrected error message
    const statusCode = err.message.includes("Product not found") ||
                       err.message.includes("Variation not found") ? 400 : 500;
    const errorMessage = err.message.split(": ")[0] || "Fail to process order";

    res.status(statusCode).json({
      error: errorMessage,
    });
  }
});


