# W3K Worker v220.70: Bug Report

ဖိုင် — `W3K-worker-v220.70.js` (၃၈,၁၉၈ ကြောင်း၊ 3.4 MB)
စစ်ဆေးသည့်ရက် — 2026-10-13

## စစ်ဆေးခဲ့သည့်နည်း

| အဆင့် | ရလဒ် |
|---|---|
| `node --check` (syntax) | ✅ အမှားမရှိ |
| ESLint — server code (line 1–25560) — `no-undef`, `no-dupe-keys`, `no-redeclare`, `no-unreachable` … | ✅ အမှားအစစ် မရှိ (unused 40 ခုသာ) |
| ESLint — Dashboard `<script>` (DASHBOARD template ထဲက JS ~9,000 ကြောင်း) ကို ထုတ်ယူပြီး စစ် | ⚠️ **function နာမည်ထပ် ၁ ခု** (Bug #1) |
| AST scan — `await` မပါသော async call / Promise ကို boolean အဖြစ်သုံးခြင်း | ✅ မတွေ့ |
| AST scan — SQL string concatenation (SQL injection) | ✅ user input အားလုံး `?` bind ဖြင့်သာ |
| AST scan — HTML ထဲ escape မလုပ်ဘဲ ထည့်ခြင်း (XSS) — Dashboard + Website | ✅ မတွေ့ (`esc()` မှန်မှန်သုံးထား) |
| လက်ဖြင့် ဖတ်စစ် — Purchase, Deposit approve/auto-approve/reverse, Withdrawal, Refund/Cancel, Admin balance API, Website login/buy/topup, Supplier API (ProdSeller/DigitalCore/StoreBat/Canboso/SafwanTiger), Gift, Router/Auth/CSRF | အောက်ပါ Bug များ |

> ⚠️ ၃၈,၀၀၀ ကြောင်းလုံးကို စာကြောင်းတိုင်း မဖတ်နိုင်ခဲ့ပါ။ ငွေ၊ လုံခြုံရေးနှင့် အသစ်ထည့်ထားသော (v219–v220) အပိုင်းများကို ဦးစားပေးစစ်ခဲ့ပြီး ကျန်အပိုင်းကို automated scan များဖြင့်သာ စစ်ခဲ့ပါသည်။

---

## 🔴 Bug #1 — Dashboard: `shrinkImage()` ကို ၂ ခါ define ထားသဖြင့် Channel Album (12 MB ကျော်) ပို့၍ မရ

- **နေရာ** — line **29423** `function shrinkImage(file,maxEdge,q)` နှင့် line **33089** `function shrinkImage(file,max)`
- **ပြဿနာ** — JavaScript တွင် function declaration နှစ်ခု နာမည်တူလျှင် **နောက်ဆုံးတစ်ခုက ရှေ့ကဟာကို အစားထိုးသည်**။
  - ပထမ (29423) — `File` object ပြန်ပေးသည် (Album အတွက်)
  - ဒုတိယ (33089) — `{url, w, h}` (data URL) ပြန်ပေးသည် (Product/Category ပုံအတွက်)
  - `albumFitTotal()` (29436) သည် `File` ကို မျှော်လင့်သော်လည်း `{url,w,h}` ကို ရသည် → `albumBytes()` = 0 ဖြစ်ပြီး "fits" ဟု ထင်ကာ → `fd.append('images', {url…}, undefined)` → **TypeError** (`parameter 2 is not of type 'Blob'`)
- **ဖြစ်ပုံ** — Dashboard → Broadcast → Channel Album တွင် ပုံများ စုစုပေါင်း 12 MB ကျော်ရွေးလျှင် "Could not prepare images" ဖြင့် အမြဲ ကျရှုံးသည်။ (12 MB အောက်ဆိုလျှင် `albumFitTotal` က shrink မခေါ်သဖြင့် ပေါ်မလာ)
- **ပြင်နည်း** — ပထမ function ကို နာမည်ပြောင်းပြီး ၎င်း၏ caller တစ်ခုတည်းကိုသာ ပြင်ပါ —
  ```js
  // line 29423
  function shrinkImageFile(file,maxEdge,q){ …
  // line 29441 (albumFitTotal ထဲ)
  return f.size>per?shrinkImageFile(f,steps[i][0],steps[i][1]):f;
  ```

---

## 🟠 Bug #2 — Withdrawal: Screenshot ပို့မရ (`proof_status='failed'`) ဖြစ်ပြီးနောက် Reject လုပ်လျှင် ငွေ ၂ ဆ ပြန်ရ

- **နေရာ** — `completeWithdrawalProof()` (line 5514) နှင့် `rejectWithdrawal()` line **5551**
- **ပြဿနာ** — `proof_status='failed'` ကို အဓိပ္ပာယ် ၂ မျိုးဖြင့် သုံးနေသည် —
  1. Payment Group သို့ prompt ပို့မရ (ငွေ **မလွှဲရသေး**) — `wd_paid_` handler (line 15685)
  2. Admin က KPay သို့ **ငွေလွှဲပြီး** Screenshot ကို customer ထံ `sendPhoto` ပို့မရ — `completeWithdrawalProof()`
  
  `rejectWithdrawal()` သည် `proof_status IN ('pending','failed')` ကို Reject ခွင့်ပြုပြီး balance ကို ပြန်ပေါင်းပေးသည်။ ထို့ကြောင့် (2) ဖြစ်ပြီးနောက် Admin က Reject နှိပ်လျှင် **KPay ငွေလည်း ရ၊ Wallet ငွေလည်း ပြန်ရ** ဖြစ်သည်။ (code comment ကိုယ်တိုင်က "ငွေလွှဲပြီးပြီဟု အတည်ပြုသည့်အချိန်မှစ၍ refund/reject မလုပ်နိုင်ရ" ဟု ဆိုထားသည်)
- **လက်ရှိ အန္တရာယ်** — `CUSTOMER_WITHDRAW_OPEN=false` ဖြစ်၍ Request အသစ် မရှိနိုင်သော်လည်း ရှိပြီးသား Request များကို Admin က ဆက်ဆောင်ရွက်နေဆဲ။
- **ပြင်နည်း** — `completeWithdrawalProof()` ၏ `sendPhoto` fail branch တွင် `'failed'` အစား `'send_failed'` ထားပြီး —
  - `completeWithdrawalProof` claim ၏ `IN (...)` ထဲ `'send_failed'` ထည့် (ထပ်ပို့ခွင့်)
  - `rejectWithdrawal` ၏ `IN ('pending','failed')` ကို မပြောင်းပါနှင့် (`send_failed` ကို reject မခွင့်ပြု)

---

## 🟠 Bug #3 — DigitalCore reconcile က တခြား Order ၏ ပစ္စည်းကို မှားပေးနိုင်

- **နေရာ** — `dcReconcile()` line **21858**
- **ပြဿနာ** — `/buy` timeout ဖြစ်ပြီး history ထဲ ရှာသောအခါ **`create_timestamp` နှင့် `quantity` ကိုသာ** တိုက်သည်။ Product ID မတိုက်ပါ။ `claimed` set သည် `ps_order_id` ရှိသော row များကိုသာ ဖယ်သည် — `dcFulfill` direct success တွင် DigitalCore response ၌ `orderId/order_id/id` မပါလျှင် `ps_order_id` ကွက်လပ် ကျန်ပြီး claimed ထဲ မပါ။
- **ဖြစ်ပုံ** — ၆ မိနစ်အတွင်း DigitalCore order ၂ ခု (ပစ္စည်းမတူ၊ qty တူ) ရှိပြီး တစ်ခု timeout ဖြစ်လျှင် ထို order သည် အခြား customer ၏ order ကို "ငါ့ဟာ" ဟု ယူကာ **ပစ္စည်းမှား (အခြားသူ၏ key) ကို ပေးပို့** နိုင်သည်။
- **ပြင်နည်း** — filter ထဲ product ကိုပါ တိုက်ပါ (ဥပမာ `String(x.product_id || x.productId || '') === supRawId(row.ps_product_id)`)၊ candidate ၁ ခုထက်ပိုလျှင် auto မယူဘဲ `check` ထားပြီး Admin ကို အသိပေးပါ။

---

## 🟡 Bug #4 — Auto-approve ပယ်ဖျက် (↩️) လျှင် နေ့စဉ်ကန့်သတ်ချက်ကို **ယနေ့** မှ ပြန်နုတ်သည်

- **နေရာ** — `reverseAutoDeposit()` line **15123** — `releaseAutoApproveDaily(env, amt, Date.now())`
- **ပြဿနာ** — ↩️ ကို auto-approve ပြီး ၂၄ နာရီအထိ နှိပ်ခွင့်ရှိသည်။ မနေ့က auto-approve ဖြစ်ခဲ့သော ငွေကို ယနေ့ ပယ်ဖျက်လျှင် **ယနေ့၏** `auto_approve_day.total` မှ နုတ်သွားသဖြင့် ယနေ့ auto-approve ကန့်သတ်ချက်ထက် ပိုဝင်ခွင့်ရသွားသည်။
- **ပြင်နည်း** — `await releaseAutoApproveDaily(env, amt, at);` (`at` = `raw.autoApproved` — function အပေါ်တွင် ရှိပြီးသား)

---

## 🟡 Bug #5 — Supplier (SafwanTiger / StoreBat) — HTTP 409 ကို "အပြီးအပိုင် ကျရှုံး" ဟု ယူပြီး Refund လုပ်

- **နေရာ** — `swFulfill()` line **21975**၊ `vbFulfill()` line **22027**
- **ပြဿနာ** — timeout / 5xx ဖြစ်လျှင် `retry` ဖြင့် **idempotency key တူတူ** ထပ်ပို့သည်။ supplier အများစုက ပထမ request ကို လက်ခံပြီးသား ဖြစ်ပါက ဒုတိယကို `409 Conflict (duplicate)` ပြန်တတ်သည်။ Code က 409 ကို permanent failure ဟုယူ၍ `psFail()` → customer ကို ငွေပြန်အမ်း — supplier ဘက်တွင် ငွေကုန်ပြီး ပစ္စည်းလည်း မပို့ဖြစ်။
- **ပြင်နည်း** — 409 ရလျှင် refund မလုပ်ခင် `swPoll` / `vbPoll` (GET order by reference) ဖြင့် order ရှိ/မရှိ အရင် စစ်ပါ။ (Supplier API docs တွင် 409 အဓိပ္ပာယ်ကို အတည်ပြုရန်)

---

## 🟡 Bug #6 — `psApply` 'paid' + `ps_order_id` ကွက်လပ် → cron က order ကို ၅ မိနစ်တိုင်း ထပ် POST

- **နေရာ** — `psTick()` (line 22083) → `psFulfill()` line 21801 ၏ `if (row.status === 'paid' && row.ps_order_id) return psPoll(...)`
- **ပြဿနာ** — supplier response ထဲ order id မပါဘဲ `status:'paid'` ဖြစ်လျှင် `ps_order_id=''` ဖြင့် သိမ်းသည်။ နောက် cron တိုင်း psPoll မဟုတ်ဘဲ psFulfill → **POST /orders ထပ်ခေါ်** သည်။ ProdSeller/Canboso/StoreBat က idempotency key ဖြင့် ကာကွယ်ထား၍ ငွေ ၂ ခါ မကုန်နိုင်သော်လည်း 24-နာရီ alert လည်း ဘယ်တော့မှ မထွက် (psPoll တွင်သာ ရှိ)။
- **ပြင်နည်း** — `paid` row ကို ps_order_id မရှိလျှင်လည်း poll လမ်းကြောင်း (reference ဖြင့်) သို့ ပို့ပါ၊ သို့မဟုတ် `'w3k-'+orderId` ကို fallback reference အဖြစ် သိမ်းပါ။

---

## 🟢 အသေးစား

| # | နေရာ | ပြဿနာ | ပြင်နည်း |
|---|---|---|---|
| 7 | `webLoginPoll()` line **20571** | `expires < now && status==='pending'` — approve ပြီး poll မလုပ်ရသေးသော login request သည် သက်တမ်း (5 မိနစ်) ကုန်ပြီးလည်း cleanup (1 နာရီ) မတိုင်မီ session ပြောင်းယူနိုင်ဆဲ | `if (!row \|\| Number(row.expires) < now) return …expired` |
| 8 | `giftClaimCore()` line 6895 | User တစ်ယောက်တည်း တပြိုင်နက် ၂ ချက်နှိပ်လျှင် ဒုတိယက `kind:'mine', code:''` ဖြင့် **ကွက်လပ်** Gift ပြ | `code===''` ဆိုလျှင် ခဏစောင့်ပြီး ပြန်ဖတ် သို့မဟုတ် "ဆောင်ရွက်နေဆဲ" ပြ |
| 9 | `autoApproveDecision()` line 14968 | Wallet တိုက်စစ်ခြင်းသည် substring သာ — Method `KBZPay` (`kbzpay`) နှင့် OCR provider `KPay` (`kpay`) မကိုက်ဘဲ auto-approve မဖြစ် (ငွေဘက် ဘေးကင်း၊ Admin သို့ ကျသွားရုံ) | alias map (`kpay↔kbzpay`, `ayapay↔aya` …) သုံး |
| 10 | Dashboard line **33626** | `change.type='button',remove=el(...)` — comma ကြောင့် `remove` သည် implicit global ဖြစ်နေ (sloppy mode တွင် အလုပ်လုပ်သော်လည်း `window.remove` ကို ညစ်ပတ်) | `;var remove=el(...)` |
| 11 | line **41** | `FORCE_SUB_CHANNEL` ကို ဘယ်မှာမှ မသုံး၊ အပေါ်က comment ("Main Menu Category အမည်") နှင့်လည်း မကိုက် | ဖျက် သို့မဟုတ် comment ပြင် |
| 12 | Dead code | `completeWithdrawal` (5481), `readDepositReceiptVision` (4119), `enrichDepositReceiptOcr` (13311), `autoApprovedToday` (14906), `GOOGLE_ALLOWED_EMAILS` const (405), `WEB_TXN_JS`/`WEB_WALLET_JS`/`WEB_OLIST_JS` စသည် ၄၀ ခု | ဖျက်နိုင် (behavior မပြောင်း) |

---

## ✅ စစ်ပြီး ပြဿနာမတွေ့သော အပိုင်းများ

- **Telegram webhook** — secret header ကို timing-safe compare၊ duplicate update guard၊ body size limit
- **Admin Dashboard auth** — HMAC session + epoch revocation + Telegram 2nd-factor + CSRF (`Sec-Fetch-Site`) + replay nonce + timestamp
- **Purchase** — `deductBalance` (financial_ops idempotency)၊ key reservation၊ rollback၊ purchase intent
- **Deposit approve** — txn registry unique၊ `deposit_credits` guard၊ concurrent approve compensation
- **Refund / Cancel** — `order_refund_guards` PRIMARY KEY ဖြင့် double refund မဖြစ်နိုင်
- **Admin balance adjust / cashout** — ledger unique index သည် `ref=''` ကို ချန်ထား၍ မှန်
- **Website** — session hash သိမ်း၊ Telegram Login Widget HMAC၊ one-time hash၊ number-matching login၊ JSON-LD `<` escape
- **SQL** — dynamic SQL အားလုံး constant fragment + `?` bind
- **XSS** — Dashboard ၂၁၀ နေရာ `innerHTML` နှင့် website HTML များတွင် DB/Supplier data ကို `esc()` ဖြင့်သာ ထည့်

---

## v220.71 ပြန်စစ်ချက် (2026-10-13)

`node --check` ✅ · ESLint server/Dashboard ✅ (အသစ် error မရှိ၊ `shrinkImage` နာမည်ထပ် ပျောက်ပြီ)

| Bug | အခြေအနေ | မှတ်ချက် |
|---|---|---|
| #1 shrinkImage | ✅ ပြင်ပြီး | `shrinkImageFile` (29486/29504) |
| #2 Withdrawal ငွေ ၂ ဆ | ✅ ပြင်ပြီး | `send_failed` + `proof_file_id IS NULL` guard ၂ ထပ်; stale `sending` ကိုလည်း `proof_file_id` က ကာကွယ် |
| #3 DigitalCore reconcile | ⚠️ ပြင်ပြီး၊ သတိ ၁ ချက် | အောက်တွင် ကြည့်ပါ |
| #4 Auto-approve release | ✅ ပြင်ပြီး | `at` သုံး |
| #5 409 → refund | ✅ ပြင်ပြီး | `hold` ထား၊ Admin သို့ အသိပေး |
| #6 paid + ID မရှိ | ✅ alert ထပ်ထည့်ပြီး | duplicate alert အသေးစား ၁ ခု (အောက်တွင်) |
| #7–#11 | ⏸ မပြင်ရသေး | webLoginPoll expiry၊ Gift ကွက်လပ်၊ KBZPay/KPay alias၊ `remove` global၊ `FORCE_SUB_CHANNEL` |

### v220.71 ပြင်ဆင်မှုထဲက သတိပြုရန်

1. **🟠 `dcReconcile` — ID format မတူလျှင် refund ပြန်ဖြစ်နိုင်** (21869–21897)
   `dcItemPid()` က `product_id` ကို အရင်ယူသည်။ DigitalCore history က `product_id` ကို ဂဏန်း (ဥပမာ `412`) ပေးပြီး ကျွန်ုပ်တို့ `ps_product_id` က slug (`dc:<slug>`) ဖြစ်နေလျှင် order အစစ်ကိုပါ "ပစ္စည်းမတူ" ဟု `continue` လုပ်ကာ `unsure` မဖြစ်ဘဲ ၆ မိနစ်ပြည့်လျှင် `psFail` → **refund** (DigitalCore ဘက်က ငွေကုန်ပြီး)။ v220.70 တုန်းက ဤအခြေအနေတွင် မှန်မှန် ပေးခဲ့သည်။
   ပြင်နည်း — field အားလုံး (`product_id`, `productId`, `product_slug`, `slug`, `product.id`, `product.slug`) ထဲက **တစ်ခုခု** `want` နှင့် တူလျှင် match ဟုယူပါ။ candidate ရှိပြီး match မရှိလျှင်လည်း `unsure` (hold) ထားပြီး refund မလုပ်ပါနှင့်။
2. **🟢 `psTick` — SafwanTiger 24-နာရီ alert ၂ ခါ** (22146–22152)
   `sw` row (ID မရှိ) သည် `swPoll` ထဲတွင် alert ပို့ပြီး `alerted=1` ထားသော်လည်း loop ထဲ `row.alerted` က အဟောင်း (0) ဖြစ်၍ အသစ်ထည့်ထားသော block က ထပ်ပို့သည်။
   ပြင်နည်း — `SELECT status, alerted …` ဖတ်ပြီး `!Number(cur.alerted)` ကိုပါ စစ်ပါ။
3. **🟢 Dashboard — `hold` status အတွက် label/ခလုတ် မရှိ** (`PS_ST`, `psOrdersHtml` 38160)
   `hold` ဖြစ်နေသော order ကို grey `hold` ဟုသာ ပြပြီး ဘာလုပ်ရမည် မပြ။ (Order သည် Processing ဖြစ်နေ၍ Operations မှ Deliver/Refund လုပ်နိုင်သည်) — `PS_ST.hold=['w','Check supplier']` ထည့်ရန် အကြံပြု။

---

## v220.72 ပြန်စစ်ချက်

`node --check` ✅ · ပြောင်းထားသည်မှာ `dcReconcile`၊ `psTick` alert နှင့် `PS_ST.hold` သာ

| v220.71 သတိပေးချက် | အခြေအနေ |
|---|---|
| DigitalCore ID format (ဂဏန်း vs slug) → refund | ✅ ပြင်ပြီး — field အားလုံး တိုက်၊ မကိုက်လျှင် `hold` |
| SafwanTiger alert ၂ ခါ | ✅ ပြင်ပြီး — `alerted`, `ps_order_id` ကို DB မှ ပြန်ဖတ် |
| Dashboard `hold` label | ✅ ပြင်ပြီး |

### ကျန်နေသေးသော / အသစ်တွေ့သော

1. **🟠 `dcReconcile` — ကိုယ့် order ID ကို "claimed" ထဲ ထည့်မိ၍ refund ဖြစ်နိုင် (v220.70 ကတည်းက ရှိ)** (21868, 21883–21886)
   Match တွေ့ပြီး `ps_order_id` ကို သိမ်းပြီးမှ `GET /order?id=` က fail ဖြစ်လျှင် `{state:'check'}` ပြန်သည်။ နောက် cron တွင် `claimed` query က **ဤ row ကိုယ်တိုင်၏** `ps_order_id` ကိုပါ ယူသွားသဖြင့် ကိုယ့် order ကို candidate ထဲမှ ဖယ်လိုက်ကာ "history ထဲ မရှိ" → ၆ မိနစ်ကျော်ပြီးသားမို့ `psFail` → **refund** (DigitalCore ဘက်တွင် ငွေကုန်ပြီး)။
   ပြင်နည်း —
   ```js
   // dcReconcile အစတွင်
   if (row.ps_order_id) {
     const d = await supCall(env, 'dc', 'GET', '/order?id=' + encodeURIComponent(String(row.ps_order_id)));
     return d.ok ? psApply(env, orderId, Object.assign({ status: 'delivered', order_id: String(row.ps_order_id) }, d.json)) : { state: 'check' };
   }
   // claimed query တွင် ကိုယ့် row ကို ဖယ်
   "... AND COALESCE(ps_order_id,'')<>'' AND order_id<>?" → .bind(orderId)
   ```
2. **🟢 v220.71 ဖြင့် `DC-REVIEW` error ရှိပြီးသား row များ `check` တွင် ထာဝရ ကျန်** (21889)
   `status='hold'` ပြောင်းသည့် UPDATE သည် `if (!/^DC-REVIEW/…)` ထဲတွင်ရှိ၍ v220.71 ကတည်းက `DC-REVIEW` error ရထားသော row များ `hold` မဖြစ်တော့ဘဲ cron တိုင်း history ကို ဆက်ခေါ်နေမည်။ ပြင်နည်း — `status='hold'` UPDATE ကို guard အပြင်ထုတ်ပြီး notify ကိုသာ guard ထဲထားပါ။
3. **ℹ️ Trade-off** — ယခု ပစ္စည်း **ရှင်းရှင်း မတူသော** candidate (တခြား customer ၏ order) ရှိရုံဖြင့်လည်း `hold` ဖြစ်မည်။ ငွေဘက် ဘေးကင်းသော်လည်း Admin စစ်ရမည့် order ပိုများနိုင်သည်။ ID ရှိပြီး မကိုက်သော candidate ကိုသာ ကျော်လိုလျှင် `ids.length && !ids.includes(want)` → `continue`၊ `ids.length===0` → `unsure` ဟု ခွဲနိုင်သည်။

---

## v220.73 ပြန်စစ်ချက်

`node --check` ✅ · ပြောင်းထားသည်မှာ `dcReconcile` သာ

| v220.72 သတိပေးချက် | အခြေအနေ |
|---|---|
| ကိုယ့် `ps_order_id` ကို claimed ထဲ ထည့်မိ → refund | ✅ ပြင်ပြီး — ID ရှိလျှင် `GET /order` တိုက်ရိုက် (Processing စစ်ပြီးမှ)၊ claimed query တွင် `order_id<>?` |
| `DC-REVIEW` row များ `check` တွင် ကျန် | ✅ ပြင်ပြီး — `hold` UPDATE ကို guard အပြင်ထုတ် |
| ပစ္စည်းမတူ candidate ကြောင့် hold များခြင်း | ✅ ID အမျိုးတူ (ဂဏန်း↔ဂဏန်း / slug↔slug) မကိုက်လျှင် ကျော်၊ အမျိုးမတူမှသာ hold |

### အသေးစား (မဖြစ်မနေ မဟုတ်)

- **🟢 DigitalCore order `paid` (keys မပါ) သို့မဟုတ် `GET /order` အမြဲ fail** — `check`/`paid` တွင် cron တိုင်း ပြန်ခေါ်နေပြီး ၂၄ နာရီ alert မထွက် (`psTick` alert သည် `ps_order_id` မရှိသော row အတွက်သာ)။ ငွေဘက် ဘေးကင်း။ လိုလျှင် `dcReconcile` ၏ `row.ps_order_id` လမ်းကြောင်းတွင် `created` > 24h နှင့် `!alerted` ဆိုလျှင် Admin ကို တစ်ခါ အသိပေးပါ။
