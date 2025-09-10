const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const axios = require("axios");

const msg91Authkey = process.env.MSG91_AUTHKEY;
const yourMobileNumber = process.env.MSG91_MOBILE_NUMBER;

exports.sendWhatsAppNotification = onDocumentCreated(
    "orders/{orderId}",
    async (event) => {
      try {
        const orderData = event.data.data();
        const orderId = event.params.orderId;
        const totalAmount = orderData.totalAmount;

        logger.info(`New order placed! ID: ${orderId}, Total: ₹${totalAmount}`);

        const msg91ApiUrl =
          "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

        const payload = {
          integrated_number: "15558698269",
          content_type: "template",
          payload: {
            messaging_product: "whatsapp",
            type: "template",
            template: {
              name: "new_order_notification",
              language: {
                code: "en",
                policy: "deterministic",
              },
              namespace: "9fdcfe39_c1cc_4d44_b582_d043de7d016d",
              to_and_components: [
                {
                  to: [yourMobileNumber],
                  components: {
                    body_1: {
                      type: "text",
                      value: orderId.substring(0, 8),
                    },
                    body_2: {
                      type: "text",
                      value: totalAmount.toFixed(2),
                    },
                  },
                },
              ],
            },
          },
        };

        const response = await axios.post(msg91ApiUrl, payload, {
          headers: {
            "Content-Type": "application/json",
            "authkey": msg91Authkey,
          },
        });

        logger.info("Msg91 API response:", response.data);
      } catch (error) {
        logger.error(
            "Error sending WhatsApp message:",
            error.response?.data || error.message,
        );
      }
    },
);
