# И.Амирлангийн 2 насны урилга

Утсанд зориулсан төрсөн өдрийн урилга. Зочдын хариу, ерөөл серверийн өгөгдлийн санд (SQLite) хадгалагдаж, админ хуудсанд харагдана.

## Ажиллуулах

Node.js 22.13 буюу түүнээс шинэ хувилбар хэрэгтэй.

```bash
npm install
npm start
```

- Урилга: http://localhost:3000
- Админ: http://localhost:3000/admin (анхдагч нэвтрэх нэр `admin`, нууц үг `admin`)

## Тохиргоо (орчны хувьсагч)

| Хувьсагч         | Утга                                                         |
|------------------|--------------------------------------------------------------|
| `ADMIN_USER`     | Админы нэр (анхдагч `admin`)                                 |
| `ADMIN_PASS`     | Админы нууц үг (анхдагч `admin`, заавал сольж тавь)          |
| `SESSION_SECRET` | Урт санамсаргүй тэмдэгт. Сервер дахин асахад админ гарахгүй |
| `DATA_DIR`       | `birthday.db` хадгалах хавтас (анхдагч `./data`)            |
| `PORT`           | Порт (анхдагч `3000`)                                        |

Жишээ: `.env.example`

## Бүтэц

```
server/index.js         Express сервер: public/ болон API
server/db.js            SQLite хүснэгтүүд (rsvps, wishes)
server/guest.js         Зочны API: POST /api/rsvp, GET/POST /api/wishes
server/admin.js         Админ API: нэвтрэх, жагсаалт, устгах
server/rate-limit.js    Хэт олон хүсэлтээс хамгаалах

public/index.html       Урилга
public/admin.html       Админ хуудас
public/assets/js/config.js   ← Урилгын мэдээлэл: нэр, огноо, газар, хөтөлбөр, зураг
public/assets/js/*.js   Урилгын логик (rsvp, wishes, scroll, effects …)
public/images/*.webp    Дэвсгэргүй болгосон зургууд
```

## API

| Арга   | Зам                        | Тайлбар                              |
|--------|----------------------------|--------------------------------------|
| POST   | `/api/rsvp`                | Хариу (нэг зочин засахад шинэчлэгдэнэ) |
| GET    | `/api/wishes`              | Сүүлийн 30 ерөөл (урилга дээр)       |
| POST   | `/api/wishes`              | Ерөөл нэмэх                          |
| POST   | `/api/admin/login`         | Нэвтрэх (HttpOnly cookie)            |
| POST   | `/api/admin/logout`        | Гарах                                |
| GET    | `/api/admin/data`          | Бүх хариу, ерөөл                     |
| DELETE | `/api/admin/rsvps/:id`     | Хариу устгах                         |
| DELETE | `/api/admin/wishes/:id`    | Ерөөл устгах                         |

Сервергүй (жишээ нь файлаар нээсэн) үед хариу SMS-ээр явна.

## Байршуулах

Мэдээлэл алдагдахгүйн тулд `DATA_DIR`-ийг байнгын диск (volume) дээр тавина.

**Railway:** GitHub репогоо холбоно → Variables-д `ADMIN_PASS`, `SESSION_SECRET`, `DATA_DIR=/data` → Volume нэмээд `/data`-д холбоно.

**Docker (өөрийн сервер):**

```bash
docker build -t birthday .
docker run -d -p 3000:3000 -v birthday-data:/data \
  -e ADMIN_PASS=... -e SESSION_SECRET=... birthday
```

## Зочин бүрт нэрээр нь

Линкийн ард `?to=` нэмнэ: `https://таны-сайт/?to=Болд ах`
