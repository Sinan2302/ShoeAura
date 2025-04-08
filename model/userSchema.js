const mongoose = require("mongoose");
const { Schema } = mongoose;
const crypto = require("crypto");

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, unique: false, sparse: true, default: null },
  googleId: { type: String, unique: true, sparse: true, default: undefined },
  password: { type: String, required: false },
  isBlocked: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  cart: [{ type: Schema.Types.ObjectId, ref: "Cart" }],

  wallet: {
    balance: { type: Number, default: 0 },
    transactions: [
      {
        amount: Number,
        type: { type: String, enum: ["credit", "debit"], required: true },
        description: String,
        date: { type: Date, default: Date.now }
      }
    ]
  },

  wishlist: [{ type: Schema.Types.ObjectId, ref: "wishlist" }],
  orderHistory: [{ type: Schema.Types.ObjectId, ref: "Order" }],
  createdOn: { type: Date, default: Date.now },

  referralCode: { type: String, unique: true },
  referrerId: { type: Schema.Types.ObjectId, ref: "User", default: null }, 
  redeemed: { type: Boolean, default: false },
  redeemedUser: [{ type: Schema.Types.ObjectId, ref: "User" }], 

  searchHistory: [
    {
      category: { type: Schema.Types.ObjectId, ref: "category" },
      brand: { type: String },
      searchOn: { type: Date, default: Date.now }
    }
  ]
});

userSchema.pre("save", async function (next) {
    if (!this.referralCode) {
        while (true) {
            const newCode = crypto.randomBytes(3).toString("hex").toUpperCase();
            const existingUser = await mongoose.model("User").findOne({ referralCode: newCode });
            if (!existingUser) {
                this.referralCode = newCode;
                break;
            }
        }
    }
    next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
