/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var audioInput = document.querySelector('input#audio');
var restartInput = document.querySelector('input#restart');
var vadInput = document.querySelector('input#vad');
var videoInput = document.querySelector('input#video');

var outputTextarea = document.querySelector('textarea#output');
var createOfferButton = document.querySelector('button#createOffer');

createOfferButton.onclick = createOffer;

function handleIceCandidate(event) {
	if (event.candidate) {
		console.log(event)
	} else {
		console.log(pc.localDescription)
		ws.send(JSON.stringify(pc.localDescription))
	}
}

function handleMediaStream(event) {
	console.log("handleMediaStream", event)
	document.getElementById("videoWindow").srcObject = event.stream;
	document.getElementById("videoWindow").play();
}


function requestUserMedia() {
	navigator.mediaDevices.getUserMedia({
		audio: true,
		video: true
  })
  .then((stream) => {
      pc.addStream(stream);
      var video = document.getElementById("videoWindow");
      video.srcObject = stream;
      video.play();
  })
  .catch(function(e) {
	  console.log(e)
    alert('getUserMedia() error: ' + e.name + e.message);
  });
}

//pc = new RTCPeerConnection(null);
var pc = new RTCPeerConnection({"DtlsSrtpKeyAgreement": false});

function createOffer() {
  var offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1,
    iceRestart: restartInput.checked,
    voiceActivityDetection: vadInput.checked
  };

  pc.onicecandidate = handleIceCandidate
  pc.onaddstream = handleMediaStream
  pc.createOffer(offerOptions)
  
  .then(function(desc) {
    pc.setLocalDescription(desc);
    outputTextarea.value = desc.sdp;
  })
  .catch(function(error) {
    outputTextarea.value = 'Failed to createOffer: ' + error;
  });
  
}

function handleAnswer(msg) {
  var answer = JSON.parse(msg.data)
  var sdp = new RTCSessionDescription(answer)
  pc.setRemoteDescription(sdp)
}

var ws_url = "ws://" + location.hostname + ":6789"
var ws = new WebSocket(ws_url)
//ws.onopen = createOffer
ws.onmessage = handleAnswer;

requestUserMedia();
