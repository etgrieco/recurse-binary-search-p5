import "./style.css";
import p5 from "p5";

const root = document.getElementById("p5-root");
if (!root) {
  throw new Error("Cannot find element root #p5-root");
}

function getRandomPossibleNumber() {
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
  | "BS_HIGH_LOW_MID_CALC"
  | "BS_REVEAL_MID_AND_TRANSITION"
  | "ADJUST_HIGH_LOW"
  | "ADJUST_HIGH_LOW_NUMS"
  | "ADJUST_MID"
  | "ADJUST_MID_NUM"
  | "END";

const FRAME_RATE_LOCK = 60;

/**
 * Procedure containers allow us to handle certain things we want to include/exclude between basis by reference to an object.
 * We can probably just have this assigned to bare variables, but this allows us to conveniently use `runAndStore`, below, to run
 * then assign things to a given container (impossible with bare variables in a single statement)
 */
type ProcContainer = { proc: () => void };
/** Take a callback, run it, then store it in a procedure container. */
const runAndStoreProc = (
  cb: () => void,
  procContainer: ProcContainer
): void => {
  cb();
  procContainer.proc = cb;
};
const runProcs = (...procs: ProcContainer[]): void => {
  procs.forEach((p) => p.proc());
};

export const myp5 = new p5(function (p: p5) {
  let font: p5.Font;

  // Global state setup
  const sortedNumbers = new Array(10)
    .fill(null)
    .map(getRandomPossibleNumber)
    .sort((a, b) => a - b);

  // Some meaningless initial value to initialize the struct that will
  // be used between draws
  const binarySearchState = {
    low: 0,
    high: 0,
    mid: 0,
  };

  const needleToFind = (function () {
    const randomPresentValue =
      sortedNumbers[Math.floor(Math.random() * sortedNumbers.length)];
    return randomPresentValue;
    // TODO: Add ending condition for 'not found' so we can do not found as well
    // const shouldUseFoundNeedle = Math.random() > 0.1; // ~10% of the time, turn up empty
    // return shouldUseFoundNeedle
    //   ? getRandomPossibleNumber()
    //   : randomPresentValue;
  })();

  const sortedNumberObjs = sortedNumbers.map((n) => ({
    n,
    posX: 0,
    posY: 0,
  }));

  const outlineObjs = {
    low: {
      posX: 0,
      posY: 0,
    },
    mid: {
      posX: 0,
      posY: 0,
    },
    high: {
      posX: 0,
      posY: 0,
    },
  };

  const textHighLowMid = {
    high: {
      in: "",
      out: "",
    },
    low: {
      in: "",
      out: "",
    },
    mid: {
      in: "",
      out: "",
    },
  } satisfies Record<string, { in: string; out: string }>;

  // SPAWN_RANDOM_NUMBERS state
  const spawnRandomNumbersFactories: {
    drawNumber: (context: p5) => void;
    xPos: number;
    yPos: number;
  }[] = [];

  // SPIN_NUMBERS_SPINNING state
  let spinNumbersFrameCount = 0;

  // SPIT_OUT_10 state
  const spitOutTenSceneState = {
    // start at full alpha
    boxAlphaDecay: 255,
  };

  // BS_HIGH_LOW_MID_CALC state
  const highLowMidCountState = {
    highInitTime: 0,
    lowInitTime: 0,
    midInitTime: 0,
  };

  // BS_REVEAL_MID_AND_TRANSITION state
  const bsRevealMidAndTransitionState = {
    alphaTransitionPercent: 0,
  };

  // ADJUST_HIGH_LOW_NUMS state
  const adjustHighLowNumsState = {
    alphaDecayHighLow: 1,
  };

  // ADJUST_MID_NUMS state
  const adjustMidNumsState = {
    alphaDecayMid: 1,
  };

  const printSquaresAndIndexNumber: ProcContainer = { proc() {} };
  const printNumberToFind: ProcContainer = { proc() {} };
  const printHighIndexAndOutline: ProcContainer = { proc() {} };
  const printLowIndexAndOutline: ProcContainer = { proc() {} };
  const printMidIndexAndOutline: ProcContainer = { proc() {} };
  const printNumberAtMid: ProcContainer = { proc() {} };

  // DEBUG: start phase; should be START in prod
  animationPhase = "START";

  const HIGH_COLOR = [0, 0, 0] as const;
  const LOW_COLOR = [255, 255, 255] as const;
  const MID_COLOR = [255, 0, 0] as const;
  const BASELINE_Y_HIGHLOWMID_OFFSET = 70;

  Object.assign(p, {
    preload() {
      // can preload assets here...
      console.log("url", import.meta.url);
      font = p.loadFont(
        new URL("../public/fonts/inconsolata.otf", import.meta.url).href
      );
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
      // Execute procedures stored in previous stage
      p.background("skyblue");
      p.orbitControl(); // helps with 'visual debugging', maybe turn off when done?

      if (animationPhase === "START") {
        // Draw the square -- 'holds numbers'
        p.box(-50, -50, -50);
        animationPhase = "COLLECT_NUMBERS";
      } else if (animationPhase === "COLLECT_NUMBERS") {
        p.box(-50, -50, -50);
        // every so often, spawn a number
        if (p.frameCount % 15 === 0) {
          const nodeNumber = getRandomPossibleNumber();

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
        p.textAlign(p.CENTER, p.CENTER);
        p.text("Sorting...", 0, -100);

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
        const BOX_DECAY_SPEED = 3;
        const BOX_SIZE = 50;

        p.textAlign(p.CENTER, p.CENTER);
        p.fill(255, 255, 255, spitOutTenSceneState.boxAlphaDecay);
        p.text("Sorting...", 0, -100);

        p.push();
        p.rotateY(p.frameCount * 0.225);
        drawBox(
          p,
          BOX_SIZE,
          [255, 255, 255, spitOutTenSceneState.boxAlphaDecay],
          [0, 0, 0, spitOutTenSceneState.boxAlphaDecay]
        );
        // decay fill
        if (spitOutTenSceneState.boxAlphaDecay > 0) {
          spitOutTenSceneState.boxAlphaDecay -= BOX_DECAY_SPEED;
        }
        p.pop();

        // Then, put out 10 squares, like dealing cards!
        let getTargetX = (idx: number) => idx * 70 - 350;
        let getTargetY = (_idx: number) => 100;

        sortedNumberObjs.forEach((num, idx) => {
          num.posX = p.lerp(num.posX, getTargetX(idx), 0.05);
          num.posY = p.lerp(num.posY, getTargetY(idx), 0.05);

          p.push();
          p.fill(0, 0, 0);
          p.square(num.posX, num.posY, 50);
          p.pop();
        });

        const everythingInItsRightPlace = sortedNumberObjs.every((obj, idx) => {
          return (
            isBasicallyEqual(obj.posX, getTargetX(idx)) &&
            isBasicallyEqual(obj.posY, getTargetY(idx))
          );
        });

        if (
          everythingInItsRightPlace &&
          spitOutTenSceneState.boxAlphaDecay <= 0
        ) {
          animationPhase = "BS_HIGH_LOW_MID_CALC";
        }
      } else if (animationPhase === "BS_HIGH_LOW_MID_CALC") {
        // prepare the binary search initial state... (minor waste compute, who cares)
        binarySearchState.low = 0;
        binarySearchState.high = sortedNumbers.length - 1;
        binarySearchState.mid = Math.floor(
          (binarySearchState.high + binarySearchState.low) / 2
        );

        // Basic render details...
        runAndStoreProc(() => {
          sortedNumberObjs.forEach((obj, idx) => {
            // square
            p.fill(0, 0, 0);
            p.stroke(0, 0, 0);
            p.square(obj.posX, obj.posY, 50);

            // and their corresponding indices
            p.textAlign(p.CENTER, p.BASELINE);
            p.text(`${idx}`, obj.posX + 50 / 2, obj.posY + 100);
            // maybe these draw steps should be encapsulated?
          });
        }, printSquaresAndIndexNumber);

        runAndStoreProc(() => {
          // now, print the number to find:
          p.stroke(255, 255, 255);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(`Find ${needleToFind} in the sorted list!`, 0, 250);
        }, printNumberToFind);

        if (!highLowMidCountState.highInitTime) {
          highLowMidCountState.highInitTime = p.frameCount;
        }

        if (highLowMidCountState.highInitTime) {
          const highXOffset = 10;
          const highYOffset = BASELINE_Y_HIGHLOWMID_OFFSET;
          outlineObjs.high = {
            posX: sortedNumberObjs[binarySearchState.high].posX,
            posY: sortedNumberObjs[binarySearchState.high].posY,
          };

          textHighLowMid.high.in = `${binarySearchState.high}`;
          runAndStoreProc(() => {
            p.stroke(...HIGH_COLOR);
            p.fill(...HIGH_COLOR);
            p.textAlign(p.LEFT, p.BASELINE);
            p.text(
              `HIGH: ${textHighLowMid.high.in}`,
              (-1 * p.width) / 2 + highXOffset,
              (-1 * p.height) / 2 + highYOffset
            );

            p.fill(255, 255, 255, 0); // alpha 0, transparent
            p.stroke(...HIGH_COLOR);
            createSquareOutline(
              p,
              outlineObjs.high.posX,
              outlineObjs.high.posY,
              50
            );
          }, printHighIndexAndOutline);
        }
        // control 'waiting' for time since high time to show low
        if (
          !highLowMidCountState.lowInitTime &&
          // When frame count shows ~1 second, set up low init time
          p.frameCount - highLowMidCountState.highInitTime > 60
        ) {
          highLowMidCountState.lowInitTime = p.frameCount;
        }

        if (highLowMidCountState.lowInitTime) {
          const lowXOffset = 10;
          const lowYOffset = BASELINE_Y_HIGHLOWMID_OFFSET + 70;
          outlineObjs.low = {
            posX: sortedNumberObjs[binarySearchState.low].posX,
            posY: sortedNumberObjs[binarySearchState.low].posY,
          };
          textHighLowMid.low.in = `${binarySearchState.low}`;

          runAndStoreProc(() => {
            p.stroke(...LOW_COLOR);
            p.fill(...LOW_COLOR);
            p.textAlign(p.LEFT, p.BASELINE);
            p.text(
              `LOW: ${textHighLowMid.low.in}`,
              (-1 * p.width) / 2 + lowXOffset,
              (-1 * p.height) / 2 + lowYOffset
            );

            p.fill(255, 255, 255, 0); // alpha 0, transparent
            p.stroke(...LOW_COLOR);
            createSquareOutline(
              p,
              outlineObjs.low.posX,
              outlineObjs.low.posY,
              50
            );
          }, printLowIndexAndOutline);
        }

        // wait a second between low and mid
        // this is getting cumbersome, what's another way to sequence this? 🤔
        if (
          !highLowMidCountState.midInitTime &&
          highLowMidCountState.lowInitTime &&
          p.frameCount - highLowMidCountState.lowInitTime > 60
        ) {
          highLowMidCountState.midInitTime = p.frameCount;
        }

        if (highLowMidCountState.midInitTime) {
          const midXOffset = 10;
          const midYOffset = BASELINE_Y_HIGHLOWMID_OFFSET + 140;

          outlineObjs.mid = {
            posX: sortedNumberObjs[binarySearchState.mid].posX,
            posY: sortedNumberObjs[binarySearchState.mid].posY,
          };
          textHighLowMid.mid.in = `${binarySearchState.mid}`;

          runAndStoreProc(() => {
            p.stroke(...MID_COLOR);
            p.fill(...MID_COLOR);
            p.textAlign(p.LEFT, p.BASELINE);
            p.text(
              `MID: ${textHighLowMid.mid.in}`,
              (-1 * p.width) / 2 + midXOffset,
              (-1 * p.height) / 2 + midYOffset
            );

            p.stroke(...MID_COLOR);
            p.fill(255, 255, 255, 0); // alpha 0, transparent
            createSquareOutline(
              p,
              outlineObjs.mid.posX,
              outlineObjs.mid.posY,
              50
            );
          }, printMidIndexAndOutline);
        }

        // TRANSITION!
        if (
          highLowMidCountState.midInitTime &&
          p.frameCount - highLowMidCountState.midInitTime > 60
        ) {
          animationPhase = "BS_REVEAL_MID_AND_TRANSITION";
        }
      } else if (animationPhase === "BS_REVEAL_MID_AND_TRANSITION") {
        runProcs(
          printHighIndexAndOutline,
          printLowIndexAndOutline,
          printMidIndexAndOutline,
          printSquaresAndIndexNumber,
          printNumberToFind
        );

        const MID_REVEAL_NUMBER_VALUE_COLOR = [255, 255, 255] as const;
        // fade-in mid
        const midObj = sortedNumberObjs[binarySearchState.mid];
        if (bsRevealMidAndTransitionState.alphaTransitionPercent < 1) {
          bsRevealMidAndTransitionState.alphaTransitionPercent += 0.02;
        }

        runAndStoreProc(() => {
          p.fill(
            ...MID_REVEAL_NUMBER_VALUE_COLOR,
            bsRevealMidAndTransitionState.alphaTransitionPercent * 255
          );
          p.textAlign(p.CENTER, p.CENTER);
          p.text(`${midObj.n}`, midObj.posX + 50 / 2, midObj.posY + 50 / 2);
        }, printNumberAtMid);

        if (bsRevealMidAndTransitionState.alphaTransitionPercent >= 1) {
          animationPhase = "ADJUST_HIGH_LOW";
        }
      } else if (animationPhase === "ADJUST_HIGH_LOW") {
        runProcs(
          printHighIndexAndOutline,
          printLowIndexAndOutline,
          printMidIndexAndOutline,
          printSquaresAndIndexNumber,
          printNumberToFind,
          printNumberAtMid
        );

        const midObj = sortedNumberObjs[binarySearchState.mid];

        let movingObj: { posX: number } | undefined;
        let targetObj: { posX: number } | undefined;
        if (midObj.n > needleToFind) {
          binarySearchState.high = binarySearchState.mid - 1;
          // move the outline
          targetObj = sortedNumberObjs[binarySearchState.high];
          movingObj = outlineObjs.high;
          movingObj.posX = p.lerp(movingObj.posX, targetObj.posX, 0.05);
        } else if (midObj.n < needleToFind) {
          binarySearchState.low = binarySearchState.mid + 1;
          // move the outline
          targetObj = sortedNumberObjs[binarySearchState.low];
          movingObj = outlineObjs.low;
          movingObj.posX = p.lerp(movingObj.posX, targetObj.posX, 0.05);
        } else if (midObj.n === needleToFind) {
          window.alert("found it!"); // deal with this later
          animationPhase = "END";
          return;
        }

        assertPresent(movingObj);
        assertPresent(targetObj);
        if (isBasicallyEqual(targetObj.posX, movingObj.posX)) {
          // cleanup
          bsRevealMidAndTransitionState.alphaTransitionPercent = 0;

          textHighLowMid.high.out = textHighLowMid.high.in;
          textHighLowMid.low.out = textHighLowMid.low.in;
          textHighLowMid.mid.out = textHighLowMid.mid.in;

          // Transition them out, to be handled in the next animation phase...
          textHighLowMid.high.in = `${binarySearchState.high}`;
          textHighLowMid.low.in = `${binarySearchState.low}`;

          animationPhase = "ADJUST_HIGH_LOW_NUMS";
        }
      } else if (animationPhase === "ADJUST_HIGH_LOW_NUMS") {
        runProcs(
          printSquaresAndIndexNumber,
          printNumberToFind,
          printNumberAtMid
        );

        // HANDLE HIGH
        if (textHighLowMid.high.in !== textHighLowMid.high.out) {
          const highXOffset = 10;
          const highYOffset = BASELINE_Y_HIGHLOWMID_OFFSET;

          p.stroke(...HIGH_COLOR);
          p.fill(...HIGH_COLOR);
          p.textAlign(p.LEFT, p.BASELINE);
          p.text(
            `HIGH: `,
            (-1 * p.width) / 2 + highXOffset,
            (-1 * p.height) / 2 + highYOffset
          );

          // Now, render the number in a decaying, spinny way
          p.push();
          // translate so that it rotates around correct origin point
          p.translate(
            (-1 * p.width) / 2 + highXOffset + 100,
            (-1 * p.height) / 2 + highYOffset
          );

          if (adjustHighLowNumsState.alphaDecayHighLow > 0) {
            p.rotateY(p.frameCount * 0.225);
          }

          // text high out
          p.fill(...HIGH_COLOR, adjustHighLowNumsState.alphaDecayHighLow * 255);
          p.text(textHighLowMid.high.out, 0, 0);

          // text high in
          p.fill(
            ...HIGH_COLOR,
            255 * 1 - adjustHighLowNumsState.alphaDecayHighLow
          );
          p.text(textHighLowMid.high.in, 0, 0);
          p.pop();

          // adjust decay
          if (adjustHighLowNumsState.alphaDecayHighLow > 0) {
            adjustHighLowNumsState.alphaDecayHighLow -= 0.02;
          }

          p.push();
          // restore creating the outline part
          p.fill(255, 255, 255, 0); // alpha 0, transparent
          createSquareOutline(
            p,
            outlineObjs.high.posX,
            outlineObjs.high.posY,
            50
          );
          p.pop();

          // run other numbers as-is
          runProcs(printLowIndexAndOutline, printMidIndexAndOutline);
        }

        // HANDLE LOW
        if (textHighLowMid.low.in !== textHighLowMid.low.out) {
          const lowXOffset = 10;
          const lowYOffset = BASELINE_Y_HIGHLOWMID_OFFSET + 70;

          p.stroke(...LOW_COLOR);
          p.fill(...LOW_COLOR);
          p.textAlign(p.LEFT, p.BASELINE);
          p.text(
            `LOW: `,
            (-1 * p.width) / 2 + lowXOffset,
            (-1 * p.height) / 2 + lowYOffset
          );

          // Now, render the number in a decaying, spinny way
          p.push();
          // translate so that it rotates around correct origin point
          p.translate(
            (-1 * p.width) / 2 + lowXOffset + 100,
            (-1 * p.height) / 2 + lowYOffset
          );

          if (adjustHighLowNumsState.alphaDecayHighLow > 0) {
            p.rotateY(p.frameCount * 0.225);
          }

          // text low out
          p.fill(...LOW_COLOR, adjustHighLowNumsState.alphaDecayHighLow * 255);
          p.text(textHighLowMid.low.out, 0, 0);

          // text low in
          p.fill(
            ...LOW_COLOR,
            255 * 1 - adjustHighLowNumsState.alphaDecayHighLow
          );
          p.text(textHighLowMid.low.in, 0, 0);
          p.pop();

          // adjust decay
          if (adjustHighLowNumsState.alphaDecayHighLow > 0) {
            adjustHighLowNumsState.alphaDecayHighLow -= 0.02;
          }

          p.push();
          // restore creating the outline part
          p.fill(255, 255, 255, 0); // alpha 0, transparent
          createSquareOutline(
            p,
            outlineObjs.low.posX,
            outlineObjs.low.posY,
            50
          );
          p.pop();

          // run other numbers as-is
          runProcs(printHighIndexAndOutline, printMidIndexAndOutline);
        }

        if (adjustHighLowNumsState.alphaDecayHighLow <= 0) {
          // set the values back to re-align
          textHighLowMid.high.out = textHighLowMid.high.in;
          textHighLowMid.low.out = textHighLowMid.low.in;
          // reset alpha decay for next time
          adjustHighLowNumsState.alphaDecayHighLow = 1;
          animationPhase = "ADJUST_MID";
        }
      } else if (animationPhase === "ADJUST_MID") {
        binarySearchState.mid = Math.floor(
          (binarySearchState.high + binarySearchState.low) / 2
        );

        runProcs(
          printHighIndexAndOutline,
          printLowIndexAndOutline,
          printMidIndexAndOutline,
          printSquaresAndIndexNumber,
          printNumberToFind,
          printNumberAtMid
        );

        // do an outline move...
        let movingObj: { posX: number } | undefined;
        let targetObj: { posX: number } | undefined;
        // move the outline
        targetObj = sortedNumberObjs[binarySearchState.mid];
        movingObj = outlineObjs.mid;
        movingObj.posX = p.lerp(movingObj.posX, targetObj.posX, 0.05);

        if (isBasicallyEqual(targetObj.posX, movingObj.posX)) {
          animationPhase = "ADJUST_MID_NUM";
          // Get mid ready for num transition
          textHighLowMid.mid.in = `${binarySearchState.mid}`;
        }
      } else if (animationPhase === "ADJUST_MID_NUM") {
        runProcs(
          printHighIndexAndOutline,
          printLowIndexAndOutline,
          printSquaresAndIndexNumber,
          printNumberToFind,
          printNumberAtMid
        );

        const midXOffset = 10;
        const midYOffset = BASELINE_Y_HIGHLOWMID_OFFSET + 140;

        // Handle MID
        p.stroke(...MID_COLOR);
        p.fill(...MID_COLOR);
        p.textAlign(p.LEFT, p.BASELINE);
        p.text(
          `MID: `,
          (-1 * p.width) / 2 + midXOffset,
          (-1 * p.height) / 2 + midYOffset
        );

        // Now, render the number in a decaying, spinny way
        p.push();
        // translate so that it rotates around correct origin point
        p.translate(
          (-1 * p.width) / 2 + midXOffset + 100,
          (-1 * p.height) / 2 + midYOffset
        );

        if (adjustMidNumsState.alphaDecayMid > 0) {
          p.rotateY(p.frameCount * 0.225);
        }

        // text mid out
        p.fill(...MID_COLOR, adjustMidNumsState.alphaDecayMid * 255);
        p.text(textHighLowMid.mid.out, 0, 0);

        // text mid in
        p.fill(...MID_COLOR, 255 * 1 - adjustMidNumsState.alphaDecayMid);
        p.text(textHighLowMid.mid.in, 0, 0);
        p.pop();

        // adjust decay
        if (adjustMidNumsState.alphaDecayMid > 0) {
          adjustMidNumsState.alphaDecayMid -= 0.02;
        }

        p.push();
        // restore creating the outline part
        p.fill(255, 255, 255, 0); // alpha 0, transparent
        createSquareOutline(p, outlineObjs.mid.posX, outlineObjs.mid.posY, 50);
        p.pop();

        if (adjustMidNumsState.alphaDecayMid <= 0) {
          // Adjust alpha decay for next time
          adjustMidNumsState.alphaDecayMid = 1;
          // Re-calc, then start loop again
          animationPhase = "BS_REVEAL_MID_AND_TRANSITION";
        }
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

  for (let face of faces) {
    ctx.fill(...fillColor);
    ctx.stroke(...strokeColor);
    ctx.beginShape();
    for (let idx of face.indices) {
      const vec = vectors[idx];
      ctx.vertex(vec.x, vec.y, vec.z);
    }
    ctx.endShape(ctx.CLOSE);
  }
}

window.debug = {};

window.debug.getAnimationPhase = () => animationPhase;

function createSquareOutline(
  p: p5,
  squareX: number,
  squareY: number,
  squareSize: number
) {
  // create box outline
  const BOX_BORDER_OFFSET = 5;
  p.square(
    squareX - BOX_BORDER_OFFSET,
    squareY - BOX_BORDER_OFFSET,
    squareSize + BOX_BORDER_OFFSET * 2
  );
}

function assertPresent<T>(v: T): asserts v is NonNullable<T> {
  if (v == null) {
    throw new Error("Expected value to be non-nullish");
  }
}
