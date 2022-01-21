const appProcess = (() => {
    let serverProcess;
    let peers_connection_ids = []
    let peers_connection = []
    let remote_vid_stream = []
    let remote_aud_stream = []

    const _init = (SDP_function, my_conn_id) => {
        serverProcess = SDP_function
        my_connection_id = my_conn_id
    }

    let iceConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun.l.google.com:19302' },
        ]
    }

    const setConnection = (connId) => {
        let connection = new RTCPeerConnection(iceConfig)
        connection.onnegotiationneeded = async (event) => {
            await setOffer(connId)
        }
        connection.onicecandidate = (event) => {
            if (event.candidate) {
                serverProcess(
                    JSON.stringify({ icecandidate: event.candidate }), connId)
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
                remote_vid_stream[connId].getVideoTracks()
                    .forEach((t) => {
                        remote_vid_stream[connId].removeTrack(t)
                    })
                remote_vid_stream[connId].addtrack(event.track)
                let remoteVideoPlayer = document.getElementById(`v_${connId}`)
                remoteVideoPlayer.srcObject = null
                remoteVideoPlayer.srcObject = remote_vid_stream[connId]
                remoteVideoPlayer.load()

            }
            else if (event.track.kind == 'audio') {
                remote_aud_stream[connId].getAudioTracks()
                    .forEach((t) => {
                        remote_aud_stream[connId].removeTrack(t)
                    })
                remote_aud_stream[connId].addtrack(event.track)
                let remoteAudioPlayer = document.getElementById(`a_${connId}`)
                remoteAudioPlayer.srcObject = null
                remoteAudioPlayer.srcObject = remote_aud_stream[connId]
                remoteAudioPlayer.load()

            }

            peers_connection_ids[connId] = connId
            peers_connection[connId] = connection
            return connection
        }
        const setOffer = async (connId) => {
            let connection = peers_connection[connId]
            let offer = await connection.creteOffer()
            await connection.setLocalDescription(offer)

            serverProcess(JSON.stringify({ offer: connection.localDescription }), connId)
        }
    }


    return {
        setNewConnection: async (connId) => {
            await setConnection(connId);
        },
        init: async (SDP_function, my_conn_id) => {
            await _init(SDP_function, my_conn_id)
        },
        processClient: async (SDP_function, my_conn_id) => {
            await SDPProcess(data, from_connId)
        }
    };



})()


//------------------------------------------------------//

export const MyApp = (() => {

    let socket = null
    let userId = ''
    let meetingId = ''

    const init = (uid, mid) => {
        userId = uid
        meetingId = mid
        event_process_for_signaling_server()
    }

    const event_process_for_signaling_server = () => {
        socket = io.connect()
        let SDP_function = (data, to_conn_id) => {
            socket.emit('SDPProcess', {
                message: data,
                to_conn_id: to_conn_id
            })
        }
        socket.on('connect', () => {
            if (socket.connected) {
                if (userId != '' && meetingId != '') {
                    appProcess.init(SDP_function, socket.id)
                    //fire an event
                    socket.emit('user_connect', {
                        displayName: userId,
                        meetingId: meetingId
                    })
                }
            }
        })

        //extract event
        socket.on('inform_others_about_me', (data) => {
            // console.log(`Client side - ${data}`)
            addUser(data.other_user_id, data.connId)
            //this function to build webrtc connection
            appProcess.setNewConnection(data.connId)
        })

        socket.on('SDPProcess', async (data) => {
            await appProcess.processClient(data.message, data.from_connId)
        })

    }

    const addUser = (other_user_id, connId) => {
        let newDivId = document.getElementById('otherTemplate').cloneNode(true)
        newDivId.setAttribute('id', connId).classList.add('other')
        newDivId.document.getElementByTagName('h2').textContent = other_user_id
        newDivId.document.getElementByTagName('video').setAttribute('id', `v_${connId}`)
        newDivId.document.getElementByTagName('audio').setAttribute('id', `a_${connId}`)
        newDivId.style.display = 'block'

        document.getElementById('divUsers').appendChild(newDivId)
    }


    return {
        //_init is a function obj that return the func
        _init: (uid, mid) => {
            init(uid, mid);
        },
    };


})();

//() -> it means immediately invoking

