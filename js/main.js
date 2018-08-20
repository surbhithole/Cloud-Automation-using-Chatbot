function disableF5(e) { if (e.which == 116) e.preventDefault(); };
// To disable f5
$(document).bind("keydown", disableF5);
function startDictation() {

if (window.hasOwnProperty('webkitSpeechRecognition')) {

 var recognition = new webkitSpeechRecognition();

 recognition.continuous = false;
 recognition.interimResults = false;

 recognition.lang = "en-US";
 recognition.start();
 document.getElementById('record').innerHTML="Recording"
 recognition.onresult = function(e) {
   document.getElementById('msgId').value  = e.results[0][0].transcript;
   recognition.stop();
   setTimeout(function(){ document.getElementById('record').innerHTML=""; }, 5000);
   document.getElementById('record').innerHTML="Recording Complete";
   // document.getElementById('labnol').submit();
 };

 recognition.onerror = function(e) {
   recognition.stop();
 }

}
}
    var table = $('<table class="table table-striped" id="tableId">');
    table.className = 'table table-striped';
    var tr = $('<tr>');
    var td = $('<th>');
    td.html("S.No");
    tr.append(td);
    var td = $('<th>');
    td.html("Name");
    tr.append(td);
    var td = $('<th>');
    td.html("ImageId");
    tr.append(td);
    td = $('<th>');
    td.html('InstanceID');
    tr.append(td);
    td = $('<th>');
    td.html('ImageType');
    tr.append(td);
    td = $('<th>');
    td.html('InstanceType');
    tr.append(td);
    td = $('<th>');
    td.html('KeyPair');
    tr.append(td);
    td = $('<th>');
    td.html('SecurityGroup');
    tr.append(td);
    table.append(tr);
    $('#showData').append(table);
    var table1 = $('<table class="table table-striped" id="tableId1">');
    table1.className = 'table table-striped';
    var tr1 = $('<tr>');
    var td1 = $('<th>');
    td1.html("S.No");
    tr1.append(td1);
    td1 = $('<th>');
    td1.html("Name");
    tr1.append(td1);
    td1 = $('<th>');
    td1.html("ImageId");
    tr1.append(td1);
    td1 = $('<th>');
    td1.html('InstanceID');
    tr1.append(td1);
    td1 = $('<th>');
    td1.html('ImageType');
    tr1.append(td1);
    td1 = $('<th>');
    td1.html('InstanceType');
    tr1.append(td1);
    td1 = $('<th>');
    td1.html('KeyPair');
    tr1.append(td1);
    td1 = $('<th>');
    td1.html('SecurityGroup');
    tr1.append(td1);
    table1.append(tr1);
    $('#awsshowData').append(table1);
    function clearChat(){
      $('#conversation').empty();
    }
    function getDateTime()
  {
    var date = new Date();
    var dt = date.toDateString() + " " + date.toLocaleTimeString();
    return dt
  };

