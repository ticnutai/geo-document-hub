

# שדרוג ממשק GIS Pro - סידור, אינטראקטיביות ופונקציונליות מלאה

## הבעיה
המערכת מכילה המון פונקציונליות אבל היא לא מסודרת: הסיידבר צפוף מדי (11 טאבים), אין מעברים חלקים, הממשק לא אינטואיטיבי, חסרים tooltips והנחיות, ויש פונקציות שעובדות חלקית (ציור, מדידה).

## מה ישתנה

### 1. ארגון מחדש של הסיידבר - קיבוץ לוגי
במקום 11 טאבים שטוחים, ארגון ל-4 קבוצות עם תת-טאבים:

```text
┌──────────────────────┐
│ 🗺️  מפה ושכבות       │ → שכבות, קטלוג, צילומי אוויר
│ 📋  תכנון            │ → תוכניות, מגרשים, גושים, קומפלוט
│ 🔧  כלים             │ → ציור, מדידה, חיפוש
│ 📊  מידע             │ → סטטיסטיקות, מסמכים
└──────────────────────┘
```

כל קבוצה נפתחת לתת-טאבים בלחיצה. זה מפשט את הממשק מ-11 כפתורים ל-4.

### 2. Header מעודכן וברור
- שם האפליקציה + breadcrumb של הטאב הנוכחי
- Quick actions bar: מיקום, מדידה, wayback on/off
- Badge counts: שכבות פעילות, מגרשים נטענים

### 3. שיפור כל פאנל בודד

**שכבות (LayerPanel):**
- Drag & drop לסדר שכבות (כבר יש react-resizable-panels)
- כפתור "זום לשכבה" שמחשב extent
- Legend אוטומטי לפי צבע השכבה
- קיבוץ לפי מקור: קטלוג / GitHub / תוכניות / ידני

**קטלוג (DataCatalog):**
- כפתור "טען תיקייה שלמה" ליד כל קטגוריה
- מונה כמה שכבות כבר נטענו מכל קטגוריה (✓ icon)
- אנימציית fade-in בטעינה

**תוכניות (PlansPanel):**
- כרטיסים יפים עם gradient לפי סטטוס
- כפתור "זום לגבול תוכנית" שמשתמש ב-plan_boundaries.geojson
- קישור ישיר למסמכי תוכנית מ-data/docs/{planId}/

**מגרשים (MigrashimPanel):**
- מסנני טווח שטח (slider)
- Virtualized list (רק 200 מוצגים, scroll lazy)
- אפשרות לייצא לCSV

**גושים (BlocksPanel):**
- חיבור למפת הקדסטר (blocks_kfar_chabad.geojson, parcels_kfar_chabad.geojson)
- לחיצה על גוש → זום למפה

**קומפלוט (ComplotPanel):**
- הצגת סטטוס בקשות (מ-complot_parsed.json)
- חיפוש חלקה מהיר
- צבעי סטטוס

**צילומי אוויר (AerialPanel):**
- Slider שנים יפה יותר עם תמונת thumbnail
- כפתור השוואה (split view)
- אנימציית fade בהחלפת שנה

**סטטיסטיקות (StatsPanel):**
- כרטיסי סיכום עם אנימציית ספירה
- Tabs פנימיים: דמוגרפיה / תוכניות / ייעודי קרקע
- גרפים אינטראקטיביים (click on chart → filter)

**חיפוש (GlobalSearch):**
- Debounced search עם highlight
- תוצאות מקובצות עם אייקונים
- לחיצה על תוכנית → פתיחת טאב תוכניות
- לחיצה על מגרש → פתיחת טאב מגרשים

**ציור (DrawTools):**
- ממשק ברור יותר עם instructions
- שמירת ציורים ב-state
- ייצוא ציורים כ-GeoJSON

### 4. אנימציות ו-UX
- `animate-fade-in` על מעבר בין טאבים
- `hover-scale` על כרטיסי תוכניות
- Skeleton loaders בזמן טעינה (במקום רק spinner)
- Toast notifications בטעינת שכבות / שגיאות
- Empty states יפים עם אילוסטרציות

### 5. Map enhancements
- Floating toolbar משודרג (מדידה, מיקום, wayback)
- Mini-map (overview) בפינה
- Fullscreen toggle
- Mouse cursor משתנה לפי מצב (ציור, מדידה, רגיל)

## קבצים שישתנו

**חדשים:**
- `src/components/sidebar/SidebarGroupNav.tsx` - ניווט קבוצות ראשי
- `src/components/sidebar/QuickActions.tsx` - כפתורי פעולה מהירים
- `src/components/ui/skeleton-loader.tsx` - Skeleton loading states
- `src/components/map/MapToolbar.tsx` - Floating toolbar מאוחד

**שדרוגים מהותיים:**
- `src/components/sidebar/AppSidebar.tsx` - ארגון מחדש לקבוצות
- `src/pages/Index.tsx` - Header + quick actions
- `src/components/sidebar/PlansPanel.tsx` - כרטיסים + זום + docs
- `src/components/sidebar/MigrashimPanel.tsx` - סינון מתקדם
- `src/components/sidebar/BlocksPanel.tsx` - חיבור קדסטר
- `src/components/sidebar/ComplotPanel.tsx` - סטטוסים + parsed data
- `src/components/sidebar/StatsPanel.tsx` - tabs + אנימציות
- `src/components/sidebar/DataCatalog.tsx` - loaded indicators
- `src/components/sidebar/GlobalSearch.tsx` - navigation + highlight
- `src/components/sidebar/AerialPanel.tsx` - slider יפה
- `src/components/map/MapView.tsx` - toolbar + fullscreen
- `src/components/map/LayerPanel.tsx` - zoom to extent + groups
- `src/components/map/DrawTools.tsx` - שמירה + ייצוא
- `src/components/map/MeasureTool.tsx` - שטח + polyline נכון

**אין שינויי DB** - הכל frontend.

