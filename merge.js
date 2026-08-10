const fs = require('fs');

function mergeIndex() {
  const part1 = fs.readFileSync('part1.html', 'utf8');
  const slides = fs.readFileSync('slides.txt', 'utf8');
  const part2 = fs.readFileSync('part2.html', 'utf8');

  // Verify that the files are not empty
  if (!part1 || !slides || !part2) {
    console.error('Error: One of the source files (part1.html, slides.txt, part2.html) is empty!');
    process.exit(1);
  }

  // Concatenate parts. Note: slides already has its own newlines, but let's make sure things transition smoothly.
  fs.writeFileSync('index.html', part1 + slides + part2);
  console.log('Successfully merged part1.html, slides.txt, and part2.html into index.html');
}

mergeIndex();
