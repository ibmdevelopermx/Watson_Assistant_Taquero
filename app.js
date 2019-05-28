//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

var express = require('express');
var cfenv = require('cfenv');

var watson = require('watson-developer-cloud');
var bodyParser = require('body-parser');

//IAM
var wconv_version_date = '2018-09-20';
var wconv_workspaceId = '{your-workspace}';
var wconv_apikey = '{your-apikey}'
var wconv_url = 'https://gateway.watsonplatform.net/assistant/api'

var app = express();
var appEnv = cfenv.getAppEnv();
var session = require('express-session');

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

app.set('trust proxy', 1) // trust first proxy 
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))

app.get('/chat', function (req, res) {
    res.sendFile(__dirname + '/public/chatv2.html');
});

app.get('/initiliaze', function(req, res){
  
  //IAM
  var assistant = new watson.AssistantV1({
    iam_apikey: wconv_apikey,
    version: wconv_version_date,
    url: wconv_url
  });

  var username = req.query.username;

  assistant.message({
    workspace_id: wconv_workspaceId,
    input: {'text': ''},
    context: { 
      'USERNAME': username,
      "CANAL": "WEB"
    }
  },  function(err, response) {
      session.context = response.context;
      
      var msgOut = "";
      var additionalText = "";
      var sys_name = "IBM Watson", avatar = "post", cssClass = "watson";
      for(var i=0; i<response.output.text.length; i++)
      {
        msgOut += "<section class=\"post\">";
        msgOut += "<header class=\"post-header-watson\">";
        msgOut += "<img width=\"48\" height=\"48\" alt=\"img\" class=\"" + avatar + "-avatar-w\" src=\"images/avatar-" + cssClass + ".png\">";
        msgOut += "<h2 class=\"post-title-" + cssClass +  "\">@" + sys_name + "</h2>";
        msgOut += "</header>";
        msgOut += "<div class=\"post-description-" + cssClass + "\">";
        msgOut += response.output.text[i];
        msgOut += additionalText;
        msgOut += "</div>";
        msgOut += "</section>";
      }

      res.send(msgOut)
  });

});

app.get('/sendMessage', function (req, res) {
  
  var message = req.query.message;
  var saved_context = session.context;
  var username = req.query.username;

  //IAM
  var assistant = new watson.AssistantV1({
    iam_apikey: wconv_apikey,
    version: wconv_version_date,
    url: wconv_url
  });

  //IAM
  assistant.message({
    workspace_id: wconv_workspaceId,
    input: {'text': message},
    context: saved_context
  },  function(err, response) {
      session.context = response.context;

      var additionalText = "";
      if(response.context.BANDERA_UBICACION !== undefined)
      {
        var additionalText = "<br><iframe " + 
          "src=\"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3764.180449439749!2d-99.27662588457551!3d19.361337747971394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d200e109a496a5%3A0x29bbf597c634a976!2sLiverpool!5e0!3m2!1sen!2sus!4v1545231476611\"" +
          "width=\"700\" height=\"400\" frameborder=\"0\""
          "style=\"border:0\" allowfullscreen></iframe>";
          delete response.context.BANDERA_UBICACION;
          callback(res, username, message, response, additionalText)
      }
      else if(response.context.BANDERA_COTIZAR !== undefined)
      {
         var request = require('request');
         //url to API
         var tipoPrenda = response.context.CATEGORIA_PRODUCTO
         var url_database = req.protocol + '://' + req.get('host') + '/calldatabase?tipo=' + tipoPrenda
          request(url_database, function (error, responseAPI, bodyAPI) {
            var datos_api = JSON.parse(bodyAPI)
            index_Start = response.entities[0].location[0]
            indext_End = response.entities[0].location[1] 
            response.context.PRENDA = response.input.text.substr(index_Start, indext_End-index_Start)
            response.context.PROMOCIONES = datos_api.promociones
            response.context.PROMOCIONES_OK = "true"

            assistant.message({
              workspace_id: wconv_workspaceId,
              input: {'text': message},
              context: response.context
            },
              function(err, response2) {
                
                delete response.context.BANDERA_COTIZAR;
                session.context = response2.context;
                callback(res, username, message, response2, additionalText)
              });
        });
      }
      else
      {
        callback(res, username, message, response, additionalText)
      }
  });

});

function callback(res, username, message, watsonresponse, additionalText){
  var name = username, avatar = "pre", cssClass = "user";
    var msgOut = "";
    msgOut += "<section class=\"post\">";
    msgOut += "<header class=\"post-header-watson\">";
    msgOut += "<img width=\"48\" height=\"48\" alt=\"img\" class=\"" + avatar + "-avatar-w\" src=\"images/avatar-" + cssClass + ".png\">";
    msgOut += "<h2 class=\"post-title-" + cssClass +  "\">@" + name + "</h2>";
    msgOut += "</header>";
    msgOut += "<div class=\"post-description-" + cssClass + "\">";
    msgOut += message;
    msgOut += "</div>";
    msgOut += "</section>";

    
    name = "IBM Watson", avatar = "post", cssClass = "watson";
    for(var i=0; i<watsonresponse.output.text.length; i++)
    {
      msgOut += "<section class=\"post\">";
      msgOut += "<header class=\"post-header-watson\">";
      msgOut += "<img width=\"48\" height=\"48\" alt=\"img\" class=\"" + avatar + "-avatar-w\" src=\"images/avatar-" + cssClass + ".png\">";
      msgOut += "<h2 class=\"post-title-" + cssClass +  "\">@" + name + "</h2>";
      msgOut += "</header>";
      msgOut += "<div class=\"post-description-" + cssClass + "\">";
      msgOut += watsonresponse.output.text[i];
      msgOut += additionalText;
      msgOut += "</div>";
      msgOut += "</section>";
    }
    res.send(msgOut)
}

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  console.log("server starting on " + appEnv.url);
});

app.get("/calldatabase", function(req, res){
  
  var tipo = req.query.tipo
  switch(tipo){
    case "Bottom": 
      promo = "En prendas inferiores tenemos " + Math.floor(Math.random() * Math.floor(25)) + "% de descuento."
      break;
    case "Top": 
      promo = "En prendas superiores tenemos " + Math.floor(Math.random() * Math.floor(50)) + "% de descuento."
      break;
    case "Joyería": 
      promo = "En joyería tenemos " + (12 + Math.floor(Math.random() * Math.floor(12)))  + " meses sin intereses"
      break;
  }
  
  var result = {
    "promociones": promo
  }
  res.send(result)
})

/*
function compare(a,b) {
  if (a.score < b.score)
    return -1;
  if (a.score > b.score)
    return 1;
  return 0;
}*/