const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// === IMAGE GENERATION ===
app.post("/api/generate-image", async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: "512x512",
      }),
    });

    const data = await response.json();
    res.json({ imageUrl: data.data[0].url });
  } catch (err) {
    console.error("Image generation error:", err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

// === FORM SUBMISSION ===
app.post("/api/submit-design", async (req, res) => {
  const {
    customerName,
    customerEmail,
    purpose,
    recipient,
    message,
    aiHelp,
    style,
    notes,
    imageUrl,
  } = req.body;

  const emailHTML = `
    <h2>New Honor Works Design Request</h2>
    <p><strong>Name:</strong> ${customerName}</p>
    <p><strong>Email:</strong> ${customerEmail}</p>
    <p><strong>Purpose:</strong> ${purpose}</p>
    <p><strong>Recipient:</strong> ${recipient}</p>
    <p><strong>Message:</strong> ${message}</p>
    <p><strong>AI Help:</strong> ${aiHelp}</p>
    <p><strong>Style:</strong> ${style}</p>
    <p><strong>Notes:</strong> ${notes}</p>
    ${imageUrl && imageUrl !== "No preview generated" ? `<p><strong>Preview:</strong><br><img src="${imageUrl}" width="400" /></p>` : ""}
  `;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Honor Works" <${process.env.EMAIL_USERNAME}>`,
      to: process.env.EMAIL_RECEIVER,
      subject: "New Honor Works Design Submission",
      html: emailHTML,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Email submission error:", error);
    res.status(500).json({ success: false, error: "Email failed to send" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Backend live on port ${PORT}`));
