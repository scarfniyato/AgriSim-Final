# AGriSim Design Specification for Godot 4.6

> A complete blueprint for recreating the AGriSim simulation interface in Godot Engine.

---

## Table of Contents

1. [Color System](#color-system)
2. [Typography](#typography)
3. [Layout & Spacing](#layout--spacing)
4. [Component Specifications](#component-specifications)
5. [Icons & Assets](#icons--assets)
6. [Animations](#animations)
7. [Godot Implementation Notes](#godot-implementation-notes)

---

## Color System

### Primary Palette

| Token | HSL | Hex | RGB | Usage |
|-------|-----|-----|-----|-------|
| **Primary Green** | `hsl(122, 39%, 49%)` | `#4CAF50` | `76, 175, 80` | Primary buttons, active states, healthy indicators |
| **Primary Foreground** | `hsl(0, 0%, 100%)` | `#FFFFFF` | `255, 255, 255` | Text on primary backgrounds |
| **Secondary Brown** | `hsl(16, 25%, 47%)` | `#8D6E63` | `141, 110, 99` | Secondary elements, earth tones |
| **Secondary Foreground** | `hsl(0, 0%, 100%)` | `#FFFFFF` | `255, 255, 255` | Text on secondary backgrounds |

### Agricultural Green Scale

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| agri-green-50 | `hsl(122, 39%, 96%)` | `#F1F8F1` | Lightest backgrounds |
| agri-green-100 | `hsl(122, 39%, 92%)` | `#E3F1E3` | Accent backgrounds, badges |
| agri-green-200 | `hsl(122, 39%, 80%)` | `#A5D6A7` | Light accents |
| agri-green-300 | `hsl(122, 39%, 65%)` | `#81C784` | Medium accents |
| agri-green-400 | `hsl(122, 39%, 55%)` | `#66BB6A` | Gradient endpoints |
| agri-green-500 | `hsl(122, 39%, 49%)` | `#4CAF50` | **Primary green** |
| agri-green-600 | `hsl(122, 39%, 40%)` | `#43A047` | Hover states |
| agri-green-700 | `hsl(122, 39%, 32%)` | `#388E3C` | Dark accents |

### Earth Brown Scale

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| earth-brown-50 | `hsl(16, 25%, 96%)` | `#F5F0EE` | Light backgrounds |
| earth-brown-100 | `hsl(16, 25%, 90%)` | `#E6DDD9` | Subtle accents |
| earth-brown-200 | `hsl(16, 25%, 75%)` | `#C4AFA6` | Medium accents |
| earth-brown-300 | `hsl(16, 25%, 60%)` | `#A38173` | Secondary elements |
| earth-brown-400 | `hsl(16, 25%, 47%)` | `#8D6E63` | **Secondary brown** |
| earth-brown-500 | `hsl(16, 25%, 38%)` | `#6D5549` | Dark earth tones |

### Environmental Colors

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| Sky Blue | `hsl(199, 89%, 48%)` | `#03A9F4` | Water, moisture indicators |
| Sun Yellow | `hsl(45, 93%, 47%)` | `#FFC107` | Solar radiation, warnings |
| Rain Blue | `hsl(210, 79%, 46%)` | `#1976D2` | Rainfall indicators |

### Stress Indicator Colors

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| Healthy | `hsl(122, 39%, 49%)` | `#4CAF50` | No stress (0.7-1.0) |
| Moderate | `hsl(45, 93%, 47%)` | `#FFC107` | Moderate stress (0.4-0.7) |
| Severe | `hsl(0, 84%, 60%)` | `#EF5350` | Severe stress (0.0-0.4) |

### Alert Colors

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| Alert Background | `hsl(45, 100%, 90%)` | `#FFF3CD` | Warning card background |
| Alert Border | `hsl(33, 100%, 50%)` | `#FF9800` | Warning card border |
| Alert Text | `hsl(33, 80%, 30%)` | `#8A5A00` | Warning text color |

### UI Surface Colors (Light Mode)

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| Background | `hsl(120, 10%, 98%)` | `#FAFBFA` | Page background |
| Foreground | `hsl(120, 15%, 15%)` | `#232B23` | Primary text |
| Card | `hsl(0, 0%, 100%)` | `#FFFFFF` | Card backgrounds |
| Card Foreground | `hsl(120, 15%, 15%)` | `#232B23` | Card text |
| Muted | `hsl(120, 10%, 94%)` | `#EDEFED` | Muted backgrounds |
| Muted Foreground | `hsl(120, 10%, 40%)` | `#5C665C` | Secondary text |
| Border | `hsl(120, 10%, 88%)` | `#DCE0DC` | Borders, dividers |
| Destructive | `hsl(0, 84%, 60%)` | `#EF5350` | Stop button, errors |

### UI Surface Colors (Dark Mode)

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| Background | `hsl(120, 15%, 8%)` | `#111512` | Page background |
| Foreground | `hsl(120, 10%, 95%)` | `#F0F2F0` | Primary text |
| Card | `hsl(120, 15%, 12%)` | `#1A1F1A` | Card backgrounds |
| Muted | `hsl(120, 15%, 18%)` | `#262D26` | Muted backgrounds |
| Muted Foreground | `hsl(120, 10%, 65%)` | `#9BA69B` | Secondary text |
| Border | `hsl(120, 15%, 20%)` | `#2B332B` | Borders |

---

## Typography

### Font Families

| Usage | Font Family | Godot Equivalent |
|-------|-------------|------------------|
| Headings | **Poppins** (Google Fonts) | Import `Poppins-*.ttf` files |
| Body Text | **Roboto** (Google Fonts) | Import `Roboto-*.ttf` files |
| Fallback | System UI, sans-serif | Godot default sans-serif |

### Font Downloads

- Poppins: https://fonts.google.com/specimen/Poppins
- Roboto: https://fonts.google.com/specimen/Roboto

### Font Weights

| Weight | Poppins | Roboto |
|--------|---------|--------|
| Light (300) | ❌ | ✅ |
| Regular (400) | ✅ | ✅ |
| Medium (500) | ✅ | ✅ |
| SemiBold (600) | ✅ | ❌ |
| Bold (700) | ✅ | ✅ |

### Type Scale

| Element | Font | Size (px) | Weight | Line Height | Letter Spacing |
|---------|------|-----------|--------|-------------|----------------|
| **H1 - App Title** | Poppins | 18px | SemiBold (600) | 1.2 | -0.01em |
| **H2 - Card Title** | Poppins | 16px | SemiBold (600) | 1.3 | normal |
| **H3 - Section Label** | Roboto | 14px | Medium (500) | 1.4 | normal |
| **Body** | Roboto | 14px | Regular (400) | 1.5 | normal |
| **Body Small** | Roboto | 13px | Regular (400) | 1.4 | normal |
| **Label (uppercase)** | Roboto | 12px | Medium (500) | 1.3 | 0.05em |
| **Metric Large** | Poppins | 24px | SemiBold (600) | 1.2 | -0.02em |
| **Metric Medium** | Poppins | 20px | SemiBold (600) | 1.2 | -0.01em |
| **Badge Text** | Roboto | 14px | Medium (500) | 1.0 | normal |
| **Button Text** | Poppins | 14px | Medium (500) | 1.0 | normal |
| **Caption** | Roboto | 11px | Regular (400) | 1.3 | normal |

---

## Layout & Spacing

### Screen Dimensions

| Property | Value |
|----------|-------|
| Design Resolution | 1920 × 1080 px |
| Aspect Ratio | 16:9 |

### Main Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (height: 64px)                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────┬─────────────────────────┐   │
│  │                           │                         │   │
│  │    LEFT PANEL (60%)       │    RIGHT PANEL (40%)    │   │
│  │                           │                         │   │
│  │  ┌─────────────────────┐  │  ┌───────────────────┐  │   │
│  │  │                     │  │  │   Status Card     │  │   │
│  │  │  3D Crop Viewport   │  │  └───────────────────┘  │   │
│  │  │  (flex: 1)          │  │  ┌───────────────────┐  │   │
│  │  │                     │  │  │  Environment Card │  │   │
│  │  └─────────────────────┘  │  └───────────────────┘  │   │
│  │  ┌─────────────────────┐  │  ┌───────────────────┐  │   │
│  │  │  Biomass Chart      │  │  │   Stress Card     │  │   │
│  │  │  (height: 208px)    │  │  └───────────────────┘  │   │
│  │  └─────────────────────┘  │  ┌───────────────────┐  │   │
│  │                           │  │   Alert Card      │  │   │
│  └───────────────────────────┴──└───────────────────┘──┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ TIME CONTROLS (height: 64px)                                │
└─────────────────────────────────────────────────────────────┘
```

### Panel Proportions

| Panel | Width | Calculation |
|-------|-------|-------------|
| Left Panel | 60% | `0.6 × (1920 - 32) = 1133px` |
| Right Panel | 40% | `0.4 × (1920 - 32) = 755px` |
| Gap Between | 16px | Fixed spacing |

### Spacing System (8px Base)

| Token | Value | Usage |
|-------|-------|-------|
| `spacing-1` | 4px | Tiny gaps, icon margins |
| `spacing-2` | 8px | Small gaps |
| `spacing-3` | 12px | Icon-to-text spacing |
| `spacing-4` | 16px | **Standard gap between elements** |
| `spacing-5` | 20px | Card padding |
| `spacing-6` | 24px | Section spacing |
| `spacing-8` | 32px | Large section gaps |
| `spacing-10` | 40px | Extra large spacing |

### Component-Specific Spacing

| Component | Property | Value |
|-----------|----------|-------|
| **Header** | Height | 64px |
| **Header** | Horizontal padding | 24px |
| **Card** | Padding | 20px |
| **Card** | Border radius | 12px |
| **Card** | Gap between cards | 16px |
| **Button** | Padding | 8px 16px |
| **Button** | Border radius | 8px |
| **Badge** | Padding | 4px 12px |
| **Badge** | Border radius | 9999px (pill) |
| **Progress Bar** | Height | 12px |
| **Progress Bar** | Border radius | 9999px |
| **Time Controls** | Height | 64px |
| **Time Controls** | Padding | 16px 24px |

---

## Component Specifications

### 1. Header Bar

```
┌────────────────────────────────────────────────────────────────┐
│ [🌱 Logo]  AGriSim          Day [45]/120  ████████░░  [⏸][⏹] │
│            Running Simulation              Progress Bar        │
└────────────────────────────────────────────────────────────────┘
```

| Element | Specification |
|---------|---------------|
| **Height** | 64px |
| **Background** | Card color (`#FFFFFF`) |
| **Border Bottom** | 1px solid Border color |
| **Shadow** | `0 1px 3px rgba(0,0,0,0.05)` |

#### Logo Box
- Size: 40 × 40 px
- Border radius: 12px
- Background: Primary green
- Icon: Sprout, 24px, white

#### Title Section
- "AGriSim": Poppins SemiBold 18px
- Subtitle: Roboto 12px, Muted Foreground
- Status dot: 8px circle, animated pulse when running

#### Day Counter
- Container: Muted background, border-radius 12px, padding 10px 24px
- "Day" label: 14px, Muted Foreground
- Current day: Poppins Bold 24px
- Total days: 14px, Muted Foreground
- Progress bar: Width 192px, height 8px

#### Control Buttons
- Pause/Resume: Primary style (green bg, white text)
- Stop: Destructive style (red bg, white text)
- Gap between buttons: 8px

### 2. Card Component (agri-card)

```css
/* Base Card Styles */
background: #FFFFFF (Card)
border: 1px solid rgba(220, 224, 220, 0.5) (Border at 50% opacity)
border-radius: 12px
padding: 20px
box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)

/* Hover State */
box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)
transition: 200ms ease
```

#### Card Title
- Font: Poppins SemiBold 16px
- Color: Foreground
- Icon: 20px, Primary green
- Gap between icon and text: 8px
- Margin bottom: 16px

### 3. Status Card

```
┌─────────────────────────────────────────┐
│ 📈 Current Status                       │
├──────────────────┬──────────────────────┤
│ 🌱 Growth Stage  │ 📊 Biomass           │
│ [Flowering]      │ 245.3 g/m²           │
├──────────────────┼──────────────────────┤
│ LAI              │ 💧 Soil Moisture     │
│ 3.2              │ 65% ████████░░░      │
└──────────────────┴──────────────────────┘
```

| Element | Specification |
|---------|---------------|
| **Grid** | 2 columns, gap 16px |
| **Label** | 12px uppercase, letter-spacing 0.05em, Muted Foreground |
| **Badge** | Pill shape, agri-green-100 bg, agri-green-700 text |
| **Metric** | Poppins SemiBold 24px |
| **Unit** | 14px normal weight, Muted Foreground |

### 4. Environment Card

```
┌─────────────────────────────────────────┐
│ ☁️ Environmental Conditions             │
├─────────────────────────────────────────┤
│ 🌡️ Temperature        28°C (26-31°C)   │
│ 🌧️ Rainfall           5 mm             │
│ ☀️ Solar Radiation    18.5 MJ/m²       │
└─────────────────────────────────────────┘
```

| Element | Specification |
|---------|---------------|
| **Row height** | ~48px with padding |
| **Divider** | 1px solid Border color |
| **Icon size** | 20px |
| **Label width** | ~45% of row |
| **Value** | Right-aligned, Poppins SemiBold |

#### Temperature Colors
- Sun icon: Sun Yellow (`#FFC107`)
- Min value: Rain Blue (`#1976D2`)
- Max value: Destructive red (`#EF5350`)

### 5. Stress Card

```
┌─────────────────────────────────────────┐
│ ⚡ Stress Indicators                     │
├─────────────────────────────────────────┤
│ 💧 Water        Healthy   0.85  ██████████████░░  │
│ 🌡️ Temperature  Moderate  0.65  ██████████░░░░░░  │
│ 🧪 Nutrient     Healthy   0.95  ███████████████░  │
│ 🐛 Pest         Healthy   0.85  ██████████████░░  │
└─────────────────────────────────────────┘
```

#### Progress Bar Colors (Based on Value)
| Range | Color | HSL | Label |
|-------|-------|-----|-------|
| 0.80 - 1.00 | Healthy Green | `hsl(142, 76%, 36%)` (#22C55E) | "Healthy" |
| 0.50 - 0.79 | Warning Yellow | `hsl(45, 93%, 47%)` (#EAB308) | "Moderate" |
| 0.00 - 0.49 | Severe Red | `hsl(0, 84%, 60%)` (#EF4444) | "Stressed" |

#### Progress Bar Specs
- Track: 8px height, Muted background at 30% opacity, full border-radius (4px)
- Fill: Transitions width over 500ms ease-out
- Label (status): 13px font, colored to match bar
- Value label: 14px Poppins SemiBold, right-aligned

### 5.1 Farm Action Buttons (Overlay)

These buttons are positioned as an overlay on the left side of the 3D Crop Visualization panel.

```
┌────────────────────────────────────────────────────────────┐
│  CROP VISUALIZATION                                        │
│                                                            │
│  ┌──────┐                                                  │
│  │  💧  │  ← Water/Irrigation Button                       │
│  └──────┘                                                  │
│     ↕ 12px gap                                             │
│  ┌──────┐                                                  │
│  │  🌿  │  ← Fertilizer Button                             │
│  └──────┘                                                  │
│     ↕ 12px gap                                             │
│  ┌──────┐                                                  │
│  │  🐛  │  ← Pesticide Button                              │
│  └──────┘                                                  │
│     ↕ 12px gap                                             │
│  ┌─────────────────┐                                       │
│  │ Farm Actions    │  ← Legend Card                        │
│  │ 💧 Irrigate     │                                       │
│  │ 🌿 Fertilize    │                                       │
│  │ 🐛 Pesticide    │                                       │
│  └─────────────────┘                                       │
└────────────────────────────────────────────────────────────┘
```

#### Button Specifications
| Property | Value |
|----------|-------|
| **Size** | 56 × 56 px |
| **Border Radius** | 12px |
| **Border** | 2px solid white at 20% opacity |
| **Shadow** | Large drop shadow (0 10px 15px -3px rgba(0,0,0,0.1)) |
| **Icon Size** | 28 × 28 px |
| **Icon Color** | White |
| **Position** | Left: 16px from edge, Vertically centered |
| **Gap** | 12px between buttons |

#### Button Colors
| Button | Background (90% opacity) | Hover (100%) |
|--------|--------------------------|--------------|
| Water | Rain Blue `#3B82F6` | `#3B82F6` |
| Fertilizer | Agri Green 500 `#4CAF50` | `#4CAF50` |
| Pesticide | Agri Brown 400 `#A1887F` | `#A1887F` |

#### Hover/Active States
- **Hover**: Scale 1.1 (110%), full opacity
- **Active/Pressed**: Scale 0.95 (95%)
- **Transition**: 150ms ease-out

#### Tooltip on Hover
```
┌───────────────────────────┐
│ Apply Irrigation          │  ← Bold title
│ Current moisture: 65%     │  ← Muted text, 12px
│ Adds +15% soil moisture   │  ← Muted text, 12px
└───────────────────────────┘
```
- Background: Card color
- Border: 1px solid Border color
- Border radius: 8px
- Padding: 12px
- Position: Right side of button

#### Action Effects (Game Logic)
| Action | Effect |
|--------|--------|
| **Water** | Soil Moisture += 15% (max 100%), reduces water stress |
| **Fertilizer** | Nutrient Level += 20% (max 100%), boosts LAI and biomass |
| **Pesticide** | Pest Level × 0.5 (reduces by 50%), reduces pest stress |

#### Legend Card
- Position: Below buttons, 12px gap
- Background: Card at 90% opacity with backdrop blur
- Border radius: 8px
- Padding: 8px 12px
- Title: "Farm Actions" - 10px uppercase, muted foreground
- Items: 10px muted foreground with 12×12 colored icons

### 6. Alert Card

```
┌─────────────────────────────────────────┐
│ ⚠️ Expert System Alerts                  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ ⚠ Flowering stage detected.        │ │
│ │   Maintain soil moisture above 60% │ │
│ │   to ensure successful pollination │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ View All Alerts →                       │
└─────────────────────────────────────────┘
```

#### Alert Box (Warning Type)
| Property | Value |
|----------|-------|
| Background | `hsl(45, 100%, 90%)` / `#FFF3CD` |
| Border | 1px solid `hsl(33, 100%, 50%)` / `#FF9800` |
| Border Radius | 8px |
| Padding | 12px |
| Text Color | `hsl(33, 80%, 30%)` / `#8A5A00` |
| Icon | AlertTriangle, 16px, Alert text color |

#### Alert Types
| Type | Background | Border | Text |
|------|------------|--------|------|
| Warning | `#FFF3CD` | `#FF9800` | `#8A5A00` |
| Info | `#E3F1E3` | `#4CAF50` | `#388E3C` |
| Error | `#FFEBEE` | `#EF5350` | `#C62828` |

### 7. Time Controls Bar

```
┌────────────────────────────────────────────────────────────────┐
│ [◀◀ -10 Days] [◀ -1 Day]     [▶ +1 Day] [▶▶ +10 Days]  Speed: [2x ▼] │
└────────────────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Height | 64px |
| Background | Card color |
| Border Top | 1px solid Border |
| Padding | 16px 24px |

#### Navigation Buttons (Default Style)
```css
background: Card
border: 1px solid Border
border-radius: 8px
padding: 8px 16px
font: Poppins Medium 14px
color: Foreground

/* Hover */
background: Muted

/* Active */
transform: scale(0.95)
```

#### Speed Dropdown
- Width: 80px
- Options: 0.5x, 1x, 2x, 5x, 10x
- Default selected: 2x

### 8. Biomass Chart

```
┌─────────────────────────────────────────┐
│ Biomass Accumulation                    │
│ ───────────────────────────────────────│
│     ▲                           ╭──────│
│     │                      ╭────╯      │
│ g/m²│                 ╭────╯           │
│     │            ╭────╯                │
│     │       ╭────╯                     │
│     │  ╭────╯                          │
│     └──────────────────────────────────│
│       0    30    60    90   120  Days  │
│                   ▲                     │
│                   │ Current Day Marker │
└─────────────────────────────────────────┘
```

| Element | Specification |
|---------|---------------|
| **Height** | 208px (container) |
| **Area Fill** | Primary green at 30% opacity |
| **Line Stroke** | Primary green, 2px |
| **Current Day Marker** | Vertical dashed line, Muted Foreground |
| **Axis Labels** | 11px, Muted Foreground |
| **Grid Lines** | 1px, Muted at 30% opacity |

### 9. 3D Crop Visualization

#### Growth Stages Visual Reference

| Stage | Days | Visual Description |
|-------|------|---------------------|
| Emergence | 0-10 | Single small sprout, 2 tiny leaves |
| Seedling | 11-25 | Small plant, 4 leaves, visible stem |
| Vegetative | 26-40 | Taller plant, 6-8 leaves, thicker stalk |
| Flowering | 41-55 | Full height, tassels appear at top |
| Grain Filling | 56-85 | Ears visible on stalk, tassels mature |
| Maturity | 86-110 | Ears fully formed, leaves yellowing |
| Harvest Ready | 111+ | Golden/brown coloring, drooping leaves |

#### Color Palette for Plant

| Part | HSL | Hex |
|------|-----|-----|
| Healthy Leaf | `hsl(122, 45%, 45%)` | `#4A9A4E` |
| Young Leaf | `hsl(90, 55%, 55%)` | `#8BC34A` |
| Mature Leaf | `hsl(122, 35%, 35%)` | `#3D7A40` |
| Stalk | `hsl(122, 30%, 55%)` | `#6FAF72` |
| Tassel | `hsl(45, 70%, 60%)` | `#D4AF37` |
| Ear/Corn | `hsl(50, 80%, 65%)` | `#E6C84B` |
| Soil | `hsl(16, 35%, 35%)` | `#785C4D` |

#### Sky Gradient
- Top: `hsl(199, 80%, 75%)` → Bottom: `hsl(199, 70%, 90%)`

---

## Icons & Assets

### Icon Library

Using Lucide Icons (MIT License) - https://lucide.dev/

| Icon Name | Usage | Size |
|-----------|-------|------|
| `Sprout` | Logo, Growth stage | 24px, 14px |
| `Pause` | Pause button | 16px |
| `Play` | Resume button | 16px |
| `Square` | Stop button | 16px |
| `TrendingUp` | Status card header | 20px |
| `Leaf` | Growth stage label | 14px |
| `Layers` | Biomass label | 14px |
| `Droplets` | Soil moisture, Water stress | 14px, 20px |
| `Cloud` | Environment card header | 20px |
| `Thermometer` | Temperature | 20px |
| `CloudRain` | Rainfall | 20px |
| `Sun` | Solar radiation | 20px |
| `Zap` | Stress card header | 20px |
| `TestTube` | Nutrient stress | 20px |
| `AlertTriangle` | Warning alerts | 16px, 20px |
| `Info` | Info alerts | 16px |
| `ChevronLeft` | Back navigation | 16px |
| `ChevronRight` | Forward navigation | 16px |
| `ChevronsLeft` | Fast back | 16px |
| `ChevronsRight` | Fast forward | 16px |
| `Gauge` | Speed control | 16px |

### Export Recommendations for Godot

1. **SVG Format**: Export all icons as SVG for scalability
2. **PNG Fallback**: Export at 1x, 2x, 3x for different resolutions
3. **Color**: Export in white (`#FFFFFF`) and recolor via Godot modulate

---

## Animations

### Timing Functions

| Name | CSS | Godot Equivalent |
|------|-----|------------------|
| Ease Out | `ease-out` | `EASE_OUT` |
| Ease In Out | `ease-in-out` | `EASE_IN_OUT` |
| Linear | `linear` | `TRANS_LINEAR` |

### Animation Specifications

#### 1. Fade In (Cards on load)
```
Duration: 400ms
Easing: ease-out
Properties:
  - opacity: 0 → 1
  - translateY: 10px → 0px
```

#### 2. Slide In Right (Alerts)
```
Duration: 300ms
Easing: ease-out
Properties:
  - translateX: 20px → 0px
  - opacity: 0 → 1
```

#### 3. Pulse Soft (Running indicator)
```
Duration: 2000ms
Easing: ease-in-out
Loop: infinite
Properties:
  - opacity: 1 → 0.7 → 1
```

#### 4. Progress Bar Fill
```
Duration: 500ms
Easing: ease-out
Properties:
  - width: 0% → target%
```

#### 5. Crop Sway (3D Visualization)
```
Duration: 4000ms
Easing: ease-in-out
Loop: infinite
Properties:
  - rotation: -2deg → 2deg → -2deg
```

#### 6. Button Press
```
Duration: 100ms
Easing: ease-out
Properties:
  - scale: 1 → 0.95
```

#### 7. Card Hover Shadow
```
Duration: 200ms
Easing: ease
Properties:
  - box-shadow: card → card-hover
```

---

## Godot Implementation Notes

### Recommended Node Structure

```
SimulationScreen (Control)
├── VBoxContainer
│   ├── Header (PanelContainer)
│   │   └── HBoxContainer
│   │       ├── LogoSection (HBoxContainer)
│   │       ├── DayCounter (HBoxContainer)
│   │       └── ControlButtons (HBoxContainer)
│   │
│   ├── MainContent (HSplitContainer or HBoxContainer)
│   │   ├── LeftPanel (VBoxContainer) [60%]
│   │   │   ├── ViewportContainer (SubViewportContainer)
│   │   │   │   └── SubViewport
│   │   │   │       └── 3D Scene (Node3D)
│   │   │   └── BiomassChart (Control with _draw)
│   │   │
│   │   └── RightPanel (ScrollContainer) [40%]
│   │       └── VBoxContainer
│   │           ├── StatusCard (PanelContainer)
│   │           ├── EnvironmentCard (PanelContainer)
│   │           ├── StressCard (PanelContainer)
│   │           └── AlertCard (PanelContainer)
│   │
│   └── TimeControls (PanelContainer)
│       └── HBoxContainer
```

### Theme Resource Setup

Create a `Theme` resource with these type variations:

```gdscript
# In your theme.tres or via code

# Panel Styles
var card_style = StyleBoxFlat.new()
card_style.bg_color = Color("#FFFFFF")
card_style.border_color = Color("#DCE0DC", 0.5)
card_style.set_border_width_all(1)
card_style.set_corner_radius_all(12)
card_style.set_content_margin_all(20)
card_style.shadow_color = Color(0, 0, 0, 0.05)
card_style.shadow_size = 4

# Button Styles
var btn_primary = StyleBoxFlat.new()
btn_primary.bg_color = Color("#4CAF50")
btn_primary.set_corner_radius_all(8)
btn_primary.set_content_margin(SIDE_LEFT, 16)
btn_primary.set_content_margin(SIDE_RIGHT, 16)
btn_primary.set_content_margin(SIDE_TOP, 8)
btn_primary.set_content_margin(SIDE_BOTTOM, 8)

# Progress Bar
var progress_bg = StyleBoxFlat.new()
progress_bg.bg_color = Color("#EDEFED")
progress_bg.set_corner_radius_all(6)

var progress_fill = StyleBoxFlat.new()
progress_fill.bg_color = Color("#4CAF50")
progress_fill.set_corner_radius_all(6)
```

### Font Import Settings

```gdscript
# Import .ttf files to res://fonts/

# Create DynamicFont resources
var poppins_semibold = load("res://fonts/Poppins-SemiBold.ttf")
var roboto_regular = load("res://fonts/Roboto-Regular.ttf")

# Apply to theme
theme.set_font("font", "Label", roboto_regular)
theme.set_font_size("font_size", "Label", 14)
```

### Signal Connections for Simulation

```gdscript
# Signals to emit from simulation manager
signal day_changed(day: int)
signal simulation_paused()
signal simulation_resumed()
signal simulation_stopped()
signal growth_stage_changed(stage: String)
signal alert_triggered(alert: Dictionary)
signal stress_updated(stress_type: String, value: float)
```

### Responsive Layout Tips

1. Use `size_flags_stretch_ratio` for 60/40 split
2. Set `custom_minimum_size` on cards for minimum heights
3. Use `ScrollContainer` for right panel to handle overflow
4. Anchor the header and time controls to edges

---

## Quick Reference Card

### Most Used Colors
| Purpose | Hex | HSL |
|---------|-----|-----|
| Primary Action | `#4CAF50` | `hsl(122, 39%, 49%)` |
| Background | `#FAFBFA` | `hsl(120, 10%, 98%)` |
| Card | `#FFFFFF` | `hsl(0, 0%, 100%)` |
| Text | `#232B23` | `hsl(120, 15%, 15%)` |
| Muted Text | `#5C665C` | `hsl(120, 10%, 40%)` |
| Border | `#DCE0DC` | `hsl(120, 10%, 88%)` |
| Destructive | `#EF5350` | `hsl(0, 84%, 60%)` |

### Most Used Spacing
| Size | Value |
|------|-------|
| Card Padding | 20px |
| Card Gap | 16px |
| Button Padding | 8px 16px |
| Icon-Text Gap | 8px |
| Border Radius (Card) | 12px |
| Border Radius (Button) | 8px |

### Most Used Fonts
| Element | Font | Size | Weight |
|---------|------|------|--------|
| Card Title | Poppins | 16px | SemiBold |
| Body | Roboto | 14px | Regular |
| Label | Roboto | 12px | Medium |
| Metric | Poppins | 24px | SemiBold |
| Button | Poppins | 14px | Medium |

---

*Document Version: 1.0*
*Created for: AGriSim Godot 4.6 Implementation*
*Based on: React/Tailwind Reference Implementation*
