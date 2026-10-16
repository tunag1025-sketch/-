import { connection } from "next/server";
import { currentUser, enabledProviders } from "@/lib/server/auth";

/** 로그인을 쓸 수 있는지, 지금 누가 로그인했는지 */
export async function GET() {
  await connection();
  const providers = enabledProviders();
  const user = providers.length ? await currentUser().catch(() => null) : null;
  return Response.json({
    enabled: providers.length > 0,
    providers,
    user: user && { id: user.id, name: user.name, image: user.image, role: user.role },
  });
}
