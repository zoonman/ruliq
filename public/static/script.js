var socket = io.connect();

jQuery.fn.extend({
insertAtCaret: function(myValue){
  return this.each(function(i) {
    if (document.selection) {
      //For browsers like Internet Explorer
      this.focus();
      var sel = document.selection.createRange();
      sel.text = myValue;
      this.focus();
    }
    else if (this.selectionStart || this.selectionStart == '0') {
      //For browsers like Firefox and Webkit based
      var startPos = this.selectionStart;
      var endPos = this.selectionEnd;
      var scrollTop = this.scrollTop;
      this.value = this.value.substring(0, startPos)+myValue+this.value.substring(endPos,this.value.length);
      this.focus();
      this.selectionStart = startPos + myValue.length;
      this.selectionEnd = startPos + myValue.length;
      this.scrollTop = scrollTop;
    } else {
      this.value += myValue;
      this.focus();
    }
  });
}
});

function insertMessage(text) {
	$('#messageInput').insertAtCaret(text);
}

function repl_add_proto(str, p1, p2, offset, s)
{
//"<a href='$1$2' target='_blank'>$2</a>"
	var res  = "<a href='" + ( /(ht|f)tp(s|)/.test(p1) ? p1 : 'http://') + p2 + "' target='_blank'>"+p2+"</a>";
	return res;
}

function leftZeroFill(number, targetLength) {
	var output = number + '';
	while (output.length < targetLength) {
		output = '0' + output;
	}
	return output;
}

function pts(ts) {
	var d = new Date(ts);
	return leftZeroFill(d.getHours(),2) + ':' + leftZeroFill(d.getMinutes(),2);
}

