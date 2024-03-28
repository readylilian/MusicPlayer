/*
  main.js is primarily responsible for hooking up the UI to the rest of the application 
  and setting up the main event loop
*/

// We will write the functions in this file in the traditional ES5 way
// In this instance, we feel the code is more readable if written this way
// If you want to re-write these as ES6 arrow functions, to be consistent with the other files, go ahead!
import * as audio from './audio.js';
import * as utils from './utils.js';
import * as canvas from './canvas.js';
let highshelf = false;
let fps = 60;
let drawParams;

const init = () => {
  console.log("init called");
  console.log(`Testing utils.getRandomColor() import: ${utils.getRandomColor()}`);
  loadJSONXHR();
}

const setupUI = (canvasElement, parsed) => {
  // A - hookup fullscreen button
  const fsButton = document.querySelector("#btn-fs");
  // add .onclick event to button
  fsButton.onclick = e => {
    console.log("goFullscreen() called");
    utils.goFullscreen(canvasElement);
  };

  const playButton = document.querySelector("#btn-play");
  playButton.onclick = e => {
    console.log(`audioCtx.state before = ${audio.audioCtx.state}`);
    //check if context is in suspended state
    if (audio.audioCtx.state == "suspended") {
      audio.audioCtx.resume();
    }
    console.log(`audioCtx.state after = ${audio.audioCtx.state}`);
    if (e.target.dataset.playing == "no") {
      //if track is currently paused, play it
      audio.playCurrentSound();
      e.target.dataset.playing = "yes";//Our CSS will set the text to Pause
      //if track is playing, pause it
    } else {
      audio.pauseCurrentSound();
      e.target.dataset.playing = "no"; //CSS sets to play
    }
  };

  document.querySelector("#btn-clear").onclick = canvas.clearStars;

  //C - hookup volume slider and label
  let volumeSlider = document.querySelector("#volume-slider");
  let volumeLabel = document.querySelector("#volume-label");
  //add .oninput event to slider
  volumeSlider.oninput = e => {
    //set the gain
    audio.setVolume(e.target.value);
    //update value of label to match value of slider
    volumeLabel.innerHTML = Math.round((e.target.value / 2 * 100));
  };

  document.querySelector("#path-slider").oninput = e => {
    drawParams.lineIntensity = e.target.value;
    document.querySelector("#path-label").innerHTML = e.target.value;
  }
  //set value of label to match inital value of slider
  volumeSlider.dispatchEvent(new Event("input"));
  //D - hookup track <select>
  let trackSelect = document.querySelector("#track-select");
  for(const track of parsed.audioFiles)
  {
    trackSelect.innerHTML += `<option value="media/${track.filename}">${track.title}</option>`;
  }
  trackSelect.firstChild.selected = true;
  // add .onchange event to <select>
  document.querySelector("#track-select").onchange = e => {
    audio.loadSoundFile(e.target.value);
    //pause the current track if it is playing
    if (playButton.dataset.playing == "yes") {
      playButton.dispatchEvent(new MouseEvent("click"));
    }
  }

  let starsCB = document.querySelector("#cb-stars");
  let circlesCB = document.querySelector("#cb-circles");

  starsCB.checked = true;
  starsCB.onchange = e => {
    drawParams.showStars = e.target.checked;
  }

  circlesCB.checked = true;
  circlesCB.onchange = e => {
    drawParams.showCircles = e.target.checked;
  }

  document.querySelector("#cb-invert").onchange = e => {
    drawParams.showInvert = e.target.checked;
  }
  document.querySelector("#cb-emboss").onchange = e => {
    drawParams.showEmboss = e.target.checked;
  }

  document.querySelector('#cb-highshelf').onchange = e => {
    audio.toggleHighshelf(); // turn on or turn off the filter, depending on the value of `highshelf`!
  };
  document.querySelector('#cb-lowshelf').onchange = e => {
    //audio.highshelf = e.target.checked;
    audio.toggleLowshelf(); // turn on or turn off the filter, depending on the value of `highshelf`!
  };
  audio.toggleHighshelf();
  audio.toggleLowshelf();

  //Time or frequency data
  document.querySelector("#cb-time").onchange = e => {
    drawParams.time = e.target.checked;
  }
} // end setupUI


const loop = () => {
  setTimeout(loop, 1000/fps)
  canvas.draw(drawParams);
}

const loadJSONXHR = () =>
{
  const url = "data/av-data.json";
  const xhr = new XMLHttpRequest();
  xhr.onload = (e) => 
  {
      console.log(`In onload - HTTP Status Code = ${e.target.status}`);
      
      const returned = e.target.responseText;

      let parsed;
      try
      {
          parsed = JSON.parse(returned);
      }catch
      {
          document.querySelector("#output").innerHTML = "JSON is null";
          return;
      }
      onLoad(parsed);
      
  };
  xhr.onerror = e => console.log(`In onerror - HTTP Status Code = ${e.target.status}`);
  xhr.open("GET", url);
  xhr.send();
}

const onLoad = (parsed) =>
{
  document.querySelector("title").innerHTML = parsed.title;
  document.querySelector("#title").innerHTML = parsed.title;
  audio.setupWebaudio(`media/${parsed.audioFiles[0].filename}`);
  drawParams = parsed.initalParams;
  let canvasElement = document.querySelector("canvas"); // hookup <canvas> element
  setupUI(canvasElement, parsed);
  canvas.setupCanvas(canvasElement, audio.analyserNode);
  loop();
}
export { init };