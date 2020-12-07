var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.set('view engine', 'ejs')

let userName = ""
let userImg = ""
let activeUser = []
let connectCounter = 0

var publicDir = require('path').join(__dirname, '/public');
app.use(express.static(publicDir));

app.get('/', function(req, res) {
    res.render("login", { error: req.query.error })
});

app.post('/strat-chat-body', function(req, res) {
    userName = req.body.userName
    userImg = req.body.userImg
    res.render("main", {
        userName: userName,
        userImg: userImg
    })
});

function formatAMPM(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
}




function addOnline() {
    return connectCounter += 1
}

function reduceOnline() {
    return connectCounter -= 1
}

function getActiveUsers(socketid) {
    let result = activeUser.findIndex(user => user.userName == userName)
    if (result == -1 && userName != "") {
        activeUser.push({ id: socketid, userName: userName, userImg: userImg })
    }
    return activeUser
}

function leaveUser(id) {
    let result = activeUser.findIndex(user => user.id == id)
    activeUser.splice(result, 1)
    return activeUser
}


io.on('connection', function(socket) {
    const newUserId = socket.id
    io.emit('active', getActiveUsers(socket.id))

    io.emit("count", addOnline())

    socket.on('message', function(msg) {
        io.emit('message', msg);
    });

    socket.on('typing', function(typing) {
        socket.broadcast.emit('typing', typing)
    });

    socket.on('untyping', function() {
        socket.broadcast.emit('untyping')
    });


    //Broadcast if a new user connect
    let date = new Date()
    let dateStamp = date.getFullYear() + "-" + date.getMonth() + 1 + "-" + date.getDate();
    let timeStamp = formatAMPM(date)

    const result = activeUser.filter(user => user.id == socket.id);
    socket.broadcast.emit("message", {
        "sender": "StratBOT",
        "message": `${result[0].userName}  joined the chat!`,
        "date": dateStamp,
        "time": timeStamp,
    })

    //Broadcast if a user disconnect
    socket.on('disconnect', function() {
        const result = activeUser.filter(user => user.id == socket.id);
        io.emit('active', leaveUser(socket.id))
        io.emit("count", reduceOnline())
        io.emit("message", {
            "sender": "StratBOT",
            "message": `${result[0].userName}  left the chat!`,
            "date": dateStamp,
            "time": timeStamp,
        })
    });

});


http.listen(port, function() {
    console.log('listening on *:' + port);
});