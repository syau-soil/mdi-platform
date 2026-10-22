# MDI 计算平台（GitHub + Supabase 版）部署指南

设施土壤微生态失衡指数（MDI）计算平台的**纯前端**版本，部署到 GitHub Pages，云端"登录 / 保存 / 读取 / 删除"功能由 [Supabase](https://supabase.com)（免费）提供。

> 本目录与已上线的 WorkBuddy 分享链接（`https://mdi-calculator.app.workbuddy.host/`）**相互独立**：两边数据不互通，改这边不会影响线上那条。

## 文件说明

| 文件 | 作用 |
|---|---|
| `index.html` | 页面结构 + 样式，通过 `<script src="_c.js">` 加载逻辑 |
| `_c.js` | 全部业务逻辑（指标归一化、加权、计算、导出、Supabase 云端存取） |
| `.nojekyll` | **必须保留**：关闭 GitHub Pages 的 Jekyll，否则以下划线开头的 `_c.js` 不会被发布 |

## 一、创建 GitHub 账号（你还没有，从这里开始）

1. 打开 <https://github.com>，点 **Sign up**（右上角）。
2. 填用户名、邮箱、密码；完成人机验证；验证邮箱（GitHub 会发一封确认邮件，点里面的链接）。
3. 注册完成后登录即可。**不需要付费**，免费账号就能用 GitHub Pages。

## 二、新建仓库

1. 登录后点右上角 **+ → New repository**。
2. Repository name 随意，例如 `mdi-platform`（会决定网址，建议小写、用连字符）。
3. 可见性选 **Public**（GitHub Pages 免费版要求公开仓库）。
4. **不要**勾选 "Add a README file" / ".gitignore" / "license" —— 我们要把本目录原样推上去，避免冲突。
5. 点 **Create repository**，进入空仓库页面。

## 三、创建 Supabase 项目（云端保存的后端）

1. 打开 <https://supabase.com>，用 GitHub 账号登录最方便，点 **Start your project**。
2. **New project**：填名字（如 `mdi`）、设置数据库密码（记下来）、选区域（离你近的，如 Singapore）。
3. 创建后等待几十秒。进入项目，左侧菜单 **Project Settings → API**：
   - 复制 **Project URL**（形如 `https://xxxx.supabase.co`）
   - 复制 **anon / public key**（一长串 `eyJ...`）
4. 左侧 **SQL Editor → New query**，把下面整段 SQL 粘贴进去执行（建表 + 开启行级安全）：

```sql
create table if not exists mdi_records (
  id bigint generated always as identity primary key,
  record_name text,
  data jsonb,
  created_at timestamptz default now(),
  user_id uuid not null default auth.uid() references auth.users
);

alter table mdi_records enable row level security;

create policy "owner_select" on mdi_records for select using (auth.uid() = user_id);
create policy "owner_insert" on mdi_records for insert with check (auth.uid() = user_id);
create policy "owner_delete" on mdi_records for delete using (auth.uid() = user_id);
```

> 这段 RLS 策略保证**每个用户只能看到自己保存的记录**。一定执行，否则数据会互相暴露。

5. （可选但推荐）左侧 **Authentication → Providers → Email**，打开 **Email OTP**（这样"获取验证码"会发 6 位数字码，可在页面输入）。不打开则用"魔法链接"登录（点邮件里的链接直接登录）。

## 四、填入 Supabase 配置

打开本目录的 `_c.js`，把最上面的 `CLOUD_CONFIG` 改成你的真实值：

```js
const CLOUD_CONFIG = {
  endpoint: "https://你的PROJECT-REF.supabase.co",   // 第三步拿到的 Project URL
  publishableKey: "你的ANON-KEY"                     // 第三步拿到的 anon key
};
```

如果保持默认（`YOUR-...` 占位符），平台仍可正常使用**计算和 CSV 导出**，只是云端保存不可用。

## 五、启用 GitHub Pages

1. 仓库页 **Settings → Pages**（左侧栏最下方）。
2. **Source**：选 **Deploy from a branch**；Branch 选 **main**，目录选 **/ (root)**；点 **Save**。
3. 等 1–2 分钟，页面顶部会出现 `https://你的用户名.github.io/mdi-platform/` 这样的地址，就是你的线上平台。

## 六、把代码推到 GitHub

在**本目录**（`MDI平台-github`）打开终端，执行：

```bash
git init
git add -A
git commit -m "MDI platform: GitHub Pages + Supabase"
git branch -M main
git remote add origin https://github.com/你的用户名/mdi-platform.git
git push -u origin main
```

`git push` 时会要求登录 GitHub：用 **GitHub 账号 + 密码**现已不支持，请改用 **Personal Access Token（PAT）** 当密码。生成 PAT：GitHub 右上角头像 → **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token**，勾 `repo` 权限，复制保存。

> 如果你不想自己敲命令，可以把**仓库地址**和**一个具有 repo 权限的 PAT** 发给我，我直接帮你推上去。

## 七、验证

1. 打开你的 GitHub Pages 地址。
2. 点"获取验证码"用邮箱注册/登录（或密码登录）。
3. 填入/导入数据 → 点"▶ 运行计算"。
4. 点"保存到云端" → 给记录命名。
5. 刷新页面 → "读取云端记录"，确认能载入刚才保存的数据。

## 注意事项（重要）

- **anon key 可公开**，但必须配合上面的 RLS 策略；没开 RLS 千万别公开仓库里的任何密钥以外的数据。
- 本版的"忘记密码"走 Supabase **邮件链接**流程：点"忘记密码"→ 收邮件 → 点链接回到页面（自动进入恢复会话）→ 填新密码提交。验证码框在 Supabase 模式下留空即可。
- 邮箱验证码登录需要站点运行在 **https** 下（GitHub Pages 满足）。
- 本代码已按 **Supabase JS v2** 接口改写，但**未经真实 Supabase 项目实测**；首次部署请严格按第七步验证登录与保存。如有报错把控制台信息发我。
- 与 WorkBuddy 已发布链接的数据不互通，是两个独立部署。
