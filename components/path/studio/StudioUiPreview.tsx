"use client";

import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useDeferredValue, useEffect, useMemo, useRef, type RefObject } from "react";

const HARNESS_APP = `import Page from "./StudentPage";

export default function App() {
  return <Page />;
}
`;

function StudioPreviewLifecycle({
  hostRef,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
}) {
  const { listen } = useSandpack();

  useEffect(() => {
    const unsubscribe = listen((message) => {
      if (message.type === "done" && message.compilatonError === false) {
        hostRef.current
          ?.querySelector<HTMLElement>(".sp-overlay.sp-loading")
          ?.style.setProperty("display", "none", "important");
      }
    });

    return unsubscribe;
  }, [hostRef, listen]);

  return null;
}

/**
 * Classic Sandpack React/TypeScript UI preview only.
 * Feeds the current app/page.tsx into a tiny harness — never Nodebox/Next/Vite.
 */
export default function StudioUiPreview({
  pageCode,
  runtime,
  headingId = "studio-preview-heading",
}: {
  pageCode: string;
  runtime: "browser_react" | "remote_node";
  headingId?: string;
}) {
  const previewHostRef = useRef<HTMLDivElement>(null);
  const previewCode = useDeferredValue(pageCode);
  const files = useMemo(
    () => ({
      "/App.tsx": HARNESS_APP,
      "/StudentPage.tsx": previewCode || "export default function Page() { return null; }\n",
    }),
    [previewCode],
  );

  return (
    <section className="studio-preview" aria-labelledby={headingId}>
      <div className="studio-panel-head studio-preview-head">
        <div className="studio-panel-label" id={headingId}>
          UI preview
        </div>
      </div>
      <p className="studio-preview-note" role="note">
        {runtime === "remote_node"
          ? "Browser UI only. Backend API and Postgres execution require the remote runtime."
          : "Browser UI only. Server and database work is not executed here."}
      </p>
      <div className="studio-browser-chrome" aria-hidden="true">
        <span className="studio-browser-dot" />
        <span className="studio-browser-dot" />
        <span className="studio-browser-dot" />
        <span className="studio-browser-url">localhost · classic Sandpack React/TS</span>
      </div>
      <div ref={previewHostRef} className="studio-sandpack">
        <SandpackProvider
          key={previewCode}
          template="react-ts"
          theme="dark"
          files={files}
          options={{
            initMode: "lazy",
            externalResources: [],
          }}
        >
          <SandpackLayout>
            <StudioPreviewLifecycle hostRef={previewHostRef} />
            <SandpackPreview
              showNavigator={false}
              showOpenInCodeSandbox={false}
              showRefreshButton
              style={{ height: "100%", minHeight: "14rem" }}
            />
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </section>
  );
}
