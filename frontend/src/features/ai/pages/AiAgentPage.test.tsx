import { screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { renderWithProviders } from "../../../test/utils";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function renderWithDifyUrl(url: string | undefined) {
  vi.resetModules();
  if (url === undefined) {
    vi.stubEnv("VITE_DIFY_APP_URL", "");
  } else {
    vi.stubEnv("VITE_DIFY_APP_URL", url);
  }
  const { AiAgentPage: Page } = await import("./AiAgentPage");
  return renderWithProviders(<Page />);
}

describe("AiAgentPage", () => {
  it("embeds the Dify app in an iframe when the URL is configured", async () => {
    await renderWithDifyUrl("http://localhost:8080/chatbot/test-app");

    const frame = screen.getByTitle("Motion Nova AI Agent") as HTMLIFrameElement;
    expect(frame).toBeInTheDocument();
    expect(frame.getAttribute("src")).toBe("http://localhost:8080/chatbot/test-app");
  });

  it("shows a configuration message when the URL is missing", async () => {
    await renderWithDifyUrl(undefined);

    expect(
      screen.getByText("Dify AI Agent URL is not configured. Set VITE_DIFY_APP_URL.")
    ).toBeInTheDocument();
    expect(screen.queryByTitle("Motion Nova AI Agent")).not.toBeInTheDocument();
  });
});
