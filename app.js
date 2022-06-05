const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3');
const app = express();
const port = 9999;
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.use(express.static('public'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({secret: 'ssshhhhh'}))

var serialport = require('serialport');
const res = require('express/lib/response');
const { redirect } = require('express/lib/response');
const Readline = serialport.ReadlineParser;



SerialPort = serialport.SerialPort; 
var myPort = new SerialPort({
    path:"COM4",
    baudRate:9600,
    parser: new Readline("")
  });

myPort.on('open', showPortOpen);
myPort.on('data', sendSerialData);
myPort.on('close', showPortClose);
myPort.on('error', showError);

var parity=0;
var str =""
var sesiune
function showPortOpen() {
    console.log('port open. Data rate: ' + myPort.baudRate);
}

function sendSerialData(data) {
    
    if(parity%2==0){
        str = str + data.toString()
    }
    else{
        str = str + data.toString()
        if(sesiune != undefined){
            let db = new sqlite3.Database('./smartPot.db', (err) => {
                if(err) {
                    return console.log(err.message);
                }
                console.log(str)
                if(parseInt(str) < 100){
                    db.run(`INSERT INTO humidityLogs(id, humidity, day) VALUES (?, ?, ?)`, [sesiune.userid,  parseInt(str), new Date().toISOString().split("T")[0]], (err) => {
                        if(err) {
                            return console.log(err.message); 
                        }
                        console.log('Adaugarea s-a realizat cu succes!');
                        sesiune.currenthumidity = parseInt(str)
                        console.log(str)
                        str=""
                        })
                }
            })
        }
    }
    parity++
    
}

function showPortClose() {
console.log('port closed.');
}

function showError(error) {
console.log('Serial port error: ' + error);
}

app.get('/', (req, res) => {
    res.render('index', {e: null})
});

app.get('/creare-cont', (req, res) => {
	res.render('cont-nou');
});
app.post('/creare', (req, res) => {
    let username = req.body.username;
	let password = req.body.password;
    let humidity_min = req.body.humidityMin;
    let humidity_max = req.body.humidityMax;
	let db = new sqlite3.Database('./smartPot.db', (err) => {
        if(err) {
            return console.log(err.message);
        }
    db.run(`INSERT INTO users(username, password, humidity_min, humidity_max) VALUES (?, ?, ?, ?)`, [username, password, humidity_min, humidity_max], (err) => {
    if(err) {
        return console.log(err.message); 
    }
    console.log('Adaugarea s-a realizat cu succes!');
    })
})
res.redirect('/')
});


app.post('/verificare-autentificare', async(request, response) => {
    let username = request.body.username;
	let password = request.body.password;
    let db = new sqlite3.Database('./smartPot.db', (err) => {
        if(err) {
            return console.log(err.message);
        }
    })
    db.all(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, data) => {
        if(err) {
            return console.log(err.message); 
        }
        if(data.length == 1){
            sess = request.session
            sesiune = sess
            sess.username = username
            sess.userid = data[0].id
            response.redirect("home")
        }
        if(data.length != 1){
            sess = request.session
            sesiune = sess
            sess.errorMsg = "Utilizator sau parola gresite!"
            response.render('index', {e: sess.errorMsg})
            return
        } 
    })
})
app.get('/home', (req, res) => {
    let db = new sqlite3.Database('./smartPot.db', (err) => {
        if(err) {
            return console.log(err.message);
        }
    })
    
    let username = req.session.username
    db.all(`SELECT humidity_min, humidity_max FROM users WHERE username = ?`, [username], (err, data) => {
        if(err) {
            return console.log(err.message); 
        }
        
        if(data != undefined && data.length != 0){
            let humidityMin = data[0].humidity_min
            let humidityMax = data[0].humidity_max
            let flag = false
            if(sesiune.currenthumidity >= humidityMin && sesiune.currenthumidity <= humidityMax){
                flag = true
            }
            myPort.write(data[0].humidity_min+ " "+data[0].humidity_max)
            db.all(`SELECT * FROM humidityLogs WHERE id = ?`, [req.session.userid], (err, data) => {
                if(err) {
                    return console.log(err.message); 
                }
                res.render('home', {u: sess.username, flag: flag, humidity: sesiune.currenthumidity, data: data })
            })
        }
        else{
            res.redirect("/")
        }
        
        return
    })

})

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err) {
            return console.log(err);
        }
        myPort.write("delogare");
        res.redirect('/');
    });
})
app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));
