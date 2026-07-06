function getOtpRemainSeconds() {
  const epoch = Math.floor(Date.now() / 1000);
  return 30 - (epoch % 30);
}

function generateOtpCode(secret) {
  if (!secret) {
    return "";
  }

  secret = String(secret)
    .replace(/\s+/g, "")
    .toUpperCase();

  const key = base32Decode(secret);

  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);

  // 8-byte counter (big-endian)
  const counterBytes = new Array(8).fill(0);
  let temp = counter;

  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  // GAS 正确用法
  const hash = Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_SHA_1,
    counterBytes,
    key
  );

  const offset = hash[hash.length - 1] & 0x0f;

  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;

  return ("000000" + otp).slice(-6);
}

function base32Decode(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

  let bits = "";
  const bytes = [];

  input = input.replace(/=+$/, "");

  for (let i = 0; i < input.length; i++) {
    const val = alphabet.indexOf(input.charAt(i));

    if (val === -1) {
      throw new Error("OTP Secret 格式错误");
    }

    bits += ("00000" + val.toString(2)).slice(-5);
  }

  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }

  return bytes;
}


/* =========================================================
 * Debug
 * ========================================================= */

function testOtp() {
  const secret = "JP3OSA3CCXUNUANC";

  Logger.log("OTP: " + generateOtpCode(secret));
  Logger.log("剩余秒数: " + getOtpRemainSeconds());
}