# 📚 Ansh Vansh Library (अंश वंश पुस्तकालय)
### Complete NCERT & UP Board Classical Library Management System
**Apple Cupertino Edition • Space Black, Pure White & Electric System Blue**

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PHP Version](https://img.shields.io/badge/PHP-8.0%2B-777BB4?logo=php&logoColor=white)](https://php.net)
[![MySQL Version](https://img.shields.io/badge/MySQL-5.7%2B%20%2F%20MariaDB-4479A1?logo=mysql&logoColor=white)](https://mysql.com)
[![Design](https://img.shields.io/badge/Theme-Apple%20Cupertino%20Dark-0071e3)](https://apple.com)
[![Responsive](https://img.shields.io/badge/Responsive-Android%20%7C%20iOS%20%7C%20Tablets%20%7C%20Desktop-30d158)](#)

---

## 🏛️ Overview

**Ansh Vansh Library (अंश वंश पुस्तकालय)** is a full-featured, production-ready educational Library Management System tailored specifically for Indian school curricula (**NCERT & UP Board / UPMSP**) from **LKG (Balvatika) up to 12th Grade**. 

Engineered with an ultra-clean **Apple Cupertino Design Aesthetic** (Deep Space Black `#000000`, Pure Titanium White `#ffffff`, and Electric System Blue `#0071e3`), the platform delivers both an authentic physical library experience (realistic 3D book spines, wooden bookcase, reading hall desk token system) and contemporary web engineering.

---

## ✨ Key Features

### 📖 1. Complete NCERT & UP Board Curriculum (LKG to 12th)
- **Primary & Balvatika (LKG, UKG, Class 1–5)**: *Balvatika Joyful Learning, Sarangi, Anand, Rimjhim, Marigold, Math Magic, Aas Pass*.
- **Upper Primary (Class 6–8)**: *Vasant, Durva, Honeycomb, Science, Mathematics, Social Sciences (Our Pasts, Earth Our Habitat)*.
- **Secondary (Class 9–10)**: *Kshitij, Sparsh, Beehive, Science, Mathematics, Democratic Politics, UP Board Hindi/Math/Vigyan*.
- **Senior Secondary (Class 11–12)**: *Physics Part 1 & 2, Chemistry Part 1 & 2, Mathematics Part 1 & 2, Biology, Flamingo, Vistas, UP Board Lekhashastra & Arthashastra*.
- **Filter Tabs**: Instant switching between *All Collections*, *Balvatika & Primary (LKG–8th)*, and *Board Exam Secondary (9th–12th)*.

### 🎫 2. Reading Hall Desk Token System (वाचनालय 24 डेस्क टोकन व्यवस्था)
- **24 Physical Desks**: Real-time status for Desks `#01` to `#24`.
- **Status Indicators**:
  - 🟢 **Green Lamp (`#30d158`)**: Vacant desk, available for allocation.
  - 🔵 **Electric Blue Lamp (`#0071e3`)**: Occupied desk with active student token.
- **Printed Token Slip**: Issue reading slips with generated Token Number (`TOK-2026-XXXX`), Student Name, Selected Book, Allocated Desk, and Timestamp.

### 🎨 3. Apple Cupertino Design Language
- **Color Harmony**: Space Black `#000000`, Deep Charcoal `#05070c`, Apple System Blue `#0071e3`, Cyan Light Blue `#2997ff`, and Titanium White `#ffffff`.
- **Frosted Glassmorphism**: `backdrop-filter: saturate(180%) blur(20px)` on headers and dialogs.
- **Apple Pill Geometry**: Pill navigation tabs and action buttons (`border-radius: 980px`).
- **Grand Studio Bookcase**: 3D book spines with realistic cloth/leather gradient textures, bookmark ribbons, and hover pull-out animations.
- **Card Catalogue Drawer**: Retro manila index card layout with Dewey Decimal call numbers and retention rod hole punch.

### 💳 4. Apple Wallet Pass Style Scholar ID Card
- Printable student identification card with high-precision SVG barcode (`window.print()` ready).
- Displays Scholar Name, Class Grade, Member ID, Roll Number, and Validity Period.

### ⚡ 5. Real-Time Physical Circulation & Acoustics
- Check out, return, and renew textbooks with automatic due date calculation (14 days default).
- Rubber stamped status effect: *ISSUED*, *RETURNED*, and *OVERDUE*.
- **Web Audio API Acoustics**: Subtle synthesized book slide rustle and rubber stamp press thud (no external audio files required).

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | HTML5 Semantic Architecture, Vanilla CSS3 (Custom Properties & Responsive Design), ES6+ JavaScript |
| **Backend** | PHP 8.0+ with PDO (Strictly prepared SQL statements, zero SQL injection) |
| **Database** | MySQL 5.7+ / MariaDB 10.4+ |
| **Design** | Apple Cupertino Dark System, Google Fonts (*Cinzel*, *Public Sans*, *Noto Serif Devanagari*, *Courier Prime*) |
| **Server** | Apache (XAMPP) / PHP Built-in Server |

---

## 🚀 Quick Start & Installation

### Option A: Using XAMPP (Recommended)

1. **Clone or Copy the Repository**:
   Clone or copy the project into your XAMPP `htdocs` directory:
   ```powershell
   git clone https://github.com/arvind0019/ansh-vansh-library.git C:\xampp\htdocs\library
   ```

2. **Start Apache & MySQL**:
   - Open **XAMPP Control Panel**.
   - Start **Apache** and **MySQL** services.

3. **Set Up the Database**:
   - Open [phpMyAdmin](http://localhost/phpmyadmin).
   - Create a database or import `database.sql`:
     ```powershell
     Get-Content "C:\xampp\htdocs\library\database.sql" | & "C:\xampp\mysql\bin\mysql.exe" -u root
     ```
   - If upgrading an existing database with the full NCERT curriculum:
     ```powershell
     Get-Content "C:\xampp\htdocs\library\ncert_upgrade.sql" | & "C:\xampp\mysql\bin\mysql.exe" -u root library_db
     ```

4. **Launch the Application**:
   Open your browser and visit:
   ```
   http://localhost/library/
   ```

---

### Option B: PHP Built-in Server

```powershell
cd library-system
php -S localhost:8080
```
Then visit: `http://localhost:8080` in your web browser.

---

## 🔐 Default Librarian Credentials

To access the Circulation Desk, register scholars, issue books, and manage desk tokens:

- **Username / Staff ID**: `librarian`
- **Password**: `admin123`

---

## 📁 Repository Structure

```
ansh-vansh-library/
├── index.html            # Main Single-Page Application (SPA)
├── config.php            # MySQL Database connection with PDO & fallbacks
├── api.php               # RESTful JSON API endpoints for books, tokens, scholars
├── database.sql          # Base database schema, indexes, and seeded data
├── ncert_upgrade.sql     # NCERT & UP Board LKG-12th full textbook seed script
├── css/
│   └── library.css       # Complete Apple White/Blue/Black Cupertino stylesheet
├── js/
│   └── app.js            # Frontend logic, acoustics, circulation, desk tokens
├── images/
│   └── ansh_vansh_logo.png # Official Ansh Vansh Library crest logo
├── README.md             # Project documentation
└── .gitignore            # Git exclusion rules
```

---

## 📱 Responsive & Touch Compatibility

The system is tested and optimized across:
- **iOS & iPadOS**: Safari Mobile, responsive safe areas (`env(safe-area-inset-top)`).
- **Android**: Chrome Mobile, full touch-swipe gesture support for book shelves.
- **Desktops & Laptops**: Chrome, Firefox, Safari, Edge with 60fps animations.

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ for Indian Education by [Arvind](https://github.com/arvind0019).
