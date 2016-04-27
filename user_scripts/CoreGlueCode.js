"use strict";
/*
 Copyright (C) 2012-2016 Grant Galitz

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var IodineGUI = {
    Iodine:null,
    Blitter:null,
    timerID: null,
    startTime:(+(new Date()).getTime()),
    mixerInput:null,
    defaults:{
        sound:true,
        volume:1,
        skipBoot:false,
        toggleSmoothScaling:true,
        toggleDynamicSpeed:false,
        toggleOffthreadGraphics:true,
        toggleOffthreadCPU:(navigator.userAgent.indexOf('AppleWebKit') == -1),
        keyZones:[
            //Use this to control the key mapping:
            //A:
            [88, 74],
            //B:
            [90, 81, 89],
            //Select:
            [16],
            //Start:
            [13],
            //Right:
            [39],
            //Left:
            [37],
            //Up:
            [38],
            //Down:
            [40],
            //R:
            [50],
            //L:
            [49]
        ]
    }
};
window.onload = function () {
    //Populate settings:
    registerDefaultSettings();
    //Initialize Iodine:
    registerIodineHandler();
    //Initialize the timer:
    registerTimerHandler();
    //Initialize the graphics:
    registerBlitterHandler();
    //Initialize the audio:
    registerAudioHandler();
    //Register the save handler callbacks:
    registerSaveHandlers();
    //Register the GUI controls.
    registerGUIEvents();
    //Register GUI settings.
    registerGUISettings();
    //Start game:
    downloadBIOS();
}
function downloadBIOS() {
    downloadFile("bios.bin", registerBIOS);
}
function registerBIOS() {
    processDownload(this, attachBIOS);
    downloadROM("mother3.gba");
}
function downloadROM() {
    IodineGUI.Iodine.pause();
    showTempString("Downloading Earthbound 2");
    downloadFile("mother3.gba", registerROM);
}
function registerROM() {
    clearTempString();
    processDownload(this, attachROM);
    if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/iPad/i)) {
        IodineGUI.Iodine.disableAudio();
    }
    IodineGUI.Iodine.play();
    document.getElementById("play").className = "hide";
    document.getElementById("pause").className = "show";
    document.getElementById("menu").className = "playing";
}
function registerIodineHandler() {
    try {
        /*
        We utilize SharedArrayBuffer and Atomics API,
        which browsers prior to 2016 do not support:
        */
        if (typeof SharedArrayBuffer != "function" || typeof Atomics != "object") {
            throw null;
        }
        else if (!IodineGUI.defaults.toggleOffthreadCPU) {
            //Try starting Iodine normally, but initialize offthread gfx:
            IodineGUI.Iodine = new IodineGBAWorkerGfxShim();
        }
        else {
            //Try starting Iodine in a webworker:
            IodineGUI.Iodine = new IodineGBAWorkerShim();
            //Have to manually capture the error if CPU thread is in a webworker:
            IodineGUI.Iodine.attachPlayErrorHandler(resetPlayButton);
            //In order for save on page unload, this needs to be done:
            addEvent("beforeunload", window, registerBeforeUnloadHandler);
        }
    }
    catch (e) {
        //Otherwise just run on-thread:
        IodineGUI.Iodine = new GameBoyAdvanceEmulator();
    }
}
function registerBeforeUnloadHandler(e) {
    IodineGUI.Iodine.pause();
    document.getElementById("pause").className = "hide";
    document.getElementById("play").className = "show";
    if (e.preventDefault) {
        e.preventDefault();
    }
    return "IodineGBA needs to process your save data, leaving now may result in not saving current data.";
}
function registerTimerHandler() {
    var rate = 16;
    IodineGUI.Iodine.setIntervalRate(rate | 0);
    setInterval(function () {
        //Check to see if web view is not hidden, if hidden don't run due to JS timers being inaccurate on page hide:
        if (!document.hidden && !document.msHidden && !document.mozHidden && !document.webkitHidden) {
            if (document.getElementById("play").className == "hide") {
                IodineGUI.Iodine.play();
            }
            IodineGUI.Iodine.timerCallback(((+(new Date()).getTime()) - (+IodineGUI.startTime)) >>> 0);
        }
        else {
            IodineGUI.Iodine.pause();
        }
    }, rate | 0);
}
function registerBlitterHandler() {
    IodineGUI.Blitter = new GfxGlueCode(240, 160);
    IodineGUI.Blitter.attachCanvas(document.getElementById("emulator_target"));
    IodineGUI.Iodine.attachGraphicsFrameHandler(IodineGUI.Blitter);
}
function registerAudioHandler() {
    var Mixer = new GlueCodeMixer();
    IodineGUI.mixerInput = new GlueCodeMixerInput(Mixer);
    IodineGUI.Iodine.attachAudioHandler(IodineGUI.mixerInput);
}
