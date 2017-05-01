# DSAppChat
Chat Application for Distributed System Class

Prerequisites

- Node.js
- Nginx


Installation

-- Application Installation --
1. ใน Command Line ไปยัง Directory ที่ Clone โปรเจคลงมา
2. เข้าไปยังโฟลเดอร์ ./DSAppchat/examples/chat
3. พิมพ์ npm install

-- Nginx Config Setup --

เข้าไป Config ค่าในไฟล์ ngninx.conf เพื่อบอก nginx Proxy ว่าเราจะกระจายทำงานบน Server กี่เครื่อง

for Mac OSx
1. ไปยัง usr/local/etc/nginx/nginx.conf
2. แก้ nginx.conf ให้เป็นดังนี้

#### Example for Nginx Setup #####
# Reference: https://www.nginx.com/resources/wiki/start/topics/examples/full/

worker_processes 2;

events {
  worker_connections 1024;
}

http {
  server {
    listen 80;

    location / {

      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header Host $host;

      proxy_pass http://nodes;
      proxy_next_upstream error timeout http_500;

      # enable WebSockets
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
    }
  }

  upstream nodes {
    # enable sticky session
    ip_hash;

    server 127.0.0.1:12000; ## 1st Server at port 12000
    server 127.0.0.1:3000; ## 2nd Server at port 3000
  }


}
###### End of File ######

3. reload nginx พิมพ์ sudo nginx -s reload



Run Application

1. ไปยัง /DSAppchat/examples/chat/
2. พิมพ์ PORT=<number of port> node index.js เพื่อ run server 
    ex. PORT=3000 node index.js
3. เข้า web browser ไปยัง localhost
