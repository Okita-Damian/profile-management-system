// utils/token.js
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ACCESS_TTL = "15m";
const REFRESH_TTL_DAYS = 7;

const sha256hex = (str) =>
  crypto.createHash("sha256").update(str).digest("hex");

// Create a strong opaque refresh token value (not a JWT)
function createOpaqueToken() {
  return crypto.randomBytes(64).toString("hex");
}

// Generate refresh token bundle (raw token to client, hash to DB)
function generateRefreshTokenBundle() {
  const raw = createOpaqueToken();
  const jti = crypto.randomUUID();
  const hash = sha256hex(raw);
  const expiresAt = new Date(
    Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  return { raw, hash, jti, expiresAt };
}

// Access token (JWT)
function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

module.exports = {
  sha256hex,
  generateRefreshTokenBundle,
  signAccessToken,
};
