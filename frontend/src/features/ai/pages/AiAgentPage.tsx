const difyUrl = import.meta.env.VITE_DIFY_APP_URL;

export function AiAgentPage() {
  if (!difyUrl) {
    return <p>Dify AI Agent URL is not configured. Set VITE_DIFY_APP_URL.</p>;
  }

  return (
    <iframe
      src={difyUrl}
      title="Motion Nova AI Agent"
      allow="microphone"
      style={{ width: "100%", height: "calc(100vh - 64px)", minHeight: "720px", border: 0 }}
    />
  );
}
