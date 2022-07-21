window.onresize = changeWindow;
const neat = new Neat(2, 1, {'popSize': 144});
const data = [[-1, -1], [-1, 1], [1, 1], [1, -1]];
const answers = [-1, 1, -1, 1];
let bestAi;

function load() {
  canvas = document.querySelector('.canvas');
  ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;
  document.onkeydown = keyPress;
  drawNeat();
}

function drawNeat() {
  const xSide = Math.floor(Math.sqrt(neat.pop.length));
  const ySide = Math.ceil(Math.sqrt(neat.pop.length));
  const xSize = width / xSide;
  const ySize = height / ySide;
  for(let i = 0; i < neat.pop.length; i++) {
    neat.pop[i].draw(xSize * (i % xSide), ySize * parseInt(i / xSide), xSize, ySize);
  }
}

function mutateNeat() {
  for(let i = 0; i < neat.popSize; i++) {
    neat.pop[i].mutate(neat.globalInnovation, neat.table, neat.allowRecurrent);
  }
  drawNeat();
}

function testPop() {
  let max = 0;
  let maxInd = 0;
  for(let i = 0; i < neat.popSize; i++) {
    const net = neat.pop[i];
    let total = 0;
    for(let j = 0; j < 4; j++) {
      const guess = net.pass(data[j]);
      total += 1 - (Math.abs(answers[j] - guess) / 2);
    }
    total *= 100 / 4;
    neat.fitness[i] = total;
    if(total > max) {
      max = total;
      maxInd = i;
    }
  }
  console.log(maxInd, max);
  return [neat.pop[maxInd], max];
}

function changeWindow() {
  width = window.innerWidth;
  height = window.innerHeight;
  //REDRAW SCREEN
  ctx.clearRect(0, 0, width, height);
  drawNeat();
}

function showBestAi(i = 0) {
  if(i == data.length) {
    return;
  }
  bestAi.pass(data[i])
  bestAi.draw(0, 0, width, height);
  setTimeout(() => {
    showBestAi(i + 1);
  }, 1000);
}

function keyPress(key) {
  if(key.keyCode == 32) {
    bestAi = testPop()[0];
    neat.step();
    drawNeat();
  }
}

function leftClick() {
  const x = event.clientX;
  const y = event.clientY;
}
