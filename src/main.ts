import './style.css';
import p5 from 'p5';

const root = document.getElementById('p5-root')
if (!root) {
  throw new Error('Cannot find element root #p5-root')
}

export const myp5 = new p5(function (p: p5) {
  Object.assign(p, {
    setup() {
      p.createCanvas(500, 500, p.WEBGL);
      p.background('skyblue');
      p.describe('A white square with a black outline in on a gray canvas.');
    },
    draw() {
      p.background(200);
      // Rotate around the y-axis.
      p.orbitControl()
    
      // Draw the square -- 'holds numbers'
      p.box(-50, -50, -50)
    }
  } satisfies Partial<typeof p>)
}, root);