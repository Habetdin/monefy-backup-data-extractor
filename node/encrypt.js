const crypto = require('crypto');
const fs = require('fs');

const BACKUP_KEY = 'MyDifficultPassw';

function getCipher() {
  const algorithm = 'aes-128-ecb';
  const key = Buffer.from(BACKUP_KEY, 'utf8');
  return crypto.createCipheriv(algorithm, key, ''); // ECB mode doesn't require an IV
}

function encryptAndSave(inputPath, outputPath) {
  const inputStream = fs.createReadStream(inputPath);
  const fileOutputStream = fs.createWriteStream(outputPath);

  const cipher = getCipher();

  const cipherInputStream = inputStream.pipe(cipher);

  cipherInputStream
    .pipe(fileOutputStream)
    .on('error', (err) => {
      console.error(err);
    })
    .on('finish', () => {
      console.log('Encryption and saving completed.');
    });
}

const sqliteDatabasePath = process.argv[2];

if (sqliteDatabasePath) {
  if (!fs.existsSync(sqliteDatabasePath)) {
    console.log('File not found!');
    return;
  }
  encryptAndSave(sqliteDatabasePath, 'encrypted.monefy');
} else {
  console.log('Usage: node encrypt.js <sqliteDatabasePath>');
}
