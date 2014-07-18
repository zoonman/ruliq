upstream app_linuxquestions {
    server 127.0.0.1:3000;
}

server {
	#listen   80; ## listen for ipv4; this line is default and implied
	#listen   [::]:80 default_server ipv6only=on; ## listen for ipv6

	root /var/www/linuxquestions.ru/ruliq/public;
	index index.php index.htm;

	server_name www.linuxquestions.ru linuxquestions.ru;

 if ($host !~* ^www\.linuxquestions\.ru$ ) {
   rewrite ^(.*)$ http://www.linuxquestions.ru$1 permanent;
 }

location /dist/ {
 root /var/www/linuxquestions.ru/ruliq/node/node_modules/socket.io/node_modules/socket.io-client;
}

location /static/ {
 root /var/www/linuxquestions.ru/ruliq/public;
}

location / {
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header Host $http_host;
      proxy_set_header X-NginX-Proxy true;
      proxy_pass http://app_linuxquestions/;
      proxy_redirect off;
			proxy_http_version 1.1;
			proxy_set_header Upgrade $http_upgrade;
			proxy_set_header Connection "upgrade";

    }
}
