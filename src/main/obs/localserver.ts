var express = require('express');
var cors = require('cors');
var app = express();


app.use(cors());

app.get('/heartbeat', function (req, res) {
   res.jsonp('Hello Starscape')
})




const Port = 34306

var server = app.listen(Port, function () {
console.log("start a server listening on port: ", Port)

})

server.on('listening', ()=>{
   console.log('catch server start up')
})

server.on('error', function (err) {
   console.log('port is occupied')
})

server.on('disconnect', function () {
   console.log('port is disconnected')
})

export default server


