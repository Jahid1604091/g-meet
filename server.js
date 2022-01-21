const express = require('express')
const http = require('http')

const PORT = process.env.PORT || 3000

const app = express()

const server = http.createServer(app)

const io = require('socket.io')(server)


const path = require('path')
app.use(express.static(path.join(__dirname, '')))



let usersConnections = []

io.on('connection',(socket)=>{
    //server side socket conenction created...
    
    socket.on('userconnect',(data)=>{
        //get the data from client and store in an array
        
        //other users except me
        let other_users = usersConnections.filter(p=>p.meeting_id == data.meetingId)
        
        usersConnections.push({
            connectionId:socket.id,
            user_id:data.displayName,
            meeting_id:data.meetingId
        })
        

        //send my information to other_users
        other_users.forEach((v)=>{
           
            //to method is for send info. to specific id
            socket.to(v.connectionId).emit('inform_others_about_me',{
                other_user_id:data.displayName,  //my dispayname and id will show to other
                connId:socket.id
            })
        })

       

        socket.emit('inform_me_about_other_users',other_users)

    })


    socket.on('SDPProcess',(data)=>{
        //get data and send again to client
        socket.to(data.to_connid).emit('SDPProcess',{
            message:data.message,
            from_connId:socket.id //my socket id
        })
    })



    // socket.on('disconnect',()=>{
    //     //user disconnected

    //     const newuserConnections = usersConnections.filter((peerSocketId)=>{
    //         peerSocketId !== socket.id
    //     })

    //     usersConnections = newuserConnections
       
    // })
})


server.listen(PORT,()=>{
    console.log(`Listening port ${PORT}`)
})
