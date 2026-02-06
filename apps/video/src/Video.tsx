import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { WithoutKontext } from "./scenes/WithoutKontext";
import { WithKontext } from "./scenes/WithKontext";
import { TheNumbers } from "./scenes/TheNumbers";
import { CTA } from "./scenes/CTA";
import {
  SCENE_1_START,
  SCENE_1_END,
  SCENE_2_START,
  SCENE_2_END,
  SCENE_3_START,
  SCENE_3_END,
  SCENE_4_START,
  SCENE_4_END,
  COLORS,
} from "./styles";

export const KontextDemoVideo: React.FC = () => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: COLORS.bg,
        position: "relative",
      }}
    >
      {/* Scene 1: Without Kontext (0-20s) */}
      <Sequence from={SCENE_1_START} durationInFrames={SCENE_1_END - SCENE_1_START}>
        <WithoutKontext />
      </Sequence>

      {/* Scene 2: With Kontext (20-45s) */}
      <Sequence from={SCENE_2_START} durationInFrames={SCENE_2_END - SCENE_2_START}>
        <WithKontext />
      </Sequence>

      {/* Scene 3: The Numbers (45-52s) */}
      <Sequence from={SCENE_3_START} durationInFrames={SCENE_3_END - SCENE_3_START}>
        <TheNumbers />
      </Sequence>

      {/* Scene 4: CTA (52-60s) */}
      <Sequence from={SCENE_4_START} durationInFrames={SCENE_4_END - SCENE_4_START}>
        <CTA />
      </Sequence>
    </div>
  );
};
