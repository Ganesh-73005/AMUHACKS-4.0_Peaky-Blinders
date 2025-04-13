const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email_address: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone_number: { type: String, required: true },
    age: { type: Number, required: true }, // Added age as a required number field
    income: { type: Number, required: true }, // Added income as a required number field
});

module.exports = mongoose.model("User", UserSchema);
