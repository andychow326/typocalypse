import { generate } from "random-words";

type RandomWordOptions = {
  minLength?: number;
  maxLength?: number;
  count?: number;
  wordsPerString?: number;
};

export function randomWords(options: RandomWordOptions): string[] {
  return generate({
    minLength: options.minLength,
    maxLength: options.maxLength,
    exactly: options.count,
    wordsPerString: options.wordsPerString
  });
}

export function randomPositions(
  numOfPositions: number
): { x: number; y: number; z: number }[] {
  const positions: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < numOfPositions; i += 1) {
    const x = Math.random() * 20 - 10;
    const y = 0;
    const z = Math.random() * 5 - 5;
    positions.push({ x, y, z });
  }
  return positions;
}
