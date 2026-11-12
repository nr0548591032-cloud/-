/* =====================================================================
   סוכן ה-AI של ניהול הבניין – שרת קטן ב-Netlify
   ---------------------------------------------------------------------
   - מפתח ה-API של Anthropic נשמר רק בהגדרות Netlify (ANTHROPIC_API_KEY),
     לעולם לא בקוד ולא בדפדפן.
   - רק משתמש מחובר ב-Firebase שמופיע ברשימת המורשים יכול להשתמש בו.
   - השרת רק קורא ומחזיר הצעה. הוא לא כותב, לא מוחק ולא משנה שום נתון.
     השמירה נעשית באפליקציה, ורק אחרי אישור של המשתמש.
   כתובת: /api/ai   (POST)
   גוף הבקשה: { task: "pricelist" | "document", parts: [...], hint?: "..." }
     parts: { type:"text", text } | { type:"image", mediaType, data } | { type:"pdf", data }
     (data = base64, בלי הקידומת data:...)
   ===================================================================== */

const FIREBASE_WEB_KEY = "AIzaSyAK0JwkVu7BhPhTTv8RpboK5NnGKbe_Nf4"; // מפתח ציבורי של אפליקציית הווב (לא סוד)
const DEFAULT_ALLOWED = ["UxdEfuUl6dhBaH3GBrPXtosn1Iv2"];          // המנהל
const MAX_BODY = 5_500_000;                                         // ~5.5MB, מתחת למגבלת Netlify

const env = (k, d = "") => {
  try { if (globalThis.Netlify?.env?.get) { const v = Netlify.env.get(k); if (v) return v; } } catch (e) {}
  return process.env[k] || d;
};

/* ---------- הגדרת מה הסוכן מחזיר (JSON קבוע) ---------- */
const TOOLS = {
  pricelist: {
    name: "save_price_list",
    description: "Return every product row found in the supplier price list.",
    input_schema: {
      type: "object",
      properties: {
        supplier: { type: "string", description: "Supplier name as printed, or empty" },
        list_date: { type: "string", description: "Date of the price list as printed (any format), or empty" },
        prices_include_vat: { type: ["boolean", "null"], description: "true if prices include VAT (כולל מע\"מ), false if before VAT (לפני מע\"מ / לא כולל), null if not stated" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Product description exactly as the supplier wrote it (Hebrew, correct reading order)" },
              sku: { type: "string", description: "Supplier item code (מק\"ט) or empty" },
              barcode: { type: "string", description: "Barcode or empty" },
              sell_unit: { type: "string", enum: ["קרטון", "מארז", "שק", "יחידה", "ק\"ג", "ליטר", "אחר"], description: "The unit the supplier sells and prices by" },
              units_per_pack: { type: ["number", "null"], description: "How many units inside the carton/pack, if stated; else null" },
              unit_size: { type: "string", description: "Size of a single unit, e.g. '1 ק\"ג', '18 ל׳', '160 גר׳', or empty" },
              price: { type: "number", description: "Price per sell_unit as printed (number only)" },
              confidence: { type: "string", enum: ["high", "low"], description: "low if the row was hard to read or the pack size / price is ambiguous" },
              question: { type: "string", description: "If confidence is low: ONE short simple Hebrew question for the user. Else empty" }
            },
            required: ["name", "sell_unit", "price", "confidence"]
          }
        }
      },
      required: ["items", "prices_include_vat"]
    }
  },
  document: {
    name: "save_document",
    description: "Return what this business document is and the key fields in it.",
    input_schema: {
      type: "object",
      properties: {
        doc_type: { type: "string", enum: ["invoice", "receipt", "invoice_receipt", "work_confirmation", "inspection_certificate", "defects_report", "quote", "service_contract", "price_list", "other"] },
        doc_type_he: { type: "string", description: "Short Hebrew name of the document type, e.g. 'חשבונית מס / קבלה'" },
        supplier: { type: "string", description: "Business / professional that issued the document" },
        supplier_id: { type: "string", description: "ח.פ / ע.מ if printed, else empty" },
        date: { type: "string", description: "Document date as YYYY-MM-DD if possible, else empty" },
        doc_number: { type: "string" },
        total: { type: ["number", "null"], description: "Final total to pay" },
        vat_amount: { type: ["number", "null"] },
        total_includes_vat: { type: ["boolean", "null"] },
        valid_until: { type: "string", description: "Expiry / validity date (certificates, quotes, contracts) as YYYY-MM-DD, else empty" },
        inspector: { type: "string", description: "For certificates: inspector or inspecting company, else empty" },
        subject: { type: "string", description: "One short Hebrew line: what the work / purchase was about" },
        line_items: {
          type: "array",
          items: { type: "object", properties: { text: { type: "string" }, amount: { type: ["number", "null"] } }, required: ["text"] }
        },
        defects: { type: "array", items: { type: "string" }, description: "For a defects report: each defect as a short Hebrew line" },
        uncertain_fields: { type: "array", items: { type: "string" }, description: "Names of fields above that were hard to read and need the user's check" }
      },
      required: ["doc_type", "doc_type_he", "supplier", "uncertain_fields"]
    }
  },
  voice: {
    name: "save_voice_note",
    description: "Turn a spoken Hebrew note of a building manager into one structured item.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["ops_task", "my_task", "purchase"], description: "ops_task = work for a professional/maintenance person in the building (repair, leak, check). my_task = a personal to-do / reminder for the manager himself (call, email, meeting, buy something small). purchase = ordering food/supplies for the kitchen/building." },
        title: { type: "string", description: "Short Hebrew title, max ~8 words, without the date/person/urgency words" },
        place: { type: "string", description: "Where in the building, if said (e.g. 'שירותים קומה 2'). Empty if not said." },
        assignee: { type: "string", description: "The professional/person to send it to, EXACTLY as one of the known contact names if it matches one. Empty if none." },
        urgent: { type: "boolean" },
        due: { type: "string", description: "Due date as YYYY-MM-DD if a day was said (today/tomorrow/Sunday/date). Empty if not said." },
        remind: { type: "string", description: "Reminder date YYYY-MM-DD if the manager asked to be reminded. Empty if not." },
        my_type: { type: "string", enum: ["phone", "mail", "buy", "meet", "doc", "field", "general"], description: "For my_task: the type of action" },
        items: { type: "array", description: "For purchase: the products and quantities said", items: { type: "object", properties: { name: { type: "string" }, qty: { type: "number" }, unit: { type: "string" } }, required: ["name"] } },
        notes: { type: "string", description: "Any other detail said that does not fit above. Short Hebrew." }
      },
      required: ["kind", "title"]
    }
  }
};

