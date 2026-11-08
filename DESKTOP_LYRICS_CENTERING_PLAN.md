# 桌面歌词逐行居中改造大纲

## 1. 需求定义

目标是让桌面歌词的每一行文字共享同一个水平中心轴：每行按照自己的实际文字宽度居中排列，较短的行向较长的行的中间收拢，形成“从字幕中间向两侧展开”的效果。

示意：

```text
当前效果：
中文测试
English Test

目标效果：
  中文测试
English Test
```

上面的空格只用于说明位置关系，代码中不能给歌词文本人为添加前导空格或后导空格。实际对齐必须由 GTK 的布局属性完成。

### 必须保持的行为

- 这是“每行文字居中”，不是把整组歌词移动到显示器正中央。
- 当前歌词和翻译歌词必须共享同一个中心轴。
- 当前歌词、翻译歌词仍然保持现有的上下排列关系、字体大小比例、颜色、描边、透明度和播放暂停淡化效果。
- 不改变桌面歌词的拖动、跨屏、锁定穿透、位置持久化和背景框逻辑。
- 不新增设置项，不修改 IPC 协议，不修改歌词解析协议。
- 不通过给字符串添加空格来模拟居中；必须兼容中文、英文、数字、标点和混合文本。

## 2. 当前实现位置

### 桌面歌词覆盖层

文件：`resources/lyrics-overlay.py`

关键现状：

- `ScreenLayer.__init__()` 创建 `self.box`、`self.current_label` 和 `self.secondary_label`。
- 当前行和副行都是 `Gtk.Label`。
- 现在两行使用 `set_xalign(0.0)`，因此都从各自控件的左侧开始绘制。
- 两个 Label 使用 `Gtk.Box(orientation=Gtk.Orientation.VERTICAL)` 垂直排列。
- `hit_size()` 使用 `self.box.get_preferred_width()` 和 `get_preferred_height()` 测量字幕尺寸。
- `place(x, y)` 根据 `hit_size()` 设置背景框大小，并移动文字框和拖动手柄。
- 拖动位置、背景框和输入区域都依赖这套尺寸计算，不能为了居中另起一套定位逻辑。

### 设置页实时预览

文件：`src/renderer/src/components/DesktopLyricsPanel.tsx`

关键现状：

- 预览在第 234 行附近。
- 第 249 行附近的第一个 `div` 显示中文示例。
- 第 255 行附近的第二个 `div` 显示英文示例。
- 目前两行没有显式的 `text-align: center`，因此预览和覆盖层一样是左对齐。

## 3. 推荐实现方案

### 3.1 修改 GTK 覆盖层的文本布局

只修改 `resources/lyrics-overlay.py` 中 `ScreenLayer.__init__()` 的文本控件布局属性：

1. 将 `self.current_label.set_xalign(0.0)` 改为 `self.current_label.set_xalign(0.5)`。
2. 将 `self.secondary_label.set_xalign(0.0)` 改为 `self.secondary_label.set_xalign(0.5)`。
3. 让两个 Label 在垂直 Box 中都填满同一个内容宽度，而不是各自只占自己的自然宽度：
   - `set_hexpand(True)`；
   - `pack_start(..., True, True, 0)`，或使用等效的 GTK expand/fill 配置。
4. 如 GTK 版本需要显式处理多行文本，可同时设置 `set_justify(Gtk.Justification.CENTER)`；但不要依赖 `justify` 代替 `xalign`，因为当前歌词是一行一个 Label，真正决定单行横向位置的是 Label 在共同分配宽度中的水平对齐方式。
5. 保持 `self.box` 为垂直布局，不要把两行改成水平布局，也不要给 Label 增加固定宽度。

推荐的布局意图如下，不要求机械照抄代码：

```python
self.current_label = Gtk.Label(label="")
self.current_label.set_name("lyric")
self.current_label.set_xalign(0.5)
self.current_label.set_hexpand(True)
self.current_label.set_justify(Gtk.Justification.CENTER)

self.secondary_label = Gtk.Label(label="")
self.secondary_label.set_name("secondary")
self.secondary_label.set_xalign(0.5)
self.secondary_label.set_hexpand(True)
self.secondary_label.set_justify(Gtk.Justification.CENTER)

self.box.pack_start(self.current_label, True, True, 0)
self.box.pack_start(self.secondary_label, True, True, 0)
```

