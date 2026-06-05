# WoxLauncher

WoxLauncher 是一个使用 Tauri、React 和 Rust 开发的 Minecraft 启动器。界面风格参考 Minecraft 官方启动器，功能目标参考 HMCL，重点覆盖实例管理、游戏下载、Java 管理、MOD/整合包浏览与安装、下载进度、日志和启动配置。

## 当前功能

- Minecraft 实例创建、配置、启动和下载
- 全局配置与独立实例配置
- Java 自动扫描、按版本选择和下载管理
- Fabric、Quilt、Forge 加载器安装链路
- MOD 浏览、下载、本地 MOD 管理、删除、备份和更新搜索入口
- 整合包导入和下载，支持 Modrinth、CurseForge、MultiMC/Prism 等主流格式
- 所有运行数据集中存放在启动器同目录的 `woxlauncher/` 下
- 下载缓存安装验证后清理
- 下载日志、右下角下载面板和右上角通知

## 数据目录
```text
woxlauncher/
  .minecraft/
  woxlauncherdb/
    woxlauncher.sqlite
  java/
  cache/
  logs/
```

## 开发

```bash
npm install
npm run build
npm run tauri dev
npm run tauri build
```

## 说明

这是一个持续开发中的启动器项目。目标是逐步补齐 HMCL 级别的核心能力，同时保持接近官方启动器的简洁界面。
