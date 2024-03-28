/*
    The purpose of this file is to take in the analyser node and a <canvas> element: 
      - the module will create a drawing context that points at the <canvas> 
      - it will store the reference to the analyser node
      - in draw(), it will loop through the data in the analyser node
      - and then draw something representative on the canvas
      - maybe a better name for this file/module would be *visualizer.js* ?
*/

import * as utils from './utils.js';

let ctx, canvasWidth, canvasHeight, gradient, analyserNode, audioData,mouseHere,mainStar,background;
let lines = [];
let stars = [];

const cursor = {
    x: innerWidth / 2,
    y: innerHeight / 2,
};

//Creates a bezier curve based on the audio data at specific points
class LineTracker{
    constructor(width,hue,offset){
        Object.assign(this,{width,hue,offset});
    }

    update(nicerData){
        const getByte = () =>
        {
            //Color of line based on value of data at a random point
            let data = nicerData[Math.round(Math.random() * nicerData.length)];
            return 105 + Math.round( (data / nicerData.length) * this.hue);
        }
        this.color =  "rgba(" + getByte() + "," + getByte() + "," + getByte() + ",.5)";
    }

    draw(ctx, intensity, nicerData){
        //Draws a bezier curve affected by the 1/3 point of the data (upward)
        //And the 2/3 point of the data (downward)
        let thirdHeight = canvasHeight / 3 * 2;
        //let thirdWidth = canvasWidth / 2;
        let diff = (Math.max(...nicerData) - Math.min(...nicerData))/2;
        ctx.save();
        ctx.lineWidth = this.width;
        ctx.strokeStyle = this.color;
        ctx.beginPath(); 
        ctx.moveTo(-10,thirdHeight + this.offset);
        ctx.bezierCurveTo
        (canvasWidth / 10 * 4, 
        -(diff) * intensity + this.offset, 
        canvasWidth / 10 * 6, 
        (diff) * intensity + this.offset, 
        canvasWidth + 10, 
        thirdHeight + this.offset);
        ctx.stroke();
        ctx.restore();
    }
}

class StandardStar{
    constructor(clickx,clicky,length){
        Object.assign(this,{clickx,clicky,length});
    }

    update()
    {
        if(Math.random() >= 0.5)
        {
            this.clickx += Math.round(Math.random() * 2);
        }
        else
        {
            this.clickx -= Math.round(Math.random() * 2);
        }

        if(Math.random() >= 0.5)
        {
            this.clicky += Math.round(Math.random() * 2);
        }
        else
        {
            this.clicky -= Math.round(Math.random() * 2);
        }
    }

    draw(ctx,nicerData)
    {
        if(nicerData.length == 0) return;
        let spacing = 360 / nicerData.length;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.50)';
        //loop through and draw
        for (let i = 0; i < nicerData.length; i++) {
            let radians = degToRad(spacing * i);
            let x,y;
            ctx.beginPath();
            x = this.clickx + (nicerData[i] * this.length) * Math.cos(radians * i);
            y = this.clicky + (nicerData[i] * this.length) *  Math.sin(radians * i);
            ctx.moveTo(this.clickx,this.clicky);
            ctx.lineTo(x,y);
            ctx.stroke();
        }
        ctx.restore();
    }

    setPosition(x,y)
    {
        this.clickx = x;
        this.clicky = y;
    }
}
const setupCanvas = (canvasElement, analyserNodeRef) => {
    canvasElement.onmousemove = (e) =>
    {
        let mouse = actualMousePos(e,canvasElement);
        cursor.x = mouse.x;
        cursor.y = mouse.y;
        mouseHere = true;
    }
    canvasElement.onmouseout = (e) =>
    {
        mouseHere = false;
    }
    canvasElement.onclick = (e) =>
    {
        if(!document.fullscreenElement)
        {
            stars.push(new StandardStar(cursor.x,cursor.y,Math.random() * .2));
        }
    }
    // create drawing context
    ctx = canvasElement.getContext("2d");
    canvasWidth = canvasElement.width;
    canvasHeight = canvasElement.height;
    // create a gradient that runs top to bottom
    gradient = utils.getLinearGradient(ctx, 0, 0, 0, canvasHeight, [{ percent: 0, color: "#247c82" }, { percent: .40, color: "#6e98db" }, { percent: .6, color: "#5aad88" }, { percent: 1, color: "#248258" }]);
    // keep a reference to the analyser node
    analyserNode = analyserNodeRef;
    // this is the array where the analyser data will be stored
    audioData = new Uint8Array(analyserNode.fftSize / 2);
    
    background = document.querySelector("#background");
    
    lines.push(new LineTracker(2,200, +20));
    lines.push(new LineTracker(2,200, -20));
    lines.push(new LineTracker(20,100, 0 ));
    mainStar = new StandardStar(canvasWidth / 2, canvasHeight /2,1);
}

