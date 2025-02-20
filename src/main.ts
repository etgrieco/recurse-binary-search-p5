import "./style.css";
import p5 from "p5";

const root = document.getElementById("p5-root");
if (!root) {
  throw new Error("Cannot find element root #p5-root");
}

function getNumber() {
  return Math.floor(Math.random() * 100);
}

function randPosOrNegativeFactor() {
  return Math.floor(Math.random()) ? -1 : 1;
}

// Equal, to the nearest Xth
function isBasicallyEqual(a: number, b: number, power = 100): boolean {
  return Math.round(a * power) === Math.round(b * power);
}

let animationPhase = "START" as
  | "START"
  | "SPAWN_RANDOM_NUMBERS"
  | "COLLECT_NUMBERS"
  | "SPIN_NUMBERS_SPINNING"
  | "SPIT_OUT_10"
  | "END";

const FRAME_RATE_LOCK = 60;

export const myp5 = new p5(function (p: p5) {
  let font: p5.Font;

  // Global state
  const sortedNumbers = new Array(10)
    .fill(null)
    .map(getNumber)
    .sort((a, b) => a - b);

  // SPAWN_RANDOM_NUMBERS state
  const spawnRandomNumbersFactories: {
    drawNumber: (context: p5) => void;
    xPos: number;
    yPos: number;
  }[] = [];

  // SPIN_NUMBERS_SPINNING state
  let spinNumbersFrameCount = 0;

  // SPIT_OUT_10 state
  const sortedNumberObjs = sortedNumbers.map((n) => ({
    n,
    posX: 0,
    posY: 0,
  }));
  // start at full alpha
  let boxAlphaDecay = 255;

  // DEBUG: start phase; should be START in prod
  animationPhase = "START";

  Object.assign(p, {
    preload() {
      // can preload assets here...
      font = p.loadFont("/public/fonts/inconsolata.otf");
    },
    setup() {
      p.frameRate(FRAME_RATE_LOCK);
      p.createCanvas(800, 600, p.WEBGL);
      p.background("skyblue");
      // setup some basic text + font
      p.textFont(font);
      p.textSize(36);
    },
    draw() {
      p.background("skyblue");
      p.orbitControl(); // helps with 'visual debugging', maybe turn off when done?

      if (animationPhase === "START") {
        // Draw the square -- 'holds numbers'
        p.box(-50, -50, -50);
        animationPhase = "COLLECT_NUMBERS";
      } else if (animationPhase === "COLLECT_NUMBERS") {
        p.box(-50, -50, -50);
        // every second, spawn a number
        if (p.frameCount % 15 === 0) {
          const nodeNumber = getNumber();

          const xPos = 0 + Math.random() * 100 * randPosOrNegativeFactor();
          const yPos = -50 + Math.random() * 100 * randPosOrNegativeFactor();
          spawnRandomNumbersFactories.push({
            drawNumber(ctx) {
              ctx.text(`${nodeNumber}`, this.xPos, this.yPos);
            },
            xPos,
            yPos,
          });
        }

        // go through factories...
        spawnRandomNumbersFactories.forEach((f) => f.drawNumber(p));
        p.describe("Box shooting out numbers");

        if (spawnRandomNumbersFactories.length >= 10) {
          animationPhase = "SPAWN_RANDOM_NUMBERS";
        }
      } else if (animationPhase === "SPAWN_RANDOM_NUMBERS") {
        p.box(-50, -50, -50);
        // Move to box origin...
        spawnRandomNumbersFactories.forEach((f) => {
          f.xPos = p.lerp(f.xPos, -10, 0.5);
          f.yPos = p.lerp(f.yPos, 10, 0.5);
          f.drawNumber(p);
        });

        if (
          spawnRandomNumbersFactories.every(
            (f) => f.xPos === -10 || f.yPos === 10
          )
        ) {
          animationPhase = "SPIN_NUMBERS_SPINNING";
        }
      } else if (animationPhase === "SPIN_NUMBERS_SPINNING") {
        p.push();
        p.rotateY(p.frameCount * 0.225);
        p.box(-50, -50, -50);
        p.pop();
        spinNumbersFrameCount++;

        // Has been running for > 3 seconds of frames
        if (spinNumbersFrameCount / FRAME_RATE_LOCK > 3) {
          animationPhase = "SPIT_OUT_10";
        }
      } else if (animationPhase === "SPIT_OUT_10") {
        const boxDecaySpeed = 3;
        const boxSize = 50;

        p.push();

        p.rotateY(p.frameCount * 0.225);
        drawBox(
          p,
          boxSize,
          [255, 255, 255, boxAlphaDecay],
          [0, 0, 0, boxAlphaDecay]
        );
        // decay fill
        if (boxAlphaDecay > 0) {
          boxAlphaDecay -= boxDecaySpeed;
        }
        p.pop();

        // Then, put out 10 squares, like dealing cards!
        let getTargetX = (idx: number) => idx * 70 - 350;
        let getTargetY = (_idx: number) => 100;

        sortedNumberObjs.forEach((num, idx) => {
          num.posX = p.lerp(num.posX, getTargetX(idx), 0.05);
          num.posY = p.lerp(num.posY, getTargetY(idx), 0.05);

          p.push();
          p.fill(255, 165, 0);
          p.square(num.posX, num.posY, 50);
          p.pop();

          const everythingInItsRightPlace = sortedNumberObjs.every(
            (obj, idx) => {
              return (
                isBasicallyEqual(obj.posX, getTargetX(idx)) &&
                isBasicallyEqual(obj.posY, getTargetY(idx))
              );
            }
          );

          if (everythingInItsRightPlace && boxAlphaDecay <= 0) {
            animationPhase = "END";
          }
        });
      } else if (animationPhase === "END") {
        p.text("THE END!", 0, 0);
      } else {
        window.alert(`unhandled animation state ${animationPhase}`);
      }
    },
  } satisfies Pick<typeof p, "preload" | "setup" | "draw">);
}, root);

