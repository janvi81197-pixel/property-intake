const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const Property = require("./models/Property");

const vision = require("@google-cloud/vision");
const multer = require("multer");

// Configure multer (store file in memory)
const upload = multer({ storage: multer.memoryStorage() });

// Parse Google credentials from environment
const visionClient = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS)
});

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.error("MongoDB Error:", err));

app.get("/", (req, res) => {
  res.send("Server Running 🚀");
});

const PORT = process.env.PORT || 5000;

// WhatsApp Manual Entry Endpoint
app.post("/whatsapp-entry", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // -------------------------------
    // Extract phone number (10 digits)
    // -------------------------------
    const phoneMatch = message.match(/\b\d{10}\b/);
    const contactPhone = phoneMatch ? phoneMatch[0] : "";

    // Duplicate check
    if (contactPhone) {
      const existing = await Property.findOne({ contactPhone });
      if (existing) {
        return res.status(400).json({
          error: "Duplicate entry: Phone number already exists"
        });
      }
    }

    // -------------------------------
    // Extract BHK
    // -------------------------------
    const bhkMatch = message.match(/(\d)\s*BHK/i);
    const bedrooms = bhkMatch ? parseInt(bhkMatch[1]) : "";

    // -------------------------------
    // Extract Price
    // -------------------------------
    const priceMatch = message.match(/(\d+(\.\d+)?)\s*(L|Lakh|lac|Cr|crore)/i);
    let price = "";
    if (priceMatch) {
      let value = parseFloat(priceMatch[1]);
      if (/cr|crore/i.test(priceMatch[3])) {
        price = value * 10000000;
      } else {
        price = value * 100000;
      }
    }

    // -------------------------------
    // Detect Property Type
    // -------------------------------
    let propertyTypeName = "";
    if (/builder\s*floor/i.test(message)) {
      propertyTypeName = "Builder Floor";
    } else if (/apartment|flat/i.test(message)) {
      propertyTypeName = "Apartment";
    } else if (/kothi/i.test(message)) {
      propertyTypeName = "Kothi";
    }

    // -------------------------------
    // Detect Purpose (Sale / Rent)
    // -------------------------------
    let purpose = "";
    if (/rent/i.test(message)) {
      purpose = "Rent";
    } else if (/sale|sell/i.test(message)) {
      purpose = "Sale";
    }

    // -------------------------------
    // Detect urgency
    // -------------------------------
    const urgency = message.toLowerCase().includes("urgent") ? "Yes" : "";

    // -------------------------------
    // Extract Super Area
    // -------------------------------
    const areaMatch = message.match(/(\d+(\.\d+)?)\s*(sq\s*ft|sqft|ft|mtr|meter)/i);
    const superArea = areaMatch ? areaMatch[1] : "";

    // -------------------------------
    // Create Entry
    // -------------------------------
    const newEntry = new Property({
      propertyTypeName,
      purpose,
      price,
      address: "",
      contactName: "",
      contactPhone,
      bedrooms,
      bathrooms: "",
      propertyAge: "",
      furnishingStatus: "",
      parking: "",
      facing: "",
      urgency,
      superArea,
      source: "whatsapp",
      rawText: message
    });

    await newEntry.save();

    res.json({
      message: "Entry saved successfully",
      data: newEntry
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// OCR Image Upload Endpoint
app.post("/ocr-upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    // Send image buffer to Google Vision
    const [result] = await visionClient.textDetection({
      image: { content: req.file.buffer }
    });

    const detections = result.textAnnotations;
    const extractedText = detections.length > 0 ? detections[0].description : "";

    res.json({
      message: "OCR successful",
      extractedText
    });

  } catch (error) {
    console.error("OCR Error:", error);
    res.status(500).json({ error: "OCR failed" });
  }
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});