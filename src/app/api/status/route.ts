import { connection } from "next/server";

/** 클라이언트가 AI 기능을 쓸 수 있는지(서버에 키가 있는지) 확인한다. */
export async function GET() {
  await connection();
  return Response.json({ ai: Boolean(process.env.ANTHROPIC_API_KEY) });
}
