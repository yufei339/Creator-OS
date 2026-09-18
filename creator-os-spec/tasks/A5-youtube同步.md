# A5 · YouTube 自动同步任务

## 目标
定时自动拉取 YouTube 发布物的公开数据,写入 metrics(collected_by=auto)。

## 前置
- A4 已通过验收
- 用户已在 .env 填 YOUTUBE_API_KEY(YouTube Data API v3 的 key)

## 背景(务实说明)
- 只有 YouTube 有正规公开 API,能合法稳定自动抓
- 抖音/小红书没有,继续走 A4 的手动回填,本步不碰它们
- 公开数据(播放/点赞/评论)用 API Key 就够;完播率等私有数据要 OAuth,本步先不做

## 要做的事
1. 建 `app/youtube.py`:
   - `fetch_stats(video_id) -> {views, likes, comments}`
   - 调 `GET https://www.googleapis.com/youtube/v3/videos?part=statistics&id={id}&key={KEY}`
2. 建同步逻辑:
   - 查所有 `platform='youtube' AND track_status='active' AND external_id IS NOT NULL` 的发布物
   - 逐个 fetch_stats,写入 publication_metrics,collected_by='auto'
3. 提供两种触发方式:
   - 手动接口 `POST /internal/sync/youtube`(方便测试)
   - 定时任务:用 APScheduler,每天跑一次(时间可配)
4. 做好错误处理:某个视频抓失败(被删/私密)不要中断整批,记日志跳过

## 验收标准
- 手动 POST /internal/sync/youtube → 之前建的 YouTube 发布物拿到一条 auto 数据
- GET 那个发布物的 metrics → 看到 collected_by=auto 的记录
- 定时任务注册成功(日志能看到下次运行时间)

## 做完就停
贴同步结果,等确认再做 A6(或先跳去做客户端 B 部分)。

## 提示
学习层 A6 依赖数据积累,现在数据还少。可以建议用户:先做客户端 B 部分,把工具用起来攒数据,A6 过段时间再做。
