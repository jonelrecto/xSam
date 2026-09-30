"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToR2 = void 0;
exports.uploadToStorage = uploadToStorage;
const client_s3_1 = require("@aws-sdk/client-s3");
const supabase_js_1 = require("@supabase/supabase-js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "exam-drawings";
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || "http://localhost:3000/uploads";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let s3Client = null;
if (R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ACCESS_KEY_ID !== "mock-access-key") {
    s3Client = new client_s3_1.S3Client({
        endpoint: R2_ENDPOINT,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
        region: "auto",
    });
}
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_URL !== "https://mock.supabase.co") {
    supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
async function uploadToStorage(destinationKey, buffer, contentType) {
    // 1. Primary: Cloudflare R2 / S3 Storage
    if (s3Client) {
        try {
            await s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: destinationKey,
                Body: buffer,
                ContentType: contentType,
            }));
            return `${R2_PUBLIC_DOMAIN}/${destinationKey}`;
        }
        catch (err) {
            console.warn("⚠️ R2 upload failed, attempting Supabase Storage fallback...", err);
        }
    }
    // 2. Secondary: Supabase Storage
    if (supabase) {
        try {
            const { data, error } = await supabase.storage
                .from(R2_BUCKET_NAME)
                .upload(destinationKey, buffer, { contentType, upsert: true });
            if (!error) {
                const { data: publicData } = supabase.storage
                    .from(R2_BUCKET_NAME)
                    .getPublicUrl(destinationKey);
                return publicData.publicUrl;
            }
            console.warn("⚠️ Supabase Storage upload error:", error);
        }
        catch (err) {
            console.warn("⚠️ Supabase fallback failed, resorting to local storage server...", err);
        }
    }
    // 3. Dev Local Disk Fallback (Guarantees local testing works out-of-the-box)
    const uploadsDir = path_1.default.join(process.cwd(), "public", "uploads", path_1.default.dirname(destinationKey));
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path_1.default.join(process.cwd(), "public", "uploads", destinationKey);
    fs_1.default.writeFileSync(filePath, buffer);
    return `${process.env.APP_BASE_URL || "http://localhost:3000"}/uploads/${destinationKey}`;
}
// Backward compatible alias matching the implementation plan route snippet
exports.uploadToR2 = uploadToStorage;
