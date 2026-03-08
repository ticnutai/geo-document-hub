

# תוכנית שדרוג מערכת GIS Pro - מערכת משוכללת מלאה

## סקירת מצב קיים
המערכת כוללת: קטלוג נתונים, שכבות, מסמכים, תוכניות, מגרשים, גושים, סטטיסטיקות, ציור, חיפוש. אבל הרבה פונקציונליות חסרה או חלקית.

## מה ייבנה (10 שדרוגים עיקריים)

### 1. צילומי אוויר היסטוריים (Wayback Imagery)
- שימוש בקובץ `wayback_releases.json` (עשרות צילומי אוויר 2014-2026)
- טאב חדש **"צילומי אוויר"** בסיידבר עם סליידר שנים
- שכבת TileLayer מ-Esri Wayback API: `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/{releaseId}/{z}/{y}/{x}`
- בחירת שנה משנה את שכבת הרקע על המפה בזמן אמת

### 2. טעינת שכבות מרובות (Batch Layer Loading)
- כפתור "טען את כל השכבות" בכל תיקייה בקטלוג
- Checkbox ליד כל קובץ בקטלוג (multi-select)
- כפתור "טען נבחרים" שטוען את כל השכבות המסומנות במקביל
- Progress bar לטעינה מרובה

### 3. מנוע חיפוש גלובלי משולב
- שדרוג טאב החיפוש לחיפוש אחוד: תוכניות + מגרשים + גושים + שכבות + מסמכים
- תוצאות מקובצות לפי קטגוריה
- לחיצה על תוצאה → ניווט למפה / פתיחת פאנל רלוונטי

### 4. חיבור תוכניות למפה (Plan → Map Integration)
- לחיצה על תוכנית בטאב תוכניות → טעינה אוטומטית של שכבות MMG שלה מ-`data/mmg/{planId}/`
- כפתור "הצג על המפה" + "הצג גבול תוכנית" + "זום לתוכנית"
- שימוש ב-MVT_GVUL/MVT_PLAN לציור גבולות

### 5. מציג מסמכי תוכניות (Documents Viewer)
- אינדקס 1,888 מסמכים מ-`all_documents_index.json`
- טאב משנה בתוך תוכניות: הצגת מסמכי PDF, DWG, DOC הקשורים לכל תוכנית
- קישור לקבצים מ-`data/docs/{planId}/`
- סינון לפי סוג קובץ

### 6. נתוני קומפלוט (Complot Integration)
- טאב חדש **"קומפלוט"** או שילוב בתוך מגרשים
- טעינת נתוני `complot_kfar_chabad/migrash_data_gush_*.json` 
- הצגת בקשות, סטטוסים, ושכונות מהנתונים
- חיפוש מגרש לפי גוש

### 7. נתוני data.gov.il
- שילוב CSV קבצים: דרישות בטיחות אש, פנקס קבלנים
- הצגה בטאב סטטיסטיקות או טאב ייעודי
- טבלה חיפושית עם סינון

### 8. שדרוג סטטיסטיקות עם גרפים (Recharts)
- גרפי עוגה: ייעודי קרקע, סטטוס תוכניות
- גרף עמודות: שטח לפי ייעוד
- גרף קווי: תוכניות לפי שנה
- שימוש ב-Recharts (כבר מותקן)

### 9. שדרוג מפה - כלי מדידה ומיקום
- כפתור "המיקום שלי" (Geolocation)
- כלי מדידת מרחק ושטח על המפה
- קואורדינטות עכבר בזמן אמת
- סרגל קנה מידה

### 10. ממשק שכבות משופר
- Drag & drop לסדר שכבות
- קיבוץ שכבות לפי מקור (קטלוג / GitHub / ידני)
- Zoom to layer extent
- Legend אוטומטי

---

## פירוט טכני

### קבצים חדשים
- `src/components/sidebar/AerialPanel.tsx` - צילומי אוויר
- `src/components/sidebar/ComplotPanel.tsx` - נתוני קומפלוט  
- `src/components/sidebar/GlobalSearch.tsx` - חיפוש גלובלי
- `src/components/map/MeasureTool.tsx` - כלי מדידה
- `src/components/map/MouseCoords.tsx` - קואורדינטות
- `src/components/map/LocateButton.tsx` - מיקום נוכחי
- `src/data/wayback-data.ts` - טעינת נתוני Wayback
- `src/data/complot-data.ts` - טעינת נתוני קומפלוט

### קבצים משודרגים
- `src/components/sidebar/DataCatalog.tsx` - multi-select + batch load
- `src/components/sidebar/PlansPanel.tsx` - כפתור "הצג על מפה" + מסמכים
- `src/components/sidebar/StatsPanel.tsx` - גרפי Recharts
- `src/components/map/MapView.tsx` - Wayback layer, מדידה, קואורדינטות, locate
- `src/components/sidebar/AppSidebar.tsx` - טאבים חדשים (צילומי אוויר, קומפלוט)
- `src/types/gis.ts` - SidebarTab types חדשים
- `src/pages/Index.tsx` - state management עבור Wayback, מדידה

### שכבות מפה חדשות
- Esri Wayback TileLayer עם releaseId דינמי
- שכבות קדסטר (blocks_kfar_chabad.geojson, parcels_kfar_chabad.geojson) זמינות בקטלוג

### אין שינויי DB
הכל מבוסס על קבצי data קיימים + Vite glob imports. אין צורך במיגרציות.

