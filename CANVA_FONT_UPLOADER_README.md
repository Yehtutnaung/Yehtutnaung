# Canva Font Upload Helper

Canva font upload မှာ တစ်ခါတင်နိုင်တဲ့ file အရေအတွက် 20 လောက်ပဲဖြစ်တဲ့အတွက် font folder ထဲက files တွေကို 20 ခုစီ auto တင်ဖို့ Windows helper files ပါ။

## Files

- `Canva_Font_Auto_Upload.bat` — Canva ကို browser automation နဲ့ဖွင့်ပြီး fonts ကို 20 ခုစီ upload တင်ဖို့ ကြိုးစားပေးမယ်။ Duplicate / confirmation dialog တွေမှာ `Skip`, `Confirm`, `Continue` စတဲ့ ခလုတ်တွေကို auto click ကြိုးစားမယ်။ Screenshot ထဲက **Uploaded fonts** popup မှာရှိတဲ့ **Add new** ခလုတ်ကိုလည်း target လုပ်ထားပါတယ်။
- `canva-font-uploader.js` — Auto upload BAT ကသုံးတဲ့ script ပါ။ BAT နဲ့တူတဲ့ folder ထဲမှာထားရမယ်။
- `Canva_Font_20_Batch_Folders.bat` — Browser automation မသုံးချင်ရင် font files တွေကို `batch_001`, `batch_002`... ဆိုပြီး 20 ခုစီ folder ခွဲပေးမယ်။ Canva ထဲမှာ folder တစ်ခုချင်း Select All လုပ်ပြီး manual တင်နိုင်တယ်။

## Requirements

Auto upload version အတွက် Windows computer မှာ **Node.js LTS** install လုပ်ထားရပါမယ်။ Google Chrome သို့မဟုတ် Microsoft Edge ရှိရပါမယ်။

Download Node.js: <https://nodejs.org/>

> New version: Playwright Chromium ကို download မလုပ်တော့ပါ။ သင့် computer ထဲက Chrome/Edge ကိုပဲသုံးမယ်။ ဒါကြောင့် `cdn.playwright.dev ... timed out` error မဖြစ်သင့်တော့ပါ။

## Auto Upload အသုံးပြုပုံ

1. ZIP ကို Extract လုပ်ပါ။ `Canva_Font_Auto_Upload.bat` နဲ့ `canva-font-uploader.js` က folder တစ်ခုထဲမှာရှိရပါမယ်။
2. Font folder ကို `Canva_Font_Auto_Upload.bat` ပေါ် drag-and-drop လုပ်ပါ။ မလုပ်ချင်ရင် BAT ကို double-click လုပ်ပြီး folder path paste/type လုပ်ပါ။
3. ပထမဆုံး run မှာ Playwright automation package ကို install လုပ်ပါမယ်။ Chromium browser download မလုပ်ပါ။
4. Script က Chrome/Edge window အသစ်ဖွင့်ပါမယ်။ Canva account ကို ကိုယ်တိုင် login ဝင်ပါ။ Password/2FA ကို script ကမသိမ်းပါ။
5. Canva Brand Kit > Fonts ထဲကိုသွားပြီး screenshot ထဲကလို **Uploaded fonts** popup ကိုဖွင့်ပါ။ **Add new** ခလုတ်မြင်တဲ့အချိန် Command Prompt မှာ Enter နှိပ်ပါ။
6. Script က **Add new** ကိုနှိပ်ပြီး 20 files စီ upload တင်ပါမယ်။ `Skip`, `Confirm`, `Continue`, `Yes, upload...` စတဲ့ prompt တွေကို auto click ကြိုးစားပါမယ်။
7. Canva UI ပြောင်းသွားလို့ auto click မလုပ်နိုင်ရင် script က browser ထဲက **Add new / Upload Font** ခလုတ်ကို click လုပ်ခိုင်းပါမယ်။ အဲဒီအချိန် file picker ပွင့်လာရင် script က နောက်ထပ် 20 files ကို auto ထည့်ပေးပါမယ်။

## Important

Automation က သင့်ရှိပြီးသား Chrome tab ကို တိုက်ရိုက်မထိန်းနိုင်ပါ။ BAT ကဖွင့်ပေးတဲ့ Chrome/Edge window အသစ်ထဲမှာ Canva ကိုဖွင့်ပြီး **Uploaded fonts > Add new** နေရာအထိသွားပေးရပါမယ်။

## Manual Batch Folder Version

Auto upload မအောင်မြင်ရင် သို့မဟုတ် automation မသုံးချင်ရင်:

1. Font folder ကို `Canva_Font_20_Batch_Folders.bat` ပေါ် drag-and-drop လုပ်ပါ။
2. Source folder အပြင်ဘက်မှာ `YourFolder_Canva_20_File_Batches` ဆိုတဲ့ output folder ထွက်လာပါမယ်။
3. `batch_001` ထဲက files ကို Canva မှာ Select All လုပ် upload တင်ပါ။ ပြီးရင် `batch_002`, `batch_003` ဆက်တင်ပါ။

## Notes / Limitations

- Canva က official stable upload API မပေးထားတဲ့အတွက် browser automation က Canva UI ပြောင်းလဲမှုအပေါ် မူတည်ပါတယ်။ မအောင်မြင်ရင် manual click fallback ပါထားပါတယ်။
- Canva account ထဲ upload/use လုပ်ခွင့်ရှိတဲ့ fonts တွေကိုသာ တင်ပါ။
- Auto upload log ကို font folder ထဲမှာ `.canva-font-upload-log.json` အဖြစ်သိမ်းပါတယ်။
- Supported extensions: `.ttf`, `.otf`, `.woff`, `.woff2`.

## Advanced command

```bat
node canva-font-uploader.js "D:\Fonts" --batch-size=20 --delay-seconds=12 --browser=auto --resume
```

Options:

- `--browser=auto` — installed Chrome/Edge ကိုသုံးမယ်။ `chrome`, `msedge`, `chromium` လို့လည်းရွေးနိုင်ပါတယ်။
- `--resume` — log ထဲမှာ attempted ဖြစ်ပြီးသား files တွေကို skip လုပ်မယ်။
- `--dry-run` — upload မတင်ဘဲ batch plan ပဲပြမယ်။
- `--no-auto-click` — Canva Add new / Upload button ကို auto click မကြိုးစားဘဲ user ကို click လုပ်ခိုင်းမယ်။ Files ကိုတော့ script က auto select ပေးမယ်။
