let opcode = new Uint16Array(1);
let memory = new Uint8Array(4096);
let V = new Uint8Array(16);
let pc = new Uint16Array(1);
let I = new Uint16Array(1);
let gfx = new Uint8Array(64 * 32);
let delay_timer = new Uint8Array(1);
let sound_timer = new Uint8Array(1);
let stack = new Uint16Array(16);
let sp = new Uint8Array(1);
let drawFlag = false;
let chip8_fontset = new Uint8Array([
  0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
  0x20, 0x60, 0x20, 0x20, 0x70, // 1
  0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
  0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
  0x90, 0x90, 0xF0, 0x10, 0x10, // 4
  0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
  0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
  0xF0, 0x10, 0x20, 0x40, 0x40, // 7
  0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
  0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
  0xF0, 0x90, 0xF0, 0x90, 0x90, // A
  0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
  0xF0, 0x80, 0x80, 0x80, 0xF0, // C
  0xE0, 0x90, 0x90, 0x90, 0xE0, // D
  0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
  0xF0, 0x80, 0xF0, 0x80, 0x80 // F
]);

const NNN = (op) => (op & 0x0fff);
const NN = (op) => (op & 0x00ff);
const N = (op) => (op & 0x000f);
const X = (op) => ((op & 0x0F00) >> 8);
const Y = (op) => ((op & 0x00F0) >> 4);
const L = (op) => (op & 0xf000);
const PC_START = 0x200;
const disp_clear = () => gfx.fill(0);
const rand = () => Math.floor(Math.random() * 11);
const initChip8 = () => {
  pc[0] = PC_START;
  opcode.fill(0);
  I.fill(0);
  sp.fill(0);
  memory.fill(0);
  V.fill(0);
  stack.fill(0);
  for (var i = 0; i < 80; i++)
    memory[i] = chip8_fontset[i];
  drawFlag = true;
  delay_timer.fill(0);
  sound_timer.fill(0);
};

function showMem8(s, e, mem) {
  var buff = '';
  for (var i = s; i < e; i++)
    buff += ('00' + mem[i].toString(16)).slice(-2);
  console.log(buff);
}

function loadGame(gameName, memory, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'PONG', true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function(e) {
    var dv = new DataView(this.response);
    for (var i = 0, len = dv.byteLength; i < len; i++)
      memory[PC_START + i] = dv.getUint8(i * Uint8Array.BYTES_PER_ELEMENT, false); // big-endian
    //showMem8(512, 512 + 246, memory);
    cb && cb();
  }
  xhr.send();
}
const printUnknown = (opcode) => console.log('unknownopcode' + (('0000' + opcode.toString(16)).slice(-4)));

