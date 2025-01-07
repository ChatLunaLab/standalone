# ChatLuna v2

## 当前存在的问题

1. 没有 WebUI 可视化界面，以及 GUI 部署
2. 房间系统太过复杂，需要简化

   - 99% 的人都不需要加入房间，切换房间等。
   - 大家都只想开箱即用，直接对话。

3. 不支持独立部署，必须要安装 Koishi

## 改进方向

1. 使用 Vue 构建 WebUI 可视化界面，以及 GUI 部署
2. 使用 assistant api 作为底层接口，上层（Koishi）使用两种模式：
   - 所有人独立对话，可以新建对话和切换
   - 私聊独立对话，指定群聊（或者所有群聊）内对话共享，群内不可以新建或者删除对话

   WebUI 直接底层对接 assistant api，独立会话即可。

3. 基于 cordis 构建，可以无缝选择 Koishi 或者独立部署。

   依托 cordis 生态，能直接使用各种插件，如数据库插件。

## 架构设计

1. **core**:

   - ChatLuna 最基础的架构
   - 提供 API，能直接创建各种模型，向量数据库，文本分块器（可能）
   - 创建自有的 ChatLunaTool，包装授权支持，自激活检测，并允许用户强制激活或者禁用
   - 独有的预设 API 支持，添加酒馆特色功能的预设（世界书和作者注释），预设服务支持（不手动读取）
   - 代理支持
   - （可能）需要提供 LLM 的调用监听和事件，去监听 Token 消耗，历史消息添加（转换）
   - OpenAI Token 计算器支持
   - 补全一些 LangChain 的套件

2. **agent**:

   - 参考 [swarm](https://github.com/openai/swarm)，融合成一个简易 Agent 架构工具
   - 使用 LangChain 的 Memory，只获取历史消息，不实际保存

3. **memory**:

   - 基于 cordis 生态插件，实现数据库对接，保存对话记录
   - 自裁剪最大调试支持，定期删除对话记录

4. **assistant**:

   - 实现 Assistant 后端 API 和 Cordis Service
   - 用户注册和登录（后续可能会迁移到其他包）
   - 基于 Memory 和 Agent，支持多 Agent 对话等
   - 文件上传处理
   - 提供扩展 API，为后续知识库打下基础
   - 预设管理（指定文件夹）
   - 可选的功能，用户可选择不开启：
     - token 消耗监听
     - 用户管理
     - 模型实际 token 价格
     - 用户组，次数限额，token 倍率计算（存入数据库）

5. **standalone**:

   - 独立部署的 ChatLuna
   - 在 cordis 上直接启动 vite，显示 WebUI

6. **ui**:

   - koishi:
     - 实现 Koishi 特有的两种对话模式
     - 提供 Lite 版本，纯 HTTP API 配置，可在 Koishi Online 上使用
     - 消息渲染器，消息读取器的支持
     - 在 Koishi 上仍可以安装 standalone，实现 Koishi + WebUI
     - 可以选择那些群或者那些用户加入用户组

   - web:
     - 使用 Vue 构建 WebUI 可视化界面
     - 可对话，独立配置模型 API Key 等
     - 用户组管理，key 生成等

7. **knowledge**:

   - 基于 Assistant 的扩展 API，构建知识库
   - 支持向量数据库，文本分块器

8. **openapi**:

   - 提供类 OpenAI 的 API 支持，流式输出
   - 联动 Assistant API，生成 API Key，API Key 管理

9. **adapters**:

   - 提供各种模型适配器，如 openai，anthropic，gemini 等
   - 提供向量数据库服务
   - 对接到 core 上

10. **ecosystem**:
    - 扩展 Koishi 或者是 WebUI 的生态
