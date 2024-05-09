增加一个功能,在electron 客户端上,本地可以启动一个socket  
const net = require('net');
const fs = require('fs');
const socketPath = '/tmp/my-electron-app.sock';
// 确保清理旧的 socket 文件
if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
const server = net.createServer((client) => {
  client.on('data', (data) => {
    console.log('从 Shell 收到:', data.toString());
  });
});
server.listen(socketPath); 案例代码如此；然后通过 echo xxx | nc -U /tmp/my-electron-app.sock 和
electron通讯；目前先实现一个功能，创建系统弹窗，支持多种样式 支持icon，支持按钮等，通知支持自动消失或者持久 你来设计并实现此功能
