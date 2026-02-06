import React from "react";
import { Composition } from "remotion";
import { KontextDemoVideo } from "./Video";
import { TOTAL_FRAMES, FRAME_RATE } from "./styles";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="KontextDemo"
        component={KontextDemoVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FRAME_RATE}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
