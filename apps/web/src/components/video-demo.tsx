"use client";

export function VideoDemo() {
  return (
    <div className="relative mx-auto w-full overflow-hidden rounded-xl border border-border/40 shadow-2xl">
      <iframe
        src="https://demo-lemon-one-19.vercel.app"
        className="w-full border-0"
        style={{ height: "700px" }}
        title="Kontext Interactive Demo"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
