import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/mailer";
import { getDatabase } from "../db/mongodb";

// In-memory OTP store with TTL (email -> { code, expiresAt })
const emailOtpStore = new Map<string, { code: string; expiresAt: number }>();

const JWT_SECRET =
  process.env.JWT_MOCK_SECRET || process.env.JWT_SECRET || "change-this";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isExpired(ts: number) {
  return Date.now() > ts;
}

export const requestEmailOtp: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== "string") {
      return res
        .status(400)
        .json({ success: false, error: "Valid email is required" });
    }

    const code = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    emailOtpStore.set(email.toLowerCase(), { code, expiresAt });

    const subject = "Your OTP | Ashish Property";
    const html = `<p>Your Ashish Property verification code is <strong style="font-size:18px">${code}</strong>.</p><p>This code will expire in 10 minutes. If you did not request this, you can ignore this email.</p>`;

    try {
      await sendEmail(email, subject, html, `Your OTP code is ${code}`);
    } catch (e: any) {
      // Do not leak internals; still keep code in store for retries
      return res
        .status(500)
        .json({ success: false, error: "Failed to send OTP email" });
    }

    return res.json({ success: true, data: { message: "OTP sent" } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Unexpected error" });
  }
};

export const verifyEmailOtp: RequestHandler = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, error: "Email and OTP are required" });
    }

    const rec = emailOtpStore.get(String(email).toLowerCase());
    if (!rec || rec.code !== String(otp) || isExpired(rec.expiresAt)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired OTP" });
    }

    // One-time use: delete after successful verification
    emailOtpStore.delete(String(email).toLowerCase());

    // Find-or-create user minimally by email
    const db = getDatabase();
    let user = await db.collection("users").findOne({ email });
    if (!user) {
      const now = new Date();
      const name = email.split("@")[0];
      const doc = {
        name,
        email,
        phone: "",
        userType: "seller",
        createdAt: now,
        updatedAt: now,
      };
      const ins = await db.collection("users").insertOne(doc as any);
      user = { _id: ins.insertedId, ...doc } as any;
    }

    const token = jwt.sign(
      {
        userId: String(user._id),
        userType: user.userType || "seller",
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          userType: user.userType || "seller",
        },
      },
      message: "OTP verified",
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Unexpected error" });
  }
};