const PROMPTS = {
  pricelist:
    "זה מחירון של ספק מזון / ציוד למוסד בישראל. החזר את כל שורות המוצרים בעזרת הכלי save_price_list. " +
    "שמור על שם המוצר בדיוק כפי שהספק כתב אותו, בסדר קריאה נכון של עברית (אם הטקסט הפוך – תקן). " +
    "מחיר: המספר שמופיע לכל יחידת מכירה (קרטון/מארז/שק/יחידה). אל תמציא מחירים ואל תחשב מע\"מ בעצמך – רק דווח אם המחירים כוללים מע\"מ. " +
    "אם לא ברור כמה יחידות בקרטון או שהמחיר לא מתאים לגודל – סמן confidence=low ונסח שאלה אחת קצרה ופשוטה בעברית. " +
    "דלג על כותרות, סיכומים ושורות שאינן מוצר.",
  document:
    "זה מסמך שהועלה למערכת ניהול של בניין / מוסד בישראל (חשבונית, קבלה, אישור עבודה, אישור בודק, דוח ליקויים, הצעת מחיר, חוזה שירות ועוד). " +
    "זהה את סוג המסמך והחזר את השדות בעזרת הכלי save_document. אל תנחש: שדה שלא כתוב – השאר ריק. " +
    "שדה שקשה לקרוא – מלא את הקריאה הסבירה וכתוב את שמו ב-uncertain_fields.",
  voice:
    "זו הקלטה קולית (מתומללת) של מנהל בניין / מוסד בישראל, שאומר בקצרה משהו שצריך לעשות. " +
    "הבן מה הוא רוצה והחזר פריט אחד בעזרת הכלי save_voice_note. תאריכים יחסיים (מחר, ביום ראשון) חשב לפי התאריך של היום שמופיע במידע הנוסף. " +
    "אם הוא מזכיר איש מקצוע – בחר את השם המדויק מרשימת אנשי הקשר שבמידע הנוסף, ואם אין התאמה ברורה השאר ריק. אל תמציא פרטים שלא נאמרו."
};