function addMessage(msg, pseudo, hclass, ts) {
	if (typeof msg === "undefined") return;
	var plain_msg = msg;
	msg = msg.replace( /(^|\s)@(\w+)\b/gi, " $1<a href='#' onclick='insertMessage(\"@$2\");return false'><span>@</span>$2</a>");
	msg = msg.replace( /((?:https\:\/\/)|(?:http\:\/\/)|(?:ftp\:\/\/)|(?:www\.))?([a-zA-Z0-9\-\.]+\.[a-zA-Z]{1,3}(?:\??)[a-zA-Z0-9\-\._\?\,\'\/\\\+&%\$#\=~]+)/gi, repl_add_proto);
	var mr = new RegExp('@' + $("#pseudoInput").val() + '','igm');
	if (mr.test(msg) && hclass == 'regular') {
		hclass='mention';
	}
	var d = new Date();
	var h = d.getHours(), m = d.getMinutes();
	if (typeof ts === "undefined") {
		ts = Date.now();
	}
	var codeMode = false;
	if(msg.indexOf('&lt;code') > -1 && msg.indexOf('&lt;/code&gt;') > -1) {
	    codeMode = true;
	}
	var html = '<div class="message '+hclass+'"><p><span class="ts">'+pts(ts)+'</span> ';
	html += '<a href="#" onclick="insertMessage(\'@' + pseudo + '\');return false" class="nick">' + pseudo + '</a>: ';
	
	if (codeMode) {
		// put text
		html += '<pre>' + msg + '</pre>';
	}
	else {
	    html += msg;
	}
	$("#chatEntries").append(html+'</p></div>');
	$("#chatEntries pre:last").each(function(i, e) {hljs.highlightBlock(e)});
	
	var t = window.setTimeout(function () {
	$("#chatEntries").animate({	scrollTop: $("#chatEntries")[0].scrollHeight }, 300); }, 50);
	// 
	if (("Notification" in window) && pseudo != "Me" && !document.hasFocus()) {
    if (Notification.permission === "granted") {
			var notification = new Notification("New message from "+pseudo, {body: plain_msg});
		}
		else if (Notification.permission !== 'denied') {
			Notification.requestPermission(function (permission) {
				if(!('permission' in Notification)) {
					Notification.permission = permission;
				}
				if (permission === "granted") {
					var notification = new Notification("New message from "+pseudo, {body: plain_msg});
				}
			});
		}
  }
}

function sentMessage() {
	if ($('#messageInput').val() != "") 
	{
		socket.emit('message', $('#messageInput').val());
		//addMessage($('#messageInput').val(), "Me", 'me', new Date().toISOString(), true);
		$('#messageInput').val('');
		ga('send', 'event', 'button', 'click', 'send', 1 );
	}
}

function setPseudo() {
	$("#pseudoInput").val($("#pseudoInput").val().trim());
	if ($("#pseudoInput").val() != "") {
		socket.emit('setPseudo', $("#pseudoInput").val());
		
	}
	ga('send', 'event', 'button', 'click', 'try to login', 1);
}

socket.on('message', function(data) {
	addMessage(data['message'], data['pseudo'], data['hclass'], data['ts']);
});

socket.on('command', function(data) {
	switch(data.type) {
		case 'relogin':
			$('#chatLogin').show();
			$('#chatControls').hide();
			$('#chatEntries').hide();
			hide_members();
			ga('send', 'event', 'button', 'click', 'unsuccessfull login');
			alert('Вам необходимо повторить попытку ввода логина. Проверьте правильность ввода.');
			break;
		case 'reload':
			ga('send', 'event', 'button', 'click', 'reload', 1);
			window.location.reload();
		break;
		case 'succefull_login':
			window.document.title = $("#pseudoInput").val()+'@RuLiQ';
			$('#chatControls').show();
			$('#chatEntries').show();
			$('#chatEntries').html('<p>...restored login after network problem...</p>');
			$('#chatLogin').hide();
			show_members();
			ga('send', 'event', 'button', 'click', 'successfull login', 2);
		break;
	}
	
});

socket.on('members', function(members_data) {
	// $('#chatMembers').show();
	//console.log(members_data);
	var html = '';
	for (var m in members_data) {
		html += '<a href="#" onclick="insertMessage(\'@'+members_data[m]+'\');return false">@'+members_data[m]+'</a>';
	}
	$('#chatMembers').html(html);
});

function show_members() {
	$('#chatEntries').removeClass('w100').addClass('w80');
	$('#chatMembers').show();
	$('i.fa-users').addClass('active');
}
function hide_members() {
	$('#chatEntries').removeClass('w80').addClass('w100');
	$('#chatMembers').hide();
	$('i.fa-users').removeClass('active');
}

$(function() {
	$("#chatControls").hide();
	$("#chatEntries").hide();
	$("#pseudoSet").click(function() {setPseudo()});
	$("#submit").click(function() {sentMessage();});
	$("#chatEntries").css('height', ($(window).height()-100));
	$("#chatMembers").css('height', ($(window).height()-100));
	$(window).resize(function () {
		$("#chatEntries").css('height', ($(window).height()-100));
		$("#chatMembers").css('height', ($(window).height()-100));
	});
	
	$('#messageInput').keyup(function (e){
		console.log($('#ctrlEnterSetting').prop('checked'));
		if(e.which == 13 && ($('#ctrlEnterSetting').prop('checked')==false || e.ctrlKey) && !e.shiftKey) {
			sentMessage();
		}
	});
	
	$('i.fa-users').click(function() {
		if ($('#chatEntries').hasClass('w100')) {
			show_members();
		}
		else {
			hide_members();
		}
	});
	
	$('i.fa-cog').click(function() {
		$("#chatSettings").show();
		ga('send', 'event', 'button', 'click', 'settings', 1);
	});
	$('#hideChatSettings').click(function() {
		$("#chatSettings").hide();
	});
	$("<link />",{'rel': 'stylesheet','href': '/static/fonts.css'}).appendTo('head');
	$("<link />",{'rel': 'stylesheet','href': '//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css'}).appendTo('head');
});


socket.on('connecting', function() {$("#appStatus").html('connecting...');});
socket.on('connect', function() {$("#appStatus").html('connected successfully');
// setPseudo();
});
socket.on('disconnect', function() {$("#appStatus").html('disconnected');});
socket.on('connect_failed', function() {$("#appStatus").html('engine fails to establish a connection to the server and has no more transports to fallback to');});
socket.on('error', function() {$("#appStatus").html('error');});
socket.on('reconnect_failed', function() {$("#appStatus").html('engine  fails to re-establish a working connection after the connection was dropped');});
socket.on('reconnect', function() {$("#appStatus").html('successfully reconnected to the server');
// try to relogin
    setPseudo();
    
});
socket.on('reconnecting', function() {$("#appStatus").html(' attempting to reconnect with the server...');});

$(window).on('load', function() {
	if ($("#pseudoInput").val().length == 0) {
	$("#pseudoInput").val(location.hash.replace('#autologin-', ''));
 
	setTimeout(function(){
		$("#pseudoSet").trigger('click');
	}, 100);

	}
});
