RuLiQ
=====


Web-chat, written on Node.js. Based on WebSockets.
Used socket.io for message exchange, MongoDB to store chatlogs.

Live version is available at http://www.linuxquestions.ru/



How to run the chat
-------------------

To run chat locally, setup environment variable MONGODB_CHAT_AUTH to provide connection to MongoDB.
For example:

    export MONGODB_CHAT_AUTH='mongodb://login:password@localhost:27017/chat'
    
Run the node app

    cd node
    nodejs app.js
    
And open in browser url `http://localhost:3000/`. 


The product is opensource and provided as is without any gurantees. Use it at your own risk.
If you found a bug or want to request new feature, use [GitHub Issues](https://github.com/zoonman/ruliq/issues).
Also, you can create a pull-request. As soon as it will be checked, it will be accepted.

Чат
===

Чат открыт для всех желающих и доступен по адресу http://www.linuxquestions.ru/
Если вы хотите написать об ошибке или попросить новую фичу, [милости просим](https://github.com/zoonman/ruliq/issues).
Вы можете помочь проекту, присылая свои пул-реквесты. 
