const functions = require('firebase-functions');
const axios = require('axios');

// Set up environment variables for secure access
const msg91Authkey = functions.config().msg91.authkey;
const yourMobileNumber = functions.config().msg91.mobile_number;
const templateId = functions.config().msg91.template_id; // Your Msg91 template ID

// This function will be triggered whenever a new document is created in the 'orders' collection
exports.sendWhatsAppNotification = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    try {
      // Get the newly created order data
      const orderData = snap.data();
      const orderId = context.params.orderId;
      const totalAmount = orderData.totalAmount;

      // Log the new order details for debugging
      console.log(`New order placed! ID: ${orderId}, Total: ₹${totalAmount}`);

      // Msg91 API endpoint for WhatsApp messages
      const msg91ApiUrl = 'https://control.msg91.com/api/v5/whatsapp/outbound';

      // The variables to be inserted into your WhatsApp template
      const templateParams = {
        orderId: orderId.substring(0, 8), // Use a shorter ID
        totalAmount: totalAmount.toFixed(2),
      };

      // Construct the API request payload
      const payload = {
        authkey: msg91Authkey,
        template_id: templateId,
        integrated_number: "15558698269", // Updated with your Msg91 number
        // This is the variable data for the template.
        variables: [templateParams.orderId, templateParams.totalAmount],
        contacts: [
          {
            to: yourMobileNumber,
          },
        ],
      };

      // Make the API call to Msg91
      const response = await axios.post(msg91ApiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Msg91 API response:', response.data);
      return { success: true, message: 'WhatsApp message sent successfully' };

    } catch (error) {
      console.error("Error sending WhatsApp message:", error.response?.data || error.message);
      return { success: false, message: 'Failed to send WhatsApp message' };
    }
  });