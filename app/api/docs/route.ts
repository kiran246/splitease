import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const spec = readFileSync(join(process.cwd(), "openapi.yaml"), "utf-8");
  return new NextResponse(spec, {
    headers: { "Content-Type": "application/yaml" },
  });
}
