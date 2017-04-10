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

var numAudioTracksInput = document.querySelector('div#numAudioTracks input');
var numAudioTracksDisplay =
    document.querySelector('span#numAudioTracksDisplay');
var outputTextarea = document.querySelector('textarea#output');
var createOfferButton = document.querySelector('button#createOffer');

createOfferButton.onclick = createOffer;

var first_answer = true;

numAudioTracksInput.onchange = function() {
  numAudioTracksDisplay.textContent = this.value;
};

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
	//document.getElementById("audioElement").srcObject = event.stream;
	document.getElementById("videoWindow").srcObject = event.stream;
	//console.log(event)
}

function gotStream(stream) {
	document.getElementById("videoWindow").srcObject = stream;
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
  if (pc) {
//    pc.close();
//    pc = null;
//    pc = new RTCPeerConnection(null);
  }
    
  var numRequestedAudioTracks = numAudioTracksInput.value;
  while (numRequestedAudioTracks < pc.getLocalStreams().length) {
    pc.removeStream(pc.getLocalStreams()[pc.getLocalStreams().length - 1]);
  }
  while (numRequestedAudioTracks > pc.getLocalStreams().length) {
    // Create some dummy audio streams using Web Audio.
    // Note that this fails if you try to do more than one track in Chrome
    // right now.
    var dst = acx.createMediaStreamDestination();
    //pc.addStream(dst.stream);
  }

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
    //send_offer(desc.sdp)
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
	//console.log("handleAnswer;", String(msg.data))
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
//			var remote_pc = new RTCPeerConnection(configuration)
//remote_pc.setRemoteDescription(new RTCSessionDescription(offer), ...) {
//  remote_pc.createAnswer()
//}
		} else {
			console.log("other sip event")
			//console.log(sip)
		}
	}
	reader.readAsText(msg.data);
}

var ws = new WebSocket('ws://172.22.99.150:8888', 'sip')
//var ws = new WebSocket('ws://192.168.254.184:8888', 'sip')
//ws.onopen = createOffer
ws.onopen = requestUserMedia
ws.onmessage = handleAnswer;

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

var invite = "SIP/2.0 2INVITE sip:202@172.22.99.150:1337 SIP/2.0\r\n\
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
