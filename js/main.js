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

var first_answer = true;

var pc = new RTCPeerConnection(null);
var acx = new AudioContext();

function handleIceCandidate(event) {
	if (event.candidate) {
		console.log(event)
	} else {
		console.log(pc.localDescription)
		send_offer(pc.localDescription.sdp)
	}
}

function handleMediaStream(event) {
	console.log("handleMediaStream", event)
	document.getElementById("videoWindow").srcObject = event.stream;
}


function requestUserMedia() {
	navigator.mediaDevices.getUserMedia({
		audio: true,
		video: true
  })
  .then((stream) => {pc.addStream(stream); createOffer() })
  .catch(function(e) {
	  console.log(e)
    alert('getUserMedia() error: ' + e.name);
  });
}

pc = new RTCPeerConnection(null);

function createOffer() {
  var offerOptions = {
    // New spec states offerToReceiveAudio/Video are of type long (due to
    // having to tell how many "m" lines to generate).
    // http://w3c.github.io/webrtc-pc/#idl-def-RTCOfferAnswerOptions.
    offerToReceiveAudio: (audioInput.checked) ? 1 : 0,
    offerToReceiveVideo: (videoInput.checked) ? 1 : 0,
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

function strip_sip(answer) {
	var index = null
	if (index = answer.indexOf("\r\n\r\n")) {
		answer = answer.substr(index+4)
	}
	
	return answer;
}

function handleAnswer(msg) {	
	var reader = new FileReader();
	reader.onload = function() {		
		var sip = reader.result
		if (sip.indexOf("SIP/2.0 200 Answering") != -1) {
			if (first_answer) {
				first_answer = false;
				console.log("got first msg", sip)
			} else {
				console.log("ignoring subsequent msg", sip)
				return
			}
			console.log("SIP Answer received")
			var sdp = strip_sip(sip);
			var desc = {
				'type' : 'answer',
				'sdp' : sdp
				}
				
			send_ack();
			pc.setRemoteDescription(new RTCSessionDescription(desc))
		} else {
			console.log("other sip event", sip)
		}
	}
	reader.readAsText(msg.data);
}

var ws_url = "ws://" + location.hostname + ":8888";
console.log("WebSocket URL: ", ws_url)
var ws = new WebSocket(ws_url, "sip")
ws.onopen = createOffer
ws.onmessage = handleAnswer;

//ws.onopen = requestUserMedia
requestUserMedia()

/** SIP Fake Header Functions */

function send_ack() {
	var ack =
	"ACK sip:202@172.22.99.150 SIP/2.0\r\n\
	Via: SIP/2.0/UDP 172.22.99.150:5060;branch=z9hG4bK0223ae47334d14ca;rport\r\n\
	Max-Forwards: 70\r\n\
	To: <sip:0i@172.22.99.150>;tag=0bc3aa7597a06724\r\n\
	From: <sip:202@172.22.99.150>;tag=6173b9c87aa7a537\r\n\
	Call-ID: 3dd3260dbcb46751\r\n\
	CSeq: 30695 ACK\r\n\
	User-Agent: baresip v0.5.1 (x86_64/linux)\r\n\
	Content-Length: 0\r\n\
	"
	
	ws.send(ack)
}

function send_offer(sdp) {
	var invite = "INVITE sip:202@172.22.99.150:1337 SIP/2.0\r\n\
Via: SIP/2.0/UDP 172.22.99.150:5060;branch=z9hG4bK27d89da3ed1dc14f;rport\r\n\
Contact: <sip:202-0x13c86c0@172.22.99.150:5060>\r\n\
Max-Forwards: 70\r\n\
To: <sip:202@172.22.99.150>\r\n\
From: <sip:202@localhost>;tag=9fb5a59fe99931de\r\n\
Call-ID: db5f1796abd4e582\r\n\
CSeq: 30695 INVITE\r\n\
User-Agent: baresip v0.5.1 (x86_64/linux)\r\n\
Allow: INVITE,ACK,BYE,CANCEL,OPTIONS,REFER,NOTIFY,SUBSCRIBE,INFO,MESSAGE\r\n\
Supported: gruu\r\n\
Content-Type: application/sdp\r\n\
Content-Length: "

	invite = invite + sdp.length + "\r\n\r\n"
	invite += sdp
	console.log(invite)

	ws.send(invite)
}
