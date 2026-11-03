# GalleryGo · 静态手机H5 Demo

四页完整流程：欢迎 → 选择图片 → 四步分析动效 → 分类图库。使用HTML、CSS与原生JavaScript，无框架、无构建、无业务后端、无上传、无登录。

当前UI采用用户指定的TECNO OCEAN BLUE v2配色：品牌深蓝`#1619A6`、交互亮蓝`#4D7CFF`，六类任务使用独立分类色。全部变量位于`style.css`开头，应用记录见`verification/配色v2验收.md`。

## 1. 打开试用

Windows有Python 3时，双击`启动预览.bat`。浏览器将打开`http://127.0.0.1:8787/`，保持启动窗口运行；Ctrl+C关闭。

也可在本目录执行：

```powershell
python start-preview.py
```

Python只提供静态文件，不处理图片、不运行AI，也没有上传接口。已有任何静态网站服务器也可以直接提供本目录，无需安装前端依赖。不要直接双击`index.html`使用file协议，浏览器通常不允许这样读取旁边的JSON；应使用静态HTTP/HTTPS地址。

手机与电脑连接可互访的同一Wi-Fi，在手机浏览器输入启动终端打印的电脑IP地址，例如`http://电脑IPv4:8787/`。手机上的localhost是手机自己，不能代替电脑IP。实际手机可用性取决于浏览器与网络互访条件；公司/访客Wi-Fi可能隔离设备，可换可互访网络，不需要关闭整个防火墙。

只允许本机预览：`python start-preview.py --host 127.0.0.1`。更换端口：`python start-preview.py --port 8788`。

## 2. 演示内容

所有初始内容来自`data.json`：24张本地SVG占位图，六类各4张；每类的前三张构成一组相似图，其中一张推荐保留。欢迎页和图片上标示示例属性，不冒充真实用户照片。

搜索示例：`gopay`、`bukti transfer minggu lalu`、`transfer ke Andi`、`pesanan`、`whatsapp`、`dokumen`、`usaha`、`keluarga`。中文辅助示例包括`上周转账记录`、`订单`、`聊天`、`证件`、`工作`、`家庭`。

搜索通过JSON映射模糊匹配，未匹配映射时再查图片文字和标签；不是实际大模型语义推理。开始搜索会切到全库，搜索期间可点分类继续筛选；清空后显示搜索示例和最近搜索，退出搜索回到此前的浏览分类。搜索和推荐只包含本次实际选中的可见图片。

照片页按日期从新到旧分组，四列展示；导入页仍是三列。点击图片进入全屏详情，顶部显示日期，底部通过`新建标签`添加标签。搜索通过底部导航的搜索入口进入，采用顶部输入框、“你可以这样搜”示例卡片、最近搜索与分类入口。三条示例带图片预览，点击即可检索；最近搜索仅保存实际提交或查看结果的查询，支持清空与撤销。预设内容位于`meta.search_suggestions`。相似图清理入口放在六类相册下方。

相似图整理入口位于`相册 → 相似图清理`。分组和清晰度推荐由JSON预设，每组可选择保留图片、查看大图，再点击`保留所选，清理其余`。只将当前组其他图片从Demo中隐藏，可立即撤销，也可用相册页的`恢复整理`还原；不删除项目图片或手机文件。

添加标签先给当前图加标签，显示1500ms学习动效，再按`tag_suggestion_ids`给出五张预设关联图，点击`全部确认`批量打标，跳过则只保留当前图标签。这是交互演示，不训练模型。若已导入或未打标的候选不足5张，则如实显示实际数量，不编造图片。

用户标签、导入记录、演示隐藏状态保存在当前浏览器localStorage中，不上传。浏览器禁止存储时仍可在当次使用，更改不保证刷新后保留。清理网站数据会重置操作，但不会修改源JSON和图片。

## 3. 替换真实样例

取得100—200张授权照片后，将缩略图与大图放入`images/`，然后编辑`data.json`，前端不需要改动：

```json
{
  "id": "001",
  "thumb": "images/001.jpg",
  "full": "images/001_full.jpg",
  "category": "payment",
  "title": "转账凭证",
  "ocr_text": "GoPay Transfer Success Rp 50.000",
  "tags": ["gopay", "transfer"],
  "similar_ids": ["002", "003"],
  "recommended": false,
  "tag_suggestion_ids": ["002", "003", "004", "009", "010"],
  "date": "2026-06-12"
}
```

保留原需求的`photos`、`categories`、`search_mapping`根结构；`title`、`date`、`tag_suggestion_ids`与`meta`是可选扩展。类别ID为`payment/order/chat/idcard/work/festival`，`all`只用于全部浏览。每个ID唯一，所有引用必须指向已有图片；相似组保持相互引用，组内一张`recommended: true`。

更新`search_mapping`为真实样例对应的关键词或印尼语句子与ID。当前“上周”等表达使用预设映射，与今天日期无自动关系；数据未更新前不应称为真实时间理解。更新素材后把`meta.sample`与界面样例文案一起按真实情况调整。新数据仍只是预标注前端演示，接入真实AI属于另一个阶段。

`tools/create-demo-data.py`仅供重新生成占位图，正常使用完全不需要运行。替换真实素材后不要运行它，否则会覆盖同名样例JSON/SVG；图片路径最好使用全新文件名以避免浏览器图片缓存。

## 4. 离线与弱网

所有资源本地提供，没有CDN、远程图片、在线字体或AI接口。首次加载完成后，当前页面的搜索、分类、整理和标签交互都在浏览器执行。

额外的`sw.js`会在HTTPS或localhost等安全上下文缓存页面、JSON和全部图片。页面显示`本地资源已缓存 · 可离线体验`后，可断开静态服务器测试刷新。普通手机局域网HTTP地址通常不能注册service worker，因此可体验已打开页面的本地交互，但不承诺关闭后离线重新打开；需要离线刷新演示时用支持service worker的HTTPS静态地址，或在电脑localhost验证。

缓存保存的是应用资源与演示结果，不代表手机运行了OCR、分类或学习模型。若开发修改后浏览器仍显示旧版本，联网刷新；如需要彻底重置，清除本网站缓存和数据，或更新`sw.js`的CACHE名称。缓存只管理GalleryGo自己命名的资源缓存。

## 5. 开发核验

Node仅用于运行附带测试，正常使用不需要Node：

```powershell
node --test tests/*.test.cjs
node --check script.js
node --check sw.js
```

检查数据引用、印尼语与中文搜索、已导入范围、隐藏图片、标签传播、相似图保留及6800ms四步阶段。DOM操作和手机布局另通过浏览器核验；交付包的验收记录与截图位于`verification/`，完整开发记录存放在上级项目的`docs/superpowers/plans/2026-11-03-gallerygo-static-demo-progress.md`。
