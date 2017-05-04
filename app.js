
var keypad = new Uint8Array(16).fill(0);
function hx(opcode) {
    return ('0000' + opcode.toString(16)).slice(-4);
}
function debugView(x, y) {
    ctx.clearRect(0, 320, 640, 160);
    ctx.fillRect(0, 320, 640, 160);
    var ch = 14 + y; h =14;
    ctx.strokeStyle = '#0f0';
    ctx.strokeText('opcode     :' + '0x'+ hx(opcode), x, ch); ch += h;
    ctx.strokeText('V          :' + V, x, ch);ch += h;
    ctx.strokeText('pc         :' + pc[0].toString(16), x, ch);ch += h;
    ctx.strokeText('delay_timer:' + delay_timer, x, ch);ch += h;
    ctx.strokeText('sound_timer:' + sound_timer,x, ch);ch += h;
    ctx.strokeText('stack      :' + stack, x, ch);ch += h;
    ctx.strokeText('sp         :' + sp[0].toString(16), x, ch);ch += h;
    ctx.strokeText('drawFlag   :' + drawFlag, x, ch);ch += h;
    ctx.strokeText('keypad     :' + keypad, x, ch);ch += h;
}
function inputKey(key, n) {
    if (key === '1'.charCodeAt(0)) keypad[0x01] = n;
    if (key === '2'.charCodeAt(0)) keypad[0x02] = n;
    if (key === '3'.charCodeAt(0)) keypad[0x03] = n;
    if (key === '4'.charCodeAt(0)) keypad[0x0c] = n;

    if (key === 'Q'.charCodeAt(0)) keypad[0x04] = n;
    if (key === 'W'.charCodeAt(0)) keypad[0x05] = n;
    if (key === 'E'.charCodeAt(0)) keypad[0x06] = n;
    if (key === 'R'.charCodeAt(0)) keypad[0x0d] = n;

    if (key === 'A'.charCodeAt(0)) keypad[0x07] = n;
    if (key === 'S'.charCodeAt(0)) keypad[0x08] = n;
    if (key === 'D'.charCodeAt(0)) keypad[0x09] = n;
    if (key === 'F'.charCodeAt(0)) keypad[0x0e] = n;

    if (key === 'Z'.charCodeAt(0)) keypad[0x0a] = n;
    if (key === 'X'.charCodeAt(0)) keypad[0x00] = n;
    if (key === 'C'.charCodeAt(0)) keypad[0x0b] = n;
    if (key === 'V'.charCodeAt(0)) keypad[0x0f] = n;
}
function loop() {
    window.requestAnimationFrame(loop);
    if (loadedGame) {
        emulateCycle();
        debugView(10, 320);
        if (drawFlag) {
            var scale = 10;
            var imageData = ctx.createImageData(64*scale,32*scale);
            var data = imageData.data;
            for (var i = 0; i < data.length; i += 4) {
                var w = 64 * 4 * scale; //rgba // TODO: devicePixelRatio
                var y = Math.floor(i / w);
                var x = i % w / 4;
                if (gfx[64*Math.floor(y/scale)+Math.floor(x/scale)]) {
                    data[i+0] = data[i+1] = data[i+2] = 240;
                    data[i+3] = 255;
                } else {
                    data[i+0] = data[i+1] = data[i+2] = 40;
                    data[i+3] = 255;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            drawFlag = false;
        }
    }
}
// initialize
var c = document.getElementById('c');
var ctx = c.getContext('2d');
var W = c.width;
var H = c.height;
console.log(W, H);
ctx.font = "16px 'Courier New'"; // web safe monospace font.
window.addEventListener('keydown',function(e) {
    e.stopPropagation();
    e.preventDefault();
    inputKey(e.keyCode, 1);
});
window.addEventListener('keyup',function(e) {
    e.stopPropagation();
    e.preventDefault();
    inputKey(e.keyCode, 0);
});
initChip8();
var loadedGame = false;
loadGame('PONG', memory, function() {
    loadedGame = true;
    loop();
});
