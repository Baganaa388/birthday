# Хариу, ерөөл хадгалах (Google Sheets)

Зочдын бөглөсөн хариу, ерөөл Google хүснэгтэд хадгалагдаж, `admin.html` хуудсанд харагдана.
Нэг удаа 5 минут орчим тохируулна.

## 1. Хүснэгт үүсгэх

1. https://sheets.new нээж шинэ хүснэгт үүсгэнэ (нэрийг нь «Амирлан 2 нас» гэх мэт).
2. Цэснээс **Extensions → Apps Script** дарна.
3. Гарч ирсэн `Code.gs` доторх бүхнийг устгаад `backend/apps-script.gs`-ийн агуулгыг хуулж тавина. Хадгална (Ctrl+S).

## 2. Админы нэр, нууц үг

Apps Script дотор зүүн талын **⚙ Project Settings → Script properties → Add script property**:

| Property     | Value   |
|--------------|---------|
| `ADMIN_USER` | `admin` |
| `ADMIN_PASS` | `admin` |

Нууц үг зөвхөн энд хадгалагдана, GitHub дээрх кодод байхгүй.
`admin` / `admin` хэтэрхий амархан тул илүү хэцүү нууц үг тавихыг зөвлөе.

## 3. Нийтлэх

1. Баруун дээд **Deploy → New deployment** → төрөл: **Web app**.
2. **Execute as:** Me, **Who has access:** Anyone.
3. **Deploy** дараад Google эрх зөвшөөрнө («Advanced → Go to … (unsafe)» гэж гарвал дарна, энэ нь таны өөрийн скрипт).
4. Гарч ирсэн `https://script.google.com/macros/s/…/exec` хаягийг хуулна.

## 4. Сайттай холбох

`assets/js/config.js` дотор:

```js
rsvp: {
  ...
  sheetUrl: "https://script.google.com/macros/s/…/exec"
}
```

Ингэсний дараа:
- Зочны «Хариу илгээх» нь SMS биш, шууд хүснэгт рүү орно.
- Ерөөлийн карт үүсгэхэд ерөөл нь хүснэгтэд хадгалагдана.
- `admin.html` нээж нэвтрээд бүх хариуг харна.

Кодыг өөрчилбөл **Deploy → Manage deployments → ✏ → Version: New version** хийж шинэчилнэ (хаяг өөрчлөгдөхгүй).