如果实际 GTK 行为表明 `pack_start` 的 expand/fill 组合会改变 `self.box` 的自然尺寸，应以“两个 Label 最终拿到相同的最大内容宽度”为验收标准进行等效调整，不能简单给每个 Label 写死一个固定宽度。

### 3.2 保持宽度测量和定位语义稳定

- 继续使用现有 `hit_size()`，让字幕框宽度由当前可见行中最宽的一行决定。
- 不修改 `place()` 中的 `x`、`y` 语义，不修改 `handle_center()`、`handle_rect()`、`move_global()` 和输入区域计算。
- 不把字幕自动移动到屏幕中心；用户保存的 `x`、`y` 和 `monitor` 必须继续有效。
- 不在 `set_text()` 中插入空格、调整字符串长度或手动计算字符宽度。
- 当翻译行为空时，当前行仍要在自己的内容区域内居中；当当前行为空而翻译行存在时，翻译行也必须居中。
- 字幕文字变长或变短时，允许现有字幕框按照自然宽度重新计算；本次改造不改变已有的拖动坐标保存策略。

### 3.3 同步设置页预览

在 `src/renderer/src/components/DesktopLyricsPanel.tsx` 的预览区域，为两行的共同容器或两行元素增加 `text-align: center`，推荐使用现有 Tailwind 类 `text-center`。

要求：

- 中文示例和英文示例必须以同一个预览容器的中心轴对齐。
- 预览的背景框仍然包住两行文字，不能让预览框变成全宽。
- 不改变预览字号、中文/英文字号比例、颜色、描边、背景透明度和弹窗布局。
- 预览结果要与 GTK 覆盖层的视觉规则一致：每一行独立居中，而不是给中文示例加空格。

## 4. 不应修改的文件和逻辑

本需求不需要修改以下内容：

- `src/main/desktopLyrics.ts`
- `src/main/ipc.ts`
- `src/preload/index.ts`
- `src/shared/types.ts`
- `src/renderer/src/lib/desktopLyrics.ts`
- `resources/lyrics-overlay.py` 中的 stdin 命令字段和拖动/跨屏代码
- 设置存储字段和版本号

除非测试证明 GTK 的最小尺寸行为确实需要配合调整，否则不要扩大改动范围。

## 5. 验收标准

### 视觉验收

至少验证以下文本组合：

1. 当前行较短，翻译行较长：

   ```text
   中文测试
   English Test
   ```

   中文行的视觉中心必须与英文行的视觉中心重合。

2. 当前行较长，翻译行较短：确认不是只有中文行居中。
3. 只有当前行，没有翻译行：当前行仍居中。
4. 只有翻译行：翻译行仍居中。
5. 中文、英文、数字、标点和中英文混合文本：不能依赖字符数量或空格数量。
6. 文本切换为更长或更短的歌词：背景框仍完整包住文字，文字不被裁切。

### 交互回归

1. 解锁状态下，左侧圆形手柄仍位于字幕区域左侧并可拖动。
2. 拖动后松手，手柄和字幕输入区域仍然正常。
3. 可以连续拖过多块显示器，不能因为改变文字对齐而中断手势。
4. 锁定后整层仍然点击穿透，居中对齐不改变锁定行为。
5. 背景开启/关闭、字体大小变化、播放/暂停淡化均正常。
6. 应用重启后，字幕位置、锁定状态和外观设置仍能恢复。

### 构建验证

完成实现后至少运行：

```bash
pnpm exec tsc --noEmit -p tsconfig.web.json
pnpm build
pnpm mobile:build
```

如果改动只涉及桌面歌词，也必须运行桌面构建和 TypeScript 检查；由于设置页是桌面/手机共用组件，仍应确认移动端构建没有回归。

在 Wayland 环境下实际启动桌面歌词覆盖层，使用真实的中文短行 + 英文长行检查截图或肉眼确认中心轴。不要只根据代码判断“应该居中”。

## 6. 给执行者的最终说明

这次改动的核心不是移动字幕位置，而是让同一个垂直字幕容器中的每一行获得相同的可用宽度，然后让每个 Label 在该宽度内水平居中。最容易出现的错误是只把 `set_xalign(0.0)` 改成 `set_xalign(0.5)`，但 Label 仍按各自自然宽度分配，这样视觉上可能不会真正共享中心轴；必须同时确认 GTK 的子控件分配宽度和最终渲染结果。

实施完成后应保持改动小、不要新增配置项、不要改 IPC 协议、不要改拖动坐标含义，并把设置页预览同步为同样的逐行居中效果。
