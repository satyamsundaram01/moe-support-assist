// Utility to standardize error handling for tool requests
export function handleError(err, context = "") {
  let errorMsg = err?.message || String(err)
  let status = err?.response?.status || null
  let details = err?.response?.data || null
  return {
    success: false,
    error: errorMsg,
    status,
    context,
    details
  }
}
