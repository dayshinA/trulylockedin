import type { UploadKind } from "./limits";

// Browser side of an admin upload: ask /api/cloudinary/sign for a signature,
// then post the file straight to Cloudinary. XMLHttpRequest rather than fetch,
// because fetch can't report upload progress.

export type UploadedAsset = {
  publicId: string;
  type: UploadKind;
  width: number;
  height: number;
};

export class UploadError extends Error {
  constructor(
    message: string,
    // Worth offering "Try again" (network or server trouble, not the file).
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

type PostResult = { status: number; body: unknown };

function errorMessage(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return undefined;
  }
  const { error } = body;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    return typeof error.message === "string" ? error.message : undefined;
  }
  return undefined;
}

function post(
  url: string,
  body: FormData,
  onProgress: (fraction: number) => void,
): Promise<PostResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.response });
    xhr.onerror = () =>
      reject(
        new UploadError(
          "The upload was interrupted. Check your connection and try again.",
          true,
        ),
      );
    xhr.send(body);
  });
}

async function sign(
  file: File,
): Promise<{ url: string; fields: Record<string, string> }> {
  let response: Response;
  try {
    response = await fetch("/api/cloudinary/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
    });
  } catch {
    throw new UploadError(
      "Couldn't reach the server. Check your connection and try again.",
      true,
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new UploadError(
      errorMessage(body) ?? "Couldn't start the upload. Try again.",
      response.status !== 400,
    );
  }
  return body as { url: string; fields: Record<string, string> };
}

export async function uploadMedia(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<UploadedAsset> {
  const { url, fields } = await sign(file);
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append("file", file);

  const { status, body } = await post(url, form, onProgress);
  if (status < 200 || status >= 300) {
    const reason = errorMessage(body);
    throw new UploadError(
      reason
        ? `${file.name} was refused: ${reason}`
        : `${file.name} couldn't be uploaded. Try again.`,
      status >= 500 || status === 0,
    );
  }
  const { public_id, resource_type, width, height } = (body ?? {}) as Record<
    string,
    unknown
  >;
  if (
    typeof public_id !== "string" ||
    (resource_type !== "image" && resource_type !== "video") ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    throw new UploadError(`${file.name} couldn't be uploaded. Try again.`, true);
  }
  return { publicId: public_id, type: resource_type, width, height };
}
