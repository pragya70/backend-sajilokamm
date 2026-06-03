import { Router } from "express";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File upload
 */

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload an image file (max 5MB)
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: JPEG, PNG, WEBP, or GIF — max 5MB
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 url:
 *                   type: string
 *                   description: Relative URL to access the uploaded file
 *                 filename:
 *                   type: string
 *                 size:
 *                   type: integer
 *                 type:
 *                   type: string
 *       400:
 *         description: No file or invalid file type
 */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: "No file uploaded" });
    if (!ALLOWED_TYPES.includes(file.mimetype)) return res.status(400).json({ success: false, error: "Invalid file type. Only images are allowed." });

    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.originalname.split(".").pop();
    const filename = `${timestamp}-${randomString}.${extension}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, file.buffer);

    return res.json({ success: true, url: `/uploads/${filename}`, filename, size: file.size, type: file.mimetype });
  } catch (err) {
    console.error("[UPLOAD]", err);
    return res.status(500).json({ success: false, error: err.message || "Upload failed" });
  }
});

export default router;
