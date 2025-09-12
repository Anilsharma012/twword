import nodemailer from "nodemailer";
import { getDatabase } from "../db/mongodb";

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedConfigHash = "";

async function loadEmailConfig() {
  try {
    const db = getDatabase();
    const settings = await db.collection("admin_settings").findOne({});
    const cfg = settings?.email || {};
    const host = cfg.smtpHost || process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(cfg.smtpPort || process.env.SMTP_PORT || 587);
    const user =
      cfg.smtpUsername ||
      process.env.SMTP_USERNAME ||
      process.env.SMTP_USER ||
      "";
    const pass =
      cfg.smtpPassword ||
      process.env.SMTP_PASSWORD ||
      process.env.SMTP_PASS ||
      "";
    const from = cfg.fromEmail || process.env.SMTP_FROM || user;
    return { host, port, user, pass, from };
  } catch {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USERNAME || process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "";
    const from = process.env.SMTP_FROM || user;
    return { host, port, user, pass, from };
  }
}

function configHash(c: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}) {
  return `${c.host}:${c.port}:${c.user}:${c.from}:${passMask(c.pass)}`;
}
function passMask(p: string) {
  return p ? String(p).slice(0, 2) + "***" : "";
}

export async function getTransporter() {
  const cfg = await loadEmailConfig();
  const hash = configHash(cfg);
  if (cachedTransporter && cachedConfigHash === hash)
    return { transporter: cachedTransporter, from: cfg.from };

  cachedConfigHash = hash;
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  return { transporter: cachedTransporter, from: cfg.from };
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
) {
  const { transporter, from } = await getTransporter();
  const info = await transporter.sendMail({ from, to, subject, html, text });
  return info;
}
