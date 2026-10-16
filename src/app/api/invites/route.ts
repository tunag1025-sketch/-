import { createInvite, currentUser, deleteInvite, listInvites } from "@/lib/server/auth";

async function admin() {
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}
const forbidden = () => Response.json({ code: "FORBIDDEN", message: "관리자만 초대할 수 있어요." }, { status: 403 });

export async function GET() {
  if (!(await admin())) return forbidden();
  return Response.json({ invites: await listInvites() });
}

export async function POST() {
  const user = await admin();
  if (!user) return forbidden();
  return Response.json({ code: await createInvite(user.id) });
}

export async function DELETE(request: Request) {
  if (!(await admin())) return forbidden();
  const code = new URL(request.url).searchParams.get("code");
  if (code) await deleteInvite(code);
  return Response.json({ ok: true });
}
