/* Wish card: turns a guest's message into a PNG they can save or share. */
(function () {
  const { C, $, when, reducedMotion } = App;

  const W = 1080, H = 1350;
  const FLAG_COLORS = ["#F2A7B8", "#FFE3A1", "#BFE6D4", "#D6CCF5"];

  function wrap(ctx, text, maxWidth) {
    const lines = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(x, left, top, w, hgt, r) {
    x.beginPath();
    x.moveTo(left + r, top);
    x.arcTo(left + w, top, left + w, top + hgt, r);
    x.arcTo(left + w, top + hgt, left, top + hgt, r);
    x.arcTo(left, top + hgt, left, top, r);
    x.arcTo(left, top, left + w, top, r);
    x.closePath();
  }

  function balloon(x, cx, cy, color) {
    x.strokeStyle = "#A2536E";
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(cx, cy + 62);
    x.bezierCurveTo(cx - 14, cy + 110, cx + 14, cy + 140, cx, cy + 190);
    x.stroke();
    x.fillStyle = color;
    x.beginPath();
    x.ellipse(cx, cy, 48, 60, 0, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.moveTo(cx - 8, cy + 66); x.lineTo(cx + 8, cy + 66); x.lineTo(cx, cy + 56);
    x.fill();
    x.fillStyle = "rgba(255,255,255,.55)";
    x.beginPath();
    x.ellipse(cx - 16, cy - 22, 10, 16, -0.5, 0, Math.PI * 2);
    x.fill();
  }

  async function drawCard(from, text) {
    await document.fonts.ready;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");

    // background with dots
    x.fillStyle = "#F9D3DA";
    x.fillRect(0, 0, W, H);
    x.fillStyle = "rgba(255,255,255,.55)";
    for (let j = 0, row = 0; j < H; j += 54, row++) {
      for (let i = row % 2 ? 27 : 0; i < W; i += 54) {
        x.beginPath(); x.arc(i, j, 4, 0, Math.PI * 2); x.fill();
      }
    }

    // bunting
    x.strokeStyle = "#A2536E"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, 40); x.quadraticCurveTo(W / 2, 170, W, 40); x.stroke();
    const n = 12;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const px = t * W;
      const py = (1 - t) ** 2 * 40 + 2 * (1 - t) * t * 170 + t ** 2 * 40;
      x.fillStyle = FLAG_COLORS[i % FLAG_COLORS.length];
      x.beginPath(); x.moveTo(px - 34, py); x.lineTo(px + 34, py); x.lineTo(px, py + 78); x.closePath(); x.fill();
    }

    balloon(x, 110, 330, "#FFE3A1");
    balloon(x, 970, 380, "#BFE6D4");

    // paper
    x.save();
    x.translate(W / 2, H / 2 + 70);
    x.rotate(-0.015);
    x.shadowColor = "rgba(74,22,40,.18)"; x.shadowBlur = 40; x.shadowOffsetY = 18;
    x.fillStyle = "#FFF8F6";
    roundRect(x, -420, -470, 840, 960, 44);
    x.fill();
    x.restore();

    // layered "2"
    x.textAlign = "center";
    x.font = '900 260px "Montserrat", sans-serif';
    [["#D6CCF5", 24], ["#BFE6D4", 16], ["#FFE3A1", 8]].forEach(([col, o]) => {
      x.fillStyle = col; x.fillText(String(C.child.age), W / 2 + o, 520 + o);
    });
    x.fillStyle = "#FFF8F6"; x.fillText(String(C.child.age), W / 2, 520);
    x.lineWidth = 6; x.strokeStyle = "#7A2342"; x.strokeText(String(C.child.age), W / 2, 520);

    x.fillStyle = "#7A2342";
    x.font = '800 60px "Montserrat", sans-serif';
    x.fillText(C.child.fullName || C.child.name, W / 2, 620);

    // message
    x.font = '600 44px "Nunito", sans-serif';
    x.fillStyle = "#4A1628";
    const lines = wrap(x, text, 700).slice(0, 7);
    const lineH = 62, top = 720;
    lines.forEach((l, i) => x.fillText(l, W / 2, top + i * lineH));

    x.font = '700 64px "Caveat", cursive';
    x.fillStyle = "#A2536E";
    x.fillText(from || "Хайртай хүмүүс нь", W / 2, top + lines.length * lineH + 70);

    x.font = '700 28px "Nunito", sans-serif';
    x.fillText(`${C.child.fullName || C.child.name} ${C.child.age} нас, ${when.dateLong}`, W / 2, H - 70);
    return c;
  }

  const form = $("#wishForm");
  const msg = $("#wishMsg");
  const preview = $("#cardPreview");
  let blob = null;

  function setMsg(text, isError) {
    msg.textContent = text;
    msg.classList.toggle("is-error", !!isError);
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const text = $("#wText").value.trim();
    const from = $("#wName").value.trim();
    if (!text) {
      setMsg("Ерөөлөө бичнэ үү.", true);
      $("#wText").focus();
      return;
    }
    setMsg("Карт үүсгэж байна…");
    // Keep a copy for the family (admin page) when the sheet is connected.
    if (C.rsvp.sheetUrl) {
      fetch(C.rsvp.sheetUrl, { method: "POST", mode: "no-cors", body: JSON.stringify({ type: "wish", from, text }) })
        .catch(() => {});
    }
    const canvas = await drawCard(from, text);
    const url = canvas.toDataURL("image/png");
    $("#cardImg").src = url;
    $("#saveCard").href = url;
    canvas.toBlob(b => (blob = b), "image/png");
    preview.hidden = false;
    setMsg("Карт бэлэн боллоо.");
    preview.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  });

  $("#shareCard").addEventListener("click", async () => {
    const file = blob && new File([blob], "eroel-kart.png", { type: "image/png" });
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Ерөөлийн карт" });
        setMsg("Илгээгдлээ. Баярлалаа!");
      } catch (_) { /* user closed the share sheet */ }
    } else {
      setMsg("Энэ төхөөрөмж шууд илгээх боломжгүй. «Хадгалах» дараад зургаа илгээгээрэй.");
    }
  });
})();
