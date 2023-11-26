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
    wordsPerString: options.wordsPerString,
  });
}
