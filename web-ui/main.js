const BACKUP_KEY = 'MyDifficultPassw'

function isSQLiteDatabase(inputBytes) {
    const sqliteHeader = 'SQLite format 3'
    const headerBytes = new TextEncoder().encode(sqliteHeader)
    for (let i = 0; i < headerBytes.length; i++) {
        if (inputBytes[i] !== headerBytes[i]) {
            return false
        }
    }
    return true
}

function arrayBufferToWordArray(arrayBuffer) {
    const words = []
    const view = new DataView(arrayBuffer)
    for (let i = 0; i < arrayBuffer.byteLength; i += 4) {
        words.push(view.getInt32(i, false))
    }
    return CryptoJS.lib.WordArray.create(words, arrayBuffer.byteLength)
}

function wordArrayToUint8Array(wordArray) {
    const bytes = new Uint8Array(wordArray.sigBytes)
    for (let i = 0; i < wordArray.sigBytes; i++) {
        bytes[i] = wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8) & 0xff
    }
    return bytes
}

function downloadBlob(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}

function decryptAndSave(file) {
    const fileReader = new FileReader()

    fileReader.onload = async (event) => {
        try {
            const encryptedDataWordArray = arrayBufferToWordArray(event.target.result)
            const key = CryptoJS.enc.Utf8.parse(BACKUP_KEY)
            const decryptedData = CryptoJS.AES.decrypt(
                { ciphertext: encryptedDataWordArray },
                key,
                { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
            )

            const decryptedBytes = wordArrayToUint8Array(decryptedData)

            if (!isSQLiteDatabase(decryptedBytes)) {
                alert('Decryption failed: Given file is not a valid Monefy backup')
                return
            }

            downloadBlob(decryptedBytes, file.name + '_decrypted.db')
        } catch (error) {
            alert('Decryption failed: ' + error.message)
        }
    }

    fileReader.onerror = () => {
        alert('File reading failed: ' + fileReader.error)
    }

    fileReader.readAsArrayBuffer(file)
}

function encryptAndSave(file) {
    const fileReader = new FileReader()

    fileReader.onload = async (event) => {
        try {
            if (!isSQLiteDatabase(new Uint8Array(event.target.result))) {
                alert('Encryption failed: Given file is not a valid SQLite database')
                return
            }

            const plainDataWordArray = arrayBufferToWordArray(event.target.result)
            const key = CryptoJS.enc.Utf8.parse(BACKUP_KEY)
            const encryptedData = CryptoJS.AES.encrypt(
                plainDataWordArray,
                key,
                { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
            )

            const encryptedBytes = wordArrayToUint8Array(encryptedData.ciphertext)

            downloadBlob(encryptedBytes, file.name + '_encrypted.monefy')
        } catch (error) {
            alert('Encryption failed: ' + error.message)
        }
    }

    fileReader.onerror = () => {
        alert('File reading failed: ' + fileReader.error)
    }

    fileReader.readAsArrayBuffer(file)
}

const fileInput = document.querySelector('#file')
const form = document.querySelector('#form')

form.addEventListener('submit', (e) => {
    e.preventDefault()
    const file = fileInput.files[0]
    if (file) {
        const action = e.submitter?.value ?? 'decrypt'
        if (action === 'encrypt') {
            encryptAndSave(file)
        } else {
            decryptAndSave(file)
        }
    } else {
        alert('Please select a file.')
    }
})