function emulateCycle() {
  opcode = (memory[pc[0]] << 8) | memory[pc[0] + 1];
  //console.log("Opcode: 0x" + ('0000' + opcode.toString(16)).slice(-4));
  switch (L(opcode)) {
    case 0x0000:
      switch (opcode & 0x00FF) {
        case 0x00E0:
          disp_clear();
          drawFlag = true;
          pc[0] += 2;
          break;
        case 0x00EE:
          sp[0] -= 1;
          pc[0] = stack[sp[0]];
          pc[0] += 2;
          break;
        default:
          printUnknown(opcode);
      }
      break;
    case 0x1000: // 1NNN goto NNN;
      pc[0] = NNN(opcode);
      break;
    case 0x2000: // 2NNN *(0xNNN)();
      stack[sp[0]] = pc[0];
      sp[0] += 1;
      pc[0] = NNN(opcode);
      break;
    case 0x3000: // 3XNN if(Vx==NN)
      pc[0] += (V[X(opcode)] == NN(opcode)) ? 4 : 2;
      break;
    case 0x4000: // 4XNN if(Vx!=NN)
      pc[0] += (V[X(opcode)] != NN(opcode)) ? 4 : 2;
      break;
    case 0x5000: // 5XY0 if (Vx==Vy)
      pc[0] += (V[X(opcode)] == V[Y(opcode)]) ? 4 : 2;
      break;
    case 0x6000: // 6XNN Vx=NN
      V[X(opcode)] = NN(opcode);
      pc[0] += 2;
      break;
    case 0x7000: // 7XNN Vx +=NN
      V[X(opcode)] += NN(opcode);
      pc[0] += 2;
      break;
    case 0x8000:
      switch (N(opcode)) {
        case 0x0000: // 8XY0
          V[X(opcode)] = V[Y(opcode)];
          break;
        case 0x0001:
          V[X(opcode)] |= V[Y(opcode)];
          V[0xF] = 0;
          break;
        case 0x0002:
          V[X(opcode)] &= V[Y(opcode)];
          V[0xF] = 0;
          break;
        case 0x0003:
          V[X(opcode)] ^= V[Y(opcode)];
          V[0xF] = 0;
          break;
        case 0x0004: // 8XY4 Vx += Vy
          V[0xF] = V[Y(opcode)] > (0xFF - V[X(opcode)]) ? 1 : 0; // carry is 1
          V[X(opcode)] += V[Y(opcode)];
          break;
        case 0x0005: // 8XY5 Vx -= Vy
          V[0xF] = V[Y(opcode)] > V[X(opcode)] ? 0 : 1; // borrow is 0. (Chip8 defined that the NOT-BORROW is 1.)
          V[X(opcode)] -= V[Y(opcode)];
          break;
        case 0x0006: // 8XY6 Vx >> 1
          V[0xF] = V[X(opcode)] & 0x1;
          V[X(opcode)] >>= 0x01;
          break;
        case 0x0007: // 8XY7 Vx=Vy-Vx
          V[0xF] = V[Y(opcode)] < V[X(opcode)] ? 0 : 1; // borrow is 0. (Chip8 defined that the NOT-BORROW is 1.)
          V[X(opcode)] = V[Y(opcode)] - V[X(opcode)];
          break;
        case 0x000E: // Vx << 1
          V[0xF] = V[X(opcode)] >> 0x7;
          V[X(opcode)] <<= 0x01;
          break;
        default:
          printUnknown(opcode);
      }
      pc[0] += 2;
      break;
    case 0x9000:
      pc[0] += V[X(opcode)] != V[Y(opcode)] ? 4 : 2;
      break;
    case 0xA000:
      I[0] = NNN(opcode);
      pc[0] += 2;
      break;
    case 0xB000:
      pc[0] = V[0] + NNN(opcode);
      break;
    case 0xC000:
      V[X(opcode)] = NN(rand()) & NN(opcode);
      pc[0] += 2;
      break;
    case 0xD000:
      {
        let x = V[X(opcode)];
        let y = V[Y(opcode)];
        let h = N(opcode);
        V[0xF] = 0;
        for (let yline = 0; yline < h; yline++) {
          let pixel = memory[I[0] + yline];
          for (let xline = 0; xline < 8; xline++) {
            if ((pixel & (0x80 >> xline)) != 0) {
              if (gfx[xline + x + ((y + yline) * 64)] == 1)
                V[0xF] = 1;
              gfx[xline + x + ((y + yline) * 64)] ^= 1;
            }
          }
        }
        drawFlag = true;
        pc[0] += 2;
      }
      break;
    case 0xE000:
      switch (NN(opcode)) {
        case 0x009E: // pressed
          pc[0] += keypad[V[X(opcode)]] != 0 ? 4 : 2;
          break;
        case 0x00A1: // released
          pc[0] += keypad[V[X(opcode)]] == 0 ? 4 : 2;
          break;
        default:
          printUnknown(opcode);
      }
      break;
    case 0xF000:
      switch (NN(opcode)) {
        case 0x0007:
          V[X(opcode)] = delay_timer[0];
          pc[0] += 2;
          break;
        case 0x000A:
          {
            var keyPressed0 = false;
            for (var i = 0; i < 16; i++) {
              if (keypad[i] != 0) { // pressed
                V[X(opcode)] = i;
                keyPressed0 = true;
              }
            }
            if (keyPressed0) pc[0] += 2;
          }
          break;
        case 0x0015:
          delay_timer[0] = V[X(opcode)];
          pc[0] += 2;
          break;
        case 0x0018:
          sound_timer[0] = V[X(opcode)];
          pc[0] += 2;
          break;
        case 0x001E:
          V[0xF] = ((I[0] + V[X(opcode)]) > 0xFFF) ? 1 : 0;
          I[0] += V[X(opcode)];
          pc[0] += 2;
          break;
        case 0x0029:
          I[0] = V[X(opcode)] * 0x5;
          pc[0] += 2;
          break;
        case 0x0033:
          {
            memory[I[0] + 0] = V[X(opcode)] / 100;
            memory[I[0] + 1] = (V[X(opcode)] / 10) % 10;
            memory[I[0] + 2] = (V[X(opcode)] % 100) % 10;
            pc[0] += 2;
          }
          break;
        case 0x0055: // i <= X(include)
          {
            for (var i = 0; i <= X(opcode); i++)
              memory[I[0] + i] = V[i];
            I[0] = I[0] + (X(opcode)) + 1;
            pc[0] += 2;
          }
          break;
        case 0x0065: // i <= X(include)
          {
            for (var i = 0; i <= X(opcode); i++)
              V[i] = memory[I[0] + i];
            I[0] = I[0] + (X(opcode)) + 1;
            pc[0] += 2;
          }
          break;
        default:
          printUnknown(opcode);
      }
      break;
    default:
      printUnknown(opcode);
  }
  if (delay_timer[0] > 0) delay_timer[0]--;
  if (sound_timer[0] > 0) {
    if (sound_timer[0] == 1) console.log('BEEP\n');
    sound_timer[0]--;
  }
}
var keypad = new Uint8Array(16).fill(0);
const hx = (opcode) => ('0000' + opcode.toString(16)).slice(-4);

