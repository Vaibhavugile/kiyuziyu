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
const generateInvoice = (orderData, filePath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(25).text("Invoice", {align: "center"});
    doc.moveDown();

    doc.fontSize(12).text(`Order ID: ${orderData.orderId}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    doc.fontSize(15).text("Customer Information", {underline: true});
    doc.fontSize(12).text(`Name: ${orderData.billingInfo.fullName}`);
    doc.text(`Phone: ${orderData.billingInfo.phoneNumber}`);
    doc.text(`Email: ${orderData.billingInfo.email}`);
    doc.text(
        `Address: ${orderData.billingInfo.addressLine1}, ` +
        `${orderData.billingInfo.city}, ${orderData.billingInfo.pincode},`,
    );
    doc.moveDown();

    doc.fontSize(15).text("Order Details", {underline: true});
    doc.moveDown();

    orderData.items.forEach((item) => {
      doc.text(
          `${item.productName} - Qty: ${item.quantity} - Price:
         ₹${item.priceAtTimeOfOrder}`,
      );
    });
    doc.moveDown();

    doc.fontSize(12).text(`Subtotal: ₹${orderData.subtotal.toFixed(2)}`);
    doc.text(`Shipping: ₹${orderData.shippingFee.toFixed(2)}`);
    doc
        .fontSize(15)
        .text(`Total Amount: ₹${orderData.totalAmount.toFixed(2)}`, {
          align: "right",
        });

    doc.end();

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

    // 1. Save order to Firestore
    console.log("Saving order to Firestore...");
    const orderRef = await db.collection("orders").add({
      ...orderData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    orderData.orderId = orderRef.id;
    console.log("Order saved with ID:", orderRef.id);

    // 2. Update product stock safely
    console.log("Updating product quantities...");
    for (const item of orderData.items) {
      const productRef = db
          .collection("collections")
          .doc(item.collectionId)
          .collection("subcollections")
          .doc(item.subcollectionId)
          .collection("products")
          .doc(item.productId);

      const productSnap = await productRef.get();

      if (!productSnap.exists) {
        console.warn("⚠️ Product not found, skipping:", productRef.path);
        continue;
      }

      await productRef.update({
        quantity: admin.firestore.FieldValue.increment(-item.quantity),
      });
    }
    console.log("Stock updated safely.");

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

    // Use Firebase public URL (no signed URL, no signBlob IAM needed)
    const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media`;

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
    console.error("Error:", err.message);
    if (fs.existsSync(invoicePath)) fs.unlinkSync(invoicePath);
    res.status(500).json({error: "Failed to process order."});
  }
});

