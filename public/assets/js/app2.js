//all WEBRTC tasks
const AppProcess = (() => {

    let serverProcess, local_div, audio, videoCamTrack,my_connection_id
    let peers_connection_ids = []
    let peers_connection = []
    let remote_vid_stream = []
    let remote_aud_stream = []
    let rtp_aud_senders = []
    let rtp_vid_senders = []
    let isAudioMute = true
    let video_states = {
        None: 0,
        Camera: 1,
        ScreenShare: 2
    }
    let video_st = video_states.None

    const _init = async (SDP_function, my_connid) => {
        serverProcess = SDP_function
        my_connection_id = my_connid
        eventProcess()
        local_div = document.getElementById('localVideoPlayer')
    }

    const eventProcess = () => {
        let mic = document.getElementById('micMuteUnmute')
        mic.addEventListener('click', async () => {
            if (!audio) {
                await loadAudio()
            }
            if (!audio) {
                alert('Audio permission not gratnted')
                return
            }
            if (isAudioMute) {
                audio.enabled = true
                mic.innerHTML = 'mic on'
                updateMediaSenders(audio, rtp_aud_senders)
            }
            else {
                audio.enabled = false
                mic.innerHTML = 'mic off'
                removeMediaSenders(rtp_aud_senders)
            }
            isAudioMute = !isAudioMute

        })

        //video cam on/off
        let videocam = document.getElementById('videoCamOnOff')

        videocam.addEventListener('click', async () => {
            if (video_st == video_states.Camera) {
                await videoProcess(video_states.None)
            }
            else {
                await videoProcess(video_states.Camera)
            }
        })

        //screen share
        let screenShare = document.getElementById('screenShare')
        screenShare.addEventListener('click', async () => {
            if (video_st == video_states.ScreenShare) {
                await videoProcess(video_states.None)
            }
            else {
                await videoProcess(video_states.ScreenShare)
            }
        })
    }

    const loadAudio = async()=>{
        try {
            let aStream = await navigator.mediaDevices.getUserMedia({
                video:false,
                audio:true
            })
            audio = aStream.getAudioTracks()[0]
            audio.enabled = false
        } catch (error) {
            console.log(`error from audioLoad ${error}`)
        }
    }


    const connection_status = (connection) => {
        //** */
        //** connection.connectionState  not working*/
        if (connection && (connection.iceConnectionState == "new"
            || connection.iceConnectionState == "connecting"
            || connection.iceConnectionState == "connected")) {
                
                return true
        }
        else {
          
            return false
        }
    }


    const updateMediaSenders = async (track, rtp_senders) => {
        for (let con_id in peers_connection_ids) {
          
            if (connection_status(peers_connection[con_id])) {

                
                if (rtp_senders[con_id] && rtp_senders[con_id].track) {
                    rtp_senders[con_id].replaceTrack(track)
                   
                   
                }
                else {
                    rtp_senders[con_id] = peers_connection[con_id].addTrack(track)
                    
                }
            }
            
        }

    }

    const removeMediaSenders = (rtp_senders) =>{
        for(let con_id in peers_connection_ids){
            if(rtp_senders[con_id && connection_status(peers_connection[con_id])]){
                peers_connection[con_id].removeTrack(rtp_senders[con_id])
                rtp_senders[con_id] = null
            }
        }
    }

    const removeVideoStream = (rtp_vid_senders) =>{
        if(videoCamTrack){
            videoCamTrack.stop()
            videoCamTrack = null
            local_div.srcObject = null
            removeMediaSenders(rtp_vid_senders)
        }
    }

    const videoProcess = async (newVideoState) => {
        if(newVideoState == video_states.None){
            $('#videoCamOnOff').html("<span style='width:100%'>cam off</span>")
        }

        video_st = newVideoState
        removeVideoStream(rtp_vid_senders)
        

        if(newVideoState == video_states.Camera){
            $('#videoCamOnOff').html("<span style='width:100%'>cam on</span>")
        }
        try {
            let vStream = null
            if (newVideoState == video_states.Camera) {
                vStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 1920,
                        height: 1080
                    },
                    audio: false
                })
            }
            else if (newVideoState == video_states.ScreenShare) {
                vStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: 1920,
                        height: 1080
                    },
                    audio: false
                })
            }

            if (vStream && vStream.getVideoTracks().length > 0) {
                videoCamTrack = vStream.getVideoTracks()[0]
                if (videoCamTrack) {
                    local_div.srcObject = new MediaStream([videoCamTrack])
                    updateMediaSenders(videoCamTrack, rtp_vid_senders)
                    
                }
            }

        } catch (error) {
            console.log(`error from straming - ${error}`)
        }

        //change the default state
        video_st = newVideoState


    }

    let iceConig = {
        //2 stun servers (provides users info from pc network, ip )
        iceServers: [
            { 'urls': 'stun:stun.l.google.com:19302' },
            { 'urls': 'stun:stun1.l.google.com:19302' },
        ]
    }

    const setConnection = async (connId) => {
        //users info from pc through ICE 

        let connection = new RTCPeerConnection(iceConig)

        //send offer to other user to make webrtc connection
        connection.onnegotiationneeded = async (event) => {
            //set offer with connId
            await setOffer(connId)
        }

        connection.onicecandidate = (event) => {
           
            if (event.candidate) {
                //server related code is in MyApp
                serverProcess(JSON.stringify({ icecandidate: event.candidate }), connId)
            }
        }

        connection.ontrack = (event) => {
            if (!remote_vid_stream[connId]) {
                remote_vid_stream[connId] = new MediaStream()
            }

            if (!remote_aud_stream[connId]) {
                remote_aud_stream[connId] = new MediaStream()
            }

            if (event.track.kind == 'video') {
                remote_vid_stream[connId].getVideoTracks().forEach((t) => remote_vid_stream[connId].removeTrack(t))
                remote_vid_stream[connId].addTrack(event.track)
                let remoteVideoPlayer = document.getElementById('v_'+connId)
                remoteVideoPlayer.srcObject = null
                remoteVideoPlayer.srcObject = remote_vid_stream[connId]
                remoteVideoPlayer.load()
            }
            else if (event.track.kind == 'audio') {
                remote_aud_stream[connId].getAudioTracks().forEach((t) => remote_aud_stream[connId].removeTrack(t))
                remote_aud_stream[connId].addTrack(event.track)
                let remoteAudioPlayer = document.getElementById('a_'+connId)
                remoteAudioPlayer.srcObject = null
                remoteAudioPlayer.srcObject = remote_aud_stream[connId]
                remoteAudioPlayer.load()
            }
        }

        peers_connection_ids[connId] = connId
        peers_connection[connId] = connection

        
        if (video_st == video_states.Camera || video_st == video_states.ScreenShare) {
            if (videoCamTrack) {
               
                updateMediaSenders(videoCamTrack, rtp_vid_senders)
            }
        }
        
        return connection

    }


    const setOffer = async (connId) => {
        let connection = peers_connection[connId]
        let offer = await connection.createOffer()
        await connection.setLocalDescription(offer)
        serverProcess(JSON.stringify({ offer: connection.localDescription }), connId)
    }

    const SDPProcess = async (message, from_connid) => {
        message = JSON.parse(message)
        if (message.answer) {
            //check answer who send offer
            await peers_connection[from_connid].setRemoteDescription(
                new RTCSessionDescription(message.answer)
            )

        }
        else if (message.offer) {
            if (!peers_connection[from_connid]) {
                //add this peer connection to peers connection
                await setConnection(from_connid)
            }
            await peers_connection[from_connid].setRemoteDescription(
                new RTCSessionDescription(message.offer)
            )

            let answer = await peers_connection[from_connid].createAnswer()
            await peers_connection[from_connid].setLocalDescription(answer)

            //return answer fro whom get call/offer
            serverProcess(JSON.stringify({ answer: answer }), from_connid)
        }

        //exchange ice candidate
        else if (message.icecandidate) {
            if (!peers_connection[from_connid]) {
                await setConnection(from_connid)
            }
            try {
                await peers_connection[from_connid].addIceCandidate(
                    message.icecandidate
                )
            } catch (error) {
                console.log(`error in ice candidate client - ${error}`)
            }
        }


    }

    return {
        setNewConnection: async (connId) => {
            await setConnection(connId)
        },
        init: async (SDP_function, my_connid) => {
            await _init(SDP_function, my_connid)
        },
        processClientFunction: async (data, from_connid) => {
            await SDPProcess(data, from_connid)
        }
    }

})()

