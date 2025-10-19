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
const MY_BUSINESS_NUMBER = "+917897897441";

const WHATSAPP_TEMPLATE_NAME = "invoice_pdf";
const WHATSAPP_TEMPLATE_NAMESPACE = "60cbb046_c34d_4f04_8c62_2cb720ccf00d";
const WHATSAPP_INTEGRATED_NUMBER = "15558299861";

// =========================================================================
// UPDATED generateInvoice FUNCTION (with robust image error handling)
// =========================================================================
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
const generateInvoice = async (orderData, filePath) => {
  const doc = new PDFDocument({size: "A4", margin: 50});
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // Document Dimensions for A4: approx width=595, height=842. Margins 50.
  const MAX_ITEMS_Y = 742; // Max Y position before adding a page
  const imageSize = 30;
  const itemHeight = imageSize + 30;

  // --- Invoice Header with Logo ---
  const logoPath = path.join(__dirname, "src", "assets",
      "WhatsApp Image 2025-09-12 at 00.31.52_50c66845.jpg");

  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 50, 45, {width: 50});
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to include local logo image:", e.message);
    }
  }

  doc.fontSize(25).fillColor("#444444").text("INVOICE", 400, 50,
      {align: "right"});
  doc.fontSize(10).text(`Order ID: #${orderData.orderId || orderData.id}`,
      400, 75, {align: "right"});
  doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString()}`,
      400, 90, {align: "right"});

  doc.strokeColor("#aaaaaa").lineWidth(1)
      .moveTo(50, 120).lineTo(550, 120).stroke();

  // --- From / To Information ---
  const customerInfoY = 140;
  // const businessInfoY = 140; // unused variable in original

  // "Invoice To" section
  doc.fontSize(12).fillColor("#000000").text("Invoice To:", 50, customerInfoY);

  // Safely destructure billingInfo
  const billing = orderData.billingInfo || {};

  doc
      .fontSize(10)
      .text(billing.fullName || "-", 50, customerInfoY + 15)
      .text(
          `${billing.addressLine1 || ""}, ${billing.city || ""}`,
          50,
          customerInfoY + 30,
      )
      .text(billing.pincode || "-", 50, customerInfoY + 45)
      .text(`Email: ${billing.email || "-"}`,
          50, customerInfoY + 60)
      .text(`Phone: ${billing.phoneNumber || "-"}`,
          50, customerInfoY + 75);

  // "Invoice For" (Your Business Info)
  doc.fontSize(12).text("Invoice For:", 350, customerInfoY, {align: "right"});
  doc
      .fontSize(10)
      .text("Kiyu-Ziyu", 350, customerInfoY + 15, {align: "right"})
      .text("Hinjewadi", 350, customerInfoY + 30, {align: "right"})
      .text("Pune, Maharashtra, 412101",
          350, customerInfoY + 45, {align: "right"})
      .text("Email: kiyuziyujewellery@gmail.com", 350, customerInfoY + 60,
          {align: "right"})
      .text("Phone: +917897897441", 350, customerInfoY + 75,
          {align: "right"});

  // Items header
  doc.moveDown().moveDown();
  let itemsY = drawItemsHeader(doc, 250); // Initial header position

  // Items list
  doc.fillColor("#000000");

  const items = Array.isArray(orderData.items) ? orderData.items : [];

  // Pre-fetch all images (CRITICAL for performance and correct drawing)
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

  const textX = 100;
  const imageX = 50;

  // Draw all items sequentially now that all images are fetched
  for (const item of itemsWithImages) {
    const itemTotal = (item.quantity || 0) * (item.priceAtTimeOfOrder || 0);

    // 💥 PAGE BREAK CHECK 💥
    if (itemsY + itemHeight > MAX_ITEMS_Y) {
      doc.addPage();
      // Start items lower on new page to allow for a top margin
      itemsY = drawItemsHeader(doc, 75);
    }

    // --- DRAW IMAGE ---
    if (item.imageBuffer) {
      try {
        doc.image(item.imageBuffer, imageX, itemsY,
            {width: imageSize, height: imageSize});
      } catch (imgErr) {
        // eslint-disable-next-line no-console
        console.error(`Failed to render image for ${item.productName}:`,
            imgErr.message);
      }
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


    // --- DRAW PRODUCT DETAILS ---
    let nextY = itemsY + 5;

    // 1. Product Name (Primary Line)
    doc.fontSize(10).fillColor("#000000")
        .text(item.productName || "-", textX, nextY);
    nextY += 12; // Move down for the next line (Product Code)

    // 2. 🛑 PRODUCT CODE 🛑
    doc.fontSize(8).fillColor("#555555")
        .text(`Code: ${item.productCode || "-"}`, textX, nextY);
    nextY += 10; // Move down for the next line (Variation)

    // 2.5 Subcollection Description (if available) - NEW
    if (item.subcollectionDescription) {
      // subtle but readable
      doc.fontSize(8).fillColor("#333333")
          .text(item.subcollectionDescription, textX, nextY, {
            width: 260,
            align: "left",
          });
      nextY += 12;
      doc.fillColor("#000000");
    }

    // 3. Variation Details
    if (item.variation) {
      let variationText = "Var: ";

      if (item.variation.color) {
        variationText += `Color: ${item.variation.color}`;
      }

      if (item.variation.size) {
        if (item.variation.color) {
          variationText += " | ";
        }
        variationText += `Size: ${item.variation.size}`;
      }

      doc.fontSize(8).fillColor("#777777")
          .text(variationText, textX, nextY);

      doc.fillColor("#000000"); // Reset color
    }

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

    itemsY += itemHeight; // Use the increased itemHeight for the next row
  }

  // Check if totals need to start on a new page
  const totalsHeaderHeight = 60; // Approximate height for Totals box
  if (itemsY + 30 + totalsHeaderHeight > MAX_ITEMS_Y) {
    doc.addPage();
    itemsY = 75;
  }

  // --- Totals Section ---
  const totalsY = itemsY + 30;
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(350, totalsY)
      .lineTo(550, totalsY).stroke();

  // Labels
  doc.fontSize(10).fillColor("#000000")
      .text("Subtotal:", 350, totalsY + 10, {align: "left"})
      .text("Packing:", 350, totalsY + 25, {align: "left"})
      .text("GRAND TOTAL:", 350, totalsY + 50, {align: "left"});


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
};
// =========================================================================
// END OF generateInvoice UPDATE
// =========================================================================

// Add this function above or below your exports.placeOrder function in index.js

exports.cancelOrder = functions.https.onRequest(async (req, res) => {
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

  const {orderId} = req.body;

  if (!orderId) {
    return res.status(400).json({error: "Missing orderId."});
  }

  try {
    console.log(`\n--- STARTING ORDER CANCELLATION: ${orderId} ---`);
    // Start a transaction to safely reverse stock and update status
    await db.runTransaction(async (t) => {
      // --- PHASE 1: ALL READS FIRST ---
      // 1. Read the Order Document
      const orderRef = db.collection("orders").doc(orderId);
      const orderDoc = await t.get(orderRef);
      if (!orderDoc.exists) {
        console.error(`ERROR: Order ${orderId} not found.`);
        throw new Error("Order not found.");
      }

      const orderData = orderDoc.data();
      const currentStatus = orderData.status;

      if (currentStatus === "Cancelled") {
        console.warn(`WARNING: Order ${orderId} is already Cancelled.`);
        throw new Error("Order is already cancelled.");
      }
      if (currentStatus === "Delivered") {
        console.warn(`WARNING: Order ${orderId} is Delivered. Stopping cancl.`);
        throw new Error("Cannot cancel a delivered order.");
      }
      console.log(`Order status  '${currentStatus}'Proceeding stock reversal.`);

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
      console.log(`Successfully read ${productDocs.length} product
         documents for reversal.`);

      // 3. Prepare updates (Stock reversal logic)

      // Map to consolidate multiple updates to the same product/variation group
      const productUpdatesMap = new Map();

      for (let i = 0; i < orderData.items.length; i++) {
        const item = orderData.items[i];
        const productDoc = productDocs[i];

        console.log(`\nProcessing item: ${item.productName} 
          (Qty: ${item.quantity})`);
        if (!productDoc.exists) {
          console.warn(`WARNING: Product not found for stock reversal:
             ${productDoc.ref.path}. Skipping.`);
          continue;
        }

        const productData = productDoc.data();
        const quantityToReturn = Number(item.quantity);

        const isVariationProduct = productData.variations &&
                                   Array.isArray(productData.variations) &&
                                   productData.variations.length > 0;

        if (item.variation && isVariationProduct) {
          let variationFound = false;
          const refPath = productDoc.ref.path;

          let updatedVariations = productUpdatesMap.has(refPath) ?
                productUpdatesMap.get(refPath).variations :
                [...productData.variations];

          console.log(`  -> Type: Variation Product. Item Variation: 
            ${item.variation.color}/${item.variation.size}`);

          updatedVariations = updatedVariations.map((v) => {
            // Use robust, trimmed, null-safe comparison
            const isMatch = (
              ((v.color ?? "").trim() ===
              (item.variation.color ?? "").trim()) &&
 ((v.size ?? "").trim() === (item.variation.size ?? "").trim())
            );

            if (isMatch) {
              const currentQuantity = Number(v.quantity) || 0;
              // REVERSE LOGIC: ADD back the cancelled quantity
              const newQuantity = currentQuantity + quantityToReturn;

              variationFound = true;
              console.log(`  -> Match found for ${v.color}/${v.size}.
                 Stock BEFORE: ${currentQuantity}, 
                 Stock AFTER: ${newQuantity}`);
              return {...v, quantity: newQuantity};
            }
            return v;
          });

          if (!variationFound) {
            console.error(`FATAL: No variation match found for 
              ${item.productName}. Stock not reversed.`);
          }

          // Store the planned update for variations
          productUpdatesMap.set(refPath, {
            ref: productDoc.ref,
            data: {variations: updatedVariations},
            variations: updatedVariations, // Store the updated array
          });

          // Case 2: Simple Product (Stock is held in the 'quantity' field)
        } else {
          const refPath = productDoc.ref.path;

          // Get current quantity or use the one previously updated in this loop
          const currentQuantity = productUpdatesMap.has(refPath) ?
                productUpdatesMap.get(refPath).quantity :
                (Number(productData.quantity) || 0);

          // REVERSE LOGIC: ADD back the cancelled quantity
          const newQuantity = currentQuantity + quantityToReturn;

          console.log(`  -> Type: Simple Product. Stock BEFORE:
             ${currentQuantity}, Stock AFTER: ${newQuantity}`);
          // Store the planned update for simple product
          productUpdatesMap.set(refPath, {
            ref: productDoc.ref,
            data: {quantity: newQuantity},
            quantity: newQuantity, // Store the quantity
          });
        }
      } // End of item loop

      // --- PHASE 2: ALL WRITES NOW ---

      // 4. Update the Order Status (First Write)
      t.update(orderRef, {
        status: "Cancelled",
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`\n✅ Order ${orderId} status set to Cancelled.`);
      // 5. Update Product Stock (Remaining Writes)
      for (const updateEntry of productUpdatesMap.values()) {
        t.update(updateEntry.ref, updateEntry.data);
        // Log the final write action
        if (updateEntry.data.variations) {
          console.log(`✅ Stock Reversed: ${updateEntry.ref.path}.
             Updated 'variations' array.`);
        } else {
          console.log(`✅ Stock Reversed: ${updateEntry.ref.path}.
             New 'quantity' is ${updateEntry.data.quantity}.`);
        }
      }
      console.log("--- Stock successfully reversed in transaction. ---");
    });
    // End of Transaction
    res.status(200).json({message: `Order ${orderId} 
      successfully cancelled and stock updated.`});
  } catch (err) {
    console.error("\n--- FINAL ERROR (Transaction Rolled Back) ---");
    console.error("Error cancelling order:", err.message);
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
        if (productData.variations && Array.isArray(productData.variations) &&
          productData.variations.length > 0) {
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

    // --- Attach subcollection descriptions to items (if available) ---
    // This fetches each unique subcollection doc referenced by the items
    // and adds a `subcollectionDescription` field to each item so the PDF
    // generator can print it.
    try {
      console.log("Fetching subcollection descriptions for invoice...");
      const subKeysSet = new Set();
      orderData.items.forEach((it) => {
        const key = `${it.collectionId}__${it.subcollectionId}`;
        subKeysSet.add(key);
      });

      const subKeys = Array.from(subKeysSet);
      const subFetchPromises = subKeys.map(async (key) => {
        const [collectionId, subcollectionId] = key.split("__");
        const subDocRef = db
            .collection("collections")
            .doc(collectionId)
            .collection("subcollections")
            .doc(subcollectionId);
        const subDoc = await subDocRef.get();
        return {key, data: subDoc.exists ? subDoc.data() : null};
      });

      const subResults = await Promise.all(subFetchPromises);
      const subMap = new Map();
      subResults.forEach((r) => {
        if (r.data) subMap.set(r.key, r.data);
      });

      // Attach description (if present) to each item
      orderData.items = orderData.items.map((it) => {
        const key = `${it.collectionId}__${it.subcollectionId}`;
        const subDoc = subMap.get(key);
        return {
          ...it,
          subcollectionDescription: subDoc && subDoc.description ?
          String(subDoc.description) : "",
        };
      });

      console.log("Attached subcollection descriptions to order items.");
    } catch (subErr) {
      // Non-fatal: log and continue without descriptions
      console.error("Failed fetching subcollection descriptions:",
          subErr.message);
      orderData.items = orderData.items.map((it) => ({...it,
        subcollectionDescription: ""}));
    }

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
