const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const AES_KEY = "RTO@29$!VEHICLE7";
const AES_ALGORITHM_ECB = "aes-128-ecb";
const AES_ALGORITHM_CBC = "aes-128-cbc";
const INPUT_ENCODING = "utf8";
const OUTPUT_ENCODING = "base64";

function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(16);
  const keyBuffer = Buffer.from(key, INPUT_ENCODING);
  const cipher = crypto.createCipheriv(AES_ALGORITHM_CBC, keyBuffer, iv);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(plaintext, INPUT_ENCODING, OUTPUT_ENCODING);
  encrypted += cipher.final(OUTPUT_ENCODING);
  const combined = Buffer.concat([iv, Buffer.from(encrypted, OUTPUT_ENCODING)]);
  return combined.toString(OUTPUT_ENCODING);
}

function encryptECB(plaintext, key) {
  const keyBuffer = Buffer.from(key, INPUT_ENCODING);
  const cipher = crypto.createCipheriv(AES_ALGORITHM_ECB, keyBuffer, null);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(plaintext, INPUT_ENCODING, OUTPUT_ENCODING);
  encrypted += cipher.final(OUTPUT_ENCODING);
  return encrypted;
}

function encryptRc(rcNumber) {
  const params = {};
  const rcParam = { encryptedKey: encryptECB("RN", AES_KEY), encryptedValue: encrypt(rcNumber, AES_KEY) };
  const isdbParam = { encryptedKey: encryptECB("ISDB", AES_KEY), encryptedValue: encrypt("false", AES_KEY) };
  params[rcParam.encryptedKey] = rcParam.encryptedValue;
  params[isdbParam.encryptedKey] = isdbParam.encryptedValue;
  return params;
}

app.get('/vehicle', async (req, res) => {
  try {
    const owner = req.query.owner;

    if (!owner) {
      return res.status(400).json({ error: 'Missing owner parameter' });
    }

    const encryptedParams = encryptRc(owner);
    const EncRc = Object.values(encryptedParams)[0];

    const response = await axios.post(
      'https://rcdetailsapi.vercel.app/rcdetails',
      `rc_no=${encodeURIComponent(EncRc)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json(response.data);

  } catch (error) {

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'May The FBI be with you!',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;