const fs = require('fs');
const readline = require('readline');

async function splitIndex() {
  const fileStream = fs.createReadStream('index.html');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const part1Stream = fs.createWriteStream('part1.html');
  const slidesStream = fs.createWriteStream('slides.txt');
  const part2Stream = fs.createWriteStream('part2.html');

  let state = 'part1'; // 'part1', 'slides', 'part2'

  for await (const line of rl) {
    if (state === 'part1') {
      if (line.trim().startsWith('const SLIDES = [')) {
        state = 'slides';
        slidesStream.write(line + '\n');
      } else {
        part1Stream.write(line + '\n');
      }
    } else if (state === 'slides') {
      slidesStream.write(line + '\n');
      if (line.trim().endsWith('];')) {
        state = 'part2';
      }
    } else {
      part2Stream.write(line + '\n');
    }
  }

  part1Stream.end();
  slidesStream.end();
  part2Stream.end();
  console.log('Successfully dynamically split index.html into part1.html, slides.txt, and part2.html');
}

splitIndex();
