// Browser-side helper for calling the app's JSON API. It turns every
// response into one of two shapes, so forms never have to guess:
//   { ok: true, data }  or  { ok: false, error, fields }

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; fields: Record<string, string> };

type Method = "GET" | "POST" | "PUT" | "DELETE";

export async function api<T = unknown>(
  url: string,
  options: { method?: Method; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const { method = "GET", body } = options;
  const isForm = body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined || isForm ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, error: "Couldn't reach the server. Check your connection.", fields: {} };
  }

  const payload = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, data: payload as T };
  return {
    ok: false,
    status: res.status,
    error: payload.error ?? "Something went wrong.",
    fields: payload.fields ?? {},
  };
}
