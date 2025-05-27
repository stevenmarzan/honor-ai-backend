const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

app.post("/api/generate-image", async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ prompt, n: 1, size: "512x512" })
    });

    const data = await response.json();
    res.json({ imageUrl: data.data[0].url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

app.post("/api/submit-design", upload.array("attachments"), async (req, res) => {
  const data = JSON.parse(req.body.data);
  const files = req.files;

  const emailBody = `
    <h2>New Honor Works Design Request</h2>
    <p><strong>Name:</strong> ${data.customerName}</p>
    <p><strong>Email:</strong> ${data.customerEmail}</p>
    <p><strong>Recipient:</strong> ${data.recipient}</p>
    <p><strong>Message:</strong> ${data.message}</p>
    <p><strong>AI Help:</strong> ${data.aiHelp}</p>
    <p><strong>Purpose:</strong> ${data.purpose}</p>
    <p><strong>Style:</strong> ${data.style}</p>
    <p><strong>Notes:</strong> ${data.notes}</p>
    ${data.imageUrl ? `<p><strong>AI Preview:</strong><br><img src="${data.imageUrl}" width="400" style="border-radius:8px; margin-top:10px;" /></p>` : ''}
  `;

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const attachments = files.map(file => ({
    filename: file.originalname,
    path: file.path
  }));

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: process.env.EMAIL_RECEIVER,
    subject: "New Honor Works Design Submission",
    html: emailBody,
    attachments
  };

  const confirmationOptions = {
    from: process.env.EMAIL_USERNAME,
    to: data.customerEmail,
    subject: "We've received your design request!",
    html: `<p>Hi ${data.customerName},</p><p>Thank you for submitting your custom design request to Honor Works. We'll review your submission and follow up shortly!</p><p>Best regards,<br>Honor Works & Apparel</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(confirmationOptions);
    files.forEach(file => fs.unlinkSync(file.path));
    res.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Backend live on port ${PORT}`));
