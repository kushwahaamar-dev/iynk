import type { Project } from "@/project/generated/types";

/** A robot project needs the physics engine; every other project runs without it. */
export const needsPhysics = (doc: Project): boolean => doc.domains?.robotics !== undefined && (doc.mechanical?.bodies.length ?? 0) > 0;