function debugView(x, y) {
  ctx.fillRect(0, 320, 640, 160);
  var h = 14;
  ctx.strokeStyle = '#0f0';
  ctx.strokeText('opcode     :' + '0x' + hx(opcode), x, y += h);
  ctx.strokeText('V          :' + V, x, y += h);
  ctx.strokeText('pc         :' + pc[0].toString(16), x, y += h);
  ctx.strokeText('delay_timer:' + delay_timer, x, y += h);
  ctx.strokeText('sound_timer:' + sound_timer, x, y += h);
  ctx.strokeText('stack      :' + stack, x, y += h);
  ctx.strokeText('sp         :' + sp[0].toString(16), x, y += h);
  ctx.strokeText('keypad     :' + keypad, x, y += h);
  ctx.strokeText('drawFlag   :' + drawFlag, x, y += h);
}

function inputKey(key, n) {
  if (key === 0x31) keypad[0x01] = n; //1
  if (key === 0x32) keypad[0x02] = n; //2
  if (key === 0x33) keypad[0x03] = n; //3
  if (key === 0x34) keypad[0x0c] = n; //4
  if (key === 0x51) keypad[0x04] = n; //Q
  if (key === 0x57) keypad[0x05] = n; //W
  if (key === 0x45) keypad[0x06] = n; //E
  if (key === 0x52) keypad[0x0d] = n; //R
  if (key === 0x41) keypad[0x07] = n; //A
  if (key === 0x53) keypad[0x08] = n; //S
  if (key === 0x44) keypad[0x09] = n; //D
  if (key === 0x46) keypad[0x0e] = n; //F
  if (key === 0x5a) keypad[0x0a] = n; //Z
  if (key === 0x58) keypad[0x00] = n; //X
  if (key === 0x43) keypad[0x0b] = n; //C
  if (key === 0x56) keypad[0x0f] = n; //V
}

function loop() {
  requestAnimationFrame(loop);
  emulateCycle();
  debugView(10, 320);
  if (!drawFlag) return;
  var scale = 10;
  var imageData = ctx.createImageData(64 * scale, 32 * scale);
  var data = imageData.data;
  for (var i = 0; i < data.length; i += 4) {
    var w = 64 * 4 * scale; //rgba // TODO: devicePixelRatio
    var y = Math.floor(i / w);
    var x = i % w / 4;
    if (gfx[64 * Math.floor(y / scale) + Math.floor(x / scale)]) {
      data[i + 0] = data[i + 1] = data[i + 2] = 240;
    } else {
      data[i + 0] = data[i + 1] = data[i + 2] = 40;
    }
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}
var ctx = document.getElementById('c').getContext('2d');
ctx.font = "16px 'Courier New'"; // web safe monospace font.
onkeydown = (e) => inputKey(e.keyCode, 1);
onkeyup = (e) => inputKey(e.keyCode, 0);
initChip8();
loadGame('PONG', memory, function() {
  loop();
});