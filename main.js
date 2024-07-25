const API_ID = "161e486c1da34563b3b7f707f268a6a9";
let disposingPeer;
let receivingPeer;

let uid = String(Math.floor(Math.random() * 10000));
let token

let client;
let channel;
let peerConnection;

   const stun_server = {
     iceServers: [
       {
         urls: "stun:3.70.112.130:3478",
       },
     ],
   };

const initialize = async () => {
  client = await AgoraRTM.createInstance(API_ID);
  await client.login({ uid, token })

  //create channel 
  channel = client.createChannel('main')
  await channel.join()
  //checked if member has joined 
  channel.on('MemberJoined', handleMemberJoined)
  client.on('MessageFromPeer', handleMessageFromPeer)
  disposingPeer = await navigator.mediaDevices.getUserMedia({video: true, audio: false})
  document.getElementById('user-1').srcObject = disposingPeer
}

const handleMemberJoined = async (MemberId) => {
  createOffer(MemberId)
}
const handleMessageFromPeer = async (message, MemberId) => {
  const receivedMessage = JSON.parse(message.text)
  if (receivedMessage.type === "offer") {
    createAnswer(receivedMessage.offer, MemberId);
  }
  if(receivedMessage.type === 'answer') {
    addAnswer(receivedMessage.answer)
  }

  if(receivedMessage.type === 'candidate') {
     if(peerConnection){
      peerConnection.addIceCandidate(receivedMessage.candidate)
    }
  }

}

const createPeerConnection = async (MemberId) => {
  peerConnection = new RTCPeerConnection(stun_server)
  receivingPeer = new MediaStream()
  document.getElementById('user-2').srcObject = receivingPeer
  document.getElementById('user-2').style.display = 'block'

  if (!disposingPeer) {
    disposingPeer = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    document.getElementById("user-1").srcObject = disposingPeer;
  }

   disposingPeer.getTracks().forEach(track => {
    return peerConnection.addTrack(track, disposingPeer)
   });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      receivingPeer.addTrack(track);
    });
  };

   peerConnection.onicecandidate = (event) => {
     if (event.candidate) {
       client.sendMessageToPeer({text: JSON.stringify({type: 'candidate', candidate: event.candidate})}, MemberId)
     }
   };
}

const createOffer = async (MemberId) => {
  await createPeerConnection(MemberId)
   const offer = await peerConnection.createOffer();
  await  peerConnection.setLocalDescription(offer)
   client.sendMessageToPeer(
     { text: JSON.stringify({type: 'offer', offer}) },
     MemberId
   );
}

const createAnswer =  async(offer, MemberId) =>{
  await createPeerConnection(MemberId)
  await peerConnection.setRemoteDescription(offer)
  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)
  client.sendMessageToPeer({text: JSON.stringify({type: 'answer', answer})}, MemberId)
}

const addAnswer = async(answer)=>{
  if(!peerConnection.currentRemoteDescription){
    peerConnection.setRemoteDescription(answer)
  }
}

initialize()