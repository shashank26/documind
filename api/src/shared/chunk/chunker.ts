import { readFileSync } from 'node:fs';
import { Chunk } from './Chunk';
import { encoding_for_model } from 'tiktoken';

const encoder = encoding_for_model('text-embedding-3-small');

export const getTokenCount = (text: string) => {
  return encoder.encode(text).length;
};

const CHUNK_SIZE = 500;
const OVERLAP_SIZE = 100;
const MIN_CHUNK_SIZE = 200;

function* chunkBigString(data: string) {
  let remaining = data;

  while (remaining.length > 0) {
    let slice = '';
    let i = 0;

    // build slice character by character until token limit reached
    while (i < remaining.length) {
      const next = slice + remaining[i];
      if (getTokenCount(next) > CHUNK_SIZE) break;

      slice = next;
      i++;
    }

    const t = slice.trim();
    if (t) yield t;

    remaining = remaining.slice(i);
  }
}

function* splitBySentence(data: string) {
  const sentences = data.split(/(?<=[.!?])\s+/);
  for (let sentence of sentences) {
    const s = sentence.trim();
    if (!s) {
      continue;
    }
    if (getTokenCount(s) > CHUNK_SIZE) {
      yield* chunkBigString(s);
    } else {
      yield s;
    }
  }
}

function* splitByParagraphs(data: string) {
  const paragraphs = data.split(/\n{2,}/);
  for (let paragraph of paragraphs) {
    const p = paragraph.trim();
    if (!p) {
      continue;
    }
    if (getTokenCount(p) > CHUNK_SIZE) {
      yield* splitBySentence(p);
    } else {
      yield p;
    }
  }
}

export const chunkFile = (file: string) => {
  const chunks: Chunk[] = [];
  let id = 1;
  let currentText = '';
  for (let text of splitByParagraphs(file)) {
    const textString = text.trim();

    const currentTokens = getTokenCount(currentText);
    const textTokens = getTokenCount(textString);

    if (currentTokens + textTokens > CHUNK_SIZE) {
      if (currentTokens >= MIN_CHUNK_SIZE) {
        // ✅ push current chunk
        chunks.push(
          new Chunk({
            id: '' + id++,
            length: currentText.length,
            data: currentText,
            tokenLength: getTokenCount(currentText),
          }),
        );

        // ✅ apply overlap
        let overlapText = currentText.slice(-OVERLAP_SIZE);
        const lastSpace = overlapText.lastIndexOf(' ');
        if (lastSpace !== -1) {
          overlapText = overlapText.slice(lastSpace + 1);
        }

        currentText = overlapText;
      }
    }

    currentText += (currentText ? ' ' : '') + textString;
  }
  if (getTokenCount(currentText) < MIN_CHUNK_SIZE && chunks.length > 0) {
    const last = chunks[chunks.length - 1];
    last.data += (last.data ? ' ' : '') + currentText;
    last.length = last.data.length;
  } else if (currentText.length > 0) {
    chunks.push(
      new Chunk({
        id: '' + id++,
        length: currentText.length,
        data: currentText,
        tokenLength: getTokenCount(currentText),
      }),
    );
  }
  return chunks;
};

// const text = readFileSync('./glossary.txt').toString();

// console.log(chunkFile(text).map((chunk) => chunk.length));