$(document).ready(function(){
    $("#table12").hide();
    var showValue = "";
    document.getElementById("chat1").style.color = "yellow";
    document.getElementById("table1").style.color = "white";
    document.getElementById("logout").style.color = "white";
    // $("#table1").click(function(){
    //     $("#table12").show();
    //     $("#chat").hide();
    //     document.getElementById("table1").style.color = "yellow";
    //     document.getElementById("chat1").style.color = "white";
    // });
    $("#chat1").click(function(){
      $("#table12").hide();
        $("#chat").show();
        document.getElementById("chat1").style.color = "yellow";
        document.getElementById("table1").style.color = "white";
    });
    $("#logout").click(function(){
        document.getElementById("logout").style.color = "yellow";
        window.location = "https://bit.ly/2jus92g";
    })

      var newID = "";
      var UniqueID = "";
  	  var messages = [];
      var lastUserMessage = "";
      var botMessage = "";
      var botName = 'test';
      var AWSconfig = {
        "accessKey":"AKIAIZGJJ2CPPUB2BGQA",
        "secretKey":"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",
        "S3Bucket":"https://s3.amazonaws.com/cloudfinalproject1",
        "region":"us-east-1",
        "sessionToken":"",
        "client_id" :"7lhg8c5khpveinksa2tteaj9li",
        "user_pool_id" : "us-east-1_NuBNmwE06",
        "cognito_domain_url":"https://cloudproject.auth.us-east-1.amazoncognito.com",
        "redirect_uri" : "https://s3.amazonaws.com/cloudfinalproject1/index.html",
        "identity_pool_id":"us-east-1:381dd755-079c-467c-85d3-6334f64c74c9"
      };

      let apigClient = {};
      var getParameterByName = function(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
          results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
      };
      console.log("Code = "+getParameterByName("code"));
      var exchangeAuthCodeForCredentials = function({auth_code = getParameterByName("code"),
                              client_id = AWSconfig.client_id,
                              identity_pool_id = AWSconfig.identity_pool_id,
                              aws_region =AWSconfig.region,
                              user_pool_id = AWSconfig.user_pool_id,
                              cognito_domain_url= AWSconfig.cognito_domain_url,
                              redirect_uri = AWSconfig.redirect_uri}) {
        return new Promise((resolve, reject) => {
          var settings = {
            url: `${cognito_domain_url}/oauth2/token`,
            //url : 'https://main.auth.us-east-1.amazoncognito.com/oauth2/token',
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization' : ''
            },
            data: {
              grant_type: 'authorization_code',
              client_id: client_id,
              redirect_uri: redirect_uri,
              code: auth_code
            }
          };
          console.log("Making a call to Ouath token");
            $.ajax(settings).done(function (response) {
            console.log('OAuth2 Token Call Responded');
            console.log('Positive Response ' + JSON.stringify(response));
            console.log("User Details");
            var ID = jwt_decode(response.id_token);
            console.log(ID);
            UniqueID = ID.email;
            newID =UniqueID.replace("@","");
            console.log(ID);
          //  document.getElementById('userDetail').innerHTML = "User -"+ ID.email;
            document.getElementById('user').innerHTML = ID.email;
            //ID(id);
            //setInterval(apiCall, 2000);
            //function apiCall(){
            $("#table1").click(function(){
                $("#table12").show();
                $("#chat").hide();
                document.getElementById("table1").style.color = "yellow";
                document.getElementById("chat1").style.color = "white";

            $.ajax({
                url:"https://1jldttaz83.execute-api.us-east-1.amazonaws.com/first/getata",
                    type:'POST',
                    crossDomain: true,
                    contentType: 'application/json',
                    dataType: 'json',
                    data:JSON.stringify({"userId" : newID}),

                    success:function(data){
                      //console.log(data);
                      $("#tableId td").remove();
                      $("#tableId1 td").remove();
                      var oi = 0;
                      var ai =0;
                      for(var i=0; i<data.MachineList.length;i++){
                      if(data.MachineList[i].INSTANCES == "Openstack")
                       {
                         console.log(data.MachineList[i].INSTANCES=="Openstack");
                         var tr = $('<tr>');
                         var td = $('<td>');
                         td.html(oi+1+".");
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].Name);
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].ImageId);
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].InstanceID);
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].ImageType);
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].INSTANCES);
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].SecurityGroup);
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].KeyPair);
                         tr.append(td);
                         table.append(tr);
                         $('#showData').append(table);
                         oi=oi+1;
                      } }
                      for(var i=0; i<data.MachineList.length;i++){
                      if(data.MachineList[i].INSTANCES == "EC2")
                      {
                         var tr = $('<tr>');
                         var td = $('<td>');
                         td.html(ai+1+".");
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].Name);
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].ImageId);
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].InstanceID);
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].ImageType);
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].INSTANCES);
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].SecurityGroup);
                         tr.append(td);
                         td = $('<td>');
                         td.html(data.MachineList[i].KeyPair);
                         tr.append(td);
                         table1.append(tr);
                        $('#awsshowData').append(table1);
                        ai=ai+1;
                      }}
                },
                    error:function(data){
                        alert(JSON.stringify(data));
                    }
            });
          });
            if (response.id_token) {
              AWS.config.region = aws_region;
              AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId : identity_pool_id,
                Logins : {
                  [`cognito-idp.${aws_region}.amazonaws.com/${user_pool_id}`]: response.id_token
                }
              });
              console.log({IdentityPoolId : identity_pool_id,
                Logins : {
                  [`cognito-idp.${aws_region}.amazonaws.com/${user_pool_id}`]: response.id_token
                }
              });
              AWS.config.credentials.refresh(function (error) {
                console.log("Error in refresh",error);
                if (error) {
                  reject(error);
                } else {
                  console.log('Successfully Logged In');
                  resolve(AWS.config.credentials);
                }
              });
            } else {
              console.log('Rejected with response :' + response);
              reject(response);
            }
          });
        });
      };
      exchangeAuthCodeForCredentials({auth_code: getParameterByName("code"),
                      client_id: AWSconfig.client_id,
                      identity_pool_id: AWSconfig.identity_pool_id,
                      aws_region: AWSconfig.region,
                      user_pool_id: AWSconfig.user_pool_id,
                      cognito_domain_url: AWSconfig.cognito_domain_url,
                      redirect_uri: AWSconfig.redirect_uri})
      .then(function(response) {
        console.log("Inside Then Function ",response);
        apigClient = apigClientFactory.newClient({
          accessKey: response.accessKeyId,
          secretKey: response.secretAccessKey,
          sessionToken: response.sessionToken,
          region: "us-east-1"
        });
      })
      .catch(function(error) {
        console.log("error = "+this.error);
        console.log("response = "+this.response);
      });
      function chatbotResponse(messageForBot){
        var params = {};
        var myMessage = ["Chat:"];
        var botmessage = ["Chat:"];
        myMessage.push(messageForBot);
        console.log(myMessage);
        var textarea = document.getElementById('usr');
        var body = {
          "messages" : messageForBot,
          "refid" : newID
		  };
        console.log('came here 3\n');
        var conversationDiv = document.getElementById('conversation');
        var requestPara = document.createElement("P");
        requestPara.className = 'userRequest';
        requestPara.appendChild(document.createTextNode(messageForBot));
        conversationDiv.appendChild(requestPara);
        conversationDiv.scrollTop = conversationDiv.scrollHeight;
        $('#msgId').val(function(){
  				return this.defaultValue;
  			});
        apigClient.chatbotPost(params, body, {})
          .then(function(result){
            var botMessage = result["data"]["message"];
            console.log(botMessage);
            if(result["data"]["message"])
          {
            var conversationDiv = document.getElementById('conversation');
            var responsePara = document.createElement("P");
            responsePara.className = 'lexResponse';
            console.log("message creations");
            botmessage.push(result["data"]["message"]);
            responsePara.appendChild(document.createTextNode(result["data"]["message"]));
            responsePara.appendChild(document.createElement('br'));
          }
            if(result["data"]["responseCard"]){
              var conversationDiv = document.getElementById('conversation');
              var responsePara = document.createElement("P");
              responsePara.className = 'lexResponse';
              responsePara.appendChild(document.createTextNode(result["data"]["message"]));
              botmessage.push(result["data"]["message"]);
              responsePara.appendChild(document.createElement('br'));
              var button = result["data"]["responseCard"]["genericAttachments"][0]["buttons"];
              for (var i = 0; i < button.length; i++) {
                responsePara.appendChild(document.createTextNode(button[i]["text"]));
                botmessage.push(result["text"]);
                if((button[i]["value"]).startsWith("ami")){
                  responsePara.appendChild(document.createTextNode(" - "));
                  responsePara.appendChild(document.createTextNode("("+button[i]["value"]+")"));
                  responsePara.appendChild(document.createElement('br'));
                }
                else{
                  responsePara.appendChild(document.createElement('br'));
                }
              }
            }
            console.log("append");
            for(var i=0;i<myMessage.length;i++){
              console.log(myMessage[i]);
              console.log(botmessage[i]);
            }
            conversationDiv.appendChild(responsePara);
            conversationDiv.scrollTop = conversationDiv.scrollHeight;

          }).catch( function(result){
          console.log("Inside Catch Function");
        });
      }
      function newEntry() {
        console.log('came here 2\n');
        if (document.getElementById("msgId").value != "") {
          var messageForBot = document.getElementById("msgId").value;
          chatbotResponse(messageForBot);
          $('#msgId').val(function(){
              return this.defaultValue;
            });
          }
        }
      function keyPress(e) {
        var x = e || window.event;
        var key = (x.keyCode || x.which);
        if (key == 13 || key == 3) {
          newEntry();
        }
      }
      document.onkeypress = keyPress;

  //MODAL FUNCTION
  // Get the modal

  var modal = document.getElementById('myModal');
  // Get the button that opens the modal
  //var btnn = document.getElementById("myBtn");
  var finish = document.getElementById("finish1");
  // Get the <span> element that closes the modal and create instance button
  var span = document.getElementsByClassName("close")[0];
  var span1 = document.getElementsByClassName("create")[0];
  var span2 = document.getElementsByClassName("create1")[0];
  // When the user clicks the button, open the modal
  // btnn.onclick = function() {
  //     modal.style.display = "block";
  // }
  //

  // When the user clicks on <span> (x), close the modal
  span.onclick = function() {
      modal.style.display = "none";
  }
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
      if (event.target == modal) {
          modal.style.display = "none";
      }
  }

    $('.showstack').hide();
    $('#shows').change(function() {
      $('.showstack').hide();
      showValue = $('#' + $(this).val());
      showValue.show();
    });

      //var textarea = document.getElementById('usr');
});