declare global {
  interface Window {
    debug: Record<string, any>;
  }
}

/** Manually draw a box, vs box() method, so I can do custom things to surfaces */
function drawBox(
  ctx: p5,
  size: number,
  fillColor: [number, number, number, number],
  strokeColor: [number, number, number, number]
) {
  let halfSize = size / 2;

  // Define the 8 corners of the cube
  let vectors = [
    ctx.createVector(-halfSize, -halfSize, halfSize), // 0: Front top-left
    ctx.createVector(halfSize, -halfSize, halfSize), // 1: Front top-right
    ctx.createVector(halfSize, halfSize, halfSize), // 2: Front bottom-right
    ctx.createVector(-halfSize, halfSize, halfSize), // 3: Front bottom-left
    ctx.createVector(-halfSize, -halfSize, -halfSize), // 4: Back top-left
    ctx.createVector(halfSize, -halfSize, -halfSize), // 5: Back top-right
    ctx.createVector(halfSize, halfSize, -halfSize), // 6: Back bottom-right
    ctx.createVector(-halfSize, halfSize, -halfSize), // 7: Back bottom-left
  ];

  let faces = [
    { indices: [0, 1, 2, 3] }, // Front
    { indices: [5, 4, 7, 6] }, // Back
    { indices: [4, 0, 3, 7] }, // Left
    { indices: [1, 5, 6, 2] }, // Right
    { indices: [4, 5, 1, 0] }, // Top
    { indices: [3, 2, 6, 7] }, // Bottom
  ];

  for (let [i, face] of faces.entries()) {
    ctx.fill(...fillColor);
    ctx.stroke(...strokeColor);
    ctx.beginShape();
    for (let idx of face.indices) {
      const vec = vectors[idx];
      ctx.vertex(vec.x, vec.y, vec.z, i % 2, Math.floor(i / 2));
    }
    ctx.endShape(ctx.CLOSE);
  }
}

window.debug = {};

window.debug.getAnimationPhase = () => console.log(animationPhase);
