import { getAdmin } from "@/lib/auth/dal";
import { signUpload } from "@/lib/cloudinary";
import { checkUpload, uploadFileSchema } from "@/lib/media/limits";

// Signs one admin upload (see lib/media/upload.ts). Admin session required.
// The file is checked against the same limits as the picker before signing.
export async function POST(request: Request) {
  if (!(await getAdmin())) {
    return Response.json(
      { error: "Your session has ended. Sign in again, then retry." },
      { status: 401 },
    );
  }
  const file = uploadFileSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!file.success) {
    return Response.json({ error: "Invalid upload request" }, { status: 400 });
  }
  const check = checkUpload(file.data, true);
  if (!check.ok) {
    return Response.json({ error: check.message }, { status: 400 });
  }
  return Response.json(signUpload(check.kind));
}
