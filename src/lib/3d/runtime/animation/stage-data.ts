import animationStagesData from "./animation_stages.json";
import type { StageDefinition, StageId } from "./types";

const FPS = animationStagesData.fps;

export const STAGES: StageDefinition[] = animationStagesData.stages.map((stage) => {
  const startFrame = stage.start;
  const parkFrame = stage.park || (stage as any).end || stage.start;
  
  const def: StageDefinition = {
    id: stage.id as StageId,
    startTime: startFrame / FPS,
    parkTime: parkFrame / FPS,
  };

  if ((stage as any).end !== undefined) {
    // @ts-ignore
    def.endTime = (stage as any).end / FPS;
  }

  return def;
});

export const ASSEMBLED_TIME = STAGES[0]?.startTime ?? 0.0416666; // Typically 1 / 24 = 0.04166...
export const TIMELINE_DURATION = animationStagesData.frame_end / FPS;