/* ---------- בדיקת המשתמש מול Firebase ---------- */
async function verifyUser(req) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_KEY}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: token })
  });
  if (!r.ok) return null;
  const j = await r.json();
  const uid = j?.users?.[0]?.localId;
  if (!uid) return null;
  const allowed = (env("AI_ALLOWED_UIDS") || DEFAULT_ALLOWED.join(",")).split(",").map(s => s.trim()).filter(Boolean);
  return allowed.includes(uid) ? uid : false;
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

function toBlocks(parts) {
  const out = [];
  for (const p of parts || []) {
    if (p?.type === "text" && p.text) out.push({ type: "text", text: String(p.text).slice(0, 200_000) });
    else if (p?.type === "image" && p.data && /^image\/(png|jpe?g|gif|webp)$/.test(p.mediaType || ""))
      out.push({ type: "image", source: { type: "base64", media_type: p.mediaType === "image/jpg" ? "image/jpeg" : p.mediaType, data: p.data } });
    else if (p?.type === "pdf" && p.data)
      out.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: p.data } });
  }
  return out;
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json({ ok: false, error: "שיטה לא נתמכת" }, 405);

  const apiKey = env("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ ok: false, error: "מפתח ה-AI לא מוגדר בשרת" }, 500);

  let user;
  try { user = await verifyUser(req); } catch (e) { user = null; }
  if (user === null) return json({ ok: false, error: "צריך להתחבר לאפליקציה" }, 401);
  if (user === false) return json({ ok: false, error: "למשתמש הזה אין הרשאה לסוכן ה-AI" }, 403);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ ok: false, error: "הקובץ גדול מדי. נסה עמוד אחד בכל פעם" }, 413);
  let body;
  try { body = JSON.parse(raw); } catch (e) { return json({ ok: false, error: "בקשה לא תקינה" }, 400); }

  const task = body.task;
  if (!TOOLS[task]) return json({ ok: false, error: "סוג משימה לא מוכר" }, 400);
  const blocks = toBlocks(body.parts);
  if (!blocks.length) return json({ ok: false, error: "לא נשלח תוכן לקריאה" }, 400);

  const hint = body.hint ? "\n\nמידע נוסף מהמשתמש: " + String(body.hint).slice(0, task === "voice" ? 4000 : 500) : "";
  const payload = {
    model: env("AI_MODEL", "claude-sonnet-5-5"),
    max_tokens: task === "pricelist" ? 16000 : task === "voice" ? 1500 : 4000,
    tools: [TOOLS[task]],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: [...blocks, { type: "text", text: PROMPTS[task] + hint + "\n\nחובה להחזיר את התשובה רק דרך קריאה לכלי " + TOOLS[task].name + ", בלי טקסט נוסף." }] }]
  };

  /* תשובה זורמת: רווחים כל כמה שניות כדי שהחיבור לא ייסגר, ובסוף ה-JSON. */
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const ping = setInterval(() => { try { ctrl.enqueue(enc.encode(" ")); } catch (e) {} }, 4000);
      let result;
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify(payload)
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          const t = j?.error?.type || "";
          const msg = r.status === 402 || /credit|billing/i.test(j?.error?.message || "") ? "נגמר הקרדיט בחשבון ה-AI"
            : r.status === 429 ? "יותר מדי בקשות בבת אחת. נסה שוב בעוד דקה"
            : r.status === 401 ? "מפתח ה-AI לא תקין או שפג תוקפו"
            : "שגיאה בשירות ה-AI (" + r.status + (t ? " " + t : "") + ")";
          if (r.status === 400) console.log("anthropic 400:", j?.error?.message);
          result = { ok: false, error: msg, detail: String(j?.error?.message || "").slice(0, 300) };
        } else {
          let use = (j.content || []).find(c => c.type === "tool_use");
          if (!use) {   /* גיבוי: אם הוחזר JSON כטקסט */
            const txt = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("");
            const m = txt.match(/\{[\s\S]*\}/);
            if (m) { try { use = { input: JSON.parse(m[0]) }; } catch (e) {} }
          }
          result = use ? { ok: true, task, data: use.input, truncated: j.stop_reason === "max_tokens", usage: j.usage }
                       : { ok: false, error: "הסוכן לא החזיר תשובה מסודרת. נסה שוב" };
        }
      } catch (e) {
        result = { ok: false, error: "אין חיבור לשירות ה-AI כרגע" };
      }
      clearInterval(ping);
      ctrl.enqueue(enc.encode(JSON.stringify(result)));
      ctrl.close();
    }
  });
  return new Response(stream, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
};

export const config = { path: "/api/ai" };
