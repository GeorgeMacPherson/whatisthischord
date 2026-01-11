export type Template = {
  id: string;
  label: string;
  intervals: number[];
  important?: number[];
};

export const TEMPLATES: Template[] = [
  { id: "maj", label: "", intervals: [0, 4, 7], important: [4, 7] },
  { id: "min", label: "m", intervals: [0, 3, 7], important: [3, 7] },
  { id: "dim", label: "dim", intervals: [0, 3, 6], important: [3, 6] },
  { id: "aug", label: "aug", intervals: [0, 4, 8], important: [4, 8] },
  { id: "sus2", label: "sus2", intervals: [0, 2, 7], important: [2, 7] },
  { id: "sus4", label: "sus4", intervals: [0, 5, 7], important: [5, 7] },

  { id: "6", label: "6", intervals: [0, 4, 7, 9], important: [4, 9] },
  { id: "m6", label: "m6", intervals: [0, 3, 7, 9], important: [3, 9] },

  { id: "7", label: "7", intervals: [0, 4, 7, 10], important: [4, 10] },
  { id: "maj7", label: "maj7", intervals: [0, 4, 7, 11], important: [4, 11] },
  { id: "m7", label: "m7", intervals: [0, 3, 7, 10], important: [3, 10] },
  {
    id: "mMaj7",
    label: "m(maj7)",
    intervals: [0, 3, 7, 11],
    important: [3, 11],
  },
  {
    id: "m7b5",
    label: "m7♭5",
    intervals: [0, 3, 6, 10],
    important: [3, 6, 10],
  },
  { id: "dim7", label: "dim7", intervals: [0, 3, 6, 9], important: [3, 6, 9] },

  { id: "9", label: "9", intervals: [0, 4, 7, 10, 2], important: [4, 10, 2] },
  {
    id: "11",
    label: "11",
    intervals: [0, 4, 7, 10, 2, 5],
    important: [4, 10, 5],
  },
  {
    id: "13",
    label: "13",
    intervals: [0, 4, 7, 10, 2, 5, 9],
    important: [4, 10, 9],
  },
];

export const EXTENSION_LABELS: Record<number, string> = {
  1: "♭9",
  2: "9",
  3: "♯9",
  5: "11",
  6: "♯11",
  8: "♭13",
  9: "13",
};

export const ADD_LABELS: Record<number, string> = {
  2: "add9",
  5: "add11",
  9: "add13",
};
