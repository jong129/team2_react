const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:9093";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

// ✅ 너 백엔드에 딱 맞는 API
export function fetchActiveTemplate(type) {
  return request(`/checklist/templates/active?type=${encodeURIComponent(type)}`);
}
