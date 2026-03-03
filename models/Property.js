const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
  propertyTypeName: { type: String },
  purpose: { type: String },
  price: { type: Number },

  address: { type: String },
  contactName: { type: String },
  contactPhone: { type: String },

  bedrooms: { type: Number },
  bathrooms: { type: String },
  propertyAge: { type: String },
  furnishingStatus: { type: String },
  parking: { type: String },
  facing: { type: String },
  urgency: { type: String },
  superArea: { type: String },

  source: { type: String },   // image or whatsapp
  rawText: { type: String },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Property", propertySchema);