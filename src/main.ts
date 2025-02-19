import './style.css';
import p5 from 'p5';

const root = document.getElementById('p5-root')
if (!root) {
  throw new Error('Cannot find element root #p5-root')
}

export const myp5 = new p5(function (p: p5) {
  let font: p5.Font

  Object.assign(p, {
    preload() {
      // can preload assets here...
      font = p.loadFont('/public/fonts/inconsolata.otf');
    },
    setup() {
      p.createCanvas(500, 500, p.WEBGL);
      p.background('skyblue');
      p.describe('A white square with a black outline in on a gray canvas.');

      // setup some basic text + font
      p.textFont(font)
      p.textSize(36)
    },
    draw() {
      p.background('skyblue');
      // Rotate around the y-axis.
      p.orbitControl()
    
      // Draw the square -- 'holds numbers'
      p.box(-50, -50, -50)

      p.text('p5*js', 10, 50);
      p.describe('The text "p5*js" written in pink on a white background.');
    },
    
  } satisfies Partial<typeof p>)
}, root);