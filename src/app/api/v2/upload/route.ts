import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * POST /api/v2/upload
 * Upload and parse files (CSV, Excel, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: "Invalid file type. Only CSV and Excel files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filepath = join(uploadsDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Parse file based on type
    let parsedData = null;
    if (file.name.endsWith(".csv")) {
      parsedData = await parseCSV(buffer.toString("utf-8"));
    } else {
      // For Excel files, you would need a library like 'xlsx'
      // For now, return file info only
      parsedData = {
        message: "Excel parsing requires additional setup. File saved successfully.",
      };
    }

    return NextResponse.json({
      success: true,
      filename,
      filepath: `/uploads/${filename}`,
      size: file.size,
      type: file.type,
      parsedData,
    });
  } catch (error: any) {
    console.error("[UPLOAD-V2] Error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * Parse CSV file content
 */
async function parseCSV(content: string) {
  const lines = content.split("\n").filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error("File is empty");
  }

  // Simple CSV parser (handles basic CSV)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => parseCSVLine(line));

  return {
    headers,
    rows,
    totalRows: rows.length,
    totalColumns: headers.length,
  };
}

/**
 * GET /api/v2/upload
 * Get list of uploaded files
 */
export async function GET() {
  try {
    const uploadsDir = join(process.cwd(), "uploads");

    if (!existsSync(uploadsDir)) {
      return NextResponse.json({ files: [] });
    }

    const { readdir, stat } = await import("fs/promises");
    const files = await readdir(uploadsDir);

    const fileList = await Promise.all(
      files.map(async (filename) => {
        const filepath = join(uploadsDir, filename);
        const stats = await stat(filepath);

        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime,
          url: `/uploads/${filename}`,
        };
      })
    );

    return NextResponse.json({ files: fileList });
  } catch (error: any) {
    console.error("[UPLOAD-V2] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