const draw = (params = {}) => {
    let playing; 
    if(document.querySelector("#btn-play").dataset.playing == "no")
    {
        playing = false;
    }
    else
    {
        playing = true;
    }
    // 1 - populate the audioData array with the frequency data from the analyserNode
    // notice these arrays are passed "by reference" 
    if(params.time)
    {
        analyserNode.getByteTimeDomainData(audioData); // waveform data
        //if(audioData[0] == 128) return;
    }else{
        analyserNode.getByteFrequencyData(audioData);
    }
    //Cuts out all the zeros so the bars and stuff look better
    //Also is just cool as you can see the changes as a song starts and ends
    let nicerData = audioData.filter((x) => x > 0);
    // 2 - draw background
    ctx.save();
    /*ctx.fillStyle = "#143109";
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);*/
    
    ctx.drawImage(background,0,0,canvasWidth,canvasHeight);
    ctx.restore();

    if(playing)
    {
        for(let i = 0; i < lines.length; i++)
        {
            if(Date.now() % 20 == 0)
            {
                lines[i].update(nicerData);
            }
            lines[i].draw(ctx,params.lineIntensity,nicerData);
        }
    }

    
    // 5 - draw circles
    if (params.showCircles && playing) {
        let maxRadius = canvasHeight / 10;
        ctx.save();
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < nicerData.length; i++) {

            let percent = nicerData[i] / 255;

            let circleRadius = percent * maxRadius;

            drawCircle(
                canvasWidth - (canvasWidth / 4),
                canvasHeight / 4,
                circleRadius * .3,
                "#02012c");

            drawCircle(
                canvasWidth - (canvasWidth / 4),
                canvasHeight / 4,
                circleRadius * .5,
                utils.makeColor(255, 255, 255, .5 - percent / 5.0));

            drawCircle(
                canvasWidth - (canvasWidth / 4),
                canvasHeight / 4,
                circleRadius,
                utils.makeColor(221, 237, 237, .35 - percent / 3.0));

            drawCircle(
                canvasWidth - (canvasWidth / 4),
                canvasHeight / 4,
                circleRadius * 1.5,
                utils.makeColor(221, 229, 237, .10 - percent / 10.0));
        }
        ctx.restore();
    }

    // 4 - draw stars
    if (params.showStars && playing) {
        //let spacing = 360 / nicerData.length;

        ctx.save();
        if(playing)
        {
            for(let i = 0; i < stars.length; i++)
            {
                stars[i].update();
                stars[i].draw(ctx,nicerData);
            }  
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.50)';
        if(mouseHere && !document.fullscreenElement)
        {
            mainStar.setPosition(cursor.x,cursor.y);
            mainStar.draw(ctx,nicerData);
        }
        else
        {
            mainStar.setPosition(canvasWidth - (canvasWidth / 4),canvasHeight/4);
            mainStar.draw(ctx,nicerData);
        }
        ctx.restore();
    }

    // 6 - bitmap manipulation
    // A) grab all of the pixels on the canvas and put them in the `data` array
    // `imageData.data` is a `Uint8ClampedArray()` typed array that has 1.28 million elements!
    // the variable `data` below is a reference to that array 
    let imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    let data = imageData.data;
    let length = data.length;
    let width = imageData.width;//not using here
    // B) Iterate through each pixel, stepping 4 elements at a time (which is the RGBA for 1 pixel)
    for (let i = 0; i < length; i += 4) {
        //invert?
        if (params.showInvert) {
            let red = data[i], green = data[i + 1], blue = data[i + 2];
            data[i] = 255 - red; //set red
            data[i + 1] = 255 - green; //set green
            data[i + 2] = 255 - blue; //set blue
            //data[i+3] is alpha
        }
    } // end for
    //Step through sub pixels
    if (params.showEmboss) {
        for (let i = 0; i < length; i++) {
            if (i % 4 == 3) continue; //skip alpha channel
            data[i] = 127 + 2 * data[i] - data[i + 4] - data[i + width * 4];
        }
    }

    
    // D) copy image data back to canvas
    ctx.putImageData(imageData, 0, 0);
}

const drawCircle = (x,y,radius,color) =>
{
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.closePath();
    ctx.restore();
}

const clearStars = () =>
{
    stars = [];
}

const degToRad = (degrees) =>
{
    return degrees * (Math.PI /180);
}

const actualMousePos = (e, canvasElement) =>
{
    let canvasRect = canvasElement.getBoundingClientRect();
    let scaleX = canvasElement.width / canvasRect.width;
    let scaleY = canvasElement.height / canvasRect.height;
    let mousePos = 
    {
        x: (e.clientX - canvasRect.left) * scaleX,
        y: (e.clientY - canvasRect.left) * scaleY
    };
    return mousePos;
}

export { setupCanvas, draw, clearStars };