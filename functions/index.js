// functions/index.js

// Imports for V2 HTTPS function, secrets, and HTTP client
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const axios = require("axios");

const MSG91_SECRET = defineSecret("MSG91_AUTH_KEY");

// 2. Define the external API endpoint
const MSG91_ENDPOINT =
  "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

/**
 * HTTPS Function that acts as a secure proxy for the MSG91 API.
 */
exports.sendWhatsappOtp = onRequest(
    // 3. Attach the secret to grant the function access to it
    {secrets: [MSG91_SECRET]},
    async (req, res) => {
      // --- CORS Setup (Resolves the blocked by CORS policy error) ---
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        // Respond to CORS preflight request
        res.status(204).send("");
        return;
      }

      if (req.method !== "POST") {
        return res.status(405).json({
          type: "error",
          message: "Method Not Allowed",
        });
      }

      try {
        // 4. Retrieve the secret value securely
        const authKey = MSG91_SECRET.value();
        if (!authKey) {
          console.error("Auth key is undefined or empty.");
          return res.status(500).json({
            type: "error",
            message: "Server configuration error: Auth Key missing.",
          });
        }

        // 5. Forward the JSON payload to the MSG91 API
        const msg91Response = await axios.post(MSG91_ENDPOINT, req.body, {
          headers: {
            "Content-Type": "application/json",
            "authkey": authKey, // 🔑 SECURELY INJECTED HERE
          },
        });

        // 6. Return the MSG91 response to the frontend
        res.status(msg91Response.status).json(msg91Response.data);
      } catch (error) {
        console.error("Error calling MSG91 API:", error.message);

        // Handle errors from the external API call
        const status = error.response ? error.response.status : 500;
        const data = error.response ?
          error.response.data :
          {
            message: "Internal server error or network failure.",
          };

        return res.status(status).json({
          type: "error",
          message: data.message || data.type ||
            "Proxy failed to execute MSG91 request.",
          details: data,
        });
      }
    },
);