//------------------------------------------------------

//all SIGNALING tasks
export const MyApp = (() => {
    let socket = null
    let user_id = ''
    let meeting_id = ''

    const init = (uid, mid) => {
        user_id = uid
        meeting_id = mid
        $("#meetingContainer").show()
        $("#me h2").text(user_id + '(ME')
        document.title = user_id
        event_process_for_signaling_server()
    }

    const event_process_for_signaling_server = () => {
        socket = io.connect()

        let SDP_function = (data, to_connid) => {
            socket.emit('SDPProcess', {
                message: data,
                to_connid: to_connid
            })
        }

        socket.on('connect', () => {
            //client side socket conenction created...

            //cheking whether socket is still connected
            if (socket.connected) {

                AppProcess.init(SDP_function, socket.id)

                if (user_id != '' && meeting_id != '') {
                    //fire an event to pass data to server
                    socket.emit('userconnect', {
                        displayName: user_id,
                        meetingId: meeting_id
                    })
                }
                else {
                    console.log('client - uid not connected')
                }
            }
            else {
                console.log('client - socket not connected')
            }
        })

        socket.on('inform_others_about_me', (data) => {
           
            addUser(data.other_user_id, data.connId)
            //set a webrtc connection for video audio
            AppProcess.setNewConnection(data.connId)
        })

        socket.on('inform_me_about_other_users', (other_users) => {
            
            if (other_users) {
                
                for (let i = 0; i < other_users.length; i++) {
                   
                    addUser(other_users[i].user_id,other_users[i].connectionId)
                    //set a webrtc connection for video audio
                    AppProcess.setNewConnection(other_users[i].connectionId)
                    
                }
            }

        })

        socket.on('SDPProcess', async (data) => {
            await AppProcess.processClientFunction(data.message, data.from_connId)
        })

    }


    const addUser = (other_user_id, connId) => {
        var newDivId = $('#otherTemplate').clone()
        newDivId.attr('id', connId).addClass('other')
        newDivId.find('h2').text = other_user_id
        newDivId.find('video').attr('id', 'v_'+connId)
        newDivId.find('audio').attr('id', 'a_'+connId)
        newDivId.show()

        $('#divUsers').append(newDivId)
    }

    return {
        _init: (uid, mid) => {
            init(uid, mid)
        }
    }
})()
