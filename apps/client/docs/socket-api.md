# Console Electron Socket API

通过 Unix Socket 与 Console Electron 客户端通信，创建系统通知和对话框。

## Socket 路径

```
/tmp/console.sock
```

## 使用方式

```bash
echo '<command>' | nc -U /tmp/console.sock
```

## 命令格式

```
<command> --title "标题" --message "内容" [options]
```

## 命令类型

### 1. notify - 通知（自动消失）

通知弹窗，会在指定时间后自动消失。

```bash
notify --title "提醒" --message "该休息了"
```

### 2. dialog - 对话框（需用户交互）

阻塞式对话框，等待用户点击按钮后返回结果。

```bash
dialog --title "确认删除" --message "确定要删除这个文件吗？"
```

## 参数说明

| 参数           | 说明                        | 默认值   |
| -------------- | --------------------------- | -------- |
| `--title`      | 弹窗标题                    | (必填)   |
| `--message`    | 弹窗内容                    | (必填)   |
| `--type`       | 消息类型                    | `info`   |
| `--buttons`    | 按钮列表（逗号分隔）        | `确定`   |
| `--persistent` | 是否持久显示（dialog 模式） | `true`   |
| `--icon`       | 自定义图标路径              | 系统默认 |
| `--timeout`    | 自动消失时间（毫秒）        | `3000`   |

## 类型选项 (`--type`)

- `info` - 信息
- `warning` - 警告
- `error` - 错误
- `success` - 成功
- `question` - 询问

## 使用示例

### 简单通知

```bash
notify --title "提醒" --message "该休息了"
```

### 带图标的通知

```bash
notify --title "新消息" --message "您有一条新消息" --icon /path/to/icon.png
```

### 成功提示

```bash
notify --title "完成" --message "操作成功！" --type success --timeout 5000
```

### 确认对话框

```bash
dialog --title "确认删除" --message "确定要删除这个文件吗？" --type warning --buttons "取消,确定"
```

### 多按钮对话框

```bash
dialog --title "选择操作" --message "请选择一个操作" --buttons "保存,不保存,取消"
```

### 带自定义图标

```bash
dialog --title "自定义" --message "使用自定义图标" --icon /Users/ximing/Pictures/icon.png
```

## 返回值

### notify 命令

```json
{ "success": true, "action": "notification_shown" }
```

### dialog 命令

用户点击按钮后返回：

```json
{ "action": "button_clicked", "button": "确定", "id": "dialog_123456789_abc123" }
```

### 错误响应

```json
{ "error": "Invalid command", "usage": "..." }
```

## 完整示例

```bash
# Shell 脚本中使用
#!/bin/bash

# 发送通知
echo 'notify --title "备份完成" --message "数据已成功备份"' | nc -U /tmp/aimo-console.sock

# 等待用户确认
RESULT=$(echo 'dialog --title "确认" --message "是否继续？" --buttons "否,是"' | nc -U /tmp/aimo-console.sock)
echo $RESULT

# 解析结果
if echo $RESULT | grep -q '"button":"是"'; then
    echo "用户选择了是"
fi
```

## 注意事项

1. `notify` 命令是非阻塞的，发送后立即返回
2. `dialog` 命令会阻塞等待用户交互，在用户点击按钮前不会返回
3. 多个命令可以通过换行分隔一次性发送
4. 确保 Console Electron 应用正在运行
