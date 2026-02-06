"use client";

import { Player } from "@remotion/player";
import { KontextDemoVideo } from "./video/Video";
import { TOTAL_FRAMES, FRAME_RATE } from "./video/styles";

export function VideoDemo() {
  return (
    <div className="relative mx-auto max-w-4xl overflow-hidden rounded-xl border border-border/40 shadow-2xl">
      <Player
        component={KontextDemoVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FRAME_RATE}
        compositionWidth={1920}
        compositionHeight={1080}
        style={{
          width: "100%",
          aspectRatio: "16/9",
        }}
        controls
        autoPlay
        loop
      />
    </div>
  );
}
