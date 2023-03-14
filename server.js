const http = require('http')
const app = require('./app')
const port = process.env.PORT || 3030
const server = http.createServer(app)
const {userJoin, getCurrentUser, userLeave, getRoomUsers} = require('./util/user')
const clients = []
const socketio = require('socket.io')

const io = socketio(server, {
  cors: {
    Headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
      'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept',
    },
  }})

    io.on('connection', (socket) => {
        socket.on("joinRoom", ({ username, roomName }) => {
            
            const lastUserRoom = getCurrentUser(socket.id)
            if (lastUserRoom && lastUserRoom.room == roomName) {
              console.log("user already in room")
            }
            else{
              if(lastUserRoom){
                socket.leave(lastUserRoom.room)
                const user = userLeave(socket.id)
                if (user) {
                    io.to(user.room).emit("message",{"nickName":"bot ", "message": `${username} disconnected`, "color":"cyan"})

                }
            }
          
            const user = userJoin(socket.id, username, roomName)
            socket.join(user.room)
            const usersInRoom = getRoomUsers(user.room)
            const viewers = usersInRoom.length
            socket.to(user.room).emit('message', {"nickName":"bot", "message": `${username} has connected to the room`, "color":"cyan", viewers:viewers} )
            socket.emit('message', {"nickName":"bot", "message": `hi ${username} Welcome to the room `, "color":"cyan", "newRoom":true, viewers:viewers} )
            }
          })
        clients.push(socket)
    
        socket.on('chat', (msg) => {
            const user = getCurrentUser(socket.id)
            const usersInRoom = getRoomUsers(user.room)
            const viewers = usersInRoom.length
            io.to(user.room).emit('message', {...msg, viewers:viewers})
        })
    
      socket.on("disconnect", () => {
        const lastUserRoom = getCurrentUser(socket.id)
        const user = userLeave(socket.id)
        var viewers = 0
        if (lastUserRoom) {
          const usersInRoom = getRoomUsers(lastUserRoom.room)
          viewers = usersInRoom.length
        }
        if (user) {
            io.to(user.room).emit("message",{"nickName":"bot", "message": `${user.username} disconnected`, "color":"cyan", viewers:viewers})
        }
      })
      socket.on("end-event", () => {
        const user = getCurrentUser(socket.id)
        const usersInRoom = getRoomUsers(user.room)
        const viewers = usersInRoom.length
        io.to(user.room).emit('event-ended', {"nickName":"bot", "message": "event ended", "color":"cyan", viewers:viewers})
      })
      socket.on("change-camera", (msg) => {
        const user = getCurrentUser(socket.id)
        const usersInRoom = getRoomUsers(user.room)
        const viewers = usersInRoom.length
        io.to(user.room).emit('camera-changed', {"nickName":"bot", "admin-message": msg.message, "color":"cyan", viewers:viewers})
      })
    })

server.listen(port)